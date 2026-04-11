import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ── Helpers ─────────────────────────────────────── */

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface CallerProfile {
  id: string;
  role: string;
  licensee_id: string | null;
  store_id: string | null;
}

/**
 * Carrega o profile do chamador autenticado.
 * ADM → acesso total. Cliente → restrito ao próprio licensee_id e roles unidade|vendedor.
 */
async function requireCaller(): Promise<
  { ok: true; caller: CallerProfile } | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { /* noop — somente leitura */ },
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Não autenticado" };

  const { data: profile } = await sb
    .from("profiles")
    .select("id, role, licensee_id, store_id")
    .eq("id", user.id)
    .single();

  const p = profile as CallerProfile | null;
  if (!p) return { ok: false, status: 403, error: "Profile não encontrado" };
  if (p.role !== "adm" && p.role !== "cliente" && p.role !== "unidade") {
    return { ok: false, status: 403, error: "Sem permissão" };
  }
  return { ok: true, caller: p };
}

/** Roles permitidas para um cliente criar/editar. */
const CLIENTE_ALLOWED_ROLES = new Set(["unidade", "vendedor"]);
/** Roles permitidas para uma unidade criar/editar. */
const UNIDADE_ALLOWED_ROLES = new Set(["vendedor"]);

/* ── POST — criar usuário ─────────────────────────── */

export async function POST(req: NextRequest) {
  const guard = await requireCaller();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { caller } = guard;

  const sb = adminClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  try {
    const body = await req.json();
    const { email, password, profile } = body as {
      email: string;
      password: string;
      profile: Record<string, unknown>;
    };
    if (!email || !password) {
      return NextResponse.json({ error: "email e senha são obrigatórios" }, { status: 400 });
    }

    // Escopo do cliente: força licensee_id e restringe roles
    if (caller.role === "cliente") {
      if (!caller.licensee_id) {
        return NextResponse.json({ error: "Cliente sem licensee" }, { status: 403 });
      }
      const role = String(profile.role ?? "");
      if (!CLIENTE_ALLOWED_ROLES.has(role)) {
        return NextResponse.json({ error: "Role não permitida" }, { status: 403 });
      }
      profile.licensee_id = caller.licensee_id;
    }

    // Escopo da unidade: força licensee_id + store_id, só cria vendedor
    if (caller.role === "unidade") {
      if (!caller.licensee_id || !caller.store_id) {
        return NextResponse.json({ error: "Unidade sem vínculo" }, { status: 403 });
      }
      const role = String(profile.role ?? "");
      if (!UNIDADE_ALLOWED_ROLES.has(role)) {
        return NextResponse.json({ error: "Role não permitida" }, { status: 403 });
      }
      profile.licensee_id = caller.licensee_id;
      profile.store_id = caller.store_id;
    }

    const { data: created, error: authErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr || !created?.user) {
      return NextResponse.json({ error: authErr?.message || "Falha ao criar usuário" }, { status: 400 });
    }
    const id = created.user.id;

    const profileData = { id, ...profile };
    const { error: pErr } = await sb.from("profiles").upsert(profileData, { onConflict: "id" });
    if (pErr) {
      await sb.auth.admin.deleteUser(id);
      return NextResponse.json({ error: `Erro ao salvar profile: ${pErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}

/* ── PATCH — atualizar profile ───────────────────── */

export async function PATCH(req: NextRequest) {
  const guard = await requireCaller();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { caller } = guard;

  const sb = adminClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  try {
    const body = await req.json();
    const { id, profile } = body as { id: string; profile: Record<string, unknown> };
    if (!id || !profile) return NextResponse.json({ error: "id e profile obrigatórios" }, { status: 400 });

    // Escopo do cliente: só pode editar usuários do próprio licensee e manter roles permitidas
    if (caller.role === "cliente") {
      if (!caller.licensee_id) {
        return NextResponse.json({ error: "Cliente sem licensee" }, { status: 403 });
      }
      const { data: target } = await sb
        .from("profiles")
        .select("licensee_id, role")
        .eq("id", id)
        .single();
      const t = target as { licensee_id: string | null; role: string } | null;
      if (!t || t.licensee_id !== caller.licensee_id) {
        return NextResponse.json({ error: "Fora do escopo" }, { status: 403 });
      }
      // Impede promover para role não-permitida
      if (profile.role !== undefined && !CLIENTE_ALLOWED_ROLES.has(String(profile.role))) {
        return NextResponse.json({ error: "Role não permitida" }, { status: 403 });
      }
      // Impede troca de licensee
      profile.licensee_id = caller.licensee_id;
    }

    // Escopo da unidade: só edita vendedores da própria store
    if (caller.role === "unidade") {
      if (!caller.licensee_id || !caller.store_id) {
        return NextResponse.json({ error: "Unidade sem vínculo" }, { status: 403 });
      }
      const { data: target } = await sb
        .from("profiles")
        .select("licensee_id, store_id, role")
        .eq("id", id)
        .single();
      const t = target as { licensee_id: string | null; store_id: string | null; role: string } | null;
      if (!t || t.store_id !== caller.store_id || t.role !== "vendedor") {
        return NextResponse.json({ error: "Fora do escopo" }, { status: 403 });
      }
      if (profile.role !== undefined && !UNIDADE_ALLOWED_ROLES.has(String(profile.role))) {
        return NextResponse.json({ error: "Role não permitida" }, { status: 403 });
      }
      profile.licensee_id = caller.licensee_id;
      profile.store_id = caller.store_id;
    }

    const { error } = await sb.from("profiles").update(profile).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}

/* ── DELETE — remover usuário ────────────────────── */

export async function DELETE(req: NextRequest) {
  const guard = await requireCaller();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { caller } = guard;

  const sb = adminClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    if (caller.role === "cliente") {
      if (!caller.licensee_id) {
        return NextResponse.json({ error: "Cliente sem licensee" }, { status: 403 });
      }
      const { data: target } = await sb
        .from("profiles")
        .select("licensee_id")
        .eq("id", id)
        .single();
      const t = target as { licensee_id: string | null } | null;
      if (!t || t.licensee_id !== caller.licensee_id) {
        return NextResponse.json({ error: "Fora do escopo" }, { status: 403 });
      }
    }

    if (caller.role === "unidade") {
      if (!caller.store_id) {
        return NextResponse.json({ error: "Unidade sem vínculo" }, { status: 403 });
      }
      const { data: target } = await sb
        .from("profiles")
        .select("store_id, role")
        .eq("id", id)
        .single();
      const t = target as { store_id: string | null; role: string } | null;
      if (!t || t.store_id !== caller.store_id || t.role !== "vendedor") {
        return NextResponse.json({ error: "Fora do escopo" }, { status: 403 });
      }
    }

    await sb.from("profiles").delete().eq("id", id);
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}

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

/**
 * Garante que o chamador tem role "adm" via sessão em cookies.
 */
async function requireAdm(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
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
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "adm") {
    return { ok: false, status: 403, error: "Requer permissão de ADM" };
  }
  return { ok: true };
}

/* ── POST — criar usuário ─────────────────────────── */

export async function POST(req: NextRequest) {
  const guard = await requireAdm();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

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
  const guard = await requireAdm();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const sb = adminClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  try {
    const body = await req.json();
    const { id, profile } = body as { id: string; profile: Record<string, unknown> };
    if (!id || !profile) return NextResponse.json({ error: "id e profile obrigatórios" }, { status: 400 });

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
  const guard = await requireAdm();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const sb = adminClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    await sb.from("profiles").delete().eq("id", id);
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}

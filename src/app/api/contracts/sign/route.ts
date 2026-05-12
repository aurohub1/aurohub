import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { fillTemplate } from "@/lib/contract-template";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role, licensee_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 403 });

  const body = await req.json() as { contract_id?: string };
  if (!body.contract_id) {
    return NextResponse.json({ error: "contract_id obrigatório" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contract, error: fetchErr } = await sb
    .from("contracts")
    .select("*")
    .eq("id", body.contract_id)
    .single();

  if (fetchErr || !contract) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  const p = profile as { role: string; licensee_id: string | null };
  const c = contract as Record<string, unknown>;

  if (p.role !== "adm" && c["licensee_id"] !== p.licensee_id) {
    return NextResponse.json({ error: "Sem permissão para este contrato" }, { status: 403 });
  }

  if (c["status"] === "signed") {
    return NextResponse.json({ error: "Contrato já assinado" }, { status: 400 });
  }

  if (c["status"] === "cancelled") {
    return NextResponse.json({ error: "Contrato cancelado" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const filled = fillTemplate(c);
  const hash = createHash("sha256").update(filled).digest("hex");
  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await sb
    .from("contracts")
    .update({ status: "signed", signed_at: now, ip_address: encrypt(ip), document_hash: hash })
    .eq("id", body.contract_id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true, contract: updated, hash, signed_at: now });
}

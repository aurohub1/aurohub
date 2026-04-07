export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo").eq("id", token).eq("ativo", true).single();
  if (!data || data.tipo !== "adm") return null;
  return data;
}

// GET — listar lojas com status de conexão Instagram
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data: lojas } = await sb
    .from("lojas")
    .select("id, nome, cidade, ig_user_id, ig_access_token, ig_token_expires_at, ativa, marca_id")
    .order("nome");

  const { data: marcas } = await sb.from("marcas").select("id, nome");
  const marcaMap = Object.fromEntries((marcas || []).map(m => [m.id, m.nome]));

  const lojasFormatadas = (lojas || []).map(l => ({
    id: l.id,
    nome: l.nome,
    cidade: l.cidade,
    marca: marcaMap[l.marca_id] || "—",
    ativa: l.ativa,
    ig_conectado: !!(l.ig_user_id && l.ig_access_token),
    ig_user_id: l.ig_user_id || null,
    ig_token_masked: l.ig_access_token ? `${l.ig_access_token.slice(0, 8)}...${l.ig_access_token.slice(-4)}` : null,
    ig_token_expires_at: l.ig_token_expires_at || null,
    ig_expira_em_dias: l.ig_token_expires_at
      ? Math.ceil((new Date(l.ig_token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return NextResponse.json({ lojas: lojasFormatadas });
}

// PUT — salvar token manual ou atualizar ig_user_id
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { loja_id, ig_user_id, ig_access_token } = await request.json();
    if (!loja_id) return NextResponse.json({ error: "loja_id obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const update: Record<string, unknown> = {};

    if (ig_user_id !== undefined) update.ig_user_id = ig_user_id || null;
    if (ig_access_token !== undefined) {
      update.ig_access_token = ig_access_token || null;
      // Token de longa duração = 60 dias
      if (ig_access_token) {
        const expires = new Date();
        expires.setDate(expires.getDate() + 60);
        update.ig_token_expires_at = expires.toISOString();
      } else {
        update.ig_token_expires_at = null;
      }
    }

    const { data, error } = await sb.from("lojas").update(update).eq("id", loja_id).select("id, nome").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ loja: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — revogar conexão Instagram
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { loja_id } = await request.json();
    if (!loja_id) return NextResponse.json({ error: "loja_id obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { error } = await sb
      .from("lojas")
      .update({ ig_user_id: null, ig_access_token: null, ig_token_expires_at: null })
      .eq("id", loja_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

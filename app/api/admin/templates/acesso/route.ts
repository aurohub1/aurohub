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

// GET — listar regras de acesso de um template + usuarios e lojas disponíveis
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("template_id");
  if (!templateId) return NextResponse.json({ error: "template_id obrigatório" }, { status: 400 });

  const sb = createServerSupabase();

  // Regras existentes
  const { data: regras } = await sb
    .from("templates_acesso")
    .select("id, template_id, usuario_id, loja_id, liberado, created_at")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false });

  // Enriquecer com nomes
  const userIds = (regras || []).filter(r => r.usuario_id).map(r => r.usuario_id);
  const lojaIds = (regras || []).filter(r => r.loja_id).map(r => r.loja_id);

  let userMap: Record<string, string> = {};
  let lojaMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await sb.from("usuarios").select("id, nome").in("id", userIds);
    userMap = Object.fromEntries((users || []).map(u => [u.id, u.nome]));
  }
  if (lojaIds.length > 0) {
    const { data: lojas } = await sb.from("lojas").select("id, nome").in("id", lojaIds);
    lojaMap = Object.fromEntries((lojas || []).map(l => [l.id, l.nome]));
  }

  const regrasEnriquecidas = (regras || []).map(r => ({
    ...r,
    nome: r.usuario_id ? userMap[r.usuario_id] || "Usuário" : lojaMap[r.loja_id] || "Loja",
    tipo_acesso: r.usuario_id ? "usuario" : "loja",
  }));

  // Listas para dropdown
  const { data: todosUsuarios } = await sb.from("usuarios").select("id, nome, tipo").eq("ativo", true).order("nome");
  const { data: todasLojas } = await sb.from("lojas").select("id, nome, cidade").eq("ativa", true).order("nome");

  return NextResponse.json({
    regras: regrasEnriquecidas,
    usuarios: todosUsuarios || [],
    lojas: todasLojas || [],
  });
}

// POST — adicionar regra de acesso
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { template_id, usuario_id, loja_id, liberado } = await request.json();
    if (!template_id) return NextResponse.json({ error: "template_id obrigatório" }, { status: 400 });
    if (!usuario_id && !loja_id) return NextResponse.json({ error: "Informe usuario_id ou loja_id" }, { status: 400 });

    const sb = createServerSupabase();
    const insert: Record<string, unknown> = {
      template_id,
      liberado: liberado !== false,
    };
    if (usuario_id) insert.usuario_id = usuario_id;
    if (loja_id) insert.loja_id = loja_id;

    const { data, error } = await sb
      .from("templates_acesso")
      .upsert(insert, { onConflict: usuario_id ? "template_id,usuario_id" : "template_id,loja_id" })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ regra: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — toggle liberado
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id, liberado } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from("templates_acesso")
      .update({ liberado })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ regra: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — remover regra
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { error } = await sb.from("templates_acesso").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

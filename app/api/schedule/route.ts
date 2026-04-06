export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo, marca_id, loja_id").eq("id", token).eq("ativo", true).single();
  return data;
}

// GET — lista postagens agendadas e publicadas recentes
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sb = createServerSupabase();

  let query = sb
    .from("postagens")
    .select("id, imagem_url, legenda, formato, status, agendado_para, publicado_em, erro_msg, created_at, usuario_id, loja_id")
    .in("status", ["agendado", "publicado", "erro"])
    .order("agendado_para", { ascending: true, nullsFirst: false });

  // Filtro por hierarquia
  if (user.tipo === "loja" || user.tipo === "cliente") {
    query = query.eq("loja_id", user.loja_id);
  }

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer com nomes de usuários
  const userIds = [...new Set((data || []).map(p => p.usuario_id).filter(Boolean))];
  const { data: users } = await sb.from("usuarios").select("id, nome").in("id", userIds.length > 0 ? userIds : ["_"]);
  const nameMap = Object.fromEntries((users || []).map(u => [u.id, u.nome]));

  const posts = (data || []).map(p => ({
    ...p,
    usuario_nome: nameMap[p.usuario_id] || "—",
  }));

  return NextResponse.json({ posts });
}

// POST — agendar publicação
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const { imagem_url, legenda, formato, agendado_para } = body;

    if (!imagem_url || !agendado_para) {
      return NextResponse.json({ error: "Imagem e data de agendamento obrigatórios" }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from("postagens")
      .insert({
        usuario_id: user.id,
        loja_id: user.loja_id,
        imagem_url,
        legenda: legenda || "",
        formato: formato || "stories",
        status: "agendado",
        agendado_para,
      })
      .select("id, status, agendado_para")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ postagem: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — reagendar ou cancelar
export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, agendado_para, status } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const update: Record<string, unknown> = {};
    if (agendado_para !== undefined) update.agendado_para = agendado_para;
    if (status !== undefined) update.status = status;

    const { data, error } = await sb.from("postagens").update(update).eq("id", id).select("id, status, agendado_para").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ postagem: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — remover agendamento
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    // Só pode deletar se for agendado (não publicado)
    const { error } = await sb.from("postagens").delete().eq("id", id).eq("status", "agendado");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

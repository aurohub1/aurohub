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

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data: planos, error: pe } = await sb.from("planos").select("*").order("preco_mensal", { ascending: true });
  const { data: packs, error: pke } = await sb.from("packs").select("*, usuarios(nome, email)").order("created_at", { ascending: false });

  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });

  return NextResponse.json({ planos: planos || [], packs: packs || [] });
}

export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const allowed = ["nome", "preco_mensal", "preco_anual", "limite_lojas", "limite_usuarios", "limite_posts", "limite_stories", "inclui_transmissao", "inclui_agendamento", "ativo"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) update[key] = fields[key];
    }

    const { data, error } = await sb.from("planos").update(update).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plano: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — atribuir pack a usuário
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { usuario_id, tipo } = body;

    if (!usuario_id || !tipo) {
      return NextResponse.json({ error: "usuario_id e tipo obrigatórios" }, { status: 400 });
    }

    const packMap: Record<string, number> = { pack10: 10, pack30: 30, pack60: 60 };
    const creditos = packMap[tipo];
    if (!creditos) return NextResponse.json({ error: "Tipo inválido: pack10, pack30, pack60" }, { status: 400 });

    const validade = new Date();
    validade.setDate(validade.getDate() + 90);

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from("packs")
      .insert({
        usuario_id, tipo,
        creditos_total: creditos,
        creditos_usados: 0,
        validade: validade.toISOString(),
        ativo: true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pack: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

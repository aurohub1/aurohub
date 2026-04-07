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

// GET — listar add-ons + assinaturas + lojas
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sb = createServerSupabase();

  const { data: addons } = await sb.from("addons").select("*").order("created_at");

  // Assinaturas com nome da loja
  const { data: assinaturas } = await sb
    .from("addons_assinaturas")
    .select("id, addon_id, loja_id, tier, ativo, created_at");

  const lojaIds = [...new Set((assinaturas || []).map(a => a.loja_id).filter(Boolean))];
  let lojaMap: Record<string, string> = {};
  if (lojaIds.length > 0) {
    const { data: lojas } = await sb.from("lojas").select("id, nome").in("id", lojaIds);
    lojaMap = Object.fromEntries((lojas || []).map(l => [l.id, l.nome]));
  }

  const assinaturasEnriquecidas = (assinaturas || []).map(a => ({
    ...a,
    loja_nome: lojaMap[a.loja_id] || "—",
  }));

  // Todas as lojas para dropdown
  const { data: todasLojas } = await sb.from("lojas").select("id, nome, cidade").eq("ativa", true).order("nome");

  return NextResponse.json({
    addons: addons || [],
    assinaturas: assinaturasEnriquecidas,
    lojas: todasLojas || [],
  });
}

// POST — criar add-on ou atribuir assinatura
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    const sb = createServerSupabase();

    // Atribuir assinatura a loja
    if (body.addon_id && body.loja_id) {
      const { tier } = body;
      if (!["individual", "time", "rede"].includes(tier)) {
        return NextResponse.json({ error: "Tier inválido" }, { status: 400 });
      }

      const { data, error } = await sb
        .from("addons_assinaturas")
        .insert({ addon_id: body.addon_id, loja_id: body.loja_id, tier, ativo: true })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ assinatura: data }, { status: 201 });
    }

    // Criar novo add-on
    const { nome, slug, descricao, preco_individual, preco_time, preco_rede } = body;
    if (!nome || !slug) return NextResponse.json({ error: "Nome e slug obrigatórios" }, { status: 400 });

    const { data, error } = await sb
      .from("addons")
      .insert({ nome, slug, descricao, preco_individual, preco_time, preco_rede, ativo: true })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ addon: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — editar add-on ou toggle assinatura
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const sb = createServerSupabase();

    // Toggle assinatura
    if (body.assinatura_id !== undefined) {
      const { data, error } = await sb
        .from("addons_assinaturas")
        .update({ ativo: body.ativo })
        .eq("id", body.assinatura_id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ assinatura: data });
    }

    // Editar add-on
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const allowed = ["nome", "descricao", "preco_individual", "preco_time", "preco_rede", "ativo"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) update[key] = fields[key];
    }

    const { data, error } = await sb.from("addons").update(update).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ addon: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — remover assinatura
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { assinatura_id } = await request.json();
    if (!assinatura_id) return NextResponse.json({ error: "assinatura_id obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { error } = await sb.from("addons_assinaturas").delete().eq("id", assinatura_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

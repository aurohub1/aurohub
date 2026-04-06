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
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: marcas } = await sb.from("marcas").select("id, nome");

  return NextResponse.json({ templates: data || [], marcas: marcas || [] });
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { nome, tipo_form, formato, marca_id, largura, altura, permite_postagem, apenas_download } = body;

    if (!nome || !tipo_form || !formato) {
      return NextResponse.json({ error: "Campos obrigatórios: nome, tipo_form, formato" }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from("templates")
      .insert({
        nome, tipo_form, formato,
        marca_id: marca_id || null,
        largura: largura || 1080,
        altura: altura || (formato === "transmissao" ? 1080 : formato === "feed" ? 1350 : 1920),
        permite_postagem: permite_postagem !== false,
        apenas_download: apenas_download === true,
        ativo: true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const update: Record<string, unknown> = {};
    const allowed = ["nome", "tipo_form", "formato", "marca_id", "largura", "altura", "ativo", "permite_postagem", "apenas_download", "thumbnail_url", "schema_json"];
    for (const key of allowed) {
      if (fields[key] !== undefined) update[key] = fields[key] === "" ? null : fields[key];
    }

    const { data, error } = await sb.from("templates").update(update).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { error } = await sb.from("templates").update({ ativo: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

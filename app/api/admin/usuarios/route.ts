export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;

  const sb = createServerSupabase();
  const { data } = await sb
    .from("usuarios")
    .select("id, tipo")
    .eq("id", token)
    .eq("ativo", true)
    .single();

  if (!data || data.tipo !== "adm") return null;
  return data;
}

// GET — lista usuários com marca e loja
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("usuarios")
    .select("id, nome, email, tipo, marca_id, loja_id, ativo, plano, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Buscar marcas e lojas para exibir nomes
  const { data: marcas } = await sb.from("marcas").select("id, nome");
  const { data: lojas } = await sb.from("lojas").select("id, nome, cidade, marca_id");

  return NextResponse.json({ users: data, marcas: marcas || [], lojas: lojas || [] });
}

// POST — criar usuário
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { nome, email, senha, tipo, marca_id, loja_id } = body;

    if (!nome || !email || !senha || !tipo) {
      return NextResponse.json({ error: "Campos obrigatórios: nome, email, senha, tipo" }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Verificar email duplicado
    const { data: existing } = await sb
      .from("usuarios")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const senha_hash = await bcrypt.hash(senha, 12);

    const { data, error } = await sb
      .from("usuarios")
      .insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha_hash,
        tipo,
        marca_id: marca_id || null,
        loja_id: loja_id || null,
        ativo: true,
      })
      .select("id, nome, email, tipo, marca_id, loja_id, ativo, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — editar usuário
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, nome, email, senha, tipo, marca_id, loja_id, ativo } = body;

    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const update: Record<string, unknown> = {};

    if (nome !== undefined) update.nome = nome.trim();
    if (email !== undefined) update.email = email.toLowerCase().trim();
    if (tipo !== undefined) update.tipo = tipo;
    if (marca_id !== undefined) update.marca_id = marca_id || null;
    if (loja_id !== undefined) update.loja_id = loja_id || null;
    if (ativo !== undefined) update.ativo = ativo;
    if (senha) update.senha_hash = await bcrypt.hash(senha, 12);
    update.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from("usuarios")
      .update(update)
      .eq("id", id)
      .select("id, nome, email, tipo, marca_id, loja_id, ativo, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — desativar usuário (soft delete)
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    // Não permitir desativar a si mesmo
    if (id === admin.id) {
      return NextResponse.json({ error: "Não pode desativar seu próprio usuário" }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { error } = await sb
      .from("usuarios")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

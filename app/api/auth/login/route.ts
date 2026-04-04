export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "E-mail e senha obrigatórios" },
        { status: 400 }
      );
    }

    const sb = createServerSupabase();
    const { data: user, error } = await sb
      .from("usuarios")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // TODO: bcrypt compare — por enquanto compara direto (migrar para hash)
    if (user.senha_hash !== senha) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("aurohub_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        marca_id: user.marca_id,
        loja_id: user.loja_id,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

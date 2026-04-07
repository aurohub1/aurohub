export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase";
import { buscarCotas } from "@/lib/cotas";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aurohub_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const sb = createServerSupabase();
    const { data: user } = await sb
      .from("usuarios")
      .select("id, loja_id")
      .eq("id", token)
      .eq("ativo", true)
      .single();

    if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const cota = await buscarCotas(user.id, user.loja_id);
    return NextResponse.json(cota);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

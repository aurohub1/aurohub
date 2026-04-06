export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("usuarios")
    .select("id, nome, email, tipo, marca_id, loja_id")
    .eq("id", token)
    .eq("ativo", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  return NextResponse.json({ user: data });
}

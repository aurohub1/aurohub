export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = createServerSupabase();

    // Check if usuarios table exists and has data
    const { data: users, error } = await sb
      .from("usuarios")
      .select("id, email, tipo, ativo, senha_hash")
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message, hint: "Tabela pode não existir" });
    }

    // Mask senha_hash for security, just show first 10 chars
    const masked = (users || []).map(u => ({
      id: u.id,
      email: u.email,
      tipo: u.tipo,
      ativo: u.ativo,
      senha_starts_with: u.senha_hash?.substring(0, 10) || "NULL",
      is_bcrypt: u.senha_hash?.startsWith("$2") || false,
    }));

    return NextResponse.json({ count: users?.length || 0, users: masked });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}

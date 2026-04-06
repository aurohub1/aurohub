export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const sb = createServerSupabase();
    const { data: users, error } = await sb
      .from("usuarios")
      .select("id, email, tipo, ativo, senha_hash")
      .limit(10);

    if (error) return NextResponse.json({ error: error.message });

    const masked = (users || []).map(u => ({
      id: u.id, email: u.email, tipo: u.tipo, ativo: u.ativo,
      senha_starts_with: u.senha_hash?.substring(0, 20) || "NULL",
      is_bcrypt: u.senha_hash?.startsWith("$2") || false,
    }));

    return NextResponse.json({ count: users?.length || 0, users: masked });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();
    const sb = createServerSupabase();

    const { data: user, error } = await sb
      .from("usuarios")
      .select("id, email, senha_hash, ativo")
      .eq("email", email?.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (error) return NextResponse.json({ step: "query_error", error: error.message });
    if (!user) return NextResponse.json({ step: "not_found" });

    const compareResult = await bcrypt.compare(senha, user.senha_hash);

    return NextResponse.json({
      step: "compare_done",
      email: user.email,
      hashPrefix: user.senha_hash?.substring(0, 20),
      senhaLength: senha?.length,
      compareResult,
    });
  } catch (err) {
    return NextResponse.json({ step: "error", error: String(err) });
  }
}

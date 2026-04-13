import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { licensee_id, password } = await request.json();
    if (!licensee_id || !password || password.length < 6) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    // Busca o user_id pelo licensee_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("licensee_id", licensee_id)
      .eq("role", "cliente")
      .single();
    if (!profile?.id) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    // Altera senha via Admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { licensee_id } = await req.json() as { licensee_id?: string };
    if (!licensee_id) return NextResponse.json({ error: "licensee_id obrigatório" }, { status: 400 });

    const sb = adminDb();

    const { data: existing } = await sb
      .from("briefings")
      .select("id, token")
      .eq("licensee_id", licensee_id)
      .maybeSingle();

    if (existing) return NextResponse.json({ token: existing.token, briefing_id: existing.id });

    const { data: briefing, error } = await sb
      .from("briefings")
      .insert({ licensee_id })
      .select("id, token")
      .single();

    if (error || !briefing) {
      console.error("[Briefing] Erro ao criar:", error);
      return NextResponse.json({ error: "Erro ao criar briefing" }, { status: 500 });
    }

    return NextResponse.json({ token: briefing.token, briefing_id: briefing.id });
  } catch (e) {
    console.error("[Briefing/create]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

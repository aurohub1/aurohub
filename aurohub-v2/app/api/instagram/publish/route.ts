export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { publishToInstagram } from "@/lib/instagram";

export async function POST(request: Request) {
  try {
    const { loja_id, image_url, caption } = await request.json();

    const sb = createServerSupabase();

    // Busca token da loja
    const { data: loja } = await sb
      .from("lojas")
      .select("ig_user_id, ig_access_token, nome")
      .eq("id", loja_id)
      .single();

    if (!loja?.ig_user_id || !loja?.ig_access_token) {
      return NextResponse.json(
        { error: "Loja sem conta Instagram conectada" },
        { status: 400 }
      );
    }

    const result = await publishToInstagram(
      loja.ig_user_id,
      loja.ig_access_token,
      image_url,
      caption
    );

    return NextResponse.json({ success: true, ig_media_id: result.id });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json(
      { error: "Erro ao publicar" },
      { status: 500 }
    );
  }
}

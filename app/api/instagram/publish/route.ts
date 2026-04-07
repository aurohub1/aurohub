export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { publishToInstagram } from "@/lib/instagram";
import { cookies } from "next/headers";
import { verificarCota, deduzirPack } from "@/lib/cotas";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aurohub_session")?.value;

    const { loja_id, image_url, caption, formato } = await request.json();

    const sb = createServerSupabase();

    // Verificar cota se temos sessão
    if (token && formato) {
      const fmt = formato || "feed";
      const cota = await verificarCota(token, loja_id, fmt);
      if (!cota.permitido) {
        return NextResponse.json(
          { error: cota.motivo, cota: cota.uso },
          { status: 403 }
        );
      }

      // Deduzir pack se excedeu plano
      const pontos = fmt === "reels" ? 2 : 1;
      const tipo = fmt === "stories" ? "stories" : "posts";
      const excedeuPlano = tipo === "stories"
        ? cota.uso.stories_usados + pontos > cota.uso.stories_limite
        : cota.uso.posts_pontos + pontos > cota.uso.posts_limite;

      if (excedeuPlano) {
        const ok = await deduzirPack(token, pontos);
        if (!ok) {
          return NextResponse.json({ error: "Sem créditos disponíveis" }, { status: 403 });
        }
      }
    }

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

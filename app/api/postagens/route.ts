export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verificarCota, deduzirPack } from "@/lib/cotas";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { imagem_url, legenda, formato, ig_media_id, status: postStatus } = body;

    if (!imagem_url) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });

    const fmt = formato || "stories";

    // Verificar cota antes de publicar (rascunhos não consomem cota)
    if (postStatus !== "rascunho") {
      const cota = await verificarCota(user.id, user.loja_id, fmt);
      if (!cota.permitido) {
        return NextResponse.json({ error: cota.motivo, cota: cota.uso }, { status: 403 });
      }

      // Se excedeu plano mas tem pack, deduzir pack
      const pontos = fmt === "reels" ? 2 : 1;
      const tipo = fmt === "stories" ? "stories" : "posts";
      const excedeuPlano = tipo === "stories"
        ? cota.uso.stories_usados + pontos > cota.uso.stories_limite
        : cota.uso.posts_pontos + pontos > cota.uso.posts_limite;

      if (excedeuPlano) {
        const ok = await deduzirPack(user.id, pontos);
        if (!ok) {
          return NextResponse.json({ error: "Sem créditos disponíveis" }, { status: 403 });
        }
      }
    }

    const { data, error } = await sb
      .from("postagens")
      .insert({
        usuario_id: user.id,
        loja_id: user.loja_id,
        imagem_url,
        legenda: legenda || "",
        formato: fmt,
        ig_media_id: ig_media_id || null,
        status: postStatus || "rascunho",
        publicado_em: ig_media_id ? new Date().toISOString() : null,
      })
      .select("id, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ postagem: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

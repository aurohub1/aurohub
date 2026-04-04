export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { publishToInstagram } from "@/lib/instagram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServerSupabase();
  const now = new Date().toISOString();

  // 1. Executar agendamentos pendentes
  const { data: pendentes } = await sb
    .from("postagens")
    .select("*, lojas!inner(ig_user_id, ig_access_token)")
    .eq("status", "agendado")
    .lte("agendado_para", now)
    .limit(10);

  let published = 0;

  if (pendentes) {
    for (const post of pendentes) {
      try {
        const loja = post.lojas as { ig_user_id: string; ig_access_token: string };
        if (!loja.ig_user_id || !loja.ig_access_token) continue;

        const result = await publishToInstagram(
          loja.ig_user_id,
          loja.ig_access_token,
          post.imagem_url,
          post.legenda
        );

        await sb
          .from("postagens")
          .update({
            status: "publicado",
            ig_media_id: result.id,
            publicado_em: now,
          })
          .eq("id", post.id);

        published++;
      } catch (err) {
        await sb
          .from("postagens")
          .update({ status: "erro", erro_msg: String(err) })
          .eq("id", post.id);
      }
    }
  }

  // 2. Expirar packs vencidos
  const { data: expiredPacks } = await sb
    .from("packs")
    .update({ ativo: false })
    .eq("ativo", true)
    .lt("validade", now)
    .select("id");

  return NextResponse.json({
    ok: true,
    published,
    packs_expired: expiredPacks?.length || 0,
    timestamp: now,
  });
}

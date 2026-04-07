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

  // 3. Refresh tokens Instagram expirando em até 7 dias
  let tokensRefreshed = 0;
  const setesDias = new Date();
  setesDias.setDate(setesDias.getDate() + 7);

  const { data: lojasExpirando } = await sb
    .from("lojas")
    .select("id, ig_access_token, ig_token_expires_at")
    .eq("ativa", true)
    .not("ig_access_token", "is", null)
    .not("ig_token_expires_at", "is", null)
    .lt("ig_token_expires_at", setesDias.toISOString())
    .gt("ig_token_expires_at", now);

  if (lojasExpirando) {
    for (const loja of lojasExpirando) {
      try {
        const res = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${loja.ig_access_token}`
        );
        const data = await res.json();
        if (data.access_token) {
          const novaExpiracao = new Date();
          novaExpiracao.setSeconds(novaExpiracao.getSeconds() + (data.expires_in || 5184000));
          await sb
            .from("lojas")
            .update({
              ig_access_token: data.access_token,
              ig_token_expires_at: novaExpiracao.toISOString(),
            })
            .eq("id", loja.id);
          tokensRefreshed++;
        }
      } catch (err) {
        console.error(`Token refresh failed for loja ${loja.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    published,
    packs_expired: expiredPacks?.length || 0,
    tokens_refreshed: tokensRefreshed,
    timestamp: now,
  });
}

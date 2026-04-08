export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

// POST /api/instagram/renew-tokens — renova todos os tokens IG
// Chamado por: admin tokens page (manual) ou cron (automático)
export async function POST(request: Request) {
  // Auth: admin ou cron secret
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const cookieStore = await cookies();
    const session = cookieStore.get("aurohub_session")?.value;
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const sb = createServerSupabase();
    const { data: user } = await sb.from("usuarios").select("id, tipo").eq("id", session).eq("ativo", true).single();
    if (!user || user.tipo !== "adm") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sb = createServerSupabase();

  // Buscar lojas com token configurado
  const { data: lojas, error } = await sb
    .from("lojas")
    .select("id, nome, ig_user_id, ig_access_token, ig_token_expires_at")
    .not("ig_access_token", "is", null)
    .eq("ativa", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!lojas || lojas.length === 0) return NextResponse.json({ ok: true, msg: "Nenhum token encontrado", renovados: [], erros: [] });

  const renovados: string[] = [];
  const erros: string[] = [];

  for (const loja of lojas) {
    if (!loja.ig_access_token) { erros.push(`${loja.nome}: token vazio`); continue; }

    try {
      // Tentar renovar via Instagram Graph API
      const res = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${loja.ig_access_token}`
      );
      const data = await res.json();

      if (data.error || !data.access_token) {
        // Fallback: tentar via Facebook Graph API
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${loja.ig_access_token}`
        );
        const fbData = await fbRes.json();

        if (!fbData.access_token) {
          erros.push(`${loja.nome}: ${data.error?.message || "token não renovado"}`);
          continue;
        }

        // Facebook token renovado
        const expiresAt = new Date(Date.now() + (fbData.expires_in || 5184000) * 1000).toISOString();
        await sb.from("lojas").update({
          ig_access_token: fbData.access_token,
          ig_token_expires_at: expiresAt,
        }).eq("id", loja.id);

        renovados.push(`${loja.nome}: renovado (FB), expira ${new Date(expiresAt).toLocaleDateString("pt-BR")}`);
        continue;
      }

      // Instagram token renovado
      const novoToken = data.access_token;
      const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();

      await sb.from("lojas").update({
        ig_access_token: novoToken,
        ig_token_expires_at: expiresAt,
      }).eq("id", loja.id);

      // Sincronizar com ig_tokens (tabela v1)
      await sb.from("ig_tokens").upsert({
        loja: loja.nome,
        ig_user_id: loja.ig_user_id || "",
        token: novoToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        auto_renewed: true,
        last_renewal: new Date().toISOString(),
      }, { onConflict: "loja" });

      renovados.push(`${loja.nome}: renovado, expira ${new Date(expiresAt).toLocaleDateString("pt-BR")}`);
    } catch (e) {
      erros.push(`${loja.nome}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, renovados, erros });
}

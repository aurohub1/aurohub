export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const GRAPH_URL = "https://graph.facebook.com/v21.0";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const adminUrl = `${baseUrl}/admin/instagram`;

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${adminUrl}?error=oauth_denied`);
  }

  // Decodificar state
  let lojaId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    lojaId = parsed.loja_id;
  } catch {
    return NextResponse.redirect(`${adminUrl}?error=invalid_state`);
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${adminUrl}?error=app_not_configured`);
  }

  const redirectUri = `${baseUrl}/api/instagram/callback`;

  try {
    // 1. Trocar code por short-lived token
    const tokenRes = await fetch(
      `${GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${adminUrl}?error=token_exchange`);
    }

    // 2. Trocar short-lived por long-lived token (60 dias)
    const longRes = await fetch(
      `${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || tokenData.access_token;
    const expiresIn = longData.expires_in || 5184000; // 60 dias default

    // 3. Buscar páginas do usuário
    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(`${adminUrl}?error=no_pages`);
    }

    // 4. Buscar Instagram Business Account de cada página
    let igUserId: string | null = null;
    let pageToken = longToken;

    for (const page of pages) {
      const igRes = await fetch(
        `${GRAPH_URL}/${page.id}?fields=instagram_business_account&access_token=${page.access_token || longToken}`
      );
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id;
        pageToken = page.access_token || longToken;
        break;
      }
    }

    if (!igUserId) {
      return NextResponse.redirect(`${adminUrl}?error=no_ig_business`);
    }

    // 5. Salvar no banco
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);

    const sb = createServerSupabase();
    await sb
      .from("lojas")
      .update({
        ig_user_id: igUserId,
        ig_access_token: pageToken,
        ig_token_expires_at: expires.toISOString(),
      })
      .eq("id", lojaId);

    return NextResponse.redirect(`${adminUrl}?success=connected`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${adminUrl}?error=callback_failed`);
  }
}

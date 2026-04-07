export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  // Verificar autenticação
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const sb = createServerSupabase();
  const { data: user } = await sb.from("usuarios").select("id, tipo").eq("id", token).eq("ativo", true).single();
  if (!user || user.tipo !== "adm") return NextResponse.redirect(new URL("/dashboard", request.url));

  const { searchParams } = new URL(request.url);
  const lojaId = searchParams.get("loja_id");
  if (!lojaId) return NextResponse.json({ error: "loja_id obrigatório" }, { status: 400 });

  const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID não configurado nas variáveis de ambiente" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  // Salvar loja_id no state para recuperar no callback
  const state = Buffer.from(JSON.stringify({ loja_id: lojaId })).toString("base64url");

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement");
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { licensee_id, store_id, image_url, caption, media_type } = await req.json();
    if (!licensee_id || !store_id) {
      return NextResponse.json({ error: "licensee_id e store_id são obrigatórios" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar credenciais Facebook na mesma tabela de credenciais IG
    // Requer colunas fb_page_id e fb_page_access_token em instagram_credentials
    const { data: cred } = await sb
      .from("instagram_credentials")
      .select("fb_page_id, fb_page_access_token")
      .eq("licensee_id", licensee_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (!cred?.fb_page_id || !cred?.fb_page_access_token) {
      return NextResponse.json({ error: "Facebook não configurado para esta loja" }, { status: 404 });
    }

    const { fb_page_id, fb_page_access_token } = cred as { fb_page_id: string; fb_page_access_token: string };
    const isStory = media_type === "STORIES";

    let fbRes: Response;

    if (isStory) {
      // Stories via Pages API (suporte limitado — requer permissão pages_manage_posts
      // e aprovação de produto "Page Stories" no app Facebook)
      const params = new URLSearchParams({ access_token: fb_page_access_token });
      if (image_url) params.set("url", image_url);
      fbRes = await fetch(
        `https://graph.facebook.com/v23.0/${fb_page_id}/photo_stories`,
        { method: "POST", body: params }
      );
    } else {
      // Feed — foto
      const params = new URLSearchParams({
        url: image_url ?? "",
        message: caption ?? "",
        access_token: fb_page_access_token,
      });
      fbRes = await fetch(
        `https://graph.facebook.com/v23.0/${fb_page_id}/photos`,
        { method: "POST", body: params }
      );
    }

    const fbData = await fbRes.json();
    const postId: string | undefined = fbData.id ?? fbData.post_id;
    const logStatus = fbRes.ok && postId ? "published" : "failed";

    try {
      await sb.from("activity_logs").insert({
        event_type: "post_facebook",
        user_id: user.id,
        metadata: {
          licensee_id,
          store_id,
          fb_page_id,
          caption: caption ?? "",
          image_url: image_url ?? null,
          media_type: media_type ?? "IMAGE",
          status: logStatus,
        },
      });
    } catch { /* silent */ }

    if (!fbRes.ok || !postId) {
      return NextResponse.json(
        { error: fbData.error?.message ?? "Falha ao publicar no Facebook", detail: fbData },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, fb_post_id: postId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

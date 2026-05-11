import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notifyPush } from "@/lib/pushNotify";
import crypto from "crypto";
import { decrypt, isEncrypted } from "@/lib/crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publica mídia no Instagram via Graph API.
 * POST { licensee_id, image_url | video_url, caption, store_id?, media_type? }
 *   media_type: "IMAGE" (default) | "REELS" | "STORIES"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licensee_id, image_url, video_url, caption, store_id, media_type, format, user_id } = body as {
      licensee_id: string;
      image_url?: string;
      video_url?: string;
      caption?: string;
      store_id?: string;
      media_type?: "IMAGE" | "REELS" | "STORIES";
      format?: "stories" | "feed" | "reels" | "tv";
      user_id?: string;
    };
    if (!licensee_id || (!image_url && !video_url)) {
      return NextResponse.json({ error: "licensee_id and image_url or video_url required" }, { status: 400 });
    }

    const mediaType = media_type ?? (video_url ? "REELS" : "IMAGE");

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();

    // Access token sempre vem por licensee. IG user id pode vir por store (caso fornecido).
    let credQuery = sb
      .from("instagram_credentials")
      .select("ig_user_id, access_token")
      .eq("licensee_id", licensee_id);

    if (store_id) {
      credQuery = credQuery.eq("store_id", store_id);
    }

    const { data: cred, error: credErr } = await credQuery.single();
    if (credErr || !cred) {
      return NextResponse.json({ error: "Instagram não configurado para este cliente" }, { status: 404 });
    }

    const rawToken = cred.access_token as string;
    const ig = { ig_user_id: cred.ig_user_id, access_token: isEncrypted(rawToken) ? decrypt(rawToken) : rawToken };

    // 1. Criar media container
    const createUrl = `https://graph.instagram.com/v23.0/${ig.ig_user_id}/media`;
    const createParams = new URLSearchParams();
    createParams.set("access_token", ig.access_token);
    createParams.set("caption", caption || "");
    if (mediaType === "IMAGE" && image_url) {
      createParams.set("image_url", image_url);
    } else if (mediaType === "REELS" && video_url) {
      createParams.set("media_type", "REELS");
      createParams.set("video_url", video_url);
    } else if (mediaType === "STORIES") {
      createParams.set("media_type", "STORIES");
      if (video_url) createParams.set("video_url", video_url);
      else if (image_url) createParams.set("image_url", image_url);
    } else {
      return NextResponse.json({ error: "Combinação media_type/url inválida" }, { status: 400 });
    }

    const createRes = await fetch(`${createUrl}?${createParams}`, { method: "POST" });
    if (!createRes.ok) {
      const detail = await createRes.text();
      if (user_id) {
        notifyPush({
          userId: user_id,
          title: "❌ Falha ao publicar",
          body: "Não foi possível criar o container no Instagram.",
          tag: "ig-publish",
        });
      }
      return NextResponse.json({ error: "Falha ao criar container", detail }, { status: 500 });
    }
    const createData = await createRes.json();
    const creationId = createData.id;
    if (!creationId) {
      return NextResponse.json({ error: "container sem id", detail: createData }, { status: 500 });
    }

    // Vídeo: retorna credentials para o client fazer polling de status_code
    if (video_url && (mediaType === "REELS" || mediaType === "STORIES")) {
      try {
        await sb.from("activity_logs").insert({
          event_type: "post_instagram",
          user_id: user?.id ?? user_id ?? null,
          metadata: {
            licensee_id,
            store_id: store_id ?? null,
            image_url: null,
            video_url: video_url ?? null,
            media_type: mediaType,
            format: format ?? null,
            creation_id: creationId,
            caption: caption ?? "",
            source: "central",
            user_id: user?.id ?? user_id ?? null,
            status: "queued",
          },
        });
      } catch { /* silent */ }
      return NextResponse.json({
        success: true,
        queued: true,
        creation_id: creationId,
        ig_user_id: ig.ig_user_id,
        access_token: ig.access_token,
      });
    }

    // Imagem: delay curto + publish síncrono
    await new Promise(r => setTimeout(r, 2000));

    const pubUrl = `https://graph.instagram.com/v23.0/${ig.ig_user_id}/media_publish`;
    const pubParams = new URLSearchParams({
      creation_id: creationId,
      access_token: ig.access_token,
    });
    const pubRes = await fetch(`${pubUrl}?${pubParams}`, { method: "POST" });
    if (!pubRes.ok) {
      const detail = await pubRes.text();
      if (user_id) {
        notifyPush({
          userId: user_id,
          title: "❌ Falha ao publicar",
          body: "Erro ao publicar no Instagram. Veja os detalhes no app.",
          tag: "ig-publish",
        });
      }
      return NextResponse.json({ error: "Falha ao publicar", detail }, { status: 500 });
    }
    const pubData = await pubRes.json();
    const igPostId = pubData.id;

    if (user_id) {
      notifyPush({
        userId: user_id,
        title: "✅ Post publicado",
        body: `Seu ${mediaType === "STORIES" ? "story" : "post"} foi publicado com sucesso.`,
        tag: "ig-publish",
      });
    }

    // Buscar thumbnail do Instagram após publicação bem-sucedida
    let thumbnailUrl: string | null = null;
    try {
      const mediaRes = await fetch(
        `https://graph.instagram.com/${igPostId}?fields=media_url,thumbnail_url,media_type&access_token=${ig.access_token}`
      );
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        thumbnailUrl = mediaData.thumbnail_url ?? mediaData.media_url ?? null;
      }
    } catch { /* silent — thumbnail é best-effort */ }

    try {
      await sb.from("activity_logs").insert({
        event_type: "post_instagram",
        user_id: user?.id ?? user_id ?? null,
        metadata: {
          licensee_id,
          store_id: store_id ?? null,
          image_url: image_url ?? null,
          video_url: video_url ?? null,
          thumbnail_url: thumbnailUrl,
          media_type: mediaType,
          format: format ?? null,
          ig_post_id: igPostId,
          caption: caption ?? "",
          source: "central",
          user_id: user?.id ?? user_id ?? null,
          status: "published",
        },
      });
    } catch { /* silent */ }

    // Deletar imagem do Cloudinary após log (liberação de espaço)
    try {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const key = process.env.CLOUDINARY_API_KEY;
      const secret = process.env.CLOUDINARY_API_SECRET;
      const publicId = image_url
        ?.split("/upload/")[1]
        ?.replace(/^v\d+\//, "")
        ?.replace(/\.[^/.]+$/, "");
      if (publicId && cloud && key && secret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
          .createHash("sha1")
          .update(`public_id=${publicId}&timestamp=${timestamp}${secret}`)
          .digest("hex");
        const fd = new FormData();
        fd.append("public_id", publicId);
        fd.append("api_key", key);
        fd.append("timestamp", String(timestamp));
        fd.append("signature", signature);
        await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
          method: "POST",
          body: fd,
        });
      }
    } catch { /* silent */ }

    return NextResponse.json({ success: true, ig_post_id: igPostId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

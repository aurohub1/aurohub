import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Publica mídia no Instagram via Graph API.
 * POST { licensee_id, image_url | video_url, caption, store_id?, media_type? }
 *   media_type: "IMAGE" (default) | "REELS" | "STORIES"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licensee_id, image_url, video_url, caption, store_id, media_type, format } = body as {
      licensee_id: string;
      image_url?: string;
      video_url?: string;
      caption?: string;
      store_id?: string;
      media_type?: "IMAGE" | "REELS" | "STORIES";
      format?: "stories" | "feed" | "reels" | "tv";
    };
    if (!licensee_id || (!image_url && !video_url)) {
      return NextResponse.json({ error: "licensee_id and image_url or video_url required" }, { status: 400 });
    }

    const mediaType = media_type ?? (video_url ? "REELS" : "IMAGE");

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    const ig = { ig_user_id: cred.ig_user_id, access_token: cred.access_token };

    console.log("[IG Post] video_url enviada:", video_url);
    console.log("[IG Post] image_url enviada:", image_url);
    console.log("[IG Post] media_type:", mediaType);

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
      return NextResponse.json({ error: "Falha ao criar container", detail }, { status: 500 });
    }
    const createData = await createRes.json();
    const creationId = createData.id;
    if (!creationId) {
      return NextResponse.json({ error: "container sem id", detail: createData }, { status: 500 });
    }

    // Para vídeos (REELS/STORIES com video_url): polling do status_code até FINISHED
    // Para imagens: delay curto é suficiente
    if (video_url && (mediaType === "REELS" || mediaType === "STORIES")) {
      const statusUrl = `https://graph.instagram.com/v23.0/${creationId}`;
      const maxAttempts = 12; // 12 × 10s = 120s
      let ready = false;
      let lastStatus = "";
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 10000));
        const statusRes = await fetch(`${statusUrl}?fields=status_code&access_token=${encodeURIComponent(ig.access_token)}`);
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();
        lastStatus = statusData.status_code || "";
        if (lastStatus === "FINISHED") { ready = true; break; }
        if (lastStatus === "ERROR" || lastStatus === "EXPIRED") {
          return NextResponse.json({ error: "Container falhou no Instagram", detail: statusData, status_code: lastStatus }, { status: 500 });
        }
      }
      if (!ready) {
        return NextResponse.json({ error: "Timeout processando vídeo (120s)", status_code: lastStatus }, { status: 504 });
      }
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }

    // 2. Publicar
    const pubUrl = `https://graph.instagram.com/v23.0/${ig.ig_user_id}/media_publish`;
    const pubParams = new URLSearchParams({
      creation_id: creationId,
      access_token: ig.access_token,
    });
    const pubRes = await fetch(`${pubUrl}?${pubParams}`, { method: "POST" });
    if (!pubRes.ok) {
      const detail = await pubRes.text();
      return NextResponse.json({ error: "Falha ao publicar", detail }, { status: 500 });
    }
    const pubData = await pubRes.json();
    const igPostId = pubData.id;

    // 3. Log em activity_logs (best-effort)
    try {
      await sb.from("activity_logs").insert({
        event_type: "post_instagram",
        metadata: {
          licensee_id,
          store_id,
          image_url: image_url ?? null,
          video_url: video_url ?? null,
          media_type: mediaType,
          format: format ?? null,
          ig_post_id: igPostId,
          caption: caption ?? "",
          source: "central",
        },
      });
    } catch { /* silent */ }

    return NextResponse.json({ success: true, ig_post_id: igPostId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

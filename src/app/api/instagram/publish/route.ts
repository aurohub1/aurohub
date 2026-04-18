import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyPush } from "@/lib/pushNotify";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/instagram/publish
 * body: { creation_id, ig_user_id, access_token, licensee_id?, store_id?, video_url?, media_type?, format?, caption? }
 * Publica o container já processado (FINISHED) e registra em activity_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creation_id, ig_user_id, access_token,
      licensee_id, store_id, video_url, media_type, format, caption, user_id,
    } = body as {
      creation_id: string;
      ig_user_id: string;
      access_token: string;
      licensee_id?: string;
      store_id?: string;
      video_url?: string;
      media_type?: string;
      format?: string;
      caption?: string;
      user_id?: string;
    };

    if (!creation_id || !ig_user_id || !access_token) {
      return NextResponse.json({ error: "creation_id, ig_user_id, access_token required" }, { status: 400 });
    }

    const pubRes = await fetch(
      `https://graph.instagram.com/v23.0/${ig_user_id}/media_publish?creation_id=${creation_id}&access_token=${encodeURIComponent(access_token)}`,
      { method: "POST" }
    );
    const pubData = await pubRes.json();
    if (!pubRes.ok || !pubData.id) {
      if (user_id) {
        notifyPush({
          userId: user_id,
          title: "❌ Falha ao publicar vídeo",
          body: "O vídeo foi processado mas não pôde ser publicado.",
          tag: "ig-publish",
        });
      }
      return NextResponse.json({ error: "Falha ao publicar", detail: pubData }, { status: 500 });
    }

    if (user_id) {
      notifyPush({
        userId: user_id,
        title: "✅ Vídeo publicado",
        body: "Seu reels/story foi publicado no Instagram.",
        tag: "ig-publish",
      });
    }

    // Log best-effort
    if (licensee_id) {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      try {
        await sb.from("activity_logs").insert({
          event_type: "post_instagram",
          metadata: {
            licensee_id,
            store_id,
            video_url: video_url ?? null,
            media_type: media_type ?? "REELS",
            format: format ?? null,
            ig_post_id: pubData.id,
            caption: caption ?? "",
            source: "client-poll",
          },
        });
      } catch { /* silent */ }
    }

    return NextResponse.json({ success: true, ig_post_id: pubData.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}

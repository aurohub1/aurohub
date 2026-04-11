import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publica uma imagem no Instagram via Graph API.
 * POST { licensee_id, image_url, caption, store_id? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licensee_id, image_url, caption, store_id } = body as {
      licensee_id: string;
      image_url: string;
      caption?: string;
      store_id?: string;
    };
    if (!licensee_id || !image_url) {
      return NextResponse.json({ error: "licensee_id and image_url required" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Access token sempre vem por licensee. IG user id pode vir por store (caso fornecido).
    const { data: cred, error: credErr } = await sb
      .from("instagram_credentials")
      .select("ig_user_id, access_token")
      .eq("licensee_id", licensee_id)
      .single();
    if (credErr || !cred) {
      return NextResponse.json({ error: "Instagram não configurado para este cliente" }, { status: 404 });
    }

    let igUserId: string = cred.ig_user_id;
    if (store_id) {
      const { data: storeRow } = await sb
        .from("stores")
        .select("ig_user_id")
        .eq("id", store_id)
        .single();
      const storeIg = (storeRow as { ig_user_id?: string | null } | null)?.ig_user_id;
      if (storeIg) igUserId = storeIg;
    }
    const ig = { ig_user_id: igUserId, access_token: cred.access_token };

    // 1. Criar media container
    const createUrl = `https://graph.instagram.com/v23.0/${ig.ig_user_id}/media`;
    const createParams = new URLSearchParams({
      image_url,
      caption: caption || "",
      access_token: ig.access_token,
    });
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
        metadata: { licensee_id, store_id, image_url, ig_post_id: igPostId },
      });
    } catch { /* silent */ }

    return NextResponse.json({ success: true, ig_post_id: igPostId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

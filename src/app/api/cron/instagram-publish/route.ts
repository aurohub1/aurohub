import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: processa fila instagram_publish_queue.
 * Para cada pending, checa status_code via Graph API.
 * Se FINISHED → media_publish + status="published"
 * Se ERROR/EXPIRED → status="error"
 * Protegido por CRON_SECRET via header Authorization: Bearer {secret}
 */
export async function GET(req: NextRequest) {
  // Validação do cron secret (Vercel Cron envia automaticamente)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pending } = await sb
    .from("instagram_publish_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(20);

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results: Array<{ id: string; status: string; detail?: string }> = [];

  for (const item of pending) {
    try {
      // Checa status do container
      const statusRes = await fetch(
        `https://graph.instagram.com/v23.0/${item.creation_id}?fields=status_code&access_token=${encodeURIComponent(item.access_token)}`
      );
      const statusData = await statusRes.json();
      const status_code: string = statusData.status_code || "";

      if (status_code === "ERROR" || status_code === "EXPIRED") {
        await sb.from("instagram_publish_queue").update({
          status: "error",
          error_detail: JSON.stringify(statusData),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        results.push({ id: item.id, status: "error", detail: status_code });
        continue;
      }

      if (status_code !== "FINISHED") {
        // Ainda processando — mantém pending, incrementa attempts
        await sb.from("instagram_publish_queue").update({
          attempts: (item.attempts || 0) + 1,
          last_status_code: status_code,
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);

        // Timeout: >20 tentativas (~10 min) e ainda não finalizou
        if ((item.attempts || 0) >= 20) {
          await sb.from("instagram_publish_queue").update({
            status: "error",
            error_detail: `Timeout: ${status_code} após 20 tentativas`,
          }).eq("id", item.id);
        }
        results.push({ id: item.id, status: "pending", detail: status_code });
        continue;
      }

      // FINISHED → publica
      const pubRes = await fetch(
        `https://graph.instagram.com/v23.0/${item.ig_user_id}/media_publish?creation_id=${item.creation_id}&access_token=${encodeURIComponent(item.access_token)}`,
        { method: "POST" }
      );
      const pubData = await pubRes.json();
      if (!pubRes.ok || !pubData.id) {
        await sb.from("instagram_publish_queue").update({
          status: "error",
          error_detail: JSON.stringify(pubData),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        results.push({ id: item.id, status: "error", detail: "publish failed" });
        continue;
      }

      // Sucesso
      await sb.from("instagram_publish_queue").update({
        status: "published",
        ig_post_id: pubData.id,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);

      // Log activity
      await sb.from("activity_logs").insert({
        event_type: "post_instagram",
        metadata: {
          licensee_id: item.licensee_id,
          store_id: item.store_id,
          video_url: item.video_url,
          media_type: item.media_type,
          format: item.format,
          ig_post_id: pubData.id,
          caption: item.caption,
          source: "cron-queue",
        },
      });

      results.push({ id: item.id, status: "published" });
    } catch (err) {
      results.push({ id: item.id, status: "error", detail: err instanceof Error ? err.message : "unknown" });
    }
  }

  return NextResponse.json({ processed: pending.length, results });
}

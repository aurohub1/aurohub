import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/*
 * Cloudinary Webhook — sincroniza pasta IMG/áleatorio com tabela imgfundo.
 *
 * SETUP NO CLOUDINARY:
 *   Dashboard → Settings → Notifications → Add Notification URL:
 *     https://app.aurovista.com.br/api/cloudinary/webhook
 *   Events a ativar: Upload completed, Resource deleted
 *
 * ENV VARS:
 *   CLOUDINARY_WEBHOOK_SECRET  — secret gerado pelo Cloudinary no painel
 *                                (Settings → Notifications → "signing secret")
 *                                Se não definido, usa CLOUDINARY_API_SECRET.
 */

const CLOUD        = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "dxgj4bcch";
const TARGET_FOLDER = "IMG/áleatorio";

function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.CLOUDINARY_WEBHOOK_SECRET ?? process.env.CLOUDINARY_API_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const expected = crypto
    .createHash("sha1")
    .update(rawBody + timestamp + secret)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function buildSecureUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${publicId}`;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-cld-timestamp") ?? "";
  const signature = req.headers.get("x-cld-signature") ?? "";

  if (!verifySignature(rawBody, timestamp, signature)) {
    console.warn("[cloudinary/webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const type = payload.notification_type as string;

  /* ── Upload ─────────────────────────────────────────── */
  if (type === "upload") {
    const publicId = payload.public_id as string;

    if (!publicId?.startsWith(TARGET_FOLDER + "/")) {
      return NextResponse.json({ ok: true, skipped: "not target folder" });
    }

    const secureUrl = (payload.secure_url as string) || buildSecureUrl(publicId);
    const filename  = publicId.split("/").pop() ?? publicId;

    const { error } = await sb.from("imgfundo").insert({
      url:       secureUrl,
      public_id: publicId,
      nome:      filename.toUpperCase(),
      tipo:      "card",
      formato:   "stories",
      form_type: "todos",
    });

    if (error) {
      console.error("[cloudinary/webhook] insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[cloudinary/webhook] inserted:", publicId);
    return NextResponse.json({ ok: true, action: "inserted", public_id: publicId });
  }

  /* ── Delete ─────────────────────────────────────────── */
  if (type === "deleted") {
    // payload.deleted = { "public_id": "deleted", ... }
    const deleted = payload.deleted as Record<string, unknown> | undefined;
    if (!deleted) return NextResponse.json({ ok: true, skipped: "no deleted map" });

    const targets = Object.keys(deleted).filter((id) =>
      id.startsWith(TARGET_FOLDER + "/")
    );

    if (!targets.length) {
      return NextResponse.json({ ok: true, skipped: "not target folder" });
    }

    let deletedCount = 0;
    for (const publicId of targets) {
      // Match por public_id (preferido) ou url como fallback
      const { error, count } = await sb
        .from("imgfundo")
        .delete({ count: "exact" })
        .eq("public_id", publicId);

      if (error) {
        console.error("[cloudinary/webhook] delete error:", publicId, error.message);
      } else if (!count) {
        // Fallback por url (imagens inseridas sem public_id)
        await sb.from("imgfundo").delete().eq("url", buildSecureUrl(publicId));
      }
      deletedCount++;
    }

    console.log("[cloudinary/webhook] deleted:", targets);
    return NextResponse.json({ ok: true, action: "deleted", count: deletedCount });
  }

  return NextResponse.json({ ok: true, skipped: `unhandled type: ${type}` });
}

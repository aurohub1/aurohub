import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Gera assinatura para upload direto ao Cloudinary pelo browser.
 * POST { folder?: string }
 * Retorna: { signature, timestamp, api_key, cloud_name }
 */
export async function POST(req: NextRequest) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const folder: string = body?.folder || "aurohubv2/publicacoes";
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(paramsToSign + secret).digest("hex");

    return NextResponse.json({ signature, timestamp, api_key: key, cloud_name: cloud, folder });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

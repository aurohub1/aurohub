import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Upload assinado para Cloudinary.
 * POST { dataUrl: string, folder?: string }
 * Retorna: { secure_url, public_id }
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
    const dataUrl: string | undefined = body?.dataUrl;
    const folder: string = body?.folder || "aurohubv2/publicacoes";
    if (!dataUrl) return NextResponse.json({ error: "dataUrl required" }, { status: 400 });

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(paramsToSign + secret).digest("hex");

    const fd = new FormData();
    fd.append("file", dataUrl);
    fd.append("api_key", key);
    fd.append("timestamp", String(timestamp));
    fd.append("folder", folder);
    fd.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "Upload failed", detail }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ secure_url: data.secure_url, public_id: data.public_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

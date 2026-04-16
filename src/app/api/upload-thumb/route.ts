import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
  }

  try {
    const { dataUrl, folder = "aurohubv2/thumbs" } = await req.json();
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
    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

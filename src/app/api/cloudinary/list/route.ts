import { NextRequest, NextResponse } from "next/server";

/**
 * Lista recursos do Cloudinary via Admin API.
 * GET /api/cloudinary/list?folder=aurohubv2/logos&q=marca
 * Retorna: { resources: [{ public_id, secure_url, width, height, filename }] }
 */
export async function GET(req: NextRequest) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "aurohubv2";
  const q = searchParams.get("q") || "";

  // Admin Search API
  const expression = q
    ? `folder:${folder}/* AND filename:*${q}*`
    : `folder:${folder}/*`;

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/search`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expression, max_results: 60, sort_by: [{ created_at: "desc" }] }),
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: "Cloudinary search failed", detail: txt }, { status: res.status });
    }
    const data = await res.json();
    const resources = (data.resources || []).map((r: { public_id: string; secure_url: string; width: number; height: number; filename?: string }) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      width: r.width,
      height: r.height,
      filename: r.filename || r.public_id.split("/").pop() || "",
    }));
    return NextResponse.json({ resources });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

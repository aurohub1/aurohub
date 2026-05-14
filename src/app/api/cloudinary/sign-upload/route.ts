import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * Gera assinatura para upload direto de vídeos ao Cloudinary pelo browser.
 * POST { folder?, resource_type? }
 * Retorna: { signature, timestamp, api_key, cloud_name, folder, resource_type }
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const folder: string = body?.folder || "aurohubv2/reels";
    const resource_type: string = body?.resource_type || "video";
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(paramsToSign + secret).digest("hex");

    return NextResponse.json({ signature, timestamp, api_key: key, cloud_name: cloud, folder, resource_type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary não configurado" }, { status: 500 });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?prefix=aurohub&max_results=50&type=upload`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const data = await res.json();

    const images = (data.resources || []).map((r: { secure_url: string; public_id: string; width: number; height: number; created_at: string }) => ({
      url: r.secure_url,
      id: r.public_id,
      width: r.width,
      height: r.height,
      created: r.created_at,
    }));

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar imagens" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.panrotas.com.br%2Ffeed%2F&count=5",
      { next: { revalidate: 3600 } }
    );
    console.log("[noticias] status:", res.status);
    const data = await res.json();
    console.log("[noticias] items:", data.items?.length, "status:", data.status);
    if (data.items?.length) {
      return NextResponse.json(
        data.items.slice(0, 5).map((i: { title: string; link: string }) => ({
          title: i.title,
          url: i.link,
        }))
      );
    }
  } catch (err) {
    console.error("[noticias] erro:", err);
  }
  return NextResponse.json([]);
}

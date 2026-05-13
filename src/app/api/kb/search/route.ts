import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface RawArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  times_used: number;
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "3"), 10);

    const sb = adminDb();
    const { data: articles } = await sb
      .from("knowledge_base")
      .select("id, title, content, category, tags, times_used")
      .eq("is_active", true);

    if (!articles || articles.length === 0) return NextResponse.json([]);

    const scored = (articles as RawArticle[]).map((a) => {
      let score = 0;
      if (q) {
        if (a.title.toLowerCase().includes(q)) score += 3;
        if (a.tags.some((t) => t.toLowerCase().includes(q))) score += 2;
        if (a.content.toLowerCase().includes(q)) score += 1;
      }
      return { ...a, score };
    });

    const filtered = q ? scored.filter((a) => a.score > 0) : scored;
    filtered.sort((a, b) => b.score - a.score || b.times_used - a.times_used);
    const top = filtered.slice(0, limit);

    // Increment times_used for returned articles
    for (const art of top) {
      await sb
        .from("knowledge_base")
        .update({ times_used: art.times_used + 1 })
        .eq("id", art.id);
    }

    return NextResponse.json(
      top.map(({ times_used, ...rest }) => ({ ...rest, times_used: times_used + 1 })),
    );
  } catch (e) {
    console.error("[KB/search]", e);
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}

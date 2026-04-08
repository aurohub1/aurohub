export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo").eq("id", token).eq("ativo", true).single();
  return data;
}

// GET /api/instagram/metrics?loja_id=xxx&period=7|15|30|90
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lojaId = searchParams.get("loja_id");
  const period = parseInt(searchParams.get("period") || "30");

  if (!lojaId) return NextResponse.json({ error: "loja_id obrigatório" }, { status: 400 });

  const sb = createServerSupabase();

  // Buscar token da loja
  const { data: loja } = await sb
    .from("lojas")
    .select("id, nome, ig_user_id, ig_access_token")
    .eq("id", lojaId)
    .single();

  if (!loja || !loja.ig_access_token || !loja.ig_user_id) {
    return NextResponse.json({ error: "Loja sem Instagram conectado" }, { status: 400 });
  }

  try {
    const token = loja.ig_access_token;
    const igUserId = loja.ig_user_id;

    // 1. Account stats
    const meRes = await fetch(
      `https://graph.instagram.com/v20.0/${igUserId}?fields=id,username,followers_count,media_count,biography&access_token=${token}`
    );
    const meData = await meRes.json();

    if (meData.error) {
      return NextResponse.json({ error: meData.error.message }, { status: 400 });
    }

    // 2. Recent media (últimos 50 posts)
    const mediaRes = await fetch(
      `https://graph.instagram.com/v20.0/${igUserId}/media?fields=id,media_type,timestamp,like_count,comments_count,caption,thumbnail_url,media_url&limit=50&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    const posts = (mediaData.data || []).filter((p: { timestamp: string }) => {
      const postDate = new Date(p.timestamp);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);
      return postDate >= cutoff;
    });

    // 3. Calcular métricas
    const totalLikes = posts.reduce((s: number, p: { like_count?: number }) => s + (p.like_count || 0), 0);
    const totalComments = posts.reduce((s: number, p: { comments_count?: number }) => s + (p.comments_count || 0), 0);
    const totalEngagement = totalLikes + totalComments;
    const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;
    const engagementRate = meData.followers_count > 0
      ? ((totalEngagement / posts.length) / meData.followers_count * 100).toFixed(2)
      : "0";

    // 4. Engajamento por dia
    const byDay: Record<string, { likes: number; comments: number; count: number }> = {};
    for (const p of posts) {
      const day = new Date(p.timestamp).toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { likes: 0, comments: 0, count: 0 };
      byDay[day].likes += p.like_count || 0;
      byDay[day].comments += p.comments_count || 0;
      byDay[day].count++;
    }

    // 5. Por tipo de mídia
    const byType: Record<string, { count: number; likes: number; comments: number }> = {};
    for (const p of posts) {
      const type = p.media_type || "IMAGE";
      if (!byType[type]) byType[type] = { count: 0, likes: 0, comments: 0 };
      byType[type].count++;
      byType[type].likes += p.like_count || 0;
      byType[type].comments += p.comments_count || 0;
    }

    // 6. Top posts
    const topPosts = [...posts]
      .sort((a: { like_count?: number; comments_count?: number }, b: { like_count?: number; comments_count?: number }) =>
        ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0))
      )
      .slice(0, 10);

    // 7. Cache no Supabase
    await sb.from("ig_metrics_cache").upsert({
      loja_id: lojaId,
      loja: loja.nome,
      followers: meData.followers_count || 0,
      posts_data: posts,
      fetched_at: new Date().toISOString(),
    }, { onConflict: "loja_id" });

    return NextResponse.json({
      account: {
        username: meData.username,
        followers: meData.followers_count || 0,
        media_count: meData.media_count || 0,
        biography: meData.biography || "",
      },
      metrics: {
        period,
        total_posts: posts.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_engagement: avgEngagement,
        engagement_rate: parseFloat(engagementRate),
      },
      by_day: byDay,
      by_type: byType,
      top_posts: topPosts,
    });
  } catch (err) {
    console.error("Instagram metrics error:", err);
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sb = createServerSupabase();

  const { data: user } = await sb
    .from("usuarios")
    .select("id, tipo, marca_id, loja_id")
    .eq("id", token)
    .eq("ativo", true)
    .single();

  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  // Período
  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") || "30d";
  const dias = periodo === "7d" ? 7 : periodo === "90d" ? 90 : 30;

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  desde.setHours(0, 0, 0, 0);

  // 1. Todas as postagens do período
  let postsQuery = sb
    .from("postagens")
    .select("id, formato, status, created_at, usuario_id, publicado_em, erro_msg")
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: true });

  // Filtro de hierarquia
  if (user.tipo === "loja" || user.tipo === "cliente") {
    postsQuery = postsQuery.eq("loja_id", user.loja_id);
  }

  const { data: posts } = await postsQuery;

  const allPosts = posts || [];

  // 2. Cards de stats
  const totalPosts = allPosts.length;
  const publicados = allPosts.filter(p => p.status === "publicado").length;
  const agendados = allPosts.filter(p => p.status === "agendado").length;
  const erros = allPosts.filter(p => p.status === "erro").length;
  const rascunhos = allPosts.filter(p => p.status === "rascunho").length;
  const taxaSucesso = totalPosts > 0
    ? ((publicados / (publicados + erros || 1)) * 100).toFixed(1)
    : "100.0";

  // 3. Chart — posts por dia agrupados por status
  const chartDays: { data: string; publicado: number; agendado: number; erro: number; rascunho: number }[] = [];
  for (let i = 0; i < dias; i++) {
    const day = new Date();
    day.setDate(day.getDate() - (dias - 1) + i);
    const dayStr = day.toISOString().slice(0, 10);
    const dayPosts = allPosts.filter(p => p.created_at?.slice(0, 10) === dayStr);
    chartDays.push({
      data: dayStr,
      publicado: dayPosts.filter(p => p.status === "publicado").length,
      agendado: dayPosts.filter(p => p.status === "agendado").length,
      erro: dayPosts.filter(p => p.status === "erro").length,
      rascunho: dayPosts.filter(p => p.status === "rascunho").length,
    });
  }

  // 4. Breakdown por formato
  const formatos: Record<string, number> = { stories: 0, feed: 0, reels: 0, transmissao: 0 };
  for (const p of allPosts) {
    const f = p.formato?.toLowerCase() || "";
    if (f in formatos) formatos[f]++;
  }

  // 5. Top usuários (ranking por posts)
  const userCounts: Record<string, number> = {};
  for (const p of allPosts) {
    if (p.usuario_id) userCounts[p.usuario_id] = (userCounts[p.usuario_id] || 0) + 1;
  }

  const topUserIds = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  let topUsers: { nome: string; total: number; publicados: number }[] = [];
  if (topUserIds.length > 0) {
    const { data: usersData } = await sb
      .from("usuarios")
      .select("id, nome")
      .in("id", topUserIds);

    const nameMap = Object.fromEntries((usersData || []).map(u => [u.id, u.nome]));

    topUsers = topUserIds.map(id => ({
      nome: nameMap[id] || "Usuário",
      total: userCounts[id],
      publicados: allPosts.filter(p => p.usuario_id === id && p.status === "publicado").length,
    }));
  }

  // 6. Horários mais ativos (hora do dia)
  const horasPublicacao: number[] = new Array(24).fill(0);
  for (const p of allPosts) {
    if (p.status === "publicado" && p.publicado_em) {
      const hora = new Date(p.publicado_em).getHours();
      horasPublicacao[hora]++;
    }
  }

  // 7. Últimos erros
  const ultimosErros = allPosts
    .filter(p => p.status === "erro" && p.erro_msg)
    .slice(-5)
    .reverse()
    .map(p => ({
      formato: p.formato,
      erro: (p.erro_msg as string).slice(0, 100),
      data: p.created_at,
    }));

  return NextResponse.json({
    periodo: { dias, desde: desde.toISOString() },
    stats: { totalPosts, publicados, agendados, erros, rascunhos, taxaSucesso },
    chart: chartDays,
    formatos,
    topUsers,
    horasPublicacao,
    ultimosErros,
  });
}

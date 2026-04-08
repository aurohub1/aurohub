export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
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

  // Stats
  const { count: totalUsuarios } = await sb
    .from("usuarios")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { count: postsHoje } = await sb
    .from("postagens")
    .select("*", { count: "exact", head: true })
    .gte("created_at", hoje.toISOString());

  const { count: totalPosts } = await sb
    .from("postagens")
    .select("*", { count: "exact", head: true });

  const { count: postsPublicados } = await sb
    .from("postagens")
    .select("*", { count: "exact", head: true })
    .eq("status", "publicado");

  // Lojas com token IG ativo
  const { count: lojasComIG } = await sb
    .from("lojas")
    .select("*", { count: "exact", head: true })
    .eq("ativa", true)
    .not("ig_access_token", "is", null);

  const { count: totalLojas } = await sb
    .from("lojas")
    .select("*", { count: "exact", head: true })
    .eq("ativa", true);

  // Uso por formato
  const { data: formatData } = await sb
    .from("postagens")
    .select("formato");

  const formatCount: Record<string, number> = { stories: 0, feed: 0, reels: 0, transmissao: 0 };
  if (formatData) {
    for (const p of formatData) {
      const f = p.formato?.toLowerCase() || "";
      if (f in formatCount) formatCount[f]++;
    }
  }

  // Posts dos últimos 30 dias (para gráfico)
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);

  const { data: recentPosts } = await sb
    .from("postagens")
    .select("created_at")
    .gte("created_at", d30.toISOString())
    .order("created_at", { ascending: true });

  // Agrupar por dia
  const chart: number[] = [];
  for (let i = 0; i < 30; i++) {
    const day = new Date();
    day.setDate(day.getDate() - 29 + i);
    const dayStr = day.toISOString().slice(0, 10);
    const count = recentPosts?.filter(p => p.created_at?.slice(0, 10) === dayStr).length || 0;
    chart.push(count);
  }

  // Atividade recente
  const { data: recentActivity } = await sb
    .from("log_atividades")
    .select("acao, formato, detalhes, created_at, usuario_id")
    .order("created_at", { ascending: false })
    .limit(10);

  // Enriquecer com nomes
  const activity = [];
  if (recentActivity && recentActivity.length > 0) {
    const userIds = [...new Set(recentActivity.map(a => a.usuario_id))];
    const { data: actUsers } = await sb
      .from("usuarios")
      .select("id, nome")
      .in("id", userIds);

    const nameMap = Object.fromEntries((actUsers || []).map(u => [u.id, u.nome]));

    for (const a of recentActivity) {
      activity.push({
        user: nameMap[a.usuario_id] || "Sistema",
        action: a.acao,
        formato: a.formato,
        time: a.created_at,
      });
    }
  }

  // Se não tem atividade no log, pegar últimas postagens como fallback
  if (activity.length === 0) {
    const { data: recentPostagens } = await sb
      .from("postagens")
      .select("formato, status, created_at, usuario_id, legenda")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentPostagens) {
      const userIds = [...new Set(recentPostagens.map(p => p.usuario_id))];
      const { data: postUsers } = await sb
        .from("usuarios")
        .select("id, nome")
        .in("id", userIds.length > 0 ? userIds : ["_"]);

      const nameMap = Object.fromEntries((postUsers || []).map(u => [u.id, u.nome]));

      for (const p of recentPostagens) {
        const statusLabel = p.status === "publicado" ? "Publicou" : p.status === "agendado" ? "Agendou" : "Criou rascunho";
        activity.push({
          user: nameMap[p.usuario_id] || "Usuário",
          action: `${statusLabel} — ${p.formato}${p.legenda ? ` · ${p.legenda.slice(0, 40)}` : ""}`,
          formato: p.formato,
          time: p.created_at,
        });
      }
    }
  }

  // MRR (receita recorrente mensal) — soma valor_mensalidade de marcas ativas
  const { data: marcasAtivas } = await sb
    .from("marcas")
    .select("id, valor_mensalidade")
    .eq("status", "ativo");

  const mrr = (marcasAtivas || []).reduce((sum, m) => sum + (parseFloat(m.valor_mensalidade) || 0), 0);
  const clientesAtivos = marcasAtivas?.length || 0;

  // Tokens com alerta de expiração (< 15 dias)
  const d15 = new Date();
  d15.setDate(d15.getDate() + 15);
  const { data: tokensExpirando } = await sb
    .from("lojas")
    .select("id, nome, ig_token_expires_at")
    .eq("ativa", true)
    .not("ig_access_token", "is", null)
    .lt("ig_token_expires_at", d15.toISOString());

  // Notificações não lidas
  const { count: notificacoesNaoLidas } = await sb
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("lida", false);

  // Usuários online (últimos 5 minutos)
  const d5min = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: onlineUsers } = await sb
    .from("usuarios_online")
    .select("nome, loja, pagina, ultimo_ping")
    .gte("ultimo_ping", d5min);

  // Agendamentos pendentes
  const { count: agendamentosPendentes } = await sb
    .from("postagens")
    .select("*", { count: "exact", head: true })
    .eq("status", "agendado");

  return NextResponse.json({
    stats: {
      usuarios_ativos: totalUsuarios || 0,
      clientes_ativos: clientesAtivos,
      posts_hoje: postsHoje || 0,
      total_posts: totalPosts || 0,
      posts_publicados: postsPublicados || 0,
      lojas_com_ig: lojasComIG || 0,
      total_lojas: totalLojas || 0,
      mrr,
      notificacoes_nao_lidas: notificacoesNaoLidas || 0,
      agendamentos_pendentes: agendamentosPendentes || 0,
    },
    tokens_expirando: (tokensExpirando || []).map(t => ({
      nome: t.nome,
      dias: Math.ceil((new Date(t.ig_token_expires_at).getTime() - Date.now()) / 86400000),
    })),
    online: onlineUsers || [],
    formatos: formatCount,
    chart,
    activity,
  });
}

import { createServerSupabase } from "./supabase";

export interface CotaStatus {
  permitido: boolean;
  motivo?: string;
  uso: {
    posts_pontos: number; // Feed=1pt, Reels=2pts
    posts_limite: number;
    stories_usados: number;
    stories_limite: number;
    pack_creditos_restantes: number;
  };
  plano: {
    nome: string;
    slug: string;
    inclui_transmissao: boolean;
    inclui_agendamento: boolean;
  } | null;
}

/**
 * Calcula pontos consumidos por formato.
 * Feed = 1 ponto, Reels = 2 pontos, Stories = contagem separada.
 */
function calcularPontos(formato: string): { tipo: "posts" | "stories"; pontos: number } {
  if (formato === "stories") return { tipo: "stories", pontos: 1 };
  if (formato === "reels") return { tipo: "posts", pontos: 2 };
  return { tipo: "posts", pontos: 1 }; // feed
}

/**
 * Verifica se o usuário pode publicar no formato solicitado.
 * ADM raiz não tem limites.
 */
export async function verificarCota(
  usuario_id: string,
  loja_id: string,
  formato: string
): Promise<CotaStatus> {
  const sb = createServerSupabase();

  // 1. Buscar usuário com plano
  const { data: usuario } = await sb
    .from("usuarios")
    .select("id, tipo, plano")
    .eq("id", usuario_id)
    .single();

  if (!usuario) {
    return {
      permitido: false,
      motivo: "Usuário não encontrado",
      uso: { posts_pontos: 0, posts_limite: 0, stories_usados: 0, stories_limite: 0, pack_creditos_restantes: 0 },
      plano: null,
    };
  }

  // ADM raiz sem marca_id = sem limites
  if (usuario.tipo === "adm") {
    return {
      permitido: true,
      uso: { posts_pontos: 0, posts_limite: 9999, stories_usados: 0, stories_limite: 9999, pack_creditos_restantes: 0 },
      plano: { nome: "Admin", slug: "admin", inclui_transmissao: true, inclui_agendamento: true },
    };
  }

  // 2. Buscar plano
  let plano = null;
  if (usuario.plano) {
    const { data } = await sb
      .from("planos")
      .select("*")
      .eq("slug", usuario.plano)
      .eq("ativo", true)
      .single();
    plano = data;
  }

  if (!plano) {
    return {
      permitido: false,
      motivo: "Nenhum plano ativo associado ao usuário",
      uso: { posts_pontos: 0, posts_limite: 0, stories_usados: 0, stories_limite: 0, pack_creditos_restantes: 0 },
      plano: null,
    };
  }

  // 3. TV — verificar se plano permite (download only, antigo "transmissão")
  if (formato === "tv") {
    return {
      permitido: plano.inclui_transmissao,
      motivo: plano.inclui_transmissao ? undefined : "Seu plano não inclui TV",
      uso: { posts_pontos: 0, posts_limite: plano.limite_posts, stories_usados: 0, stories_limite: plano.limite_stories, pack_creditos_restantes: 0 },
      plano: { nome: plano.nome, slug: plano.slug, inclui_transmissao: plano.inclui_transmissao, inclui_agendamento: plano.inclui_agendamento },
    };
  }

  // 4. Contar uso do mês atual (por loja)
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data: postsDoMes } = await sb
    .from("postagens")
    .select("formato")
    .eq("loja_id", loja_id)
    .in("status", ["publicado", "agendado"])
    .gte("created_at", inicioMes.toISOString());

  let postsPoints = 0;
  let storiesCount = 0;

  for (const p of postsDoMes || []) {
    const { tipo, pontos } = calcularPontos(p.formato);
    if (tipo === "posts") postsPoints += pontos;
    else storiesCount += pontos;
  }

  // 5. Verificar packs ativos do usuário
  const { data: packs } = await sb
    .from("packs")
    .select("creditos_total, creditos_usados")
    .eq("usuario_id", usuario_id)
    .eq("ativo", true)
    .gt("validade", new Date().toISOString());

  let packCreditos = 0;
  for (const pack of packs || []) {
    packCreditos += pack.creditos_total - pack.creditos_usados;
  }

  // 6. Verificar se pode publicar
  const { tipo, pontos } = calcularPontos(formato);

  const uso = {
    posts_pontos: postsPoints,
    posts_limite: plano.limite_posts,
    stories_usados: storiesCount,
    stories_limite: plano.limite_stories,
    pack_creditos_restantes: packCreditos,
  };

  const planoInfo = {
    nome: plano.nome,
    slug: plano.slug,
    inclui_transmissao: plano.inclui_transmissao,
    inclui_agendamento: plano.inclui_agendamento,
  };

  if (tipo === "stories") {
    const excedeu = storiesCount + pontos > plano.limite_stories;
    if (excedeu && packCreditos >= pontos) {
      // Pode usar pack
      return { permitido: true, uso, plano: planoInfo };
    }
    if (excedeu) {
      return {
        permitido: false,
        motivo: `Limite de Stories atingido (${storiesCount}/${plano.limite_stories})`,
        uso,
        plano: planoInfo,
      };
    }
  } else {
    const excedeu = postsPoints + pontos > plano.limite_posts;
    if (excedeu && packCreditos >= pontos) {
      return { permitido: true, uso, plano: planoInfo };
    }
    if (excedeu) {
      return {
        permitido: false,
        motivo: `Limite de Feed/Reels atingido (${postsPoints}/${plano.limite_posts} pontos)`,
        uso,
        plano: planoInfo,
      };
    }
  }

  return { permitido: true, uso, plano: planoInfo };
}

/**
 * Deduz créditos do pack mais antigo ativo (FIFO).
 * Retorna true se conseguiu deduzir.
 */
export async function deduzirPack(usuario_id: string, pontos: number): Promise<boolean> {
  const sb = createServerSupabase();

  const { data: packs } = await sb
    .from("packs")
    .select("id, creditos_total, creditos_usados")
    .eq("usuario_id", usuario_id)
    .eq("ativo", true)
    .gt("validade", new Date().toISOString())
    .order("created_at", { ascending: true }); // FIFO

  let restante = pontos;
  for (const pack of packs || []) {
    if (restante <= 0) break;
    const disponivel = pack.creditos_total - pack.creditos_usados;
    if (disponivel <= 0) continue;

    const deduzir = Math.min(disponivel, restante);
    await sb
      .from("packs")
      .update({ creditos_usados: pack.creditos_usados + deduzir })
      .eq("id", pack.id);
    restante -= deduzir;
  }

  return restante <= 0;
}

/**
 * Busca resumo de cotas para exibição no frontend.
 */
export async function buscarCotas(usuario_id: string, loja_id: string): Promise<CotaStatus> {
  return verificarCota(usuario_id, loja_id, "feed");
}

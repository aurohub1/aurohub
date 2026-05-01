"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function normalizeUrl(url: string): string {
  if (url.startsWith("https://")) return url;
  return "https://res.cloudinary.com/dxgj4bcch/image/upload/" + url;
}

export interface BadgesData {
  badges: Record<string, string>;
  feriados: Record<string, string>;
}

const TTL_MS = 60 * 60 * 1000; // 1h — igual v1 (Cache.fetch, utils.js:207)

let cachedPromise: Promise<BadgesData> | null = null;
let cachedAt = 0;

// Categoria → aliases usados por resolveBadgeUrl (BADGE_ALIASES em src/lib/badges.ts)
const CAT_TO_ALIASES: Record<string, string[]> = {
  all_inclusive:   ["ALL INCLUSIVE", "All Inclusive", "allinclusive", "all_inclusive"],
  ultima_chamada:  ["ÚLTIMA CHAMADA", "ULTIMA CHAMADA", "Última Chamada", "ultimachamada", "chamada"],
  ultimos_lugares: ["ÚLTIMOS LUGARES", "ULTIMOS LUGARES", "Últimos Lugares", "ultimoslugares"],
  oferta:          ["OFERTAS", "OFERTAS AZUL", "Ofertas Azul", "ofertas azul", "ofertas"],
  desconto:        ["DESCONTO", "desconto", "porcentagem", "PORCENTAGEM"],
};

async function loadBadges(): Promise<BadgesData> {
  const [b, f] = await Promise.all([
    supabase.from("badges").select("nome,url,categoria"),
    supabase.from("feriados").select("nome,url"),
  ]);
  if (b.error) throw b.error;
  if (f.error) throw f.error;

  type BadgeRow = { nome: string; url: string; categoria?: string };

  // 1. Agrupa por nome e sorteia entre variações — v1 utils.js:194-203
  const byNome: Record<string, string[]> = {};
  for (const r of (b.data ?? []) as BadgeRow[]) {
    if (!r.nome || !r.url) continue;
    (byNome[r.nome] ||= []).push(r.url);
  }
  const badges: Record<string, string> = {};
  for (const [k, arr] of Object.entries(byNome)) {
    badges[k] = normalizeUrl(arr[Math.floor(Math.random() * arr.length)]);
  }

  // 2. Resolução por categoria — sobrepõe aliases com URL sorteada da categoria
  const byCategory: Record<string, string[]> = {};
  for (const r of (b.data ?? []) as BadgeRow[]) {
    if (!r.url || !r.categoria) continue;
    (byCategory[r.categoria] ||= []).push(r.url);
  }
  for (const [cat, aliases] of Object.entries(CAT_TO_ALIASES)) {
    const urls = byCategory[cat];
    if (!urls?.length) continue;
    const picked = normalizeUrl(urls[Math.floor(Math.random() * urls.length)]);
    for (const alias of aliases) {
      badges[alias] = picked;
    }
  }

  // 3. Feriados: keyed by nome → url
  const feriados: Record<string, string> = {};
  for (const r of (f.data ?? []) as Array<{ nome: string; url: string }>) {
    if (!r.nome || !r.url) continue;
    feriados[r.nome] = normalizeUrl(r.url);
  }

  return { badges, feriados };
}

function getBadgesPromise(): Promise<BadgesData> {
  const now = Date.now();
  if (cachedPromise && now - cachedAt < TTL_MS) return cachedPromise;
  cachedAt = now;
  const p = loadBadges();
  cachedPromise = p;
  // Em caso de erro, limpa o singleton para permitir retry na próxima chamada
  p.catch(() => {
    if (cachedPromise === p) {
      cachedPromise = null;
      cachedAt = 0;
    }
  });
  return p;
}

export function invalidateBadgesCache(): void {
  cachedPromise = null;
  cachedAt = 0;
}

// Conveniência para DevTools: `window.invalidateBadgesCache()` força refetch
if (typeof window !== "undefined") {
  (window as unknown as { invalidateBadgesCache?: () => void }).invalidateBadgesCache = invalidateBadgesCache;
}

interface UseBadgesResult {
  badges: Record<string, string>;
  feriados: Record<string, string>;
  ready: boolean;
  error: Error | null;
}

export function useBadges(): UseBadgesResult {
  const [state, setState] = useState<UseBadgesResult>({
    badges: {},
    feriados: {},
    ready: false,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    getBadgesPromise()
      .then(d => {
        if (alive) setState({ badges: d.badges, feriados: d.feriados, ready: true, error: null });
      })
      .catch(err => {
        if (alive) {
          setState({
            badges: {},
            feriados: {},
            ready: true,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => { alive = false; };
  }, []);

  return state;
}

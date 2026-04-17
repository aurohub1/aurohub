"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cldUrl } from "@/lib/cloudinary";

export interface BadgesData {
  badges: Record<string, string>;
  feriados: Record<string, string>;
}

const TTL_MS = 60 * 60 * 1000; // 1h — igual v1 (Cache.fetch, utils.js:207)

let cachedPromise: Promise<BadgesData> | null = null;
let cachedAt = 0;

async function loadBadges(): Promise<BadgesData> {
  const [b, f] = await Promise.all([
    supabase.from("badges").select("nome,url"),
    supabase.from("feriados").select("nome,url"),
  ]);
  if (b.error) throw b.error;
  if (f.error) throw f.error;

  // Agrupa por nome e sorteia entre variações — v1 utils.js:194-203
  const groups: Record<string, string[]> = {};
  for (const r of (b.data ?? []) as Array<{ nome: string; url: string }>) {
    if (!r.nome || !r.url) continue;
    (groups[r.nome] ||= []).push(r.url);
  }
  const badges: Record<string, string> = {};
  for (const [k, arr] of Object.entries(groups)) {
    const picked = arr[Math.floor(Math.random() * arr.length)];
    const norm = cldUrl(picked);
    if (norm) badges[k] = norm;
  }

  const feriados: Record<string, string> = {};
  for (const r of (f.data ?? []) as Array<{ nome: string; url: string }>) {
    if (!r.nome || !r.url) continue;
    const norm = cldUrl(r.url);
    if (norm) feriados[r.nome] = norm;
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

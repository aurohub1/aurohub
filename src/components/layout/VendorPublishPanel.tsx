"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";

/* ── Constantes ──────────────────────────────────── */

const AUGUSTO_CURY = [
  "Grandes sonhos exigem grandes atitudes.",
  "Seja o protagonista da sua história.",
  "Quem tem um porquê suporta qualquer como.",
  "Treine sua mente como um atleta treina o corpo.",
  "Cada amanhecer é uma chance de reescrever sua história.",
  "Não espere a tempestade passar — aprenda a dançar na chuva.",
  "Pessoas emocionalmente saudáveis transformam obstáculos em degraus.",
];

type Format = "stories" | "feed" | "reels" | "tv";
interface PostsByFormat { stories: number; feed: number; reels: number; tv: number; }

interface PlanLimits {
  max_posts_day: number;
  max_feed_reels_day: number | null;
  max_stories_day: number | null;
  is_enterprise: boolean;
}

/* ── Helpers ─────────────────────────────────────── */

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDateLong(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function WeatherIcon({ code, size = 14 }: { code: number | null; size?: number }) {
  const color = "#FF7A1A";
  if (code === null) return <Cloud size={size} color={color} />;
  if (code === 0) return <Sun size={size} color={color} />;
  if (code <= 3) return <CloudSun size={size} color={color} />;
  if (code <= 48) return <CloudFog size={size} color={color} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} color={color} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} color={color} />;
  if (code >= 95) return <CloudLightning size={size} color={color} />;
  return <Cloud size={size} color={color} />;
}

/* ── Componente principal ────────────────────────── */

export default function VendorPublishPanel() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [posts, setPosts] = useState<PostsByFormat>({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null);
  const [quotes, setQuotes] = useState<string[]>(AUGUSTO_CURY);
  const [now, setNow] = useState<Date>(new Date());
  const [quoteIdx, setQuoteIdx] = useState(0);

  /* ── Relógio (tick 1s) ─────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Frase do dia: mesma frase durante todo o dia ──
   * Não rotaciona; troca apenas quando a data muda. */

  /* ── Load profile + plano + quotes + clima ─────── */
  const loadAll = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) return;

      // Plano
      const slug = p.plan?.slug || p.licensee?.plan_slug || p.licensee?.plan;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("max_posts_day, max_feed_reels_day, max_stories_day, is_enterprise")
          .eq("slug", slug)
          .single();
        if (plan) setPlanLimits(plan as PlanLimits);
      }

      // Frases do segmento + mix com Augusto Cury
      const segmentId = p.licensee?.segment_id ?? null;
      let segQuotes: string[] = [];
      if (segmentId) {
        const { data: seg } = await supabase
          .from("segments")
          .select("vendor_quotes")
          .eq("id", segmentId)
          .single();
        const arr = (seg as { vendor_quotes?: unknown } | null)?.vendor_quotes;
        if (Array.isArray(arr) && arr.length > 0) segQuotes = arr as string[];
      }
      // 70% segmento + 30% Cury (se segmento existe), senão só Cury
      const pool = segQuotes.length > 0
        ? [...segQuotes, ...segQuotes, ...AUGUSTO_CURY]
        : AUGUSTO_CURY;

      // Frase do dia: persiste em localStorage; troca só quando data muda
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const storageKey = "ah_frase_do_dia";
      let dailyQuote: string | null = null;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (saved.data === today && typeof saved.frase === "string" && pool.includes(saved.frase)) {
          dailyQuote = saved.frase;
        }
      } catch { /* ignore */ }

      if (!dailyQuote) {
        dailyQuote = pool[Math.floor(Math.random() * pool.length)];
        try { localStorage.setItem(storageKey, JSON.stringify({ data: today, frase: dailyQuote })); } catch { /* ignore */ }
      }

      // Mantém o array com a frase do dia na posição 0
      setQuotes([dailyQuote, ...pool.filter(q => q !== dailyQuote)]);
      setQuoteIdx(0);

      // Cidade da store pra clima
      let cidade: string | null = null;
      if (p.store_id) {
        try {
          const { data: s } = await supabase.from("stores").select("city").eq("id", p.store_id).single();
          const c = (s as { city?: string | null } | null)?.city;
          if (c && c.trim()) cidade = c.trim();
        } catch { /* ignore */ }
      }
      const cityLabel = cidade ?? "Rio Preto";

      // Geocode + weather
      let lat = -20.8116, lon = -49.3755;
      if (cidade) {
        try {
          const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&country=BR`);
          if (geo.ok) {
            const g = await geo.json();
            const r = g?.results?.[0];
            if (r?.latitude && r?.longitude) { lat = r.latitude; lon = r.longitude; }
          }
        } catch { /* ignore */ }
      }
      try {
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
        if (w.ok) {
          const d = await w.json();
          if (d?.current) {
            setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, city: cityLabel });
          }
        }
      } catch { /* ignore */ }

      // Contador de posts do dia da store do vendedor
      if (p.store_id) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const { data } = await supabase
          .from("activity_logs")
          .select("metadata")
          .gte("created_at", start.toISOString())
          .eq("event_type", "post_instagram")
          .limit(500);
        const counts: PostsByFormat = { stories: 0, feed: 0, reels: 0, tv: 0 };
        for (const row of (data ?? []) as { metadata: Record<string, unknown> | null }[]) {
          const m = row.metadata ?? {};
          if (m.store_id !== p.store_id) continue;
          let f = (m.format as string) || "";
          if (!f) {
            const mt = (m.media_type as string) || "";
            if (mt === "STORIES") f = "stories";
            else if (mt === "REELS") f = "reels";
            else f = "feed";
          }
          if (f === "stories" || f === "feed" || f === "reels" || f === "tv") counts[f as Format]++;
        }
        setPosts(counts);
      }
    } catch (err) {
      console.error("[VendorPublishPanel] load:", err);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Re-carrega o contador a cada 60s pra refletir publicações
    const t = setInterval(loadAll, 60000);
    return () => clearInterval(t);
  }, [loadAll]);

  /* ── Derived ───────────────────────────────────── */

  const limits = useMemo(() => {
    if (!planLimits) return null;
    const fr = planLimits.max_feed_reels_day ?? 0;
    const st = planLimits.max_stories_day ?? 0;
    return {
      stories: st >= 99 ? null : st,
      feed: fr,
      reels: fr,
      tv: planLimits.is_enterprise ? (planLimits.max_posts_day || 999) : 0,
    };
  }, [planLimits]);

  const visibleBars = useMemo(() => {
    if (!limits) return [];
    const out: { key: Format; label: string; count: number; max: number | null }[] = [];
    if (limits.stories !== 0) out.push({ key: "stories", label: "Stories", count: posts.stories, max: limits.stories });
    if (limits.feed > 0) out.push({ key: "feed", label: "Feed", count: posts.feed, max: limits.feed });
    if (limits.reels > 0) out.push({ key: "reels", label: "Reels", count: posts.reels, max: limits.reels });
    if (limits.tv > 0) out.push({ key: "tv", label: "TV", count: posts.tv, max: limits.tv });
    return out;
  }, [limits, posts]);

  const currentQuote = quotes[quoteIdx] ?? "";

  /* ── Render ────────────────────────────────────── */

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {/* Relógio + Clima */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2.5 py-2">
        <div className="min-w-0">
          <div className="font-mono text-[13px] font-bold text-[var(--txt)] tabular-nums">
            {formatTime(now)}
          </div>
          <div className="text-[8px] uppercase tracking-wider text-[var(--txt3)]">
            {formatDateLong(now)}
          </div>
        </div>
        {weather && (
          <div className="flex shrink-0 items-center gap-1">
            <WeatherIcon code={weather.code} size={13} />
            <div className="text-right">
              <div className="text-[11px] font-bold text-[var(--txt)] tabular-nums leading-none">
                {weather.temp}°
              </div>
              <div className="mt-0.5 truncate max-w-[60px] text-[8px] text-[var(--txt3)]">
                {weather.city}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contador de posts */}
      {visibleBars.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2.5 py-2">
          <div className="text-[8px] font-bold uppercase tracking-wider text-[var(--txt3)]">
            Posts de hoje
          </div>
          {visibleBars.map((b) => {
            const unlimited = b.max === null;
            const pct = !unlimited && b.max && b.max > 0 ? Math.min(100, (b.count / b.max) * 100) : 0;
            const danger = !unlimited && b.max !== null && b.count >= b.max;
            return (
              <div key={b.key} className="flex items-center gap-1.5">
                <span className="w-8 text-[8px] font-semibold uppercase text-[var(--txt3)]">{b.label}</span>
                <div className="flex-1 h-[2px] overflow-hidden rounded-full bg-[var(--bg2)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: unlimited ? "0%" : `${pct}%`,
                      background: danger ? "#EF4444" : "#D4A843",
                    }}
                  />
                </div>
                <span
                  className="w-8 text-right text-[8px] font-bold tabular-nums"
                  style={{ color: danger ? "#EF4444" : "var(--txt3)" }}
                >
                  {unlimited ? `${b.count}` : `${b.count}/${b.max}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Frase do dia */}
      {currentQuote && (
        <div className="rounded-lg border border-[rgba(255,122,26,0.18)] bg-[rgba(255,122,26,0.05)] px-2.5 py-2">
          <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-[#FF7A1A]">
            Motivação
          </div>
          <p
            key={quoteIdx}
            className="text-[10px] italic leading-snug text-[var(--txt2)]"
            style={{ animation: "fadeIn 0.4s ease" }}
          >
            &ldquo;{currentQuote}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

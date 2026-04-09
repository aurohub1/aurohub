"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Store {
  id: string;
  name: string;
  ig_user_id: string | null;
}

interface IgCredential {
  licensee_id: string;
  ig_user_id: string;
  access_token: string;
}

interface IgPost {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  saved?: number;
  reach?: number;
}

interface Metrics {
  followers: number;
  posts: IgPost[];
  totalLikes: number;
  totalComments: number;
  totalSaved: number;
  avgReach: number;
  avgEngagement: number;
  engagementRate: number;
}

type Period = 7 | 15 | 30 | 90;

/* ── Helpers ─────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function engagementLabel(rate: number): { text: string; color: string } {
  if (rate >= 3) return { text: "Excelente", color: "var(--green)" };
  if (rate >= 1.5) return { text: "Bom", color: "var(--gold)" };
  return { text: "Regular", color: "var(--orange)" };
}

/* ── Component ───────────────────────────────────── */

export default function MetricasPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [credentials, setCredentials] = useState<IgCredential[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [period, setPeriod] = useState<Period>(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Load stores + credentials on mount
  useEffect(() => {
    async function init() {
      try {
        const [storesRes, credsRes] = await Promise.all([
          supabase.from("stores").select("id, name, ig_user_id"),
          supabase.from("instagram_credentials").select("licensee_id, ig_user_id, access_token"),
        ]);

        console.log("stores:", storesRes.data, storesRes.error);
        console.log("creds:", credsRes.data, credsRes.error);
        const storeList = (storesRes.data ?? []) as Store[];
        const credList = (credsRes.data ?? []) as IgCredential[];

        // Only show stores that have ig_user_id
        const connected = storeList.filter((s) => s.ig_user_id);
        setStores(connected);
        setCredentials(credList);

        if (connected.length > 0) {
          setSelectedStore(connected[0].id);
        }
      } catch {
        setError("Erro ao carregar lojas.");
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, []);

  // Fetch metrics from Instagram API
  const fetchMetrics = useCallback(async () => {
    const store = stores.find((s) => s.id === selectedStore);
    if (!store?.ig_user_id) return;

    const cred = credentials.find((c) => c.ig_user_id === store.ig_user_id);
    if (!cred) {
      setError("Token Instagram não encontrado para esta loja.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = cred.access_token;
      const igId = store.ig_user_id;

      // 1. Get followers count
      const profileRes = await fetch(
        `https://graph.instagram.com/v25.0/${igId}?fields=followers_count,media_count&access_token=${token}`
      );
      const profile = await profileRes.json();

      if (profile.error) {
        setError(profile.error.message || "Erro na API do Instagram.");
        setLoading(false);
        return;
      }

      const followers = profile.followers_count ?? 0;

      // 2. Get recent media
      const mediaRes = await fetch(
        `https://graph.instagram.com/v25.0/${igId}/media?fields=id,caption,media_url,thumbnail_url,media_type,timestamp,like_count,comments_count&limit=100&access_token=${token}`
      );
      const mediaData = await mediaRes.json();
      const allPosts: IgPost[] = (mediaData.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        caption: (p.caption as string) ?? "",
        media_url: (p.media_url as string) ?? "",
        thumbnail_url: (p.thumbnail_url as string) ?? "",
        media_type: (p.media_type as string) ?? "IMAGE",
        timestamp: p.timestamp as string,
        like_count: (p.like_count as number) ?? 0,
        comments_count: (p.comments_count as number) ?? 0,
        saved: 0,
        reach: 0,
      }));

      // 3. Filter by period
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);
      const filtered = allPosts.filter((p) => new Date(p.timestamp) >= cutoff);

      // 4. Fetch insights for each post (reach, saved)
      const postsWithInsights = await Promise.all(
        filtered.slice(0, 25).map(async (post) => {
          try {
            const insightRes = await fetch(
              `https://graph.instagram.com/v25.0/${post.id}/insights?metric=reach,saved&access_token=${token}`
            );
            const insightData = await insightRes.json();
            const insightMap: Record<string, number> = {};
            (insightData.data ?? []).forEach((d: { name: string; values: { value: number }[] }) => {
              insightMap[d.name] = d.values?.[0]?.value ?? 0;
            });
            return { ...post, reach: insightMap.reach ?? 0, saved: insightMap.saved ?? 0 };
          } catch {
            return post;
          }
        })
      );

      // 5. Calculate metrics
      const totalLikes = postsWithInsights.reduce((s, p) => s + p.like_count, 0);
      const totalComments = postsWithInsights.reduce((s, p) => s + p.comments_count, 0);
      const totalSaved = postsWithInsights.reduce((s, p) => s + (p.saved ?? 0), 0);
      const totalReach = postsWithInsights.reduce((s, p) => s + (p.reach ?? 0), 0);
      const count = postsWithInsights.length || 1;
      const avgEngagement = (totalLikes + totalComments) / count;
      const engagementRate = followers > 0 ? (avgEngagement / followers) * 100 : 0;
      const avgReach = totalReach / count;

      setMetrics({
        followers,
        posts: postsWithInsights,
        totalLikes,
        totalComments,
        totalSaved,
        avgReach: Math.round(avgReach),
        avgEngagement: Math.round(avgEngagement),
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      });
    } catch (err) {
      setError("Erro ao buscar métricas do Instagram.");
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [stores, selectedStore, credentials, period]);

  // Auto-fetch when store or period changes
  useEffect(() => {
    if (selectedStore && credentials.length > 0) {
      fetchMetrics();
    }
  }, [selectedStore, period, fetchMetrics]);

  /* ── Render ────────────────────────────────────── */

  const engLabel = metrics ? engagementLabel(metrics.engagementRate) : null;

  return (
    <>
      {/* ── Controls ─────────────────────────────── */}
      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        {/* Store selector */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--txt3)]">Loja:</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            disabled={initialLoading}
            className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--txt)] outline-none transition-colors focus:border-[var(--orange)]"
          >
            {stores.length === 0 && <option value="">Nenhuma loja conectada</option>}
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {([7, 15, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                period === p
                  ? "bg-[var(--orange3)] text-[var(--orange)]"
                  : "text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt2)]"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchMetrics}
          disabled={loading || !selectedStore}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-[var(--bdr2)] px-4 text-[12px] font-semibold text-[var(--txt2)] transition-colors hover:border-[var(--orange)] hover:text-[var(--orange)] disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}>
            <path d="M17 10a7 7 0 11-2-5M17 3v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* ── Error ────────────────────────────────── */}
      {error && (
        <div className="card-glass flex items-center gap-3 p-4 text-[13px] text-[var(--red)]">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
            <path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 10v3M10 15h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────── */}
      {initialLoading || loading ? (
        <div className="card-glass py-16 text-center text-[13px] text-[var(--txt3)]">
          {initialLoading ? "Carregando lojas..." : "Buscando métricas do Instagram..."}
        </div>
      ) : !metrics ? (
        <div className="card-glass flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--purple3)]">
            <svg viewBox="0 0 20 20" fill="none" className="h-7 w-7 text-[var(--purple)]">
              <path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-[15px] font-bold text-[var(--txt)]">Sem dados</div>
          <div className="text-[13px] text-[var(--txt3)]">Selecione uma loja com Instagram conectado.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiMini label="Seguidores" value={metrics.followers.toLocaleString("pt-BR")} color="var(--blue)" />
            <KpiMini label="Posts no período" value={String(metrics.posts.length)} color="var(--orange)" />
            <KpiMini label="Total likes" value={metrics.totalLikes.toLocaleString("pt-BR")} color="var(--red)" />
            <KpiMini label="Total comentários" value={metrics.totalComments.toLocaleString("pt-BR")} color="var(--gold)" />
            <KpiMini label="Engaj. médio" value={String(metrics.avgEngagement)} color="var(--purple)" />
            <KpiMini
              label="Taxa engajamento"
              value={`${metrics.engagementRate}%`}
              color={engLabel!.color}
              badge={engLabel!.text}
            />
            <KpiMini label="Total salvamentos" value={metrics.totalSaved.toLocaleString("pt-BR")} color="var(--green)" />
            <KpiMini label="Alcance médio" value={metrics.avgReach.toLocaleString("pt-BR")} color="var(--blue)" />
          </div>

          {/* ── Engagement legend ─────────────────── */}
          <div className="card-glass flex items-center gap-6 px-5 py-3">
            <span className="text-[12px] font-semibold text-[var(--txt3)]">Taxa de engajamento:</span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
              <span className="text-[var(--green)]">Excelente (&gt;3%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
              <span className="text-[var(--gold)]">Bom (1.5-3%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full bg-[var(--orange)]" />
              <span className="text-[var(--orange)]">Regular (&lt;1.5%)</span>
            </span>
          </div>

          {/* ── Posts list ────────────────────────── */}
          <div className="card-glass overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-3">
              <h3 className="text-[13px] font-bold text-[var(--txt)]">Posts recentes</h3>
              <span className="text-[11px] text-[var(--txt3)]">{metrics.posts.length} posts</span>
            </div>

            {metrics.posts.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[var(--txt3)]">
                Nenhum post no período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-[var(--bdr)]">
                {metrics.posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--hover-bg)]"
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--bg3)]">
                      {(post.thumbnail_url || post.media_url) && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* Caption */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-[var(--txt)]">
                        {post.caption?.slice(0, 80) || "Sem legenda"}
                      </div>
                      <div className="text-[11px] text-[var(--txt3)]">
                        {timeAgo(post.timestamp)} · {post.media_type}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 gap-4 text-[12px]">
                      <div className="text-center">
                        <div className="font-bold text-[var(--txt)]">{post.like_count}</div>
                        <div className="text-[10px] text-[var(--txt3)]">likes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[var(--txt)]">{post.comments_count}</div>
                        <div className="text-[10px] text-[var(--txt3)]">coment.</div>
                      </div>
                      {(post.reach ?? 0) > 0 && (
                        <div className="text-center">
                          <div className="font-bold text-[var(--txt)]">{post.reach}</div>
                          <div className="text-[10px] text-[var(--txt3)]">alcance</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ── KPI Mini Card ───────────────────────────────── */

function KpiMini({
  label,
  value,
  color,
  badge,
}: {
  label: string;
  value: string;
  color: string;
  badge?: string;
}) {
  return (
    <div className="card-glass flex flex-col gap-1 p-4">
      <div className="text-[0.62rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none"
          style={{ color }}
        >
          {value}
        </span>
        {badge && (
          <span
            className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
            style={{ background: `${color}20`, color }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

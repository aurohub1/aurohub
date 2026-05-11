"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { NewsCard } from "@/components/NewsCard";
import FeriadosCard from "@/components/FeriadosCard";
import InactivityAlert from "@/components/InactivityAlert";
import { getInactiveStores, type InactiveStore } from "@/lib/inactivity-check";
import {
  Store, BarChart3, FileText, Sparkles, CalendarClock, ArrowRight,
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
  AlertTriangle,
} from "lucide-react";

interface DataComemorativa { id: string; nome: string; data_mes: number; data_dia: number; tipo: string; }
interface PlatformUpdate { id: string; title: string; description: string; deployed_at: string; }

/* ── Tipos ───────────────────────────────────────── */

interface StoreRow {
  id: string;
  name: string;
  city?: string | null;
  active?: boolean | null;
}
interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}
interface PlanFull {
  slug: string;
  name: string;
  max_users: number;
  max_posts_day: number;
}
interface Noticia { title: string; url: string; image?: string | null; source?: string; }

type FmtKey = "stories" | "feed" | "reels" | "tv";

const SEGMENT_MAP: Record<string, string> = {
  "7dd6759b-ba23-4d33-b898-c7a00cdf7b80": "turismo",
  "741c1469-9552-449a-835e-c79966680e68": "imobiliaria",
  "3b5aacc8-c0f0-483d-a282-0cda7520fdcb": "moda",
  "0deb6f4d-91a8-4ee8-b6d3-081caae6ccf0": "beleza",
  "7071c508-3e6b-4a91-b5f4-dfcc070798d1": "educacao",
  "eeb1f1b9-eac1-4c5b-afb5-59af3c1b8e6f": "restaurante",
  "2b068193-9cb9-47e9-8796-ff3abc7318e0": "saude",
};

/* ── Helpers ─────────────────────────────────────── */

const AUGUSTO_CURY = [
  "Grandes sonhos exigem grandes atitudes.",
  "O sucesso não é o destino, é a jornada.",
  "Quem não treina a mente para superar obstáculos desiste no primeiro problema.",
  "Seja o protagonista da sua história.",
  "A mente que se abre a uma nova ideia jamais volta ao seu tamanho original.",
  "Não tenha medo dos momentos difíceis — o melhor aço é forjado no fogo mais intenso.",
  "Aprenda a ser feliz com o que você tem enquanto busca o que deseja.",
  "Pessoas emocionalmente saudáveis transformam obstáculos em degraus.",
  "Quem tem um porquê suporta qualquer como.",
  "O maior adversário que você vai enfrentar está dentro de você.",
  "Treine sua mente como um atleta treina o corpo.",
  "Cada amanhecer é uma chance de reescrever sua história.",
  "Inteligência sem emoção é como um carro sem combustível.",
  "Os mais sábios aprendem com os próprios erros e com os erros dos outros.",
  "Não espere a tempestade passar — aprenda a dançar na chuva.",
];

function pickQuoteOfDay(segmentQuotes: string[] | null): string {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = "ah_frase_do_dia";
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (saved.date === today && saved.quote) return saved.quote;
  } catch { /* ignore */ }

  const pool = [...(segmentQuotes ?? []), ...AUGUSTO_CURY];
  const dayIndex = Math.floor(Date.now() / 86400000);
  const quote = pool[dayIndex % pool.length];

  try { localStorage.setItem(storageKey, JSON.stringify({ date: today, quote })); } catch { /* ignore */ }
  return quote;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function WeatherIcon({ code, size = 22 }: { code: number | null; size?: number }) {
  const color = "var(--orange)";
  if (code === null) return <Cloud size={size} color={color} />;
  if (code === 0) return <Sun size={size} color={color} />;
  if (code <= 3) return <CloudSun size={size} color={color} />;
  if (code <= 48) return <CloudFog size={size} color={color} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} color={color} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} color={color} />;
  if (code >= 95) return <CloudLightning size={size} color={color} />;
  return <Cloud size={size} color={color} />;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Conta de 0 até target com easeOutCubic. Só dispara quando `enabled`
 *  vira true — evita que a animação rode enquanto o main JSX ainda
 *  está oculto pelo estado de loading. */
function useCountUp(target: number, enabled: boolean, duration = 600): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!enabled) { setV(0); return; }
    if (!target || target <= 0) { setV(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, duration]);
  return v;
}

/* ── Component ───────────────────────────────────── */

export default function ClienteInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [planFull, setPlanFull] = useState<PlanFull | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [, setQuote] = useState<string>("");
  const [inactiveStores, setInactiveStores] = useState<InactiveStore[]>([]);
  const [hasPendingContract, setHasPendingContract] = useState(false);
  const [platformUpdates, setPlatformUpdates] = useState<PlatformUpdate[]>([]);

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dbFeriados, setDbFeriados] = useState<DataComemorativa[]>([]);
  const [postsMes, setPostsMes] = useState(0);
  const [, setPostFormats] = useState<Record<FmtKey, number>>({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [postLimits, setPostLimits] = useState<Record<FmtKey, number>>({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [templatesCount, setTemplatesCount] = useState(0);

  const [noticias, setNoticias] = useState<Noticia[]>([]);

  const [cityName, setCityName] = useState<string>("Rio Preto");
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  const [loading, setLoading] = useState(true);
  // Counters esperam 200ms após loading=false — dá tempo do React Strict Mode
  // terminar o double-invoke dos effects antes de começar a animação de 0→target.
  const [countersEnabled, setCountersEnabled] = useState(false);
  useEffect(() => {
    if (loading) { setCountersEnabled(false); return; }
    const t = setTimeout(() => setCountersEnabled(true), 200);
    return () => clearTimeout(t);
  }, [loading]);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      // Verificar contrato pendente (fire-and-forget, não bloqueia loading)
      supabase.from("contracts").select("id").eq("licensee_id", p.licensee_id).eq("status", "pending").limit(1).maybeSingle()
        .then(({ data }) => setHasPendingContract(!!data));

      // Novidades da plataforma não lidas (fire-and-forget)
      supabase.from("platform_updates").select("id, title, description, deployed_at")
        .not("read_by", "cs", `{"${p.id}"}`)
        .order("deployed_at", { ascending: false }).limit(5)
        .then(({ data }) => { if (data?.length) setPlatformUpdates(data as PlatformUpdate[]); });

      const segmentId = p.licensee?.segment_id ?? null;
      const slug = p.licensee?.plan_slug || p.licensee?.plan || p.plan?.slug;

      // Clima: fire-and-forget — geolocation pode levar 5s, não deve bloquear loading
      void (async () => {
        try {
          const pos = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
            if (typeof window === "undefined" || !navigator.geolocation || localStorage.getItem("geo_granted") !== "true") { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
              (g) => resolve({ lat: g.coords.latitude, lon: g.coords.longitude }),
              () => resolve(null),
              { timeout: 5000, maximumAge: 600_000 }
            );
          });
          const lat = pos?.lat ?? -20.8116;
          const lon = pos?.lon ?? -49.3755;
          if (pos) {
            try {
              const rev = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt`);
              if (rev.ok) { const d = await rev.json(); const name = d?.results?.[0]?.name; if (name) setCityName(name); }
            } catch { /* silent */ }
          }
          const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
          if (w.ok) { const d = await w.json(); if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }); }
        } catch { /* silent */ }
      })();

      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const hojeDt = new Date();
      const mesAtual = hojeDt.getMonth() + 1;
      const diaAtual = hojeDt.getDate();
      const diaFim = diaAtual + 14;

      // Todas as queries independentes em paralelo
      const [
        inactive,
        licResult,
        planResult,
        storeRows,
        usersResult,
        logsResult,
        tmplsResult,
        feriadosResult,
        noticiasResult,
        segmentQuotes,
      ] = await Promise.all([
        // 1. Lojas inativas
        getInactiveStores(supabase, p.licensee_id),
        // 2. expires_at do licensee
        supabase.from("licensees").select("expires_at").eq("id", p.licensee_id).single(),
        // 3. Plano completo
        slug
          ? supabase.from("plans").select("slug, name, max_users, max_posts_day").eq("slug", slug).single()
          : Promise.resolve({ data: null as PlanFull | null, error: null }),
        // 4. Stores (best-effort city/active, fallback id/name)
        (async (): Promise<StoreRow[]> => {
          const r = await supabase.from("stores").select("id, name, city, active").eq("licensee_id", p.licensee_id).order("name");
          if (!r.error && r.data) return r.data as StoreRow[];
          const { data } = await supabase.from("stores").select("id, name").eq("licensee_id", p.licensee_id).order("name");
          return (data ?? []) as StoreRow[];
        })(),
        // 5. Usuários
        supabase.from("profiles").select("id, name, email, role").eq("licensee_id", p.licensee_id).order("name"),
        // 6. Activity logs do mês
        supabase.from("activity_logs").select("id, metadata").gte("created_at", inicioMes.toISOString()).in("event_type", ["post_instagram", "post_scheduled"]).limit(500),
        // 7. Templates
        supabase.from("system_config").select("key").like("key", "tmpl_%").like("value", `%"licenseeId":"${p.licensee_id}"%`),
        // 8. Feriados (1 ou 2 queries dependendo do mês)
        (async (): Promise<DataComemorativa[]> => {
          try {
            if (diaFim <= 31) {
              const { data: dc } = await supabase.from("datas_comemorativas").select("id, nome, data_mes, data_dia, tipo").eq("data_mes", mesAtual).gte("data_dia", diaAtual).lte("data_dia", diaFim).order("data_dia").limit(5);
              return (dc ?? []) as DataComemorativa[];
            }
            const proxMes = mesAtual === 12 ? 1 : mesAtual + 1;
            const [r1, r2] = await Promise.all([
              supabase.from("datas_comemorativas").select("id, nome, data_mes, data_dia, tipo").eq("data_mes", mesAtual).gte("data_dia", diaAtual).order("data_dia").limit(5),
              supabase.from("datas_comemorativas").select("id, nome, data_mes, data_dia, tipo").eq("data_mes", proxMes).lte("data_dia", diaFim - 31).order("data_dia").limit(5),
            ]);
            return [...((r1.data ?? []) as DataComemorativa[]), ...((r2.data ?? []) as DataComemorativa[])].slice(0, 5);
          } catch { return []; }
        })(),
        // 9. Notícias
        (async (): Promise<Noticia[]> => {
          try {
            const segmentName = SEGMENT_MAP[segmentId ?? ""] ?? "default";
            const res = await fetch(`/api/noticias?segment=${segmentName}`);
            if (res.ok) return (await res.json()) as Noticia[];
          } catch { /* silent */ }
          return [];
        })(),
        // 10. Frases do segmento (fallback sequencial interno)
        (async (): Promise<string[] | null> => {
          if (segmentId) {
            const { data: seg } = await supabase.from("segments").select("quotes").eq("id", segmentId).single();
            const arr = (seg as { quotes?: unknown } | null)?.quotes;
            if (Array.isArray(arr) && arr.length > 0) return arr as string[];
          }
          const { data: outros } = await supabase.from("segments").select("quotes").eq("name", "Outros").single();
          const arr = (outros as { quotes?: unknown } | null)?.quotes;
          if (Array.isArray(arr) && arr.length > 0) return arr as string[];
          return null;
        })(),
      ]);

      // Aplica resultados
      setInactiveStores(inactive);
      if (licResult.data) setExpiresAt((licResult.data as { expires_at: string | null }).expires_at ?? null);
      if (planResult.data) setPlanFull(planResult.data as PlanFull);

      const { data: limits } = await supabase
        .from("profiles")
        .select("stories_limit, feed_limit, reels_limit, tv_limit")
        .eq("id", p.id)
        .single();
      if (limits) setPostLimits({
        stories: (limits as any).stories_limit ?? 0,
        feed:    (limits as any).feed_limit    ?? 0,
        reels:   (limits as any).reels_limit   ?? 0,
        tv:      (limits as any).tv_limit      ?? 0,
      });
      setStores(storeRows);
      setUsers((usersResult.data ?? []) as UserRow[]);

      const allLogs = (logsResult.data ?? []) as { id: string; metadata: Record<string, unknown> | null }[];
      const doLic = allLogs.filter((l) => l.metadata?.licensee_id === p.licensee_id);
      setPostsMes(doLic.length);
      const fmtCounts: Record<FmtKey, number> = { stories: 0, feed: 0, reels: 0, tv: 0 };
      for (const l of doLic) {
        const fmt = l.metadata?.format as FmtKey | undefined;
        if (fmt && fmt in fmtCounts) fmtCounts[fmt]++;
      }
      setPostFormats(fmtCounts);

      setTemplatesCount((tmplsResult.data ?? []).length);
      setDbFeriados(feriadosResult);
      if (noticiasResult.length) setNoticias(noticiasResult);
      setQuote(pickQuoteOfDay(segmentQuotes));

    } catch (err) {
      console.error("[ClienteInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function markUpdateRead(updateId: string) {
    if (!profile?.id) return;
    const { data: cur } = await supabase.from("platform_updates").select("read_by").eq("id", updateId).single();
    const existing = (cur?.read_by ?? []) as string[];
    if (!existing.includes(profile.id)) {
      await supabase.from("platform_updates").update({ read_by: [...existing, profile.id] }).eq("id", updateId);
    }
    setPlatformUpdates(prev => prev.filter(u => u.id !== updateId));
  }

  /* ── Derived ───────────────────────────────────── */

  const status = profile?.licensee?.status ?? "—";
  const isActive = status === "active";
  const maxUsers = planFull?.max_users ?? null;
  const usersUsedPct = maxUsers && maxUsers > 0
    ? Math.min(100, Math.round((users.length / maxUsers) * 100))
    : null;
  const unidadesAtivas = stores.filter((s) => s.active !== false).length;

  // Counters animados dos KPIs (easeOutCubic, 600ms) — disparam 200ms
  // depois de loading=false pra escapar do double-invoke do Strict Mode.
  const postsMesAnim = useCountUp(postsMes, countersEnabled);
  const templatesAnim = useCountUp(templatesCount, countersEnabled);
  const usersAnim = useCountUp(users.length, countersEnabled);
  const unidadesAnim = useCountUp(unidadesAtivas, countersEnabled);

  const proximosFeriados = useMemo(() => {
    const year = new Date().getFullYear();
    return dbFeriados.slice(0, 5).map((d) => ({
      nome: d.nome,
      data: `${year}-${String(d.data_mes).padStart(2, "0")}-${String(d.data_dia).padStart(2, "0")}`,
    }));
  }, [dbFeriados]);

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <div className="flex min-w-0 flex-col gap-5 overflow-x-hidden inicio-cliente-fade">
      {hasPendingContract && (
        <Link
          href="/cliente/contrato"
          className="flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-[13px] font-medium text-yellow-700 transition-colors hover:bg-yellow-500/15 dark:text-yellow-400"
        >
          <AlertTriangle size={16} className="shrink-0" />
          Contrato pendente de assinatura — clique aqui para assinar
        </Link>
      )}
      <style>{`
        @keyframes inicioClienteFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .inicio-cliente-fade {
          animation: inicioClienteFadeUp 500ms ease forwards;
        }
      `}</style>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-6 min-h-[100px]" style={{display:'flex', alignItems:'center'}}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--orange) 50%, var(--gold) 100%)" }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Olá, {profile?.name?.split(" ")[0] || profile?.licensee?.name || "cliente"}
            </h1>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3" style={{ flexShrink: 0 }}>
            <div
              className="flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--bdr)] px-4 py-2.5"
              style={{
                background: "linear-gradient(135deg, rgba(255,122,26,0.08), rgba(59,130,246,0.05))",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.14))",
                  border: "1px solid var(--bdr2)",
                  boxShadow: "0 0 24px rgba(255,122,26,0.22)",
                }}
              >
                <WeatherIcon code={weather?.code ?? null} />
              </div>
              <div>
                <div className="font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-none text-[var(--txt)] tabular-nums">
                  {weather ? `${weather.temp}°` : "—"}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--txt3)]">
                  {cityName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Central de Publicação — compact row ═══ */}
      <Link
        href="/cliente/templates"
        className="group flex items-center justify-between gap-4 rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
        style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-white">Central de Publicação</div>
            <div className="text-[11px] text-white/70">Acesse a biblioteca de templates liberada para a sua marca.</div>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-transparent backdrop-blur-sm px-5 py-2 text-[12px] font-semibold transition-all group-hover:bg-white/10" style={{ color: "var(--brand-primary)", border: "1.5px solid var(--brand-primary)" }}>
          Ver templates <ArrowRight size={13} />
        </span>
      </Link>

      <InactivityAlert stores={inactiveStores} />

      {/* ═══ Novidades da plataforma ════════════════════ */}
      {platformUpdates.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">✨ Novidades</span>
          </div>
          {platformUpdates.map(u => (
            <div key={u.id} className="card-glass flex items-start gap-3 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--orange)]/10 text-sm">✨</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[var(--txt)] leading-snug">{u.title}</div>
                <div className="text-[11px] text-[var(--txt3)] mt-0.5 leading-relaxed">{u.description}</div>
                <div className="text-[10px] text-[var(--txt3)] mt-1">{new Date(u.deployed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</div>
              </div>
              <button
                onClick={() => markUpdateRead(u.id)}
                className="shrink-0 self-start rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--txt3)] hover:bg-[var(--bg2)] transition-colors"
              >
                Lido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Layout principal 3 colunas ══════════════════════════ */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr 1.2fr", gap: "10px" }}>

        {/* ── Col 1: 4 cards empilhados ─────────── */}
        <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>

          {/* Plano atual */}
          <div className="card-glass flex flex-col overflow-hidden">
          <div className="py-2 px-3">
            <div className="mb-3 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]">
                <BarChart3 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Plano atual</div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                    style={
                      isActive
                        ? { background: "var(--green3)", color: "var(--green)" }
                        : { background: "var(--red3)", color: "var(--red)" }
                    }
                  >
                    {isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">
                  {planFull?.name || profile?.plan?.name || "—"}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--txt3)]">
                  <CalendarClock size={11} />
                  Vence em {formatDate(expiresAt)}
                </div>
              </div>
            </div>

            {/* Barra de uso de usuários */}
            {maxUsers !== null && maxUsers > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--txt3)]">
                  <span>Usuários usados</span>
                  <span className="tabular-nums">{usersAnim} / {maxUsers}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg2)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${usersUsedPct ?? 0}%`,
                      background: (usersUsedPct ?? 0) > 90
                        ? "var(--red)"
                        : (usersUsedPct ?? 0) > 70
                          ? "var(--orange)"
                          : "linear-gradient(90deg, var(--orange), var(--gold))",
                    }}
                  />
                </div>
                {users.length >= maxUsers && (
                  <div className="mt-1.5 text-xs" style={{ color: "var(--red)" }}>⚠️ Limite atingido — entre em contato com o suporte</div>
                )}
              </div>
            )}

            {/* Breakdown por formato */}
            <div className="mt-3 grid grid-cols-4 border-t border-[var(--bdr)] pt-3">
              {([
                { key: "stories" as FmtKey, label: "Stories", color: "#3B9EFF" },
                { key: "feed"    as FmtKey, label: "Feed",    color: "#F59E0B" },
                { key: "reels"   as FmtKey, label: "Reels",   color: "#10B981" },
                { key: "tv"      as FmtKey, label: "TV",      color: "#8B5CF6" },
              ]).map(({ key, label, color }) => {
                const ilimitado = postLimits[key] === 0;
                return (
                  <div key={key} className="flex flex-col items-center">
                    <span style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1, color }}>
                      {ilimitado ? "∞" : String(postLimits[key])}
                    </span>
                    <span style={{ fontSize: "10px", letterSpacing: ".8px", color: "var(--txt3)" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* Posts do mês */}
          <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 py-2 px-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]">
              <BarChart3 size={22} />
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts do mês</div>
              <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">
                {postsMesAnim}
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--txt3)]">Publicações de todas as unidades</div>
            </div>
          </div>
          </div>

          {/* Templates disponíveis */}
          <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 py-2 px-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]">
              <FileText size={22} />
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Templates</div>
              <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">
                {templatesAnim}
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--txt3)]">Disponíveis para publicação</div>
            </div>
          </div>
          </div>

          {/* Unidades */}
          <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 py-2 px-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]">
              <Store size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Unidades</div>
              <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">
                {unidadesAnim}
              </div>
              <div className="mt-1.5 truncate text-[11px] text-[var(--txt3)]">
                {stores.map(s => s.name).join(' · ') || 'Nenhuma unidade'}
              </div>
            </div>
          </div>
          </div>

        </div>

        {/* ── Col 2: FeriadosCard ────────────────── */}
        <div className="self-start" style={{ minWidth: 0 }}>
          <FeriadosCard feriados={proximosFeriados} />
        </div>

        {/* ── Col 3: NewsCard ───────────────────── */}
        <div className="self-start" style={{ minWidth: "280px" }}>
          <NewsCard news={noticias} />
        </div>

      </div>
    </div>
  );
}

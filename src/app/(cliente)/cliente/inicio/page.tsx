"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { NewsCard } from "@/components/NewsCard";
import FeriadosCard from "@/components/FeriadosCard";
import {
  Store, BarChart3, FileText, Sparkles, CalendarClock, ArrowRight,
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";

interface DataComemorativa { id: string; nome: string; data_mes: number; data_dia: number; tipo: string; }
function daysUntil(iso: string): number {
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

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

function roleLabel(role: string | null): string {
  switch (role) {
    case "adm":      return "ADM";
    case "cliente":  return "Cliente";
    case "unidade":  return "Unidade";
    case "vendedor": return "Consultor";
    default:         return role || "—";
  }
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
  const [quote, setQuote] = useState<string>("");

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dbFeriados, setDbFeriados] = useState<DataComemorativa[]>([]);
  const [postsMes, setPostsMes] = useState(0);
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

      // Frase do segmento (igual ADM)
      let segmentQuotes: string[] | null = null;
      const segmentId = p.licensee?.segment_id ?? null;
      if (segmentId) {
        const { data: seg } = await supabase.from("segments").select("quotes").eq("id", segmentId).single();
        const arr = (seg as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      if (!segmentQuotes) {
        const { data: outros } = await supabase.from("segments").select("quotes").eq("name", "Outros").single();
        const arr = (outros as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      setQuote(pickQuoteOfDay(segmentQuotes));

      // Previsão do tempo via geolocation do browser (fallback Rio Preto)
      try {
        const pos = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
          if (typeof window === "undefined" || !navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 600_000 }
          );
        });
        const lat = pos?.lat ?? -20.8116;
        const lon = pos?.lon ?? -49.3755;

        if (pos) {
          try {
            const rev = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt`);
            if (rev.ok) {
              const d = await rev.json();
              const name = d?.results?.[0]?.name;
              if (name) setCityName(name);
            }
          } catch { /* silent */ }
        }

        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
        if (w.ok) {
          const d = await w.json();
          if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        }
      } catch { /* silent */ }

      // Dados do licensee (expires_at não vem no FullProfile)
      const { data: licFull } = await supabase
        .from("licensees")
        .select("expires_at")
        .eq("id", p.licensee_id)
        .single();
      if (licFull) setExpiresAt((licFull as { expires_at: string | null }).expires_at ?? null);

      // Plano completo (inclui max_users)
      const slug = p.licensee?.plan_slug || p.licensee?.plan || p.plan?.slug;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("slug, name, max_users, max_posts_day")
          .eq("slug", slug)
          .single();
        if (plan) setPlanFull(plan as PlanFull);
      }

      // Stores (best-effort com city/active)
      let storeRows: StoreRow[] = [];
      {
        const tryFull = await supabase
          .from("stores")
          .select("id, name, city, active")
          .eq("licensee_id", p.licensee_id)
          .order("name");
        if (!tryFull.error && tryFull.data) {
          storeRows = tryFull.data as StoreRow[];
        } else {
          const { data } = await supabase
            .from("stores")
            .select("id, name")
            .eq("licensee_id", p.licensee_id)
            .order("name");
          storeRows = (data ?? []) as StoreRow[];
        }
      }
      setStores(storeRows);

      // Usuários do licensee
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("licensee_id", p.licensee_id)
        .order("name");
      setUsers((usersData ?? []) as UserRow[]);

      // Posts do mês via activity_logs (filtrado por licensee_id nos metadata)
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, metadata")
        .gte("created_at", inicioMes.toISOString())
        .in("event_type", ["post_instagram", "post_scheduled"])
        .limit(500);
      const allLogs = (logs ?? []) as { id: string; metadata: Record<string, unknown> | null }[];
      const doLic = allLogs.filter((l) => l.metadata?.licensee_id === p.licensee_id);
      setPostsMes(doLic.length);

      // Templates do canvas (system_config tmpl_* onde value contém licenseeId)
      const { data: tmpls } = await supabase
        .from("system_config")
        .select("key")
        .like("key", "tmpl_%")
        .like("value", `%"licenseeId":"${p.licensee_id}"%`);
      setTemplatesCount((tmpls ?? []).length);

      // Datas comemorativas próximos 14 dias
      try {
        const hojeDt = new Date();
        const mesAtual = hojeDt.getMonth() + 1;
        const diaAtual = hojeDt.getDate();
        const diaFim = diaAtual + 14;
        if (diaFim <= 31) {
          const { data: dc } = await supabase
            .from("datas_comemorativas")
            .select("id, nome, data_mes, data_dia, tipo")
            .eq("data_mes", mesAtual)
            .gte("data_dia", diaAtual)
            .lte("data_dia", diaFim)
            .order("data_dia")
            .limit(5);
          setDbFeriados((dc ?? []) as DataComemorativa[]);
        } else {
          const { data: dc1 } = await supabase
            .from("datas_comemorativas")
            .select("id, nome, data_mes, data_dia, tipo")
            .eq("data_mes", mesAtual)
            .gte("data_dia", diaAtual)
            .order("data_dia")
            .limit(5);
          const proxMes = mesAtual === 12 ? 1 : mesAtual + 1;
          const { data: dc2 } = await supabase
            .from("datas_comemorativas")
            .select("id, nome, data_mes, data_dia, tipo")
            .eq("data_mes", proxMes)
            .lte("data_dia", diaFim - 31)
            .order("data_dia")
            .limit(5);
          setDbFeriados([...((dc1 ?? []) as DataComemorativa[]), ...((dc2 ?? []) as DataComemorativa[])].slice(0, 5));
        }
      } catch { /* silent */ }

      // Notícias do setor
      try {
        const segmentName = SEGMENT_MAP[segmentId ?? ""] ?? "default";
        const res = await fetch(`/api/noticias?segment=${segmentName}`);
        if (res.ok) {
          const items = await res.json();
          if (items.length) setNoticias(items);
        }
      } catch { /* silent */ }
    } catch (err) {
      console.error("[ClienteInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      <style>{`
        @keyframes inicioClienteFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .inicio-cliente-fade {
          animation: inicioClienteFadeUp 400ms ease forwards;
        }
      `}</style>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-6 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--orange) 50%, var(--gold) 100%)" }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel do Cliente · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Olá, {profile?.name?.split(" ")[0] || profile?.licensee?.name || "cliente"}
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] italic text-[var(--txt2)]">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
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

      {/* ═══ KPI Row — Plano, Posts do mês, Templates ══ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Plano atual */}
        <div className="card-glass px-5 py-5">
          <div className="mb-3 flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
              style={{
                background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
                border: "1px solid var(--bdr2)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 0 24px rgba(255,122,26,0.22)",
              }}
            >
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
          {maxUsers === -1 && (
            <div className="text-[11px] text-[var(--txt3)]">Usuários ilimitados</div>
          )}
        </div>

        {/* Posts do mês */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid var(--bdr2)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 24px rgba(255,122,26,0.22)",
            }}
          >
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

        {/* Templates disponíveis */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid var(--bdr2)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 24px rgba(255,122,26,0.22)",
            }}
          >
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

      {/* ═══ Unidades + Usuários + Notícias ══════════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Unidades ──────────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Store size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Unidades</h3>
              <span className="rounded-full bg-[var(--green3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--green)]">
                {unidadesAnim} ativa{unidadesAtivas === 1 ? "" : "s"}
              </span>
            </div>
            <Link
              href="/clientes"
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline"
            >
              Gerenciar <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-5">
            {stores.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhuma unidade cadastrada.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {stores.map((s) => {
                  const ativo = s.active !== false;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-[var(--txt)]">{s.name}</div>
                        {s.city && <div className="truncate text-[10px] text-[var(--txt3)]">{s.city}</div>}
                      </div>
                      <span
                        className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                        style={
                          ativo
                            ? { background: "var(--green3)", color: "var(--green)" }
                            : { background: "var(--red3)", color: "var(--red)" }
                        }
                      >
                        {ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Próximos feriados ──────────────────── */}
        <FeriadosCard feriados={proximosFeriados} />

        {/* ── Notícias do setor ─────────────────── */}
        <div className="self-start">
          <NewsCard news={noticias} />
        </div>
      </div>
    </div>
  );
}

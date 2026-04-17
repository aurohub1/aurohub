"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { NewsCard } from "@/components/NewsCard";
import FeriadosCard from "@/components/FeriadosCard";
import {
  Send, BarChart3, ArrowRight, Image as ImageIcon, CalendarDays,
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";

interface DataComemorativa { id: string; nome: string; data_mes: number; data_dia: number; tipo: string; }
function daysUntil(iso: string): number {
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/* ── Tipos ───────────────────────────────────────── */

interface Vendedor {
  id: string;
  name: string | null;
  email: string | null;
}

interface ScheduledPost {
  id: string;
  format: string;
  field_values: Record<string, unknown>;
  status: string;
  scheduled_at: string;
  image_url: string | null;
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

/* ── Constantes ──────────────────────────────────── */

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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "var(--blue3)",   color: "var(--blue)",   label: "Agendado" },
  published: { bg: "var(--green3)",  color: "var(--green)",  label: "Publicado" },
  failed:    { bg: "var(--red3)",    color: "var(--red)",    label: "Falhou" },
  cancelled: { bg: "var(--bg3)",     color: "var(--txt3)",   label: "Cancelado" },
};

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function getDestino(fv: Record<string, unknown>): string {
  return (fv?.destino ?? fv?.destination ?? fv?.titulo ?? "Sem destino") as string;
}

/* ── Component ───────────────────────────────────── */

export default function UnidadeInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [quote, setQuote] = useState<string>("");

  const [postsHoje, setPostsHoje] = useState(0);
  const [postsMes, setPostsMes] = useState(0);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [dbFeriados, setDbFeriados] = useState<DataComemorativa[]>([]);
  const [ultimasPub, setUltimasPub] = useState<ScheduledPost[]>([]);

  const [noticias, setNoticias] = useState<Noticia[]>([]);

  const [cityName, setCityName] = useState<string>("Rio Preto");
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.store_id) { setLoading(false); return; }

      // Frase do segmento
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

      // Previsão do tempo via geolocation do browser — fallback store.city → Rio Preto
      try {
        const pos = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
          if (typeof window === "undefined" || !navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 600_000 }
          );
        });

        let lat = -20.8116, lon = -49.3755;
        let resolvedCity: string | null = null;

        if (pos) {
          lat = pos.lat;
          lon = pos.lon;
          try {
            const rev = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt`);
            if (rev.ok) {
              const d = await rev.json();
              resolvedCity = d?.results?.[0]?.name ?? null;
            }
          } catch { /* silent */ }
        } else if (p?.store_id) {
          // Fallback: geocoding pela city da store
          try {
            const { data: s } = await supabase.from("stores").select("city").eq("id", p.store_id).single();
            const c = (s as { city?: string | null } | null)?.city;
            if (c && c.trim()) {
              resolvedCity = c.trim();
              const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(resolvedCity)}&count=1&language=pt&country=BR`);
              if (geo.ok) {
                const g = await geo.json();
                const r = g?.results?.[0];
                if (r?.latitude && r?.longitude) { lat = r.latitude; lon = r.longitude; }
              }
            }
          } catch { /* silent */ }
        }

        if (resolvedCity) setCityName(resolvedCity);

        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
        if (w.ok) {
          const d = await w.json();
          if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        }
      } catch { /* silent */ }

      // Datas
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      const inicioMes = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), 1);

      // Posts hoje / mês (activity_logs filtrado por store_id no metadata)
      const [logsHojeRes, logsMesRes] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("id, metadata")
          .gte("created_at", inicioDia.toISOString())
          .in("event_type", ["post_instagram", "post_scheduled"]),
        supabase
          .from("activity_logs")
          .select("id, metadata")
          .gte("created_at", inicioMes.toISOString())
          .in("event_type", ["post_instagram", "post_scheduled"]),
      ]);
      const countByStore = (rows: { metadata: Record<string, unknown> | null }[] | null) =>
        (rows ?? []).filter((l) => l.metadata?.store_id === p.store_id).length;
      setPostsHoje(countByStore(logsHojeRes.data));
      setPostsMes(countByStore(logsMesRes.data));

      // Vendedores da unidade
      const { data: vendData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("store_id", p.store_id)
        .eq("role", "vendedor")
        .order("name");
      const vendList = (vendData ?? []) as Vendedor[];
      setVendedores(vendList);

      // Últimas publicações: scheduled_posts não tem store_id → filtra por user_id
      const userIds = [p.id, ...vendList.map((v) => v.id)];
      const { data: posts } = await supabase
        .from("scheduled_posts")
        .select("id, format, field_values, status, scheduled_at, image_url")
        .in("user_id", userIds)
        .order("scheduled_at", { ascending: false })
        .limit(5);
      setUltimasPub((posts ?? []) as ScheduledPost[]);

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
      console.error("[UnidadeInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const proximosFeriados = useMemo(() => {
    const year = new Date().getFullYear();
    return dbFeriados.slice(0, 5).map((d) => ({
      nome: d.nome,
      data: `${year}-${String(d.data_mes).padStart(2, "0")}-${String(d.data_dia).padStart(2, "0")}`,
    }));
  }, [dbFeriados]);

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-6 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel da Unidade · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              {profile?.store?.name || "Sua unidade"}
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] italic text-[var(--txt2)]">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
          </div>

          <div
            className="ml-auto flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--bdr)] px-4 py-2.5"
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

      {/* ═══ Stats + CTA Row ═══════════════════════ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Posts de Hoje */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid var(--bdr2)",
            }}
          >
            <Send size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts de hoje</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsHoje}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Publicações confirmadas</div>
          </div>
        </div>

        {/* Posts do Mês */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--blue)]"
            style={{ background: "var(--blue3)", border: "1px solid var(--bdr2)" }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts do mês</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsMes}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Total da unidade</div>
          </div>
        </div>

        {/* CTA: Publicar agora */}
        <Link
          href="/unidade/publicar"
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-5 text-white shadow-lg transition-transform hover:scale-[1.015]"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 45%, #D4A843 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))" }}
          />
          <div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.28)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Send size={22} />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/80">Ação rápida</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none">
              Publicar agora
            </div>
            <div className="mt-1 text-[11px] text-white/80">Criar e publicar uma arte</div>
          </div>
          <ArrowRight size={18} className="relative shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* ═══ Consultores + Últimas + Notícias — alturas alinhadas ═══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">
          {/* ── Próximos feriados ──────────────────── */}
          <FeriadosCard feriados={proximosFeriados} />

          {/* ── Últimas publicações ──────────────── */}
          <div className="card-glass flex h-[320px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={15} className="text-[var(--orange)]" />
                <h3 className="text-[14px] font-bold text-[var(--txt)]">Últimas publicações</h3>
              </div>
              <Link
                href="/central-de-publicacao"
                className="text-[11px] font-semibold text-[var(--orange)] hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {ultimasPub.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="mb-3 h-8 w-8 text-[var(--txt3)] opacity-40" />
                  <p className="text-[13px] text-[var(--txt3)]">Nenhuma publicação ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {ultimasPub.map((post) => {
                    const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.pending;
                    const destino = getDestino(post.field_values || {});
                    const formatLabel = FORMAT_LABELS[post.format] ?? post.format;
                    return (
                      <div key={post.id} className="flex items-center gap-3 rounded-lg border border-[var(--bdr)] px-3 py-2 page-fade">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--bdr)] bg-[var(--bg2)]">
                          {post.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--txt3)]">
                              <ImageIcon size={14} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-medium text-[var(--txt)]">{destino}</div>
                          <div className="truncate text-[10px] text-[var(--txt3)]">
                            {formatLabel} · {formatDateTime(post.scheduled_at)}
                          </div>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Notícias do setor ── */}
        <div className="self-start">
          <NewsCard news={noticias} height={280} />
        </div>
      </div>
    </>
  );
}

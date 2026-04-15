"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { NewsCard } from "@/components/NewsCard";
import {
  CalendarDays,
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Noticia { title: string; url: string; image?: string | null; source?: string; }

interface DataTurismo {
  nome: string;
  data: string; // YYYY-MM-DD (ano 2026)
  tipo: "feriado" | "vespera" | "temporada" | "evento";
}

interface DataComemorativa {
  id: string;
  nome: string;
  data_mes: number;
  data_dia: number;
  tipo: string;
}

/* ── Constantes ──────────────────────────────────── */

/** Frases do Augusto Cury — fallback genérico misturado ao pool de segmento. */
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

/**
 * Frase do dia determinística — mesma frase durante o mesmo dia,
 * pega por índice baseado em `Math.floor(Date.now() / 86400000)`.
 */
function pickQuoteOfDay(segmentQuotes: string[] | null): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

// Calendário do turismo 2026 — feriados, vésperas e alta temporada relevantes
const CALENDARIO_TURISMO: DataTurismo[] = [
  { nome: "Tiradentes",              data: "2026-04-21", tipo: "feriado" },
  { nome: "Véspera Tiradentes",      data: "2026-04-20", tipo: "vespera" },
  { nome: "Dia do Trabalho",         data: "2026-05-01", tipo: "feriado" },
  { nome: "Corpus Christi",          data: "2026-06-04", tipo: "feriado" },
  { nome: "Véspera Corpus Christi",  data: "2026-06-03", tipo: "vespera" },
  { nome: "Férias escolares julho",  data: "2026-07-01", tipo: "temporada" },
  { nome: "Independência",           data: "2026-09-07", tipo: "feriado" },
  { nome: "N. Sra. Aparecida",       data: "2026-10-12", tipo: "feriado" },
  { nome: "Finados",                 data: "2026-11-02", tipo: "feriado" },
  { nome: "Proclamação da República",data: "2026-11-15", tipo: "feriado" },
  { nome: "Consciência Negra",       data: "2026-11-20", tipo: "feriado" },
  { nome: "Alta temporada verão",    data: "2026-12-20", tipo: "temporada" },
  { nome: "Natal",                   data: "2026-12-25", tipo: "feriado" },
  { nome: "Réveillon",               data: "2026-12-31", tipo: "feriado" },
];

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
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

/* ── Component ───────────────────────────────────── */

export default function VendedorInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [quote, setQuote] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [cityName, setCityName] = useState<string>("Rio Preto");
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  const [noticias, setNoticias] = useState<Noticia[]>([]);

  const [dbFeriados, setDbFeriados] = useState<DataComemorativa[]>([]);

  /* ── Load profile, posts, quote, weather ─────── */
  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);

      // Frase: segmento do licensee (vendor_quotes) misturado com Augusto Cury
      let segmentQuotes: string[] | null = null;
      const segmentId = p?.licensee?.segment_id ?? null;
      if (segmentId) {
        const { data: seg } = await supabase
          .from("segments")
          .select("vendor_quotes")
          .eq("id", segmentId)
          .single();
        const arr = (seg as { vendor_quotes?: unknown } | null)?.vendor_quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      setQuote(pickQuoteOfDay(segmentQuotes));

      // Cidade da store (best-effort — coluna pode não existir)
      let cidade: string | null = null;
      if (p?.store_id) {
        try {
          const { data: s } = await supabase.from("stores").select("city").eq("id", p.store_id).single();
          const c = (s as { city?: string | null } | null)?.city;
          if (c && c.trim()) cidade = c.trim();
        } catch { /* coluna ausente */ }
      }
      setCityName(cidade ?? "Rio Preto");

      // Previsão do tempo
      let lat = -20.8116, lon = -49.3755;
      if (cidade) {
        try {
          const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&country=BR`);
          if (geo.ok) {
            const g = await geo.json();
            const r = g?.results?.[0];
            if (r?.latitude && r?.longitude) { lat = r.latitude; lon = r.longitude; }
          }
        } catch { /* silent */ }
      }
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
      if (w.ok) {
        const d = await w.json();
        if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
      }

      // Datas comemorativas próximos 14 dias (tabela datas_comemorativas)
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
            .order("data_dia");
          setDbFeriados((dc ?? []) as DataComemorativa[]);
        } else {
          const { data: dc1 } = await supabase
            .from("datas_comemorativas")
            .select("id, nome, data_mes, data_dia, tipo")
            .eq("data_mes", mesAtual)
            .gte("data_dia", diaAtual)
            .order("data_dia");
          const proxMes = mesAtual === 12 ? 1 : mesAtual + 1;
          const { data: dc2 } = await supabase
            .from("datas_comemorativas")
            .select("id, nome, data_mes, data_dia, tipo")
            .eq("data_mes", proxMes)
            .lte("data_dia", diaFim - 31)
            .order("data_dia");
          setDbFeriados([...((dc1 ?? []) as DataComemorativa[]), ...((dc2 ?? []) as DataComemorativa[])]);
        }
      } catch { /* tabela ausente — fallback pra hardcoded */ }

      // Notícias do setor — API interna que tenta múltiplos feeds com cache
      try {
        const segmentName: string = ({
          "7dd6759b-ba23-4d33-b898-c7a00cdf7b80": "turismo",
          "741c1469-9552-449a-835e-c79966680e68": "imobiliaria",
          "3b5aacc8-c0f0-483d-a282-0cda7520fdcb": "moda",
          "0deb6f4d-91a8-4ee8-b6d3-081caae6ccf0": "beleza",
          "7071c508-3e6b-4a91-b5f4-dfcc070798d1": "educacao",
          "eeb1f1b9-eac1-4c5b-afb5-59af3c1b8e6f": "restaurante",
          "2b068193-9cb9-47e9-8796-ff3abc7318e0": "saude",
        } as Record<string, string>)[segmentId ?? ""] ?? "default";

        const res = await fetch(`/api/noticias?segment=${segmentName}`);
        if (res.ok) {
          const items = await res.json();
          if (items.length) setNoticias(items);
        }
      } catch { /* silencioso */ }
    } catch (err) {
      console.error("[VendedorInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ──────────────────────────────────── */

  const proximosFeriados = useMemo(() => {
    // Preferência: tabela datas_comemorativas (tempo real do ADM). Fallback: hardcoded CALENDARIO_TURISMO.
    if (dbFeriados.length > 0) {
      const year = new Date().getFullYear();
      return dbFeriados.slice(0, 5).map((d) => ({
        nome: d.nome,
        data: `${year}-${String(d.data_mes).padStart(2, "0")}-${String(d.data_dia).padStart(2, "0")}`,
        tipo: "feriado" as const,
      }));
    }
    return CALENDARIO_TURISMO
      .filter((d) => d.tipo === "feriado" && daysUntil(d.data) >= 0)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);
  }, [dbFeriados]);

  /* ── Render ──────────────────────────────────── */

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HEADER — saudação + quote + weather ═══ */}
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel do Consultor · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Olá, {profile?.name?.split(" ")[0] || "consultor"}
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] italic text-[var(--txt2)]">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.store?.name || "—"}</p>
          </div>

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
                border: "1px solid rgba(255,255,255,0.08)",
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

      {/* ═══ Feriados + Notícias ═══════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Próximos feriados ───────────────────── */}
        <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Próximos feriados</h3>
            </div>
          </div>
          <div className="p-5">
            {proximosFeriados.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Sem feriados próximos.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {proximosFeriados.map((f) => {
                  const diff = daysUntil(f.data);
                  return (
                    <div key={f.data + f.nome} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                      <span className="truncate text-[12px] text-[var(--txt)]">{f.nome}</span>
                      <span className="ml-2 shrink-0 rounded-full bg-[var(--orange3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--orange)] tabular-nums">
                        {diff === 0 ? "HOJE" : `em ${diff}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Notícias do Setor — slideshow ──────── */}
        <div className="lg:col-span-2">
          <NewsCard news={noticias} />
        </div>
      </div>
    </>
  );
}

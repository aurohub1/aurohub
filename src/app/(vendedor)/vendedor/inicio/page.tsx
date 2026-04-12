"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Send, Bell, Plus, Check, Trash2, CalendarDays, Plane, Sparkles,
  Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Lembrete {
  id: string;
  cliente: string;
  data: string; // YYYY-MM-DD
  nota: string;
  feito: boolean;
}

interface Noticia { title: string; url: string; image?: string | null; source?: string; }

interface DataTurismo {
  nome: string;
  data: string; // YYYY-MM-DD (ano 2026)
  tipo: "feriado" | "vespera" | "temporada" | "evento";
}

/* ── Constantes ──────────────────────────────────── */

const LS_LEMBRETES = "ah_vendedor_lembretes_v1";

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
  const pool = [...(segmentQuotes ?? []), ...AUGUSTO_CURY];
  const dayIndex = Math.floor(Date.now() / 86400000);
  return pool[dayIndex % pool.length];
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

const TIPO_STYLE: Record<DataTurismo["tipo"], { bg: string; color: string; label: string }> = {
  feriado:   { bg: "var(--red3)",    color: "var(--red)",    label: "Feriado" },
  vespera:   { bg: "var(--orange3)", color: "var(--orange)", label: "Véspera" },
  temporada: { bg: "var(--blue3)",   color: "var(--blue)",   label: "Temporada" },
  evento:    { bg: "var(--gold3)",   color: "var(--gold)",   label: "Evento" },
};

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

function formatData(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function WeatherIcon({ code, size = 22 }: { code: number | null; size?: number }) {
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

/* ── Component ───────────────────────────────────── */

export default function VendedorInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [quote, setQuote] = useState<string>("");
  const [postsHoje, setPostsHoje] = useState(0);
  const [loading, setLoading] = useState(true);

  const [cityName, setCityName] = useState<string>("Rio Preto");
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [novoCliente, setNovoCliente] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaNota, setNovaNota] = useState("");

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiaIdx, setNoticiaIdx] = useState(0);

  /* ── Load profile, posts, quote, weather ─────── */
  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);

      // Posts de hoje (por store quando possível)
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, metadata")
        .gte("created_at", inicioDia.toISOString())
        .in("event_type", ["post_instagram", "post_scheduled"]);
      const allLogs = (logs ?? []) as { id: string; metadata: Record<string, unknown> | null }[];
      const filtrados = p?.store_id
        ? allLogs.filter((l) => l.metadata?.store_id === p.store_id)
        : allLogs;
      setPostsHoje(filtrados.length);

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

  /* ── Lembretes (localStorage) ─────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LEMBRETES);
      if (raw) setLembretes(JSON.parse(raw));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (noticias.length <= 1) return;
    const t = setInterval(() => {
      setNoticiaIdx(i => (i + 1) % noticias.length);
    }, 6000);
    return () => clearInterval(t);
  }, [noticias.length]);

  function persistLembretes(next: Lembrete[]) {
    setLembretes(next);
    try { localStorage.setItem(LS_LEMBRETES, JSON.stringify(next)); } catch { /* silent */ }
  }

  function addLembrete() {
    if (!novoCliente.trim() || !novaData) return;
    const next: Lembrete[] = [
      ...lembretes,
      { id: uid(), cliente: novoCliente.trim(), data: novaData, nota: novaNota.trim(), feito: false },
    ].sort((a, b) => a.data.localeCompare(b.data));
    persistLembretes(next);
    setNovoCliente(""); setNovaData(""); setNovaNota("");
  }

  function toggleLembrete(id: string) {
    persistLembretes(lembretes.map((l) => l.id === id ? { ...l, feito: !l.feito } : l));
  }

  function removeLembrete(id: string) {
    persistLembretes(lembretes.filter((l) => l.id !== id));
  }

  /* ── Derived ──────────────────────────────────── */

  const proximosFeriados = useMemo(() => {
    return CALENDARIO_TURISMO
      .filter((d) => d.tipo === "feriado" && daysUntil(d.data) >= 0)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 3);
  }, []);

  const calendarioProximos = useMemo(() => {
    return CALENDARIO_TURISMO
      .filter((d) => {
        const diff = daysUntil(d.data);
        return diff >= 0 && diff <= 60;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, []);

  /* ── Render ──────────────────────────────────── */

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HEADER — saudação + quote + weather ═══ */}
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">
              Painel do Vendedor · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Olá, {profile?.name?.split(" ")[0] || "vendedor"}
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

      {/* ═══ 3 KPI / Action cards ═══════════════════ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Publicar agora */}
        <Link
          href="/vendedor/publicar"
          className="card-glass group relative flex items-center gap-4 overflow-hidden px-5 py-5 transition-transform hover:scale-[1.01]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30"
            style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
          />
          <div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
          >
            <Sparkles size={22} />
          </div>
          <div className="relative">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Ação rápida</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">
              Publicar agora
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Criar e postar uma arte</div>
          </div>
        </Link>

        {/* Posts de hoje */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#FF7A1A]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Send size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts de hoje</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsHoje}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Publicações da unidade</div>
          </div>
        </div>

        {/* Próximos feriados */}
        <div className="card-glass flex flex-col gap-2 px-5 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--red)]"
              style={{ background: "var(--red3)" }}
            >
              <CalendarDays size={16} />
            </div>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Próximos feriados</span>
          </div>
          <div className="flex flex-col gap-1">
            {proximosFeriados.map((f) => {
              const diff = daysUntil(f.data);
              return (
                <div key={f.data} className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-[var(--txt)]">{f.nome}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-[var(--orange3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--orange)]">
                    {diff === 0 ? "HOJE" : `em ${diff}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Lembretes + Calendário + Notícias ════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Lembretes ─────────────────────────── */}
        <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[#FF7A1A]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Lembretes</h3>
            </div>
            <span className="text-[11px] text-[var(--txt3)]">{lembretes.filter(l => !l.feito).length} pendentes</span>
          </div>

          <div className="p-5">
            {/* Form */}
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_0.9fr_auto]">
              <input
                type="text"
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
              />
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
              />
              <button
                onClick={addLembrete}
                disabled={!novoCliente.trim() || !novaData}
                className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[12px] font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <input
              type="text"
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
              placeholder="Nota (opcional)"
              className="mb-4 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />

            {/* Lista */}
            {lembretes.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhum lembrete. Adicione o primeiro acima.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {lembretes.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center gap-3 rounded-lg border border-[var(--bdr)] px-3 py-2 ${l.feito ? "opacity-50" : ""}`}
                  >
                    <button
                      onClick={() => toggleLembrete(l.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${l.feito ? "border-[var(--green)] bg-[var(--green)] text-white" : "border-[var(--bdr2)]"}`}
                    >
                      {l.feito && <Check size={12} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[12px] font-medium text-[var(--txt)] ${l.feito ? "line-through" : ""}`}>
                        {l.cliente}
                      </div>
                      {l.nota && <div className="truncate text-[10px] text-[var(--txt3)]">{l.nota}</div>}
                    </div>
                    <span className="shrink-0 text-[10px] text-[var(--txt3)] tabular-nums">{formatData(l.data)}</span>
                    <button
                      onClick={() => removeLembrete(l.id)}
                      className="text-[var(--txt3)] hover:text-[var(--red)]"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Calendário do turismo ─────────────── */}
        <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Plane size={15} className="text-[#FF7A1A]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Calendário do turismo</h3>
            </div>
            <span className="text-[11px] text-[var(--txt3)]">Próximos 60 dias</span>
          </div>
          <div className="p-5">
            {calendarioProximos.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhuma data nos próximos 60 dias.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {calendarioProximos.map((d) => {
                  const diff = daysUntil(d.data);
                  const style = TIPO_STYLE[d.tipo];
                  return (
                    <div key={d.data + d.nome} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--txt3)] tabular-nums">
                          {formatData(d.data)}
                        </div>
                        <div className="truncate text-[12px] text-[var(--txt)]">{d.nome}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.label}
                        </span>
                        <span className="w-12 text-right text-[10px] text-[var(--txt3)] tabular-nums">
                          {diff === 0 ? "hoje" : `em ${diff}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Notícias do Setor — slideshow ──────── */}
        <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Plane size={15} className="text-[#FF7A1A]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Notícias do setor</h3>
            </div>
            {noticias.length > 0 && (
              <div className="flex gap-1">
                {noticias.map((_, i) => (
                  <button key={i} onClick={() => setNoticiaIdx(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: i === noticiaIdx ? 16 : 6, background: i === noticiaIdx ? "#FF7A1A" : "var(--bdr2)" }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="relative flex-1 overflow-hidden">
            {noticias.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[var(--txt3)]">Carregando notícias...</div>
            ) : (() => {
              const n = noticias[noticiaIdx];
              return (
                <a href={n.url} target="_blank" rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity">
                  {n.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.image} alt=""
                      className="w-full h-36 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="px-5 py-4">
                    <p className="text-[13px] font-semibold leading-snug text-[var(--txt)]"
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {n.title}
                    </p>
                    {n.source && (
                      <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-[#FF7A1A]">
                        {n.source}
                      </span>
                    )}
                  </div>
                </a>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}

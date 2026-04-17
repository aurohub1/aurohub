"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  CalendarDays, Plus, Check, Trash2, ChevronLeft, ChevronRight, X,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Lembrete {
  id: string;
  cliente: string;
  data: string; // YYYY-MM-DD
  nota: string;
  feito: boolean;
}

interface DataComemorativa {
  id: string;
  nome: string;
  data_mes: number;
  data_dia: number;
  tipo: string;
}

type ViewMode = "mes" | "semana";

/* ── Constantes ──────────────────────────────────── */

const LS_LEMBRETES = "ah_gerente_lembretes_v1";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPO_BADGE: Record<string, { bg: string; color: string }> = {
  feriado:   { bg: "var(--red3)",    color: "var(--red)" },
  vespera:   { bg: "var(--orange3)", color: "var(--orange)" },
  temporada: { bg: "var(--blue3)",   color: "var(--blue)" },
  evento:    { bg: "var(--gold3)",   color: "var(--gold)" },
  segmento:  { bg: "rgba(167,139,250,0.18)", color: "#A78BFA" },
  lembrete:  { bg: "rgba(34,197,94,0.18)",   color: "var(--green)" },
};

/* ── Helpers ─────────────────────────────────────── */

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function isoDay(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function formatDia(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function sameISO(a: string, b: string): boolean {
  return a === b;
}

/* ── Component ───────────────────────────────────── */

export default function GerenteCalendarioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [view, setView] = useState<ViewMode>("mes");

  const now = new Date();
  const [cursor, setCursor] = useState<{ year: number; month: number }>({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string>(isoDay(now.getFullYear(), now.getMonth(), now.getDate()));

  const [feriados, setFeriados] = useState<DataComemorativa[]>([]);
  const [datasSegmento, setDatasSegmento] = useState<DataComemorativa[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formCliente, setFormCliente] = useState("");
  const [formData, setFormData] = useState(selectedDay);
  const [formNota, setFormNota] = useState("");

  /* ── Load ─────────────────────────────────────── */

  const loadData = useCallback(async () => {
    const p = await getProfile(supabase);
    setProfile(p);

    const segmentId = p?.licensee?.segment_id ?? null;

    try {
      // Todas as datas do mês atual + próximo (o cursor move depois)
      const mesA = cursor.month + 1;
      const mesB = mesA === 12 ? 1 : mesA + 1;
      const anoB = mesA === 12 ? cursor.year + 1 : cursor.year;

      const { data: dcA } = await supabase
        .from("datas_comemorativas")
        .select("*")
        .in("data_mes", [mesA, mesB]);

      const all = ((dcA ?? []) as (DataComemorativa & { segment_id?: string | null })[]);
      setFeriados(all.filter((d) => d.tipo !== "segmento" && d.tipo !== "evento"));
      setDatasSegmento(
        all.filter((d) => d.tipo === "segmento" || d.tipo === "evento" || (segmentId && d.segment_id === segmentId))
      );
      console.log("[Calendario] datas_comemorativas:", all.length, "rows — tipos:", [...new Set(all.map((d) => d.tipo))]);
      void anoB;
    } catch (err) {
      console.warn("[Calendario] erro ao carregar datas_comemorativas:", err);
    }
  }, [cursor.month, cursor.year]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LEMBRETES);
      if (raw) setLembretes(JSON.parse(raw));
    } catch { /* silent */ }
  }, []);

  function persistLembretes(next: Lembrete[]) {
    setLembretes(next);
    try { localStorage.setItem(LS_LEMBRETES, JSON.stringify(next)); } catch { /* silent */ }
  }

  /* ── Derived — eventos por dia ─────────────────── */

  interface Evento { tipo: string; label: string; source: "feriado" | "segmento" | "lembrete"; refId?: string; }

  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    const add = (iso: string, ev: Evento) => { (map[iso] ??= []).push(ev); };

    const buildIso = (row: { data_mes?: number; data_dia?: number; data?: string }): string | null => {
      if (row.data && typeof row.data === "string") {
        const d = new Date(row.data + "T12:00:00");
        if (!isNaN(d.getTime())) return isoDay(d.getFullYear(), d.getMonth(), d.getDate());
      }
      if (typeof row.data_mes === "number" && typeof row.data_dia === "number") {
        return isoDay(cursor.year, row.data_mes - 1, row.data_dia);
      }
      return null;
    };

    for (const f of feriados) {
      const iso = buildIso(f);
      if (iso) add(iso, { tipo: f.tipo, label: f.nome, source: "feriado" });
    }
    for (const s of datasSegmento) {
      const iso = buildIso(s);
      if (iso) add(iso, { tipo: "segmento", label: s.nome, source: "segmento" });
    }
    for (const l of lembretes) {
      add(l.data, { tipo: "lembrete", label: `${l.cliente}${l.nota ? " — " + l.nota : ""}`, source: "lembrete", refId: l.id });
    }
    return map;
  }, [feriados, datasSegmento, lembretes, cursor.year]);

  /* ── Month grid ───────────────────────────────── */

  const monthGrid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];

    // leading from prev month
    const prevDays = new Date(cursor.year, cursor.month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevDays - i;
      const prevMonth = cursor.month === 0 ? 11 : cursor.month - 1;
      const prevYear = cursor.month === 0 ? cursor.year - 1 : cursor.year;
      cells.push({ iso: isoDay(prevYear, prevMonth, d), day: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: isoDay(cursor.year, cursor.month, d), day: d, inMonth: true });
    }
    // trailing
    while (cells.length % 7 !== 0) {
      const d = cells.length - (startOffset + daysInMonth) + 1;
      const nextMonth = cursor.month === 11 ? 0 : cursor.month + 1;
      const nextYear = cursor.month === 11 ? cursor.year + 1 : cursor.year;
      cells.push({ iso: isoDay(nextYear, nextMonth, d), day: d, inMonth: false });
    }
    return cells;
  }, [cursor]);

  /* ── Week list ────────────────────────────────── */

  const weekList = useMemo(() => {
    const start = parseIso(selectedDay);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return isoDay(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [selectedDay]);

  /* ── Handlers ─────────────────────────────────── */

  function navMonth(delta: number) {
    setCursor((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  }

  function openAddLembrete() {
    setFormCliente("");
    setFormData(selectedDay);
    setFormNota("");
    setModalOpen(true);
  }

  function saveLembrete() {
    if (!formCliente.trim() || !formData) return;
    const next = [
      ...lembretes,
      { id: uid(), cliente: formCliente.trim(), data: formData, nota: formNota.trim(), feito: false },
    ].sort((a, b) => a.data.localeCompare(b.data));
    persistLembretes(next);
    setModalOpen(false);
  }

  function toggleLembrete(id: string) {
    persistLembretes(lembretes.map((l) => l.id === id ? { ...l, feito: !l.feito } : l));
  }

  function removeLembrete(id: string) {
    persistLembretes(lembretes.filter((l) => l.id !== id));
  }

  /* ── Render ───────────────────────────────────── */

  const todayIso = isoDay(now.getFullYear(), now.getMonth(), now.getDate());
  const diaEventos = eventosPorDia[selectedDay] ?? [];

  return (
    <>
      {/* ═══ HEADER ═══════════════════════════════ */}
      <div className="card-glass flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="min-w-[180px] text-center">
            <div className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-tight text-[var(--txt)]">
              {MESES[cursor.month]} {cursor.year}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--txt3)]">
              {profile?.store?.name || "—"}
            </div>
          </div>
          <button
            onClick={() => navMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--bdr)] p-0.5">
            {(["mes", "semana"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors"
                style={view === v
                  ? { background: "var(--orange)", color: "#fff" }
                  : { color: "var(--txt3)" }}
              >
                {v === "mes" ? "Mês" : "Semana"}
              </button>
            ))}
          </div>
          <button
            onClick={openAddLembrete}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Plus size={14} /> Novo lembrete
          </button>
        </div>
      </div>

      {/* ═══ GRID: Calendário + Painel do dia ══════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Calendário ───────────────────────── */}
        <div className="card-glass overflow-hidden">
          {view === "mes" ? (
            <>
              <div className="grid grid-cols-7 border-b border-[var(--bdr)] bg-[var(--bg2)]">
                {DIAS_SEM.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGrid.map((cell) => {
                  const isToday = sameISO(cell.iso, todayIso);
                  const isSelected = sameISO(cell.iso, selectedDay);
                  const evs = eventosPorDia[cell.iso] ?? [];
                  const hasFeriado = evs.some((e) => e.tipo === "feriado");
                  const hasVespera = evs.some((e) => e.tipo === "vespera");
                  const cellBg = isSelected
                    ? "rgba(255,122,26,0.10)"
                    : hasFeriado
                      ? "rgba(239,68,68,0.08)"
                      : hasVespera
                        ? "rgba(255,122,26,0.06)"
                        : undefined;
                  const feriadoLabel = evs.find((e) => e.tipo === "feriado")?.label
                    ?? evs.find((e) => e.tipo === "vespera")?.label;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() => setSelectedDay(cell.iso)}
                      title={feriadoLabel}
                      className="group relative flex min-h-[70px] flex-col gap-1 border-b border-r border-[var(--bdr)] p-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
                      style={cellBg ? { background: cellBg } : undefined}
                    >
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          cell.inMonth ? "text-[var(--txt)]" : "text-[var(--txt3)] opacity-50"
                        }`}
                      >
                        {isToday ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--orange)] text-[10px] font-bold text-white">
                            {cell.day}
                          </span>
                        ) : cell.day}
                      </span>
                      {feriadoLabel && (
                        <span className="line-clamp-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--red)]">
                          {feriadoLabel}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-0.5">
                        {evs.slice(0, 3).map((e, i) => {
                          const style = TIPO_BADGE[e.tipo] ?? TIPO_BADGE.evento;
                          return <span key={i} className="h-2 w-2 rounded-full" style={{ background: style.color }} />;
                        })}
                        {evs.length > 3 && <span className="text-[8px] text-[var(--txt3)]">+{evs.length - 3}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              {weekList.map((iso) => {
                const d = parseIso(iso);
                const evs = eventosPorDia[iso] ?? [];
                const isToday = sameISO(iso, todayIso);
                const isSelected = sameISO(iso, selectedDay);
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDay(iso)}
                    className="flex items-start gap-4 border-b border-[var(--bdr)] p-4 text-left transition-colors hover:bg-[var(--hover-bg)]"
                    style={isSelected ? { background: "rgba(255,122,26,0.08)" } : undefined}
                  >
                    <div className="w-12 shrink-0 text-center">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-[var(--txt3)]">
                        {DIAS_SEM[d.getDay()]}
                      </div>
                      <div
                        className={`mt-0.5 font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-none tabular-nums ${
                          isToday ? "text-[var(--orange)]" : "text-[var(--txt)]"
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {evs.length === 0 ? (
                        <span className="text-[11px] text-[var(--txt3)]">Sem eventos</span>
                      ) : (
                        evs.map((e, i) => {
                          const style = TIPO_BADGE[e.tipo] ?? TIPO_BADGE.evento;
                          return (
                            <div key={i} className="flex items-center gap-2 page-fade">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: style.color }} />
                              <span className="truncate text-[12px] text-[var(--txt2)]">{e.label}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Painel do dia selecionado ──────────── */}
        <div className="card-glass flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--bdr)] px-5 py-4">
            <CalendarDays size={15} className="text-[var(--orange)]" />
            <h3 className="text-[14px] font-bold text-[var(--txt)]">{formatDia(selectedDay)}</h3>
          </div>
          <div className="flex flex-col gap-2 p-5">
            {diaEventos.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhum evento neste dia.</div>
            ) : (
              diaEventos.map((e, i) => {
                const style = TIPO_BADGE[e.tipo] ?? TIPO_BADGE.evento;
                const lem = e.source === "lembrete" ? lembretes.find((l) => l.id === e.refId) : null;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-[var(--bdr)] px-3 py-2">
                    {lem ? (
                      <button
                        onClick={() => toggleLembrete(lem.id)}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          lem.feito ? "border-[var(--green)] bg-[var(--green)] text-white" : "border-[var(--bdr2)]"
                        }`}
                      >
                        {lem.feito && <Check size={10} />}
                      </button>
                    ) : (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: style.color }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[12px] font-medium text-[var(--txt)] ${lem?.feito ? "line-through opacity-60" : ""}`}
                      >
                        {e.label}
                      </div>
                      <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {e.tipo}
                      </span>
                    </div>
                    {lem && (
                      <button
                        onClick={() => removeLembrete(lem.id)}
                        className="text-[var(--txt3)] hover:text-[var(--red)]"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODAL — Novo lembrete ═════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-md rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--txt)]">Novo lembrete</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--txt3)] hover:bg-[var(--hover-bg)]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Nome do cliente</label>
                <input
                  type="text"
                  value={formCliente}
                  onChange={(e) => setFormCliente(e.target.value)}
                  placeholder="Ex.: Maria Oliveira"
                  autoFocus
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Data</label>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Nota (opcional)</label>
                <input
                  type="text"
                  value={formNota}
                  onChange={(e) => setFormNota(e.target.value)}
                  placeholder="Ex.: aniversário, viagem em julho"
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-semibold text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
              >
                Cancelar
              </button>
              <button
                onClick={saveLembrete}
                disabled={!formCliente.trim() || !formData}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
              >
                <Plus size={13} /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

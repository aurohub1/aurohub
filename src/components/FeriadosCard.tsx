"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export interface FeriadoItem { nome: string; data: string; } // data = YYYY-MM-DD

function daysUntil(iso: string): number {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

/* ── Mini Calendar ─────────────────────────────── */

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function MiniCalendar({ feriados }: { feriados: FeriadoItem[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const feriadoSet = useMemo(() => {
    const s = new Set<string>();
    for (const f of feriados) s.add(f.data);
    return s;
  }, [feriados]);

  const feriadoMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of feriados) m.set(f.data, f.nome);
    return m;
  }, [feriados]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prev} className="rounded p-0.5 text-[var(--txt3)] hover:text-[var(--txt)]"><ChevronLeft size={14} /></button>
        <span className="text-[11px] font-bold text-[var(--txt)]">{MONTH_NAMES[month]} {year}</span>
        <button type="button" onClick={next} className="rounded p-0.5 text-[var(--txt3)] hover:text-[var(--txt)]"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-0.5 text-[8px] font-bold uppercase text-[var(--txt3)]">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
          const isToday = iso === todayISO;
          const isFeriado = feriadoSet.has(iso);
          const nome = feriadoMap.get(iso);
          return (
            <div
              key={iso}
              title={nome || undefined}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] tabular-nums mx-auto"
              style={
                isFeriado
                  ? { background: "var(--orange)", color: "#fff", fontWeight: 700 }
                  : isToday
                    ? { background: "var(--blue)", color: "#fff", fontWeight: 700 }
                    : { color: "var(--txt2)" }
              }
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Card ─────────────────────────────────── */

export default function FeriadosCard({ feriados }: { feriados: FeriadoItem[] }) {
  const next5 = feriados.filter((f) => daysUntil(f.data) >= 0).slice(0, 5);

  return (
    <div className="card-glass flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-[var(--orange)]" />
          <h3 className="text-[14px] font-bold text-[var(--txt)]">Próximos feriados</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
          {feriados.length}
        </span>
      </div>

      {/* Mini calendar */}
      <MiniCalendar feriados={feriados} />

      {/* List */}
      <div className="flex flex-col gap-2 border-t border-[var(--bdr)] p-4">
        {next5.length === 0 ? (
          <div className="py-2 text-center text-[12px] text-[var(--txt3)]">
            Sem feriados próximos.
          </div>
        ) : (
          next5.map((f) => {
            const diff = daysUntil(f.data);
            const d = new Date(f.data + "T00:00:00");
            const dia = pad(d.getDate());
            const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
            return (
              <div
                key={f.data + f.nome}
                className="flex items-center gap-3 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 transition-colors hover:border-[rgba(59,130,246,0.4)]"
              >
                <div
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #3B82F6 100%)" }}
                >
                  <span className="font-[family-name:var(--font-dm-serif)] text-[16px] font-bold leading-none tabular-nums">
                    {dia}
                  </span>
                  <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider opacity-90">
                    {mes}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-[var(--txt)]">{f.nome}</div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold tabular-nums"
                  style={
                    diff === 0
                      ? { background: "var(--red3)", color: "var(--red)" }
                      : { background: "var(--orange3)", color: "var(--orange)" }
                  }
                >
                  {diff === 0 ? "HOJE" : `em ${diff}d`}
                </span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

"use client";

import { CalendarDays, CalendarPlus } from "lucide-react";

export interface FeriadoItem { nome: string; data: string; } // data = YYYY-MM-DD

function daysUntil(iso: string): number {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

function icsDate(iso: string): string {
  // YYYY-MM-DD → YYYYMMDD
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dtstamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function buildIcs(feriados: FeriadoItem[]): string {
  const stamp = dtstamp();
  const events = feriados.map((f, i) => [
    "BEGIN:VEVENT",
    `UID:aurohub-feriado-${icsDate(f.data)}-${i}@aurohub`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(f.data)}`,
    `DTEND;VALUE=DATE:${icsDate(nextDay(f.data))}`,
    `SUMMARY:${f.nome.replace(/[,;\\]/g, " ")}`,
    "DESCRIPTION:Feriado — agenda Aurohub",
    "END:VEVENT",
  ].join("\r\n")).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aurohub//Feriados//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Feriados Aurohub",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function exportIcs(feriados: FeriadoItem[]) {
  if (feriados.length === 0) return;
  const ics = buildIcs(feriados);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feriados-aurohub.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FeriadosCard({ feriados }: { feriados: FeriadoItem[] }) {
  return (
    <div className="card-glass flex h-[320px] flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-[var(--orange)]" />
          <h3 className="text-[14px] font-bold text-[var(--txt)]">Próximos feriados</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
          {feriados.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {feriados.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[12px] text-[var(--txt3)]">
            Sem feriados próximos.
          </div>
        ) : (
          feriados.map((f) => {
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

      {feriados.length > 0 && (
        <button
          type="button"
          onClick={() => exportIcs(feriados)}
          className="flex shrink-0 items-center justify-center gap-1.5 border-t border-[var(--bdr)] px-4 py-2 text-[11px] font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--orange)]"
        >
          <CalendarPlus size={12} />
          Exportar para Google Agenda
        </button>
      )}
    </div>
  );
}

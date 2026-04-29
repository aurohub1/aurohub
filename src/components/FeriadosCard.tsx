"use client";

import { CalendarDays } from "lucide-react";

export interface FeriadoItem { nome: string; data: string; } // data = YYYY-MM-DD

function daysUntil(iso: string): number {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

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

      {/* List */}
      <div className="flex flex-col gap-2 p-4">
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
                className="flex items-center gap-3 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 transition-shadow duration-200 hover:shadow-md hover:border-[rgba(59,130,246,0.4)]"
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

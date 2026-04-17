"use client";

import { PublicationRow, FORMATO_LABEL } from "./types";

interface Props { rows: PublicationRow[]; limit?: number; }

export default function HistoryTable({ rows, limit = 50 }: Props) {
  const view = rows.slice(0, limit);
  return (
    <div
      className="p-6"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--bdr2)",
        borderRadius: 20,
      }}
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--txt)" }}>Histórico recente</h3>
          <p className="text-xs" style={{ color: "var(--txt3)" }}>
            Últimos {Math.min(limit, rows.length)} registros do período
          </p>
        </div>
      </div>
      {view.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 mb-3" style={{ color: "var(--txt3)" }} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>Nenhum registro no período.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bdr2)" }}>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--txt3)" }}>Data</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--txt3)" }}>Template</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--txt3)" }}>Formato</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--txt3)" }}>Destino</th>
                <th className="py-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--txt3)" }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => {
                const zebra = i % 2 === 0 ? "var(--hover-bg)" : "transparent";
                return (
                  <tr
                    key={r.id}
                    className="transition-colors"
                    style={{ background: zebra }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = zebra; }}
                  >
                    <td className="py-2.5 pr-4 text-xs tabular-nums" style={{ color: "var(--txt2)" }}>
                      {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 pr-4 text-sm truncate max-w-[240px]" style={{ color: "var(--txt)" }}>{r.template_nome || "—"}</td>
                    <td className="py-2.5 pr-4 text-sm" style={{ color: "var(--txt2)" }}>{FORMATO_LABEL[r.formato] || r.formato}</td>
                    <td className="py-2.5 pr-4 text-sm" style={{ color: "var(--txt2)" }}>{r.destino || "—"}</td>
                    <td className="py-2.5">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={
                          r.tipo === "publicado"
                            ? { background: "var(--blue3)", color: "var(--blue)" }
                            : { background: "var(--orange3)", color: "var(--orange)" }
                        }
                      >
                        {r.tipo === "publicado" ? "Publicado" : "Download"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

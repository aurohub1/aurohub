"use client";

import { PublicationRow, FORMATO_LABEL } from "./types";

interface Props { rows: PublicationRow[]; limit?: number; }

export default function HistoryTable({ rows, limit = 50 }: Props) {
  const view = rows.slice(0, limit);
  return (
    <div
      className="p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
      }}
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Histórico recente</h3>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Últimos {Math.min(limit, rows.length)} registros do período
          </p>
        </div>
      </div>
      {view.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 mb-3" style={{ color: "rgba(255,255,255,0.2)" }} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum registro no período.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.4)" }}>Data</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.4)" }}>Template</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.4)" }}>Formato</th>
                <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.4)" }}>Destino</th>
                <th className="py-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => (
                <tr
                  key={r.id}
                  className="transition-colors"
                  style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"; }}
                >
                  <td className="py-2.5 pr-4 text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-white truncate max-w-[240px]">{r.template_nome || "—"}</td>
                  <td className="py-2.5 pr-4 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{FORMATO_LABEL[r.formato] || r.formato}</td>
                  <td className="py-2.5 pr-4 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{r.destino || "—"}</td>
                  <td className="py-2.5">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={
                        r.tipo === "publicado"
                          ? { background: "rgba(59,130,246,0.15)", color: "#60A5FA" }
                          : { background: "rgba(255,122,26,0.15)", color: "#FFB380" }
                      }
                    >
                      {r.tipo === "publicado" ? "Publicado" : "Download"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

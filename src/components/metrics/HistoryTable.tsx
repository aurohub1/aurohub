"use client";

import { PublicationRow, FORMATO_LABEL } from "./types";

interface Props { rows: PublicationRow[]; limit?: number; }

export default function HistoryTable({ rows, limit = 50 }: Props) {
  const view = rows.slice(0, limit);
  return (
    <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Histórico recente</h3>
          <p className="text-xs text-slate-500">Últimos {Math.min(limit, rows.length)} registros do período</p>
        </div>
      </div>
      {view.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-slate-300 mb-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-slate-400">Nenhum registro no período.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-semibold">Data</th>
                <th className="py-2 pr-4 font-semibold">Template</th>
                <th className="py-2 pr-4 font-semibold">Formato</th>
                <th className="py-2 pr-4 font-semibold">Destino</th>
                <th className="py-2 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {view.map(r => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 text-xs text-slate-500 tabular-nums">
                    {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 pr-4 text-sm text-slate-700 truncate max-w-[240px]">{r.template_nome || "—"}</td>
                  <td className="py-2 pr-4 text-sm text-slate-600">{FORMATO_LABEL[r.formato] || r.formato}</td>
                  <td className="py-2 pr-4 text-sm text-slate-600">{r.destino || "—"}</td>
                  <td className="py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.tipo === "publicado"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
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

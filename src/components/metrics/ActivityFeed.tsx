"use client";

import { PublicationRow, Formato, FORMATO_LABEL, FORMATO_COLOR } from "./types";
import { Rocket, Download, Circle, Film, Image as ImageIcon, Tv } from "lucide-react";

interface Props { rows: PublicationRow[]; limit?: number; }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return "agora";
  if (diff < hr) return `há ${Math.floor(diff / min)}min`;
  if (diff < day) return `há ${Math.floor(diff / hr)}h`;
  if (diff < 2 * day) return "ontem";
  return `há ${Math.floor(diff / day)}d`;
}

function iconForFormato(f: Formato) {
  switch (f) {
    case "stories": return <Circle size={13} />;
    case "reels":   return <Film size={13} />;
    case "feed":    return <ImageIcon size={13} />;
    case "tv":      return <Tv size={13} />;
  }
}

export default function ActivityFeed({ rows, limit = 8 }: Props) {
  const view = rows.slice(0, limit);
  return (
    <div
      className="p-5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
      }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Atividade recente</h3>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Últimos {limit} registros</p>
      </div>
      {view.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Rocket className="w-6 h-6 mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Sem atividade ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {view.map(r => {
            const color = FORMATO_COLOR[r.formato] || "#3B82F6";
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${color}1A`, color }}
                >
                  {iconForFormato(r.formato)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">
                    {r.template_nome || "(sem nome)"}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>{FORMATO_LABEL[r.formato]}</span>
                    <span>·</span>
                    <span>{relativeTime(r.created_at)}</span>
                  </div>
                </div>
                <div
                  className="shrink-0 rounded-full p-1"
                  style={
                    r.tipo === "publicado"
                      ? { background: "rgba(59,130,246,0.15)", color: "#60A5FA" }
                      : { background: "rgba(255,122,26,0.15)", color: "#FFB380" }
                  }
                  title={r.tipo === "publicado" ? "Publicado" : "Download"}
                >
                  {r.tipo === "publicado" ? <Rocket size={11} /> : <Download size={11} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

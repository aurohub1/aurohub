"use client";

import { useState } from "react";

/* ── Types ────────────────────────────────────────────────── */

export interface HistoryLog {
  id: string;
  created_at: string;
  metadata: {
    licensee_id?: string;
    store_id?: string;
    media_type?: string;
    format?: string;
    caption?: string;
    ig_post_id?: string;
    image_url?: string;
    video_url?: string;
    thumbnail_url?: string;
    status?: string;
  };
}

/* ── Constants ────────────────────────────────────────────── */

export const PAGE_SIZE = 24;

export const MEDIA_FILTERS: { value: string; label: string }[] = [
  { value: "todos",   label: "Todos"   },
  { value: "IMAGE",   label: "Feed"    },
  { value: "REELS",   label: "Reels"   },
  { value: "STORIES", label: "Stories" },
];

export const TYPE_INFO: Record<string, { label: string; bg: string; color: string }> = {
  IMAGE:   { label: "Feed",    bg: "var(--blue3)",   color: "var(--blue)"   },
  REELS:   { label: "Reels",   bg: "var(--purple3)", color: "var(--purple)" },
  STORIES: { label: "Stories", bg: "var(--orange3)", color: "var(--orange)" },
};

export const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: "Publicado",   bg: "var(--green3)", color: "var(--green)" },
  queued:    { label: "Processando", bg: "var(--gold3)",  color: "var(--gold)"  },
  failed:    { label: "Falhou",      bg: "var(--red3)",   color: "var(--red)"   },
};

/* ── Helpers ──────────────────────────────────────────────── */

export function fmtDate(s: string) {
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── SkeletonCard ─────────────────────────────────────────── */

export function SkeletonCard({ aspectRatio = "1/1" }: { aspectRatio?: string }) {
  return (
    <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
      <div style={{ aspectRatio, background: "var(--bg2)", opacity: 0.6 }} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 12, width: "60%", borderRadius: 6, background: "var(--bg2)" }} />
        <div style={{ height: 10, width: "80%", borderRadius: 6, background: "var(--bg2)" }} />
        <div style={{ height: 10, width: "40%", borderRadius: 6, background: "var(--bg2)" }} />
      </div>
    </div>
  );
}

/* ── PostCard ─────────────────────────────────────────────── */

export function PostCard({
  log, licName, storeName, showDeleteButton, onDelete,
}: {
  log: HistoryLog;
  licName: string;
  storeName: string;
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const m = log.metadata;
  const thumb   = m.thumbnail_url ?? m.image_url ?? null;
  const isVideo = !!m.video_url && !m.image_url;
  const typeInfo   = TYPE_INFO[m.media_type ?? ""] ?? { label: m.media_type ?? "—", bg: "var(--bg2)", color: "var(--txt3)" };
  const statusInfo = STATUS_INFO[m.status ?? "published"] ?? STATUS_INFO.published;
  const primaryLabel = licName || storeName || "—";

  return (
    <div
      className="card-glass page-fade"
      style={{ borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "var(--bg2)", flexShrink: 0 }}>
        {!imgError && thumb ? (
          <img src={thumb} alt="" onError={() => setImgError(true)} style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            transition: "transform 0.3s", transform: hovered ? "scale(1.05)" : "scale(1)",
          }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "var(--bg2)" }}>
            {isVideo && !imgError ? (
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 36, height: 36, color: "var(--txt3)" }}>
                <path d="M5 4l12 6-12 6V4z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 36, height: 36, color: "var(--txt3)", opacity: 0.3 }}>
                <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 14l4-4 4 4 3-3 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: typeInfo.bg, color: typeInfo.color,
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.04em",
        }}>
          {typeInfo.label}
        </div>

        {/* Delete button — only for ADM */}
        {showDeleteButton && hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete?.(log.id); }}
            title="Apagar registro"
            style={{
              position: "absolute", top: 6, right: 6,
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(239,68,68,0.85)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 14, height: 14 }}>
              <path d="M3 6h14M8 6V4h4v2M6 6l1 10h6l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Caption overlay on hover */}
        {hovered && m.caption && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)",
            display: "flex", alignItems: "flex-end", padding: 10,
            pointerEvents: "none",
          }}>
            <p style={{
              color: "#fff", fontSize: 12, lineHeight: 1.45, margin: 0,
              display: "-webkit-box", WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {m.caption}
            </p>
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <span style={{
            fontSize: 12, color: "var(--txt)", fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {primaryLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
            background: statusInfo.bg, color: statusInfo.color,
          }}>
            {statusInfo.label}
          </span>
        </div>

        {/* Show store name below when licName also present */}
        {licName && storeName && (
          <span style={{ fontSize: 11, color: "var(--txt3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {storeName}
          </span>
        )}

        <span style={{ fontSize: 11, color: "var(--txt3)" }}>{fmtDate(log.created_at)}</span>

        {m.caption && (
          <p style={{
            fontSize: 12, color: "var(--txt2)", margin: "2px 0 0",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4,
          }}>
            {m.caption}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── PostHistoryGrid ──────────────────────────────────────── */

interface PostHistoryGridProps {
  logs: HistoryLog[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPage: (pg: number) => void;
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
  storeMap: Record<string, string>;
  licMap?: Record<string, string>;
  publishHref?: string;
  mediaFilter?: string;
}

export default function PostHistoryGrid({
  logs, loading, total, page, totalPages, onPage,
  showDeleteButton = false, onDelete,
  storeMap, licMap = {},
  publishHref = "/central-de-publicacao",
  mediaFilter,
}: PostHistoryGridProps) {
  const skeletonRatio =
    mediaFilter === "STORIES" || mediaFilter === "REELS" ? "9/16"
    : mediaFilter === "IMAGE" ? "4/5"
    : "1/1";

  if (!loading && logs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: 16 }}>
        <svg viewBox="0 0 64 64" fill="none" style={{ width: 64, height: 64, color: "var(--txt3)", opacity: 0.3 }}>
          <rect x="8" y="8" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="3" />
          <path d="M20 36l8-8 8 8 8-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="3" />
        </svg>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--txt2)", margin: 0 }}>Nenhum post encontrado</p>
        <p style={{ fontSize: 13, color: "var(--txt3)", margin: 0 }}>Ainda não há posts publicados via Central</p>
        <a href={publishHref} style={{
          marginTop: 8, padding: "10px 22px", borderRadius: 10,
          background: "var(--orange)", color: "#fff", fontSize: 14,
          fontWeight: 600, textDecoration: "none",
        }}>
          Ir para Central de Publicação
        </a>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, minHeight: "400px", alignContent: "start" }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} aspectRatio={skeletonRatio} />)
          : logs.map(log => (
              <PostCard
                key={log.id}
                log={log}
                licName={licMap[log.metadata?.licensee_id ?? ""] ?? ""}
                storeName={storeMap[log.metadata?.store_id ?? ""] ?? ""}
                showDeleteButton={showDeleteButton}
                onDelete={onDelete}
              />
            ))
        }
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 32, flexWrap: "wrap" }}>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1px solid var(--bdr)", cursor: page === 0 ? "not-allowed" : "pointer",
              background: page === 0 ? "transparent" : "var(--card-bg)",
              color: page === 0 ? "var(--txt3)" : "var(--txt2)",
            }}
          >
            ← Anterior
          </button>

          {(() => {
            const maxVisible = 7;
            const start = totalPages > maxVisible
              ? Math.max(0, Math.min(page - 3, totalPages - maxVisible))
              : 0;
            const count = Math.min(maxVisible, totalPages);
            return Array.from({ length: count }).map((_, i) => {
              const pg = start + i;
              const active = pg === page;
              return (
                <button
                  key={pg}
                  onClick={() => onPage(pg)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                    background: active ? "var(--orange)" : "var(--card-bg)",
                    color: active ? "#fff" : "var(--txt2)",
                    border: `1px solid ${active ? "var(--orange)" : "var(--bdr)"}`,
                  }}
                >
                  {pg + 1}
                </button>
              );
            });
          })()}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages - 1}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1px solid var(--bdr)",
              cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              background: page >= totalPages - 1 ? "transparent" : "var(--card-bg)",
              color: page >= totalPages - 1 ? "var(--txt3)" : "var(--txt2)",
            }}
          >
            Próximo →
          </button>
        </div>
      )}
    </>
  );
}

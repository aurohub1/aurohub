"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmGuard } from "@/contexts/AdmContext";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────── */

type MediaTypeFilter = "todos" | "IMAGE" | "REELS" | "STORIES";

interface HistoryLog {
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

interface Licensee { id: string; name: string; }
interface Store { id: string; name: string; licensee_id: string; }

/* ── Constants ───────────────────────────────────────────── */

const PAGE_SIZE = 24;

const MEDIA_FILTERS: { value: MediaTypeFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "IMAGE", label: "Feed" },
  { value: "REELS", label: "Reels" },
  { value: "STORIES", label: "Stories" },
];

const TYPE_INFO: Record<string, { label: string; bg: string; color: string }> = {
  IMAGE:   { label: "Feed",    bg: "var(--blue3)",   color: "var(--blue)"   },
  REELS:   { label: "Reels",   bg: "var(--purple3)", color: "var(--purple)" },
  STORIES: { label: "Stories", bg: "var(--orange3)", color: "var(--orange)" },
};

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: "Publicado",    bg: "var(--green3)", color: "var(--green)" },
  queued:    { label: "Processando",  bg: "var(--gold3)",  color: "var(--gold)"  },
  failed:    { label: "Falhou",       bg: "var(--red3)",   color: "var(--red)"   },
};

/* ── Helpers ─────────────────────────────────────────────── */

function fmtDate(s: string) {
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── SkeletonCard ────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
      <div style={{ aspectRatio: "1/1", background: "var(--bg2)", opacity: 0.6 }} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 12, width: "60%", borderRadius: 6, background: "var(--bg2)" }} />
        <div style={{ height: 10, width: "80%", borderRadius: 6, background: "var(--bg2)" }} />
        <div style={{ height: 10, width: "40%", borderRadius: 6, background: "var(--bg2)" }} />
      </div>
    </div>
  );
}

/* ── PostCard ────────────────────────────────────────────── */

function PostCard({
  log, licName, storeName, onDelete,
}: {
  log: HistoryLog;
  licName: string;
  storeName: string;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const m = log.metadata;
  const thumb = m.thumbnail_url ?? m.image_url ?? null;
  const isVideo = !!m.video_url && !m.image_url;
  const typeInfo = TYPE_INFO[m.media_type ?? ""] ?? { label: m.media_type ?? "—", bg: "var(--bg2)", color: "var(--txt3)" };
  const statusInfo = STATUS_INFO[m.status ?? "published"] ?? STATUS_INFO.published;

  return (
    <div
      className="card-glass page-fade"
      style={{ borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "var(--bg2)", flexShrink: 0 }}>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              transition: "transform 0.3s", transform: hovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        ) : isVideo ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 36, height: 36, color: "var(--txt3)" }}>
              <path d="M5 4l12 6-12 6V4z" fill="currentColor" />
            </svg>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 36, height: 36, color: "var(--txt3)", opacity: 0.3 }}>
              <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14l4-4 4 4 3-3 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
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

        {/* Trash button — visible on hover */}
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(log.id); }}
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
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
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
            {licName || "—"}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
            background: statusInfo.bg, color: statusInfo.color,
          }}>
            {statusInfo.label}
          </span>
        </div>

        {storeName && (
          <span style={{ fontSize: 11, color: "var(--txt3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {storeName}
          </span>
        )}

        <span style={{ fontSize: 11, color: "var(--txt3)" }}>{fmtDate(log.created_at)}</span>

        {m.caption && (
          <p style={{
            fontSize: 12, color: "var(--txt2)", margin: "2px 0 0",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
          }}>
            {m.caption}
          </p>
        )}

      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */

export default function HistoricoPostagensPage() {
  const { allowed } = useAdmGuard("can_view_logs");

  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);

  const [licFilter, setLicFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaTypeFilter>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const storesForLic = useMemo(
    () => allStores.filter(s => !licFilter || s.licensee_id === licFilter),
    [allStores, licFilter]
  );
  const licMap = useMemo(() => Object.fromEntries(licensees.map(l => [l.id, l.name])), [licensees]);
  const storeMap = useMemo(() => Object.fromEntries(allStores.map(s => [s.id, s.name])), [allStores]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(licFilter || storeFilter || mediaFilter !== "todos" || dateFrom || dateTo || search);

  /* ── Reference data ──────────────────────────────────── */

  useEffect(() => {
    async function init() {
      const [{ data: lics }, { data: stores }] = await Promise.all([
        supabase.from("licensees").select("id, name").order("name"),
        supabase.from("stores").select("id, name, licensee_id").order("name"),
      ]);
      setLicensees((lics as Licensee[]) ?? []);
      setAllStores((stores as Store[]) ?? []);
    }
    init();
  }, []);

  /* ── History query ───────────────────────────────────── */

  const loadHistory = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      let q = supabase
        .from("activity_logs")
        .select("id, created_at, metadata", { count: "exact" })
        .eq("event_type", "post_instagram")
        .filter("metadata->>source", "eq", "central")
        .order("created_at", { ascending: false })
        .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

      if (licFilter) q = q.filter("metadata->>licensee_id", "eq", licFilter);
      if (storeFilter) q = q.filter("metadata->>store_id", "eq", storeFilter);
      if (mediaFilter !== "todos") q = q.filter("metadata->>media_type", "eq", mediaFilter);
      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

      const { data, count } = await q;
      setLogs((data as HistoryLog[]) ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error("[Histórico] loadHistory:", err);
    } finally {
      setLoading(false);
    }
  }, [licFilter, storeFilter, mediaFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
    loadHistory(0);
  }, [loadHistory]);

  /* ── Client-side search ──────────────────────────────── */

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(l =>
      (l.metadata?.caption ?? "").toLowerCase().includes(s) ||
      (licMap[l.metadata?.licensee_id ?? ""] ?? "").toLowerCase().includes(s) ||
      (storeMap[l.metadata?.store_id ?? ""] ?? "").toLowerCase().includes(s)
    );
  }, [logs, search, licMap, storeMap]);

  /* ── Actions ─────────────────────────────────────────── */

  function clearFilters() {
    setLicFilter("");
    setStoreFilter("");
    setMediaFilter("todos");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  function goPage(pg: number) {
    setPage(pg);
    loadHistory(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportCSV() {
    const header = ["Data", "Cliente", "Loja", "Tipo", "Legenda", "Status", "Post ID"];
    const rows = filtered.map(l => {
      const m = l.metadata;
      return [
        fmtDate(l.created_at),
        licMap[m?.licensee_id ?? ""] ?? m?.licensee_id ?? "",
        storeMap[m?.store_id ?? ""] ?? m?.store_id ?? "",
        TYPE_INFO[m?.media_type ?? ""]?.label ?? m?.media_type ?? "",
        (m?.caption ?? "").replace(/"/g, '""'),
        STATUS_INFO[m?.status ?? "published"]?.label ?? m?.status ?? "",
        m?.ig_post_id ?? "",
      ].map(v => `"${v}"`).join(",");
    });
    const csv = [header.map(h => `"${h}"`).join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-postagens-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteOne(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/adm/logs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== id));
        setTotal(t => t - 1);
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await fetch("/api/adm/logs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      if (res.ok) {
        setDeleteAllOpen(false);
        setDeleteAllText("");
        setLogs([]);
        setTotal(0);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!allowed) return null;

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: "var(--txt3)" }}>
          <span>ADM</span>
          <span>/</span>
          <span style={{ color: "var(--txt2)" }}>Histórico de Postagens</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: "var(--orange3)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20, color: "var(--orange)" }}>
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--txt)", margin: 0 }}>Histórico de Postagens</h1>
              <p style={{ fontSize: 12, color: "var(--txt3)", margin: 0 }}>
                {loading ? "Carregando..." : `${total} publicaç${total !== 1 ? "ões" : "ão"} encontrada${total !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={exportCSV}
              className="card-glass"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8, fontSize: 13,
                color: "var(--txt2)", border: "none", cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16 }}>
                <path d="M10 3v10M6 13l4 4 4-4M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Exportar CSV
            </button>
            <button
              onClick={() => { setDeleteAllOpen(true); setDeleteAllText(""); }}
              className="card-glass"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8, fontSize: 13,
                color: "var(--red)", border: "1px solid var(--red3)", cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16 }}>
                <path d="M3 6h14M8 6V4h4v2M6 6l1 10h6l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Zerar histórico
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card-glass" style={{ borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          {/* Client */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>Cliente</label>
            <select
              value={licFilter}
              onChange={e => { setLicFilter(e.target.value); setStoreFilter(""); }}
              style={{
                background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8,
                padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none",
              }}
            >
              <option value="">Todos os clientes</option>
              {licensees.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Store */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>Unidade</label>
            <select
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              disabled={!licFilter}
              style={{
                background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8,
                padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none",
                opacity: licFilter ? 1 : 0.5,
              }}
            >
              <option value="">Todas as unidades</option>
              {storesForLic.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8,
                padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none",
              }}
            />
          </div>

          {/* Date to */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{
                background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8,
                padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none",
              }}
            />
          </div>

          {/* Search */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>Buscar</label>
            <div style={{ position: "relative" }}>
              <svg viewBox="0 0 20 20" fill="none" style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                width: 14, height: 14, color: "var(--txt3)", pointerEvents: "none",
              }}>
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Legenda, cliente, unidade..."
                style={{
                  width: "100%", background: "var(--bg2)", border: "1px solid var(--bdr)",
                  borderRadius: 8, padding: "7px 10px 7px 32px", fontSize: 13,
                  color: "var(--txt)", outline: "none",
                }}
              />
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                alignSelf: "flex-end", padding: "7px 14px", borderRadius: 8, fontSize: 13,
                color: "var(--txt3)", background: "transparent",
                border: "1px solid var(--bdr)", cursor: "pointer",
              }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Type chips */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {MEDIA_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setMediaFilter(f.value)}
              style={{
                padding: "4px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: mediaFilter === f.value ? "var(--orange)" : "var(--bg2)",
                color: mediaFilter === f.value ? "#fff" : "var(--txt2)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 16,
        }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 0", gap: 16,
        }}>
          <svg viewBox="0 0 64 64" fill="none" style={{ width: 64, height: 64, color: "var(--txt3)", opacity: 0.3 }}>
            <rect x="8" y="8" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="3" />
            <path d="M20 36l8-8 8 8 8-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="3" />
          </svg>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--txt2)", margin: 0 }}>
            Nenhum post encontrado
          </p>
          <p style={{ fontSize: 13, color: "var(--txt3)", margin: 0 }}>
            {hasFilters ? "Tente ajustar os filtros" : "Ainda não há posts publicados via Central"}
          </p>
          <Link
            href="/central-de-publicacao"
            style={{
              marginTop: 8, padding: "10px 22px", borderRadius: 10,
              background: "var(--orange)", color: "#fff", fontSize: 14,
              fontWeight: 600, textDecoration: "none",
            }}
          >
            Ir para Central de Publicação
          </Link>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 16,
        }}>
          {filtered.map(log => (
            <PostCard
              key={log.id}
              log={log}
              licName={licMap[log.metadata?.licensee_id ?? ""] ?? ""}
              storeName={storeMap[log.metadata?.store_id ?? ""] ?? ""}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginTop: 32, flexWrap: "wrap",
        }}>
          <button
            onClick={() => goPage(page - 1)}
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
            let start = 0;
            if (totalPages > maxVisible) {
              start = Math.max(0, Math.min(page - 3, totalPages - maxVisible));
            }
            const count = Math.min(maxVisible, totalPages);
            return Array.from({ length: count }).map((_, i) => {
              const pg = start + i;
              const active = pg === page;
              return (
                <button
                  key={pg}
                  onClick={() => goPage(pg)}
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
            onClick={() => goPage(page + 1)}
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

      {/* ── Modal: apagar individual ── */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card-glass" style={{
            borderRadius: 16, padding: 28, maxWidth: 400, width: "90%",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "var(--red3)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20, color: "var(--red)" }}>
                  <path d="M3 6h14M8 6V4h4v2M6 6l1 10h6l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Apagar registro</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--txt3)" }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--txt2)", lineHeight: 1.5 }}>
              Apagar este registro do histórico de postagens?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "transparent", border: "1px solid var(--bdr)",
                  color: "var(--txt2)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteOne(deleteTarget)}
                disabled={deleting}
                style={{
                  padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "var(--red)", border: "none",
                  color: "#fff", cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: zerar histórico ── */}
      {deleteAllOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card-glass" style={{
            borderRadius: 16, padding: 28, maxWidth: 440, width: "90%",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "var(--red3)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20, color: "var(--red)" }}>
                  <path d="M3 6h14M8 6V4h4v2M6 6l1 10h6l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Zerar histórico</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--txt3)" }}>Ação irreversível.</p>
              </div>
            </div>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--red3)", border: "1px solid rgba(239,68,68,0.25)",
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--red)", fontWeight: 600, lineHeight: 1.5 }}>
                Isso irá apagar TODOS os registros de histórico de postagens. Esta ação é irreversível.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--txt3)", fontWeight: 600 }}>
                Digite <strong style={{ color: "var(--txt)" }}>CONFIRMAR</strong> para continuar
              </label>
              <input
                type="text"
                value={deleteAllText}
                onChange={e => setDeleteAllText(e.target.value)}
                placeholder="CONFIRMAR"
                autoFocus
                style={{
                  background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8,
                  padding: "9px 12px", fontSize: 14, color: "var(--txt)",
                  outline: "none", letterSpacing: "0.05em",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteAllOpen(false); setDeleteAllText(""); }}
                disabled={deleting}
                style={{
                  padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "transparent", border: "1px solid var(--bdr)",
                  color: "var(--txt2)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting || deleteAllText !== "CONFIRMAR"}
                style={{
                  padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "var(--red)", border: "none", color: "#fff",
                  cursor: deleting || deleteAllText !== "CONFIRMAR" ? "not-allowed" : "pointer",
                  opacity: deleting || deleteAllText !== "CONFIRMAR" ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {deleting ? "Apagando..." : "Zerar tudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

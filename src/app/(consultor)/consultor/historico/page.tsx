"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import PostHistoryGrid, {
  HistoryLog, PAGE_SIZE, MEDIA_FILTERS,
} from "@/components/history/PostHistoryGrid";
import { HelpCircle } from "lucide-react";
import { useTour } from "@/hooks/useTour";

type MediaTypeFilter = "todos" | "IMAGE" | "REELS" | "STORIES";

const CLOCK_ICON = (
  <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20, color: "var(--orange)" }}>
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ConsultorHistoricoPage() {
  const [storeId, setStoreId]     = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeMap, setStoreMap]   = useState<Record<string, string>>({});

  const [mediaFilter, setMediaFilter] = useState<MediaTypeFilter>("todos");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");

  const [logs, setLogs]   = useState<HistoryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    async function init() {
      const profile = await getProfile(supabase);
      if (!profile?.store_id) return;
      const name = profile.store?.name ?? "";
      setStoreId(profile.store_id);
      setStoreName(name);
      setStoreMap({ [profile.store_id]: name });
    }
    init();
  }, []);

  const loadHistory = useCallback(async (pg: number) => {
    if (!storeId) return;
    setLoading(true);
    try {
      let q = supabase
        .from("activity_logs")
        .select("id, created_at, metadata", { count: "exact" })
        .eq("event_type", "post_instagram")
        .filter("metadata->>store_id", "eq", storeId)
        .order("created_at", { ascending: false })
        .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

      if (mediaFilter !== "todos") q = q.filter("metadata->>media_type", "eq", mediaFilter);
      if (dateFrom)                q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo)                  q = q.lte("created_at", `${dateTo}T23:59:59`);

      const { data, count } = await q;
      setLogs((data as HistoryLog[]) ?? []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [storeId, mediaFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
    loadHistory(0);
  }, [loadHistory]);

  function goPage(pg: number) {
    setPage(pg);
    loadHistory(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const { startTour } = useTour({
    pageKey: "consultor-historico",
    steps: [
      { element: "[data-tour='titulo-historico']", popover: { title: "Histórico de Postagens", description: "Veja todas as suas publicações, ordenadas da mais recente para a mais antiga." } },
      { element: "[data-tour='filtros-historico']", popover: { title: "Filtros", description: "Filtre por período ou tipo de mídia para encontrar publicações específicas." } },
      { popover: { title: "Pronto!", description: "Clique em qualquer publicação para ver os detalhes. O botão ? está sempre disponível." } },
    ],
    autoStart: true,
    delay: 1000,
  });

  const hasFilters = !!(mediaFilter !== "todos" || dateFrom || dateTo);

  return (
    <>
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: "var(--txt3)" }}>
          <span>Consultor</span><span>/</span>
          <span style={{ color: "var(--txt2)" }}>Histórico de Postagens</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "var(--orange3)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {CLOCK_ICON}
          </div>
          <div>
            <h1 data-tour="titulo-historico" style={{ fontSize: 20, fontWeight: 700, color: "var(--txt)", margin: 0 }}>Histórico de Postagens</h1>
            <p style={{ fontSize: 12, color: "var(--txt3)", margin: 0 }}>
              {loading ? "Carregando..." : `${total} publicaç${total !== 1 ? "ões" : "ão"} encontrada${total !== 1 ? "s" : ""}`}
              {storeName ? ` · ${storeName}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div data-tour="filtros-historico" className="card-glass" style={{ borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>De</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--txt3)", fontWeight: 600 }}>Até</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--txt)", outline: "none" }} />
          </div>
          {hasFilters && (
            <button onClick={() => { setMediaFilter("todos"); setDateFrom(""); setDateTo(""); }}
              style={{ alignSelf: "flex-end", padding: "7px 14px", borderRadius: 8, fontSize: 13, color: "var(--txt3)", background: "transparent", border: "1px solid var(--bdr)", cursor: "pointer" }}>
              Limpar
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {MEDIA_FILTERS.map(f => (
            <button key={f.value} onClick={() => setMediaFilter(f.value as MediaTypeFilter)}
              style={{
                padding: "4px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: mediaFilter === f.value ? "var(--orange)" : "var(--bg2)",
                color: mediaFilter === f.value ? "#fff" : "var(--txt2)",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <PostHistoryGrid
        logs={logs}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPage={goPage}
        storeMap={storeMap}
        mediaFilter={mediaFilter}
        publishHref="/consultor/publicar"
      />
    </div>
    <button
      onClick={startTour}
      title="Ver tour guiado"
      style={{ position: "fixed", bottom: "24px", right: "24px", width: "48px", height: "48px", borderRadius: "50%", background: "var(--orange)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
    >
      <HelpCircle size={24} strokeWidth={2.5} />
    </button>
    </>
  );
}

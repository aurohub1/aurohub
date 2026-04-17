"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface LogEntry {
  id: string;
  user_name: string | null;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Filters {
  search: string;
  action: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

/* ── Constants ───────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  download: "Download",
  post_instagram: "Post Instagram",
  post_scheduled: "Agendamento",
  template_created: "Template criado",
  template_edited: "Template editado",
  user_created: "Usuário criado",
  user_blocked: "Usuário bloqueado",
  user_unblocked: "Usuário desbloqueado",
  login: "Login",
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  download: { bg: "var(--blue3)", text: "var(--blue)" },
  post_instagram: { bg: "var(--orange3)", text: "var(--orange)" },
  post_scheduled: { bg: "var(--gold3)", text: "var(--gold)" },
  template_created: { bg: "var(--green3)", text: "var(--green)" },
  template_edited: { bg: "var(--purple3)", text: "var(--purple)" },
  user_created: { bg: "var(--green3)", text: "var(--green)" },
  user_blocked: { bg: "var(--red3)", text: "var(--red)" },
  user_unblocked: { bg: "var(--green3)", text: "var(--green)" },
  login: { bg: "var(--blue3)", text: "var(--blue)" },
};

const REFRESH_INTERVAL = 30;

/* ── Helpers ─────────────────────────────────────── */

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function getMeta(entry: LogEntry, key: string): string {
  if (!entry.metadata || typeof entry.metadata !== "object") return "—";
  return (entry.metadata[key] as string) ?? "—";
}

/* ── Component ───────────────────────────────────── */

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    action: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load logs ─────────────────────────────────── */

  const loadLogs = useCallback(async () => {
    try {
      let query = supabase
        .from("activity_logs")
        .select("id, user_name, event_type, description, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filters.dateFrom) {
        query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
      }
      if (filters.action) {
        query = query.eq("event_type", filters.action);
      }

      const { data } = await query;
      setLogs((data as LogEntry[]) ?? []);
    } catch (err) {
      console.warn("Erro ao carregar logs:", err);
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.action]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /* ── Auto-refresh ──────────────────────────────── */

  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadLogs();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadLogs]);

  /* ── Client-side filtering ─────────────────────── */

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const searchLower = filters.search.toLowerCase();
      const matchSearch =
        !searchLower ||
        (l.user_name ?? "").toLowerCase().includes(searchLower) ||
        (l.description ?? "").toLowerCase().includes(searchLower) ||
        getMeta(l, "form").toLowerCase().includes(searchLower) ||
        getMeta(l, "destino").toLowerCase().includes(searchLower);

      const matchType =
        !filters.type || getMeta(l, "tipo") === filters.type;

      return matchSearch && matchType;
    });
  }, [logs, filters.search, filters.type]);

  /* ── KPIs ──────────────────────────────────────── */

  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter(
      (l) => l.created_at.startsWith(hoje)
    );
    const posts = todayLogs.filter(
      (l) => l.event_type === "post_instagram" || l.event_type === "post_scheduled"
    ).length;
    const downloads = todayLogs.filter(
      (l) => l.event_type === "download"
    ).length;
    return { total: todayLogs.length, posts, downloads };
  }, [logs]);

  /* ── Export CSV ─────────────────────────────────── */

  function exportCsv() {
    const header = "Data,Usuário,Ação,Descrição,Loja,Form,Destino,Tipo\n";
    const rows = filtered
      .map((l) =>
        [
          formatTime(l.created_at),
          l.user_name ?? "—",
          ACTION_LABELS[l.event_type] ?? l.event_type,
          (l.description ?? "").replace(/,/g, ";"),
          getMeta(l, "loja"),
          getMeta(l, "form"),
          getMeta(l, "destino"),
          getMeta(l, "tipo"),
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurohub-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Clear filters ─────────────────────────────── */

  function clearFilters() {
    setFilters({ search: "", action: "", type: "", dateFrom: "", dateTo: "" });
  }

  const hasFilters = filters.search || filters.action || filters.type || filters.dateFrom || filters.dateTo;

  /* ── Unique types from metadata ────────────────── */

  const types = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      const t = getMeta(l, "tipo");
      if (t !== "—") set.add(t);
    });
    return Array.from(set).sort();
  }, [logs]);

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiMini label="Total hoje" value={String(kpis.total)} color="var(--blue)" />
        <KpiMini label="Posts hoje" value={String(kpis.posts)} color="var(--orange)" />
        <KpiMini label="Downloads hoje" value={String(kpis.downloads)} color="var(--green)" />
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuário, destino, form..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="h-9 w-full rounded-lg border border-[var(--bdr2)] bg-[var(--input-bg)] pl-9 pr-3 text-[12px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none transition-colors focus:border-[var(--orange)]"
          />
        </div>

        {/* Action filter */}
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none"
        >
          <option value="">Todas ações</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Type filter */}
        {types.length > 0 && (
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none"
          >
            <option value="">Todos tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {/* Date from */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none"
        />

        {/* Date to */}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none"
        />

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-9 rounded-lg border border-[var(--bdr2)] px-3 text-[12px] font-semibold text-[var(--txt3)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
          >
            Limpar
          </button>
        )}

        {/* Export */}
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-[var(--bdr2)] px-3 text-[12px] font-semibold text-[var(--txt2)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)] disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          CSV
        </button>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--txt3)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          {countdown}s
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="card-glass overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue3)]">
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-[var(--blue)]">
                <path d="M4 4h12M4 8h12M4 12h8M4 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-[15px] font-bold text-[var(--txt)]">Nenhum log encontrado</div>
            <div className="text-[13px] text-[var(--txt3)]">
              {hasFilters ? "Tente ajustar os filtros." : "Atividades aparecerão aqui automaticamente."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--bdr)] bg-[var(--hover-bg)]">
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Quando</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Usuário</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Loja</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Ação</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Form</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Destino</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Tipo</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const actionStyle = ACTION_COLORS[log.event_type] ?? { bg: "var(--blue3)", text: "var(--blue)" };
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--bdr)] transition-colors last:border-b-0 hover:bg-[var(--hover-bg)]"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="font-medium text-[var(--txt)]">{formatTime(log.created_at)}</div>
                        <div className="text-[10px] text-[var(--txt3)]">{timeAgo(log.created_at)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-[9px] font-bold text-white">
                            {(log.user_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[var(--txt)]">{log.user_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--txt2)]">
                        {getMeta(log, "loja")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                          style={{ background: actionStyle.bg, color: actionStyle.text }}
                        >
                          {ACTION_LABELS[log.event_type] ?? log.event_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--txt2)]">
                        {getMeta(log, "form")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--txt2)]">
                        {getMeta(log, "destino")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {getMeta(log, "tipo") !== "—" ? (
                          <span className="rounded-md bg-[var(--bg3)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--txt2)]">
                            {getMeta(log, "tipo")}
                          </span>
                        ) : (
                          <span className="text-[var(--txt3)]">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-right text-[var(--txt3)]">
                        {log.description ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--bdr)] px-4 py-2.5 text-[11px] text-[var(--txt3)]">
            <span>{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
              Atualiza em {countdown}s
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* ── KPI Mini ────────────────────────────────────── */

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glass flex flex-col gap-1 p-4 page-fade">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">{label}</div>
      <span className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

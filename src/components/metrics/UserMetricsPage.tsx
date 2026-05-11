"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import { Rocket, Download, CalendarDays, Sparkles, Sun, Calendar, Eye, TrendingUp, Bookmark } from "lucide-react";
import MetricCard from "./MetricCard";
import BarsByDay from "./BarsByDay";
import PieByFormat from "./PieByFormat";
import HistoryTable from "./HistoryTable";
import FiltersBar from "./FiltersBar";
import ActivityFeed from "./ActivityFeed";
import type { Formato, Tipo, PeriodoDias, PublicationRow } from "./types";
import { FORMATO_LABEL, PERIODO_LABEL } from "./types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Loja { id: string; name: string | null }
interface IgMetrics { reach: number; impressions: number; saved: number; mediaCount: number; notConfigured?: boolean }

export default function UserMetricsPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [igMetrics, setIgMetrics] = useState<IgMetrics | null>(null);

  const [periodo, setPeriodo] = useState<PeriodoDias>(30);
  const [formato, setFormato] = useState<Formato | "all">("all");
  const [tipo, setTipo] = useState<Tipo | "all">("all");
  const [lojaFilter, setLojaFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const isLicenseeScope = useMemo(() => {
    if (!profile) return false;
    return (profile.role === "cliente" || profile.role === "gerente") && !!profile.licensee_id;
  }, [profile]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const feats = await getFeatures(supabase, p);
      setFeatures(feats);
      if (!feats.has("metricas")) { setLoading(false); return; }

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const isLicensee = (p.role === "cliente" || p.role === "gerente") && !!p.licensee_id;

      const histQuery = supabase
        .from("publication_history")
        .select("id, licensee_id, loja_id, user_id, user_role, template_id, template_nome, formato, tipo, destino, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      const [histRes, lojaRes] = await Promise.all([
        isLicensee
          ? histQuery.eq("licensee_id", p.licensee_id!).limit(2000)
          : histQuery.eq("user_id", p.id),
        isLicensee
          ? supabase.from("stores").select("id, name").eq("licensee_id", p.licensee_id!).order("name")
          : Promise.resolve({ data: [] as Loja[] }),
      ]);

      const allRows = (histRes.data ?? []) as PublicationRow[];
      setRows(allRows);
      setLojas((lojaRes.data ?? []) as Loja[]);

      if (isLicensee && allRows.length > 0) {
        const userIds = [...new Set(allRows.map(r => r.user_id).filter((id): id is string => !!id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", userIds);
          const namesMap: Record<string, string> = {};
          for (const prof of (profilesData ?? []) as Array<{ id: string; name: string | null }>) {
            if (prof.name) namesMap[prof.id] = prof.name;
          }
          setUserNames(namesMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isLicenseeScope || loading) return;
    fetch("/api/metricas/instagram")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setIgMetrics(data as IgMetrics); })
      .catch(() => {});
  }, [isLicenseeScope, loading]);

  const filtered = useMemo(() => {
    const since = Date.now() - periodo * 24 * 60 * 60 * 1000;
    return rows.filter(r => {
      if (new Date(r.created_at).getTime() < since) return false;
      if (formato !== "all" && r.formato !== formato) return false;
      if (tipo !== "all" && r.tipo !== tipo) return false;
      if (lojaFilter !== "all" && r.loja_id !== lojaFilter) return false;
      return true;
    });
  }, [rows, periodo, formato, tipo, lojaFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(todayStart); monthStart.setDate(todayStart.getDate() - 29);
    let today = 0, week = 0, month = 0, downloadsMonth = 0;
    let totalPublicacoes = 0, totalDownloads = 0;
    const consultoresSet = new Set<string>();
    const templatesSet = new Set<string>();

    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (r.tipo === "publicado") {
        totalPublicacoes++;
        if (t >= todayStart.getTime()) today++;
        if (t >= weekStart.getTime()) week++;
        if (t >= monthStart.getTime()) month++;
        if (r.user_id) consultoresSet.add(r.user_id);
        if (r.template_id) templatesSet.add(r.template_id);
      } else if (r.tipo === "download") {
        totalDownloads++;
        if (t >= monthStart.getTime()) downloadsMonth++;
      }
    }
    return {
      today, week, month, downloadsMonth,
      totalPublicacoes, totalDownloads,
      consultoresAtivos: consultoresSet.size,
      templatesUsados: templatesSet.size
    };
  }, [rows]);

  const consultoresNoPeriodo = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      if (r.tipo === "publicado" && r.user_id) set.add(r.user_id);
    }
    return set.size;
  }, [filtered]);

  const topTemplates = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const name = r.template_nome ?? "Sem nome";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  const consultorRanking = useMemo(() => {
    const map = new Map<string, { count: number; formats: Map<Formato, number> }>();
    for (const r of filtered) {
      if (r.tipo === "publicado" && r.user_id) {
        const entry = map.get(r.user_id) ?? { count: 0, formats: new Map<Formato, number>() };
        entry.count++;
        entry.formats.set(r.formato, (entry.formats.get(r.formato) ?? 0) + 1);
        map.set(r.user_id, entry);
      }
    }
    return Array.from(map.entries())
      .map(([userId, { count, formats }]) => {
        const topFmt = Array.from(formats.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const rawName = userNames[userId] ?? "";
        const initials = rawName.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || userId.slice(0, 2).toUpperCase();
        return { userId, name: rawName || userId.slice(0, 8), initials, count, topFormat: topFmt as Formato | null };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered, userNames]);

  /* ── Export ────────────────────────────────────── */

  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportOpen]);

  function exportCsv() {
    const today = new Date().toISOString().split("T")[0];
    const header = "Data,Template,Formato,Tipo,Destino\n";
    const csvRows = filtered.map((r) =>
      [
        new Date(r.created_at).toLocaleString("pt-BR"),
        `"${(r.template_nome ?? "—").replace(/"/g, "'")}"`,
        FORMATO_LABEL[r.formato] ?? r.formato,
        r.tipo,
        r.destino ?? "—",
      ].join(",")
    ).join("\n");

    const blob = new Blob(["﻿" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const today = new Date().toISOString().split("T")[0];
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(18);
    doc.setTextColor(30, 30, 40);
    doc.text("Relatório de Métricas", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(110, 110, 120);
    doc.text(`Período: ${PERIODO_LABEL[periodo]}`, 14, 29);
    doc.text(`Gerado em: ${today}`, 14, 35);

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 40);
    doc.text("Resumo do período", 14, 46);

    autoTable(doc, {
      startY: 50,
      head: [["Métrica", "Valor"]],
      body: [
        ["Total publicações", String(kpis.totalPublicacoes)],
        ["Total downloads",   String(kpis.totalDownloads)],
        ["Consultores ativos", String(kpis.consultoresAtivos)],
        ["Templates usados",   String(kpis.templatesUsados)],
      ],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [12, 12, 20], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      tableWidth: 90,
    });

    const afterKpis = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 40);
    doc.text("Detalhe por publicação", 14, afterKpis);

    autoTable(doc, {
      startY: afterKpis + 4,
      head: [["Data", "Template", "Formato", "Tipo", "Destino"]],
      body: filtered.map((r) => [
        new Date(r.created_at).toLocaleDateString("pt-BR"),
        (r.template_nome ?? "—").slice(0, 30),
        FORMATO_LABEL[r.formato] ?? r.formato,
        r.tipo,
        r.destino ?? "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [12, 12, 20], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 246, 250] },
    });

    doc.save(`metricas-${today}.pdf`);
  }

  if (!loading && profile && !features.has("metricas")) {
    return (
      <>
        <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Métricas</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
              {isLicenseeScope ? "Publicações e downloads das suas lojas" : "Publicações e downloads do seu perfil"}
            </p>
          </div>
        </div>
        <div
          className="mt-8 flex flex-col items-center justify-center py-16 text-center"
          style={{ background: "var(--input-bg)", border: "1px dashed var(--bdr2)", borderRadius: 20 }}
        >
          <Sparkles className="w-8 h-8 mb-3" style={{ color: "var(--gold)" }} />
          <h3 className="text-base font-semibold" style={{ color: "var(--txt)" }}>Recurso premium</h3>
          <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--txt2)" }}>
            As métricas estão disponíveis em planos superiores. Fale com o ADM para liberar.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Métricas</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            {isLicenseeScope ? "Publicações e downloads das suas lojas" : "Publicações e downloads do seu perfil"}
          </p>
        </div>
        {!loading && filtered.length > 0 && (
          <div ref={exportRef} style={{ position: "relative" }}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 14px", borderRadius: 8,
                border: "1px solid var(--bdr)", background: "transparent",
                fontSize: 12, fontWeight: 600, color: "var(--txt2)", cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 14, height: 14 }}>
                <path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Exportar
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 12, height: 12 }}>
                <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {exportOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                background: "var(--card-bg)", border: "1px solid var(--bdr)",
                borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                minWidth: 120,
              }}>
                <button onClick={() => { exportCsv(); setExportOpen(false); }}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 12, color: "var(--txt2)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--hover-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  CSV
                </button>
                <button onClick={() => { exportPdf(); setExportOpen(false); }}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 12, color: "var(--txt2)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--hover-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "var(--input-bg)" }} />
          <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "var(--input-bg)" }} />
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div data-tour="kpi-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <MetricCard label="Total publicações"  value={kpis.totalPublicacoes}  icon={<Rocket size={18} />}       accent="blue"   />
            <MetricCard label="Total downloads"    value={kpis.totalDownloads}    icon={<Download size={18} />}     accent="green"  />
            <MetricCard label="Consultores ativos" value={kpis.consultoresAtivos} icon={<CalendarDays size={18} />} accent="orange" />
          </div>

          {/* KPIs secundários */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MetricCard label="Hoje"          value={kpis.today}          icon={<Sun size={16} />}          accent="orange" />
            <MetricCard label="Esta semana"   value={kpis.week}           icon={<CalendarDays size={16} />} accent="blue"   />
            <MetricCard label="Este mês"      value={kpis.month}          icon={<Calendar size={16} />}     accent="green"  />
            <MetricCard label="Downloads mês" value={kpis.downloadsMonth} icon={<Download size={16} />}     accent="gold"   />
          </div>

          {/* Engajamento Instagram */}
          {isLicenseeScope && igMetrics && !igMetrics.notConfigured && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <MetricCard label="Alcance (30d)"     value={igMetrics.reach}       icon={<Eye size={16} />}        accent="blue"   />
              <MetricCard label="Impressões (30d)"  value={igMetrics.impressions} icon={<TrendingUp size={16} />} accent="orange" />
              <MetricCard label="Salvamentos (30d)" value={igMetrics.saved}       icon={<Bookmark size={16} />}   accent="gold"   />
            </div>
          )}

          {/* Filtros */}
          <div className="mt-6">
            <FiltersBar
              periodo={periodo} onPeriodoChange={setPeriodo}
              formato={formato} onFormatoChange={setFormato}
              tipo={tipo} onTipoChange={setTipo}
              extra={isLicenseeScope && lojas.length > 0 ? (
                <select
                  value={lojaFilter}
                  onChange={(e) => setLojaFilter(e.target.value)}
                  className="h-8 rounded-full px-4 text-xs outline-none"
                  style={{ background: "transparent", border: "1px solid var(--bdr2)", color: "var(--txt2)" }}
                >
                  <option value="all" style={{ background: "var(--card-bg)" }}>Todas as lojas</option>
                  {lojas.map(l => (
                    <option key={l.id} value={l.id} style={{ background: "var(--card-bg)" }}>
                      {l.name || "—"}
                    </option>
                  ))}
                </select>
              ) : undefined}
            />
          </div>

          {/* Gráfico + Distribuição */}
          <div data-tour="grafico" className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 mt-4">
            <BarsByDay rows={filtered} days={periodo} />
            <PieByFormat rows={filtered} />
          </div>

          {/* Top templates, Por consultor, Atividade */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ${consultoresNoPeriodo >= 2 ? "lg:grid-cols-3" : ""}`}>
            {/* Top templates */}
            <div className="rounded-xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>Top templates</h3>
              {topTemplates.length === 0 ? (
                <div className="text-sm" style={{ color: "var(--txt3)" }}>Sem publicações no período</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {topTemplates.map(([name, count], i) => {
                    const pct = Math.round((count / topTemplates[0][1]) * 100);
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[70%]" style={{ color: "var(--txt)" }}>{name}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: "var(--txt2)" }}>{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bdr2)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: i === 0 ? "var(--orange)" : "var(--blue)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Por consultor */}
            {consultoresNoPeriodo >= 2 && (
              <div className="rounded-xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>Por consultor</h3>
                <div className="flex flex-col gap-3">
                  {consultorRanking.map((c, i) => (
                    <div key={c.userId} className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: i === 0 ? "var(--orange)" : "var(--input-bg)",
                          color: i === 0 ? "#fff" : "var(--txt2)",
                          border: "1px solid var(--bdr2)",
                        }}
                      >
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: "var(--txt)" }}>{c.name}</div>
                        {c.topFormat && (
                          <div className="text-[11px]" style={{ color: "var(--txt3)" }}>{FORMATO_LABEL[c.topFormat]}</div>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--txt)" }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Atividade recente */}
            <ActivityFeed rows={filtered} />
          </div>

          {/* Histórico */}
          <div className="mt-4">
            <HistoryTable rows={filtered} />
          </div>
        </>
      )}
    </>
  );
}

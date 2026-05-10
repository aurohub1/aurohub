"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import { Rocket, Download, CalendarDays, Sparkles } from "lucide-react";
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

export default function UserMetricsPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<PeriodoDias>(30);
  const [formato, setFormato] = useState<Formato | "all">("all");
  const [tipo, setTipo] = useState<Tipo | "all">("all");
  const [lojaFilter, setLojaFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Cliente e gerente veem dados do licensee; outros roles veem dados próprios
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

      setRows((histRes.data ?? []) as PublicationRow[]);
      setLojas((lojaRes.data ?? []) as Loja[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 40);
    doc.text("Relatório de Métricas", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(110, 110, 120);
    doc.text(`Período: ${PERIODO_LABEL[periodo]}`, 14, 29);
    doc.text(`Gerado em: ${today}`, 14, 35);

    // KPI summary
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

    // Detail table
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

  // Feature off → tela de upgrade
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
          style={{
            background: "var(--input-bg)",
            border: "1px dashed var(--bdr2)",
            borderRadius: 20,
          }}
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
                fontSize: 12, fontWeight: 600, color: "var(--txt2)",
                cursor: "pointer",
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
          {/* KPIs */}
          <div data-tour="kpi-cards" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <MetricCard label="Total publicações" value={kpis.totalPublicacoes} icon={<Rocket size={18} />}       accent="blue"   />
            <MetricCard label="Total downloads"   value={kpis.totalDownloads}   icon={<Download size={18} />}     accent="green"  />
            <MetricCard label="Consultores ativos" value={kpis.consultoresAtivos} icon={<CalendarDays size={18} />} accent="orange" />
            <MetricCard label="Templates usados"  value={kpis.templatesUsados}  icon={<CalendarDays size={18} />} accent="gold"   />
          </div>

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
                  style={{
                    background: "transparent",
                    border: "1px solid var(--bdr2)",
                    color: "var(--txt2)",
                  }}
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

          {/* Linha principal - Gráfico + Distribuição */}
          <div data-tour="grafico" className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 mt-4">
            <BarsByDay rows={filtered} days={periodo} />
            <PieByFormat rows={filtered} />
          </div>

          {/* Linha detalhes - Top templates, Por consultor, Atividade */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ${consultoresNoPeriodo >= 2 ? "lg:grid-cols-3" : ""}`}>
            {/* Top templates - placeholder */}
            <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6" style={{ background: "var(--card-bg)", borderColor: "var(--bdr)" }}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>Top templates</h3>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-slate-600" style={{ color: "var(--txt2)" }}>Em breve</div>
              </div>
            </div>

            {/* Por consultor - só renderiza se houver 2+ consultores */}
            {consultoresNoPeriodo >= 2 && (
              <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6" style={{ background: "var(--card-bg)", borderColor: "var(--bdr)" }}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>Por consultor</h3>
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-slate-600" style={{ color: "var(--txt2)" }}>Em breve</div>
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

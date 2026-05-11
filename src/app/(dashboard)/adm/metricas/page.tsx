"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Rocket, Download, CalendarDays, Sun, Calendar, Eye, TrendingUp, Bookmark } from "lucide-react";
import MetricCard from "@/components/metrics/MetricCard";
import BarsByDay from "@/components/metrics/BarsByDay";
import PieByFormat from "@/components/metrics/PieByFormat";
import FiltersBar from "@/components/metrics/FiltersBar";
import HistoryTable from "@/components/metrics/HistoryTable";
import type { Formato, Tipo, PeriodoDias, PublicationRow } from "@/components/metrics/types";
import { FORMATO_LABEL } from "@/components/metrics/types";

interface Lic { id: string; name: string | null }
interface Loja { id: string; name: string | null; licensee_id: string | null }
interface IgMetrics { reach: number; impressions: number; saved: number; mediaCount: number; notConfigured?: boolean }

export default function AdmMetricasPage() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [licensees, setLicensees] = useState<Lic[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [igMetrics, setIgMetrics] = useState<IgMetrics | null>(null);

  const [periodo, setPeriodo] = useState<PeriodoDias>(30);
  const [formato, setFormato] = useState<Formato | "all">("all");
  const [tipo, setTipo] = useState<Tipo | "all">("all");
  const [licenseeFilter, setLicenseeFilter] = useState<string>("all");
  const [lojaFilter, setLojaFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const [histRes, licRes, lojaRes] = await Promise.all([
        supabase
          .from("publication_history")
          .select("id, licensee_id, loja_id, user_id, user_role, template_id, template_nome, formato, tipo, destino, created_at")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("licensees").select("id, name").order("name"),
        supabase.from("stores").select("id, name, licensee_id").order("name"),
      ]);

      const allRows = (histRes.data ?? []) as PublicationRow[];
      setRows(allRows);
      setLicensees((licRes.data ?? []) as Lic[]);
      setLojas((lojaRes.data ?? []) as Loja[]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Fetch Instagram ao selecionar um licensee específico
  useEffect(() => {
    if (loading || licenseeFilter === "all") { setIgMetrics(null); return; }
    fetch(`/api/metricas/instagram?licensee_id=${licenseeFilter}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setIgMetrics(data as IgMetrics); else setIgMetrics(null); })
      .catch(() => setIgMetrics(null));
  }, [licenseeFilter, loading]);

  useEffect(() => { setLojaFilter("all"); }, [licenseeFilter]);

  const filtered = useMemo(() => {
    const since = Date.now() - periodo * 24 * 60 * 60 * 1000;
    return rows.filter(r => {
      if (new Date(r.created_at).getTime() < since) return false;
      if (formato !== "all" && r.formato !== formato) return false;
      if (tipo !== "all" && r.tipo !== tipo) return false;
      if (licenseeFilter !== "all" && r.licensee_id !== licenseeFilter) return false;
      if (lojaFilter !== "all" && r.loja_id !== lojaFilter) return false;
      return true;
    });
  }, [rows, periodo, formato, tipo, licenseeFilter, lojaFilter]);

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
      templatesUsados: templatesSet.size,
    };
  }, [rows]);

  const lojasFiltradas = useMemo(() => {
    if (licenseeFilter === "all") return lojas;
    return lojas.filter(l => l.licensee_id === licenseeFilter);
  }, [lojas, licenseeFilter]);

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

  const extraFilters = (
    <>
      <select
        value={licenseeFilter}
        onChange={(e) => setLicenseeFilter(e.target.value)}
        className="h-8 rounded-full px-4 text-xs outline-none"
        style={{ background: "transparent", border: "1px solid var(--bdr2)", color: "var(--txt2)" }}
      >
        <option value="all" style={{ background: "var(--card-bg)" }}>Todos os licensees</option>
        {licensees.map(l => (
          <option key={l.id} value={l.id} style={{ background: "var(--card-bg)" }}>{l.name || "—"}</option>
        ))}
      </select>
      <select
        value={lojaFilter}
        onChange={(e) => setLojaFilter(e.target.value)}
        className="h-8 rounded-full px-4 text-xs outline-none"
        style={{ background: "transparent", border: "1px solid var(--bdr2)", color: "var(--txt2)" }}
      >
        <option value="all" style={{ background: "var(--card-bg)" }}>Todas as lojas</option>
        {lojasFiltradas.map(l => (
          <option key={l.id} value={l.id} style={{ background: "var(--card-bg)" }}>{l.name || "—"}</option>
        ))}
      </select>
    </>
  );

  return (
    <>
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Métricas da plataforma</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            Agregado de todos os clientes, lojas e consultores
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "var(--input-bg)" }} />
          <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "var(--input-bg)" }} />
        </div>
      ) : (
        <>
          {/* KPIs principais — totais globais (últimos 90d, sem filtro) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <MetricCard label="Total publicações"  value={kpis.totalPublicacoes}  icon={<Rocket size={18} />}       accent="blue"   />
            <MetricCard label="Total downloads"    value={kpis.totalDownloads}    icon={<Download size={18} />}     accent="green"  />
            <MetricCard label="Consultores ativos" value={kpis.consultoresAtivos} icon={<CalendarDays size={18} />} accent="orange" />
            <MetricCard label="Templates usados"   value={kpis.templatesUsados}   icon={<CalendarDays size={18} />} accent="gold"   />
          </div>

          {/* KPIs secundários */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MetricCard label="Hoje"          value={kpis.today}          icon={<Sun size={16} />}          accent="orange" />
            <MetricCard label="Esta semana"   value={kpis.week}           icon={<CalendarDays size={16} />} accent="blue"   />
            <MetricCard label="Este mês"      value={kpis.month}          icon={<Calendar size={16} />}     accent="green"  />
            <MetricCard label="Downloads mês" value={kpis.downloadsMonth} icon={<Download size={16} />}     accent="gold"   />
          </div>

          {/* Filtros */}
          <div className="mt-6">
            <FiltersBar
              periodo={periodo} onPeriodoChange={setPeriodo}
              formato={formato} onFormatoChange={setFormato}
              tipo={tipo} onTipoChange={setTipo}
              extra={extraFilters}
            />
          </div>

          {/* Engajamento Instagram — só quando um licensee está selecionado */}
          {licenseeFilter !== "all" && igMetrics && !igMetrics.notConfigured && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <MetricCard label="Alcance (30d)"     value={igMetrics.reach}       icon={<Eye size={16} />}        accent="blue"   />
              <MetricCard label="Impressões (30d)"  value={igMetrics.impressions} icon={<TrendingUp size={16} />} accent="orange" />
              <MetricCard label="Salvamentos (30d)" value={igMetrics.saved}       icon={<Bookmark size={16} />}   accent="gold"   />
            </div>
          )}

          {/* Gráfico + Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 mt-4">
            <BarsByDay rows={filtered} days={periodo} />
            <PieByFormat rows={filtered} />
          </div>

          {/* Top templates + Por consultor */}
          <div className={`grid grid-cols-1 gap-4 mt-4 ${consultoresNoPeriodo >= 2 ? "md:grid-cols-2" : ""}`}>
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

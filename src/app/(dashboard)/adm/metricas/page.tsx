"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Rocket, Download, CalendarDays, Globe2 } from "lucide-react";
import MetricCard from "@/components/metrics/MetricCard";
import BarsByDay from "@/components/metrics/BarsByDay";
import PieByFormat from "@/components/metrics/PieByFormat";
import HistoryTable from "@/components/metrics/HistoryTable";
import FiltersBar from "@/components/metrics/FiltersBar";
import type { Formato, Tipo, PeriodoDias, PublicationRow } from "@/components/metrics/types";

interface Lic { id: string; name: string | null }
interface Loja { id: string; name: string | null; licensee_id: string | null }

export default function AdmMetricasPage() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [licensees, setLicensees] = useState<Lic[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);

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
      setRows((histRes.data ?? []) as PublicationRow[]);
      setLicensees((licRes.data ?? []) as Lic[]);
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
    let today = 0, week = 0, month = 0, downloadsMonth = 0, platformMonth = 0;
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (r.tipo === "publicado") {
        if (t >= todayStart.getTime()) today++;
        if (t >= weekStart.getTime()) week++;
        if (t >= monthStart.getTime()) month++;
        if (t >= monthStart.getTime()) platformMonth++;
      } else if (r.tipo === "download" && t >= monthStart.getTime()) {
        downloadsMonth++;
      }
    }
    return { today, week, month, downloadsMonth, platformMonth };
  }, [rows]);

  const lojasFiltradas = useMemo(() => {
    if (licenseeFilter === "all") return lojas;
    return lojas.filter(l => l.licensee_id === licenseeFilter);
  }, [lojas, licenseeFilter]);

  // Se licensee muda, reseta loja
  useEffect(() => { setLojaFilter("all"); }, [licenseeFilter]);

  const extraFilters = (
    <>
      <select
        value={licenseeFilter}
        onChange={(e) => setLicenseeFilter(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400"
      >
        <option value="all">Todos os licensees</option>
        {licensees.map(l => <option key={l.id} value={l.id}>{l.name || "—"}</option>)}
      </select>
      <select
        value={lojaFilter}
        onChange={(e) => setLojaFilter(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400"
      >
        <option value="all">Todas as lojas</option>
        {lojasFiltradas.map(l => <option key={l.id} value={l.id}>{l.name || "—"}</option>)}
      </select>
    </>
  );

  return (
    <>
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Métricas da plataforma</h2>
          <p className="mt-0.5 text-sm text-slate-500">Agregado de todos os clientes, lojas e consultores</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="animate-pulse bg-slate-200 rounded-lg h-24 w-full" />
          <div className="animate-pulse bg-slate-200 rounded-lg h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
            <MetricCard label="Publicações hoje"     value={kpis.today}          icon={<Rocket size={16} />}       accent="blue"   />
            <MetricCard label="Esta semana"           value={kpis.week}           icon={<CalendarDays size={16} />} accent="green"  />
            <MetricCard label="Este mês"              value={kpis.month}          icon={<CalendarDays size={16} />} accent="orange" />
            <MetricCard label="Downloads (30d)"       value={kpis.downloadsMonth} icon={<Download size={16} />}     accent="gold"   />
            <MetricCard label="Plataforma (30d)"      value={kpis.platformMonth}  icon={<Globe2 size={16} />}       accent="blue"   />
          </div>

          <div className="mt-4">
            <FiltersBar
              periodo={periodo} onPeriodoChange={setPeriodo}
              formato={formato} onFormatoChange={setFormato}
              tipo={tipo} onTipoChange={setTipo}
              extra={extraFilters}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <BarsByDay rows={filtered} days={periodo} />
            <PieByFormat rows={filtered} />
          </div>

          <div className="mt-4">
            <HistoryTable rows={filtered} />
          </div>
        </>
      )}
    </>
  );
}

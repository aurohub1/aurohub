"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const scopeByLicensee = profile?.role === "cliente" || profile?.role === "gerente";

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

      const useLicensee = (p.role === "cliente" || p.role === "gerente") && !!p.licensee_id;

      const histQuery = supabase
        .from("publication_history")
        .select("id, licensee_id, loja_id, user_id, user_role, template_id, template_nome, formato, tipo, destino, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      const [histRes, lojaRes] = await Promise.all([
        useLicensee
          ? histQuery.eq("licensee_id", p.licensee_id!).limit(2000)
          : histQuery.eq("user_id", p.id),
        useLicensee
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
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (r.tipo === "publicado") {
        if (t >= todayStart.getTime()) today++;
        if (t >= weekStart.getTime()) week++;
        if (t >= monthStart.getTime()) month++;
      } else if (r.tipo === "download" && t >= monthStart.getTime()) {
        downloadsMonth++;
      }
    }
    return { today, week, month, downloadsMonth };
  }, [rows]);

  // Feature off → tela de upgrade
  if (!loading && profile && !features.has("metricas")) {
    return (
      <>
        <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Métricas</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            {scopeByLicensee ? "Publicações e downloads das suas lojas" : "Publicações e downloads do seu perfil"}
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
            {scopeByLicensee ? "Publicações e downloads das suas lojas" : "Publicações e downloads do seu perfil"}
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
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <MetricCard label="Publicações hoje" value={kpis.today}          icon={<Rocket size={18} />}       accent="blue"   />
            <MetricCard label="Esta semana"       value={kpis.week}           icon={<CalendarDays size={18} />} accent="green"  />
            <MetricCard label="Este mês"          value={kpis.month}          icon={<CalendarDays size={18} />} accent="orange" />
            <MetricCard label="Downloads (30d)"   value={kpis.downloadsMonth} icon={<Download size={18} />}     accent="gold"   />
          </div>

          {/* Filtros */}
          <div className="mt-6">
            <FiltersBar
              periodo={periodo} onPeriodoChange={setPeriodo}
              formato={formato} onFormatoChange={setFormato}
              tipo={tipo} onTipoChange={setTipo}
              extra={scopeByLicensee && lojas.length > 0 ? (
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

          {/* Gráfico principal + lateral direita */}
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <div className="flex-1 min-w-0">
              <BarsByDay rows={filtered} days={periodo} />
            </div>
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
              <ActivityFeed rows={filtered} />
              <PieByFormat rows={filtered} />
            </div>
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

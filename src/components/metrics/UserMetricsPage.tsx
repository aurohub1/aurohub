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

export default function UserMetricsPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<PeriodoDias>(30);
  const [formato, setFormato] = useState<Formato | "all">("all");
  const [tipo, setTipo] = useState<Tipo | "all">("all");

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
      const { data } = await supabase
        .from("publication_history")
        .select("id, licensee_id, loja_id, user_id, user_role, template_id, template_nome, formato, tipo, destino, created_at")
        .eq("user_id", p.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      setRows((data ?? []) as PublicationRow[]);
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
      return true;
    });
  }, [rows, periodo, formato, tipo]);

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

  // Feature off → tela de upgrade (dark)
  if (!loading && profile && !features.has("metricas")) {
    return (
      <div className="rounded-2xl overflow-hidden p-6 text-white" style={{ background: "#0a0f1e" }}>
        <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h2 className="text-2xl font-bold text-white">Métricas</h2>
            <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Publicações e downloads do seu perfil</p>
          </div>
        </div>
        <div
          className="mt-8 flex flex-col items-center justify-center py-16 text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 20,
          }}
        >
          <Sparkles className="w-8 h-8 mb-3" style={{ color: "#D4A843" }} />
          <h3 className="text-base font-semibold text-white">Recurso premium</h3>
          <p className="mt-1 max-w-sm text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            As métricas estão disponíveis em planos superiores. Fale com o ADM para liberar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden p-6 text-white" style={{ background: "#0a0f1e" }}>
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 className="text-2xl font-bold text-white">Métricas</h2>
          <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Publicações e downloads do seu perfil</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "rgba(255,255,255,0.04)" }} />
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
            />
          </div>

          {/* Gráfico principal + lateral direita */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
            <BarsByDay rows={filtered} days={periodo} />
            <div className="flex flex-col gap-4">
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
    </div>
  );
}

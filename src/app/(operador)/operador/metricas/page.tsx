"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3 } from "lucide-react";

export default function OperadorMetricasPage() {
  const [stats, setStats] = useState({ postsHoje: 0, postsMes: 0, totalStores: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
    const inicioMes = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), 1);
    try {
      const [hojeRes, mesRes, storesRes] = await Promise.all([
        supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", inicioDia.toISOString()).in("event_type", ["post_instagram", "post_scheduled"]),
        supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", inicioMes.toISOString()).in("event_type", ["post_instagram", "post_scheduled"]),
        supabase.from("stores").select("id", { count: "exact", head: true }),
      ]);
      setStats({ postsHoje: hojeRes.count ?? 0, postsMes: mesRes.count ?? 0, totalStores: storesRes.count ?? 0 });
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="animate-pulse bg-[var(--bg2)] rounded-lg h-20 w-full" />;

  return (
    <>
      <div className="border-b border-[var(--bdr)] pb-4">
        <h2 className="text-[20px] font-bold text-[var(--txt)]">Métricas</h2>
        <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Visão geral — somente leitura</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Posts de hoje", value: stats.postsHoje, color: "var(--orange)", bg: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))" },
          { label: "Posts do mês", value: stats.postsMes, color: "var(--blue)", bg: "var(--blue3)" },
          { label: "Lojas ativas", value: stats.totalStores, color: "var(--green)", bg: "var(--green3)" },
        ].map(s => (
          <div key={s.label} className="card-glass flex items-center gap-4 px-5 py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ color: s.color, background: s.bg, border: "1px solid rgba(255,255,255,0.08)" }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">{s.label}</div>
              <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

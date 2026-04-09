"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import KpiCard from "@/components/dashboard/KpiCard";
import PostsChart from "@/components/dashboard/PostsChart";
import FormatUsage from "@/components/dashboard/FormatUsage";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";

interface DashboardKpis {
  clientesAtivos: number;
  tokensAtivos: number;
  postsHoje: number;
  mrr: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    clientesAtivos: 0,
    tokensAtivos: 0,
    postsHoje: 0,
    mrr: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKpis();
  }, []);

  async function loadKpis() {
    const hoje = new Date().toISOString().split("T")[0];
    const agora = new Date().toISOString();

    let clientesAtivos = 0;
    let mrr = 0;
    let tokensAtivos = 0;
    let postsHoje = 0;

    try {
      const { data } = await supabase
        .from("licensees")
        .select("id, plan")
        .eq("status", "active");
      const licensees = data ?? [];
      clientesAtivos = licensees.length;

      // MRR: busca preços na tabela plans e cruza com o plano de cada licensee
      const { data: plans } = await supabase
        .from("plans")
        .select("slug, price_monthly");
      const priceMap: Record<string, number> = {};
      (plans ?? []).forEach((p) => {
        priceMap[p.slug] = parseFloat(p.price_monthly as string) || 0;
      });
      mrr = licensees.reduce((sum, l) => sum + (priceMap[l.plan] ?? 0), 0);
    } catch { /* tabela pode não existir */ }

    try {
      const { data } = await supabase
        .from("instagram_credentials")
        .select("id, expires_at");
      tokensAtivos = (data ?? []).filter(
        (t) => !t.expires_at || new Date(t.expires_at) > new Date(agora)
      ).length;
    } catch { /* tabela pode não existir */ }

    try {
      const { data } = await supabase
        .from("activity_logs")
        .select("id")
        .gte("created_at", `${hoje}T00:00:00`);
      postsHoje = (data ?? []).length;
    } catch { /* tabela pode não existir */ }

    setKpis({ clientesAtivos, tokensAtivos, postsHoje, mrr });
    setLoading(false);
  }

  const tokensColor = !loading && kpis.tokensAtivos === 0 ? "red" : "orange";

  return (
    <>
      {/* ── KPI Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clientes licenciados"
          value={loading ? "..." : kpis.clientesAtivos}
          badge="ativos"
          color="green"
          href="/clientes"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]">
              <path d="M16 11c0 3.866-2.686 7-6 7S4 14.866 4 11V5l6-2 6 2v6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="Tokens Instagram ativos"
          value={loading ? "..." : kpis.tokensAtivos}
          badge={tokensColor === "red" ? "ALERTA" : "IG"}
          color={tokensColor}
          href="/tokens"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]">
              <rect x="2" y="2" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
        />
        <KpiCard
          label="Posts publicados hoje"
          value={loading ? "..." : kpis.postsHoje}
          badge="hoje"
          color="gold"
          href="/logs"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]">
              <path d="M17 3L3 8.5l6 2 2 6L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="Receita recorrente mensal"
          value={loading ? "..." : `R$${kpis.mrr.toLocaleString("pt-BR")}`}
          badge="MRR"
          color="blue"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]">
              <path d="M3 10h14M3 6h14M3 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* ── Charts + Quick Actions ───────────────── */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_280px]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          <PostsChart />

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <FormatUsage />
            <ActivityFeed />
          </div>
        </div>

        {/* Right column */}
        <QuickActions />
      </div>
    </>
  );
}

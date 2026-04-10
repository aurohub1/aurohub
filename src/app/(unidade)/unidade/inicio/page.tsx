"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Send, Users, Download } from "lucide-react";

export default function UnidadeInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [vendedoresCount, setVendedoresCount] = useState<number>(0);
  const [postsHoje, setPostsHoje] = useState<number>(0);
  const [downloadsMes, setDownloadsMes] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      if (p?.store_id) {
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        const inicioMes = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), 1);

        const [vendRes, postsRes, downRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("store_id", p.store_id).eq("role", "vendedor"),
          supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", inicioDia.toISOString()).contains("metadata", { store_id: p.store_id }),
          supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("event_type", "download").gte("created_at", inicioMes.toISOString()).contains("metadata", { store_id: p.store_id }),
        ]);
        setVendedoresCount(vendRes.count ?? 0);
        setPostsHoje(postsRes.count ?? 0);
        setDownloadsMes(downRes.count ?? 0);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }} />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">Painel da Unidade</p>
          <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
            {profile?.store?.name || "Sua unidade"}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<Send size={22} />} label="Posts hoje" value={String(postsHoje)} hint="Publicações confirmadas" />
        <StatCard icon={<Users size={22} />} label="Vendedores ativos" value={String(vendedoresCount)} hint="Contas vinculadas" />
        <StatCard icon={<Download size={22} />} label="Downloads no mês" value={String(downloadsMes)} hint="Artes exportadas" />
      </div>
    </>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-glass flex items-start gap-4 px-5 py-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#FF7A1A]" style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))", border: "1px solid rgba(255,255,255,0.08)" }}>
        {icon}
      </div>
      <div>
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">{label}</div>
        <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">{value}</div>
        {hint && <div className="mt-1 text-[11px] text-[var(--txt3)]">{hint}</div>}
      </div>
    </div>
  );
}

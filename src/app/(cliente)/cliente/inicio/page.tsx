"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Store, Users, BarChart3 } from "lucide-react";

export default function ClienteInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [unidadesCount, setUnidadesCount] = useState<number>(0);
  const [usuariosCount, setUsuariosCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      if (p?.licensee_id) {
        const [stResp, usResp] = await Promise.all([
          supabase.from("stores").select("id", { count: "exact", head: true }).eq("licensee_id", p.licensee_id),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("licensee_id", p.licensee_id),
        ]);
        setUnidadesCount(stResp.count ?? 0);
        setUsuariosCount(usResp.count ?? 0);
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
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">Painel do Cliente</p>
          <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
            {profile?.licensee?.name || "Sua agência"}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--txt3)]">Plano {profile?.plan?.name || profile?.licensee?.plan || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<Store size={22} />} label="Unidades" value={String(unidadesCount)} hint="Lojas ativas" />
        <StatCard icon={<Users size={22} />} label="Usuários" value={String(usuariosCount)} hint="Contas vinculadas" />
        <StatCard
          icon={<BarChart3 size={22} />}
          label="Métricas"
          value={profile?.plan?.can_metrics ? "Disponível" : "Bloqueado"}
          hint={profile?.plan?.can_metrics ? "Plano permite" : "Upgrade necessário"}
          locked={!profile?.plan?.can_metrics}
        />
      </div>
    </>
  );
}

function StatCard({ icon, label, value, hint, locked }: { icon: React.ReactNode; label: string; value: string; hint?: string; locked?: boolean }) {
  return (
    <div className="card-glass flex items-start gap-4 px-5 py-5" style={{ opacity: locked ? 0.55 : 1 }}>
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

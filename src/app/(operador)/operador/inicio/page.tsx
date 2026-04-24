"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { BarChart3, Users, FileText } from "lucide-react";

export default function OperadorInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [stats, setStats] = useState({ licensees: 0, users: 0, postsMonth: 0 });

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      try {
        const [licRes, usersRes, logsRes] = await Promise.all([
          supabase.from("licensees").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("activity_logs").select("id", { count: "exact", head: true })
            .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .in("event_type", ["post_instagram", "post_scheduled"]),
        ]);
        setStats({
          licensees: licRes.count ?? 0,
          users: usersRes.count ?? 0,
          postsMonth: logsRes.count ?? 0,
        });
      } catch { /* silent */ }
    })();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  })();

  return (
    <>
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #3B82F6 50%, #1E3A6E 100%)" }} />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--blue)]">
            {greeting}
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
            Olá, {profile?.name?.split(" ")[0]?.trim() || "Operador"}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--txt3)]">
            Visualização de dados — modo somente leitura
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--blue)]" style={{ background: "var(--blue3)", border: "1px solid var(--bdr2)" }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Clientes</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">{stats.licensees}</div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Marcas cadastradas</div>
          </div>
        </div>
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]" style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))", border: "1px solid var(--bdr2)" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Usuários</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">{stats.users}</div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Total no sistema</div>
          </div>
        </div>
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--green)]" style={{ background: "var(--green3)", border: "1px solid var(--bdr2)" }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts do mês</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-4xl font-bold leading-none text-[var(--txt)] tabular-nums">{stats.postsMonth}</div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Todas as marcas</div>
          </div>
        </div>
      </div>
    </>
  );
}

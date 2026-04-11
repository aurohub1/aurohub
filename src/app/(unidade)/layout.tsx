"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { UNIDADE_SECTIONS } from "@/components/layout/Sidebar";
import { useContentProtection } from "@/hooks/useContentProtection";
import WelcomeTour from "@/components/tour/WelcomeTour";

export default function UnidadeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);

  useContentProtection();

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (!p) { router.push("/login"); return; }
      // Unidade, Cliente ou ADM podem acessar
      if (p.role !== "unidade" && p.role !== "cliente" && p.role !== "adm") {
        router.push(homeForRole(p.role));
        return;
      }
      setProfile(p);
      const feats = await getFeatures(supabase, p);
      setFeatures(feats);
      setChecking(false);
    })();
  }, [router]);

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (err) { console.error("[Logout]", err); }
    window.location.href = "/login";
  }

  if (checking) {
    return <div className="flex min-h-dvh items-center justify-center text-[13px] text-[var(--txt3)]">Verificando acesso...</div>;
  }

  return (
    <>
      <Sidebar
        activePath={pathname}
        user={{ name: profile?.name || "Unidade", role: "unidade" }}
        onLogout={handleLogout}
        sections={UNIDADE_SECTIONS}
        activeFeatures={features}
        brandLabel={profile?.store?.name || "Central da Unidade"}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col">
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>
        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-3 text-[0.68rem] text-[var(--txt3)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          <span>Aurohub online</span>
          <span className="text-[var(--bdr2)]">&middot;</span>
          <span>{profile?.store?.name || "—"}</span>
        </footer>
      </div>
      <WelcomeTour role="unidade" />
    </>
  );
}

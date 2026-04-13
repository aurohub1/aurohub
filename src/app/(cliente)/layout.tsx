"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { CLIENTE_SECTIONS } from "@/components/layout/Sidebar";
import { useContentProtection } from "@/hooks/useContentProtection";
import WelcomeTour from "@/components/tour/WelcomeTour";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
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
      // Cliente ou ADM podem acessar
      if (p.role !== "cliente" && p.role !== "adm") {
        router.push(homeForRole(p.role));
        return;
      }
      setProfile(p);

      // Injeta cores da empresa se disponíveis
      if (p.licensee_id) {
        const { data: licColors } = await supabase
          .from("licensees")
          .select("cor_primaria,cor_secundaria,cor_acento,cor_fundo,splash_effect")
          .eq("id", p.licensee_id)
          .single();

        if (licColors?.cor_primaria) {
          const root = document.documentElement;
          root.style.setProperty("--empresa-primary", licColors.cor_primaria);
          root.style.setProperty("--empresa-secondary", licColors.cor_secundaria || "#D4A843");
          root.style.setProperty("--empresa-accent", licColors.cor_acento || "#1E3A6E");
          root.style.setProperty("--empresa-bg", licColors.cor_fundo || "#0E1520");
          // Ativa tema empresa por padrão quando licensee tem cores
          const saved = localStorage.getItem("ah_theme");
          if (!saved || saved === "light" || saved === "empresa") {
            root.setAttribute("data-theme", "empresa");
            localStorage.setItem("ah_theme", "empresa");
          }
        }
      }

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
        user={{ name: profile?.name || "Cliente", role: "cliente" }}
        onLogout={handleLogout}
        sections={CLIENTE_SECTIONS}
        activeFeatures={features}
        brandLabel={profile?.licensee?.name || "Central do Cliente"}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col">
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>
        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-3 text-[0.68rem] text-[var(--txt3)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          <span>Aurohub online</span>
          <span className="text-[var(--bdr2)]">&middot;</span>
          <span>{profile?.licensee?.name || "—"}</span>
        </footer>
      </div>
      <WelcomeTour role="cliente" />
    </>
  );
}

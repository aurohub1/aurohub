"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { CLIENTE_SECTIONS } from "@/components/layout/Sidebar";
import { useContentProtection } from "@/hooks/useContentProtection";
import WelcomeTour from "@/components/tour/WelcomeTour";

function lighten(hex: string, amount = 20): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

interface BrandColors {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  tema_fundo_escuro?: string | null;
  tema_fundo_claro?: string | null;
}

function applyBrandTheme(colors: BrandColors) {
  const el = document.documentElement;
  const theme = localStorage.getItem("ah_theme") || "light";

  // Accent
  if (colors.cor_primaria) {
    el.style.setProperty("--brand-orange", colors.cor_primaria);
    el.style.setProperty("--brand-orange2", colors.cor_secundaria || colors.cor_primaria);
    el.style.setProperty("--brand-orange3", colors.cor_primaria + "1f");
  }

  // Fundos baseados no tema ativo
  const bg = theme === "dark" ? colors.tema_fundo_escuro : colors.tema_fundo_claro;
  if (bg) {
    el.style.setProperty("--brand-bg", bg);
    el.style.setProperty("--brand-bg1", lighten(bg, theme === "dark" ? 8 : -4));
    el.style.setProperty("--brand-bg2", lighten(bg, theme === "dark" ? 16 : -8));
    el.style.setProperty("--brand-bg3", lighten(bg, theme === "dark" ? 30 : -16));
    el.style.setProperty("--card-bg", theme === "dark" ? `${bg}b8` : bg);
    el.style.setProperty("--sidebar-bg", theme === "dark" ? `${bg}eb` : bg);
    el.style.setProperty("--topbar-bg", theme === "dark" ? `${bg}e6` : bg);
  }
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);

  // useContentProtection();

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
      const feats = await getFeatures(supabase, p);
      setFeatures(feats);

      // Aplica cores accent do licenciado
      if (p.licensee_id) {
        const { data: lic } = await supabase
          .from("licensees")
          .select("cor_primaria,cor_secundaria,tema_fundo_escuro,tema_fundo_claro")
          .eq("id", p.licensee_id)
          .single();
        console.log("[Brand]", lic);
        if (lic) applyBrandTheme(lic);
      }

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

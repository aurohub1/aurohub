"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { UNIDADE_SECTIONS } from "@/components/layout/Sidebar";
import { useContentProtection } from "@/hooks/useContentProtection";
import WelcomeTour from "@/components/tour/WelcomeTour";

function lighten(hex: string, amount = 20): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

interface BrandColors {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  tema_fundo_escuro?: string | null;
  tema_fundo_claro?: string | null;
  tema_texto_escuro?: string | null;
  tema_texto_claro?: string | null;
}

function applyBrandTheme(colors: BrandColors) {
  const dark = (localStorage.getItem("ah_theme") || "light") === "dark";
  const accent = colors.cor_primaria;
  const accent2 = colors.cor_secundaria || accent;
  const bg = dark ? colors.tema_fundo_escuro : colors.tema_fundo_claro;
  const txt = dark ? colors.tema_texto_escuro : colors.tema_texto_claro;

  const vars: string[] = [];
  if (accent) {
    vars.push(`--brand-orange: ${accent}`);
    vars.push(`--brand-orange2: ${accent2}`);
    vars.push(`--brand-orange3: ${accent}1f`);
    vars.push(`--brand-bdr: ${accent}26`);
    vars.push(`--brand-bdr2: ${accent}40`);
  }
  if (bg) {
    vars.push(`--brand-bg: ${bg}`);
    vars.push(`--brand-bg1: ${lighten(bg, dark ? 8 : -4)}`);
    vars.push(`--brand-bg2: ${lighten(bg, dark ? 16 : -8)}`);
    vars.push(`--brand-bg3: ${lighten(bg, dark ? 30 : -16)}`);
    vars.push(`--brand-card-bg: ${dark ? `${bg}b8` : `${bg}e8`}`);
    vars.push(`--brand-sidebar-bg: ${dark ? `${bg}eb` : `${lighten(bg, -4)}eb`}`);
    vars.push(`--brand-topbar-bg: ${dark ? `${bg}e6` : `${lighten(bg, -4)}e6`}`);
  }
  if (txt) {
    vars.push(`--brand-txt: ${txt}`);
    vars.push(`--brand-txt2: ${lighten(txt, dark ? -30 : 30)}`);
    vars.push(`--brand-txt3: ${lighten(txt, dark ? -60 : 60)}`);
  }
  if (!vars.length) return;

  let styleEl = document.getElementById("brand-theme") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "brand-theme";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `[data-theme] { ${vars.map(v => v + ";").join(" ")} }`;
}

export default function UnidadeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const [brandColors, setBrandColors] = useState<BrandColors | null>(null);

  // useContentProtection();

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  // Re-aplica brand theme quando tema muda
  useEffect(() => {
    if (!brandColors) return;
    const handler = () => applyBrandTheme(brandColors);
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, [brandColors]);

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

      // Aplica cores accent do licenciado
      if (p.licensee_id) {
        const { data: lic } = await supabase
          .from("licensees")
          .select("cor_primaria,cor_secundaria,tema_fundo_escuro,tema_fundo_claro,tema_texto_escuro,tema_texto_claro")
          .eq("id", p.licensee_id)
          .single();
        if (lic) { setBrandColors(lic); applyBrandTheme(lic); }
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

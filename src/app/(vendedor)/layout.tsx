"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { VENDEDOR_SECTIONS } from "@/components/layout/Sidebar";
import VendorPublishPanel from "@/components/layout/VendorPublishPanel";
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
  const el = document.documentElement;
  const dark = (localStorage.getItem("ah_theme") || "light") === "dark";

  // Accent
  if (colors.cor_primaria) {
    el.style.setProperty("--brand-orange", colors.cor_primaria);
    el.style.setProperty("--brand-orange2", colors.cor_secundaria || colors.cor_primaria);
    el.style.setProperty("--brand-orange3", colors.cor_primaria + "1f");
  }

  // Backgrounds
  const bg = dark ? colors.tema_fundo_escuro : colors.tema_fundo_claro;
  if (bg) {
    el.style.setProperty("--brand-bg", bg);
    el.style.setProperty("--brand-bg1", lighten(bg, dark ? 8 : -4));
    el.style.setProperty("--brand-bg2", lighten(bg, dark ? 16 : -8));
    el.style.setProperty("--brand-bg3", lighten(bg, dark ? 30 : -16));
    el.style.setProperty("--brand-card-bg", dark ? `${bg}b8` : `${bg}e8`);
    el.style.setProperty("--brand-sidebar-bg", dark ? `${bg}eb` : `${lighten(bg, -4)}eb`);
    el.style.setProperty("--brand-topbar-bg", dark ? `${bg}e6` : `${lighten(bg, -4)}e6`);
  }

  // Text
  const txt = dark ? colors.tema_texto_claro : colors.tema_texto_escuro;
  if (txt) {
    el.style.setProperty("--brand-txt", txt);
    el.style.setProperty("--brand-txt2", lighten(txt, dark ? -30 : 30));
    el.style.setProperty("--brand-txt3", lighten(txt, dark ? -60 : 60));
  }

  // Borders from accent
  if (colors.cor_primaria) {
    el.style.setProperty("--brand-bdr", colors.cor_primaria + "26");
    el.style.setProperty("--brand-bdr2", colors.cor_primaria + "40");
  }
}

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  // useContentProtection();

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  useEffect(() => {
    fetch("/api/noticias?segment=turismo")
      .then(r => r.json())
      .then((items: {title: string}[]) => {
        if (items?.length) setTickerItems(items.map(i => i.title));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (!p) { router.push("/login"); return; }
      // Vendedor, Unidade, Cliente ou ADM podem acessar
      if (!["vendedor", "unidade", "cliente", "adm"].includes(p.role || "")) {
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
        user={{ name: profile?.name || "Vendedor", role: "vendedor" }}
        onLogout={handleLogout}
        sections={VENDEDOR_SECTIONS}
        activeFeatures={features}
        brandLabel="Painel do Vendedor"
        extraPanel={pathname === "/vendedor/publicar" ? <VendorPublishPanel /> : undefined}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col overflow-x-hidden">
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>
        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-3 mb-0 text-[0.68rem] text-[var(--txt3)] overflow-hidden">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          <span>Aurohub online</span>
          <span className="text-[var(--bdr2)]">&middot;</span>
          <span>{profile?.name || "—"}</span>
          {tickerItems.length > 0 && (
            <>
              <span className="text-[var(--bdr2)]">&middot;</span>
              <div className="flex-1 max-w-full overflow-hidden">
                <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
                <div className="flex whitespace-nowrap text-[10px] text-[var(--txt3)]"
                  style={{ animation: "ticker 40s linear infinite" }}>
                  {[...tickerItems, ...tickerItems].map((t, i) => (
                    <span key={i} className="shrink-0 px-6">{"\uD83D\uDCF0"} {t}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </footer>
      </div>
      <WelcomeTour role="vendedor" />
    </>
  );
}

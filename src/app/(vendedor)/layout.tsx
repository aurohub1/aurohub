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

      // Injeta CSS do tema do licensee
      if (p.licensee_id) {
        let link = document.getElementById("brand-theme-css") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.id = "brand-theme-css";
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
        link.href = `/api/theme/${p.licensee_id}`;
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
        user={{ name: profile?.name || "Consultor", role: "vendedor" }}
        onLogout={handleLogout}
        sections={VENDEDOR_SECTIONS}
        activeFeatures={features}
        brandLabel="Painel do Consultor"
        extraPanel={pathname === "/vendedor/publicar" ? <VendorPublishPanel /> : undefined}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col overflow-x-hidden pb-10">
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>
      </div>
      <footer className="fixed bottom-0 left-[220px] right-0 z-40 flex items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-2.5 text-[0.68rem] text-[var(--txt3)] overflow-hidden">
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
      <WelcomeTour role="vendedor" />
    </>
  );
}

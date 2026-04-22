"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { CLIENTE_SECTIONS } from "@/components/layout/Sidebar";
import { useContentProtection } from "@/hooks/useContentProtection";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import WelcomeTour from "@/components/tour/WelcomeTour";
import { SupportDrawerProvider } from "@/components/support/SupportDrawerProvider";
import SupportFab from "@/components/support/SupportFab";
import PushPermission from "@/components/PushPermission";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const [tickerItems, setTickerItems] = useState<{ title: string; url?: string }[]>([]);

  useBrandTheme(profile?.licensee_id);
  // useContentProtection();

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    const h = new Date().getHours();
    document.documentElement.setAttribute("data-theme", saved || ((h >= 6 && h < 19) ? "light" : "dark"));
  }, []);

  useEffect(() => {
    fetch("/api/noticias?segment=turismo")
      .then(r => r.json())
      .then((items: { title: string; url?: string }[]) => {
        if (items?.length) setTickerItems(items.map(i => ({ title: i.title, url: i.url })));
      })
      .catch(() => {});
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
    <SupportDrawerProvider>
      <Sidebar
        activePath={pathname}
        user={{ name: profile?.name || "Cliente", role: "cliente" }}
        onLogout={handleLogout}
        sections={CLIENTE_SECTIONS}
        activeFeatures={features}
        brandLabel={profile?.licensee?.name || "Central do Cliente"}
      />
      <div className={`ml-[220px] flex flex-1 flex-col ${pathname === "/cliente/publicar" ? "h-dvh overflow-hidden" : "min-h-dvh pb-10"}`}>
        <main className="flex flex-1 flex-col" style={{padding: pathname === "/cliente/publicar" ? "0" : "1.5rem", gap: pathname === "/cliente/publicar" ? "0" : "1.25rem"}}>{children}</main>
      </div>
      <footer className="fixed bottom-0 left-[220px] right-0 z-40 flex items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-2.5 text-[0.68rem] text-[var(--txt3)] overflow-hidden">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
        <span>Aurohub online</span>
        <span className="text-[var(--bdr2)]">&middot;</span>
        <span>{profile?.licensee?.name || "—"}</span>
        {tickerItems.length > 0 && (
          <>
            <span className="text-[var(--bdr2)]">&middot;</span>
            <div className="flex-1 max-w-full overflow-hidden">
              <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
              <div className="flex whitespace-nowrap text-[10px] text-[var(--txt3)]"
                style={{ animation: "ticker 40s linear infinite" }}>
                {[...tickerItems, ...tickerItems].map((t, i) => (
                  t.url ? (
                    <a
                      key={i}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-6 hover:text-[var(--txt)] hover:underline"
                    >
                      {"\uD83D\uDCF0"} {t.title}
                    </a>
                  ) : (
                    <span key={i} className="shrink-0 px-6">{"\uD83D\uDCF0"} {t.title}</span>
                  )
                ))}
              </div>
            </div>
          </>
        )}
      </footer>
      <WelcomeTour role="cliente" />
      <PushPermission />
      <SupportFab />
    </SupportDrawerProvider>
  );
}

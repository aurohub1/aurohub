"use client";

import "./theme-override.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (!p) { router.push("/login"); return; }
      if (p.role !== "adm") { router.push(homeForRole(p.role)); return; }
      setProfile(p);
      setChecking(false);
    })();
  }, [router]);

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[Logout] signOut error:", error);
    } catch (err) {
      console.error("[Logout] exception:", err);
    }
    window.location.href = "/login";
  }

  if (checking) {
    return <div className="flex min-h-dvh items-center justify-center text-[13px] text-[var(--txt3)]">Verificando acesso...</div>;
  }

  return (
    <>
      <Sidebar
        activePath={pathname}
        user={{ name: profile?.name || "Usuário", role: profile?.role || "adm" }}
        onLogout={handleLogout}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col pb-10">
        <Topbar />
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>
      </div>
      <footer className="fixed bottom-0 left-[220px] right-0 z-40 flex items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-2.5 text-[0.68rem] text-[var(--txt3)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
        <span>Supabase online</span>
        <span className="text-[var(--bdr2)]">&middot;</span>
        <span>Aurohub v6.0</span>
      </footer>
    </>
  );
}

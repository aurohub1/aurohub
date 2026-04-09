"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <Sidebar
        activePath={pathname}
        user={{ name: "Duane", role: "adm" }}
        onLogout={handleLogout}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col">
        <Topbar />
        <main className="flex flex-1 flex-col gap-5 p-6">{children}</main>

        {/* Status bar */}
        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-3 text-[0.68rem] text-[var(--txt3)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          <span>Supabase online</span>
          <span className="text-[var(--bdr2)]">&middot;</span>
          <span>Aurohub v6.0</span>
        </footer>
      </div>
    </>
  );
}

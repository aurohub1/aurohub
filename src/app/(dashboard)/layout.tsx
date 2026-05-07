"use client";

import "./theme-override.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import {
  AdmContext, type AdmLevel,
} from "@/contexts/AdmContext";
import {
  ADM_FULL_PERMISSIONS, ADM_PERMISSIONS_SELECT, rowToAdmPermissions, type AdmPermissions,
} from "@/lib/adm-permissions";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AdmSupportFab from "@/components/support/AdmSupportFab";
import AdmSupportDrawer from "@/components/support/AdmSupportDrawer";
import AdmChatFab from "@/components/chat/AdmChatFab";
import AdmChatWidget from "@/components/chat/AdmChatWidget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [admPerms, setAdmPerms] = useState<AdmPermissions>(ADM_FULL_PERMISSIONS);
  const [admLevel, setAdmLevel] = useState<AdmLevel>(null);
  const [admSupportOpen, setAdmSupportOpen] = useState(false);
  const [admSupportMinimized, setAdmSupportMinimized] = useState(false);
  const [admChatOpen, setAdmChatOpen] = useState(false);
  const [admChatMinimized, setAdmChatMinimized] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (!p) { router.push("/login"); return; }
      if (p.role !== "adm" && p.role !== "operador") { router.push(homeForRole(p.role)); return; }
      setProfile(p);
      const level = p.adm_level as AdmLevel | null;
      setAdmLevel(level ?? null);
      if (p.role === "adm" && level && level !== "super") {
        const { data } = await supabase
          .from("adm_permissions")
          .select(ADM_PERMISSIONS_SELECT)
          .eq("user_id", p.id)
          .maybeSingle();
        if (data) setAdmPerms(rowToAdmPermissions(data as Record<string, unknown>));
      }
      setChecking(false);
    })();
    fetch("/api/maintenance-status", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { active: boolean }) => setMaintenanceActive(d.active))
      .catch(() => {});
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
    <AdmContext.Provider value={{ admLevel, perms: admPerms }}>
      <Sidebar
        activePath={pathname}
        user={{ name: profile?.name || "Usuário", role: profile?.role || "adm", avatar_url: profile?.avatar_url || null }}
        onLogout={handleLogout}
        maintenanceActive={maintenanceActive}
        admPerms={admPerms}
        chatUnreadCount={chatUnreadCount}
      />
      <div className="ml-[220px] flex min-h-dvh flex-1 flex-col pb-10">
        <Topbar />
        <main className="flex flex-1 flex-col gap-5 p-6 pb-20">{children}</main>
      </div>
      <footer className="fixed bottom-0 left-[220px] right-0 z-40 flex items-center gap-3 border-t border-[var(--bdr)] bg-[var(--bg1)] px-6 py-2.5 text-[0.68rem] text-[var(--txt3)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
        <span>Supabase online</span>
        <span className="text-[var(--bdr2)]">&middot;</span>
        <span>Aurohub v6.0</span>
      </footer>
      {profile?.role === "adm" && (
        <>
          <AdmSupportFab onClick={() => { setAdmSupportOpen(true); setAdmSupportMinimized(false); }} isOpen={admSupportOpen} />
          <AdmSupportDrawer
            isOpen={admSupportOpen}
            minimized={admSupportMinimized}
            onClose={() => { setAdmSupportOpen(false); setAdmSupportMinimized(false); }}
            onMinimize={() => setAdmSupportMinimized(true)}
            onRestore={() => setAdmSupportMinimized(false)}
          />
          <AdmChatFab
            onClick={() => { setAdmChatOpen(true); setAdmChatMinimized(false); }}
            isOpen={admChatOpen}
            unreadCount={chatUnreadCount}
          />
          <AdmChatWidget
            isOpen={admChatOpen}
            minimized={admChatMinimized}
            onClose={() => { setAdmChatOpen(false); setAdmChatMinimized(false); }}
            onMinimize={() => setAdmChatMinimized(true)}
            onRestore={() => setAdmChatMinimized(false)}
            onUnreadChange={setChatUnreadCount}
          />
        </>
      )}
    </AdmContext.Provider>
  );
}

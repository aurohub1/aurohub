"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import Sidebar, { VENDEDOR_SECTIONS } from "@/components/layout/Sidebar";

import { useBrandTheme } from "@/hooks/useBrandTheme";
import WelcomeTour from "@/components/tour/WelcomeTour";
import { SupportDrawerProvider } from "@/components/support/SupportDrawerProvider";
import SupportFab from "@/components/support/SupportFab";
import PushPermission from "@/components/PushPermission";
import { PublishQueueProvider } from "@/hooks/usePublishQueue";
import PublishQueuePanel from "@/components/PublishQueuePanel";
import MaintenanceBanner from "@/components/layout/MaintenanceBanner";

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const [tickerItems, setTickerItems] = useState<{ title: string; url?: string }[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

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
      // Vendedor, Unidade, Cliente ou ADM podem acessar
      if (!["vendedor", "unidade", "cliente", "adm"].includes(p.role || "")) {
        router.push(homeForRole(p.role));
        return;
      }
      setProfile(p);
      const feats = await getFeatures(supabase, p);
      setFeatures(feats);

      setChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!profile?.licensee_id || !profile?.id) return;
    const licenseeId = profile.licensee_id;
    const userId = profile.id;
    let alive = true;

    async function refreshUnread() {
      const { data: rooms } = await supabase.from("chat_rooms").select("id").eq("licensee_id", licenseeId);
      if (!rooms?.length) { if (alive) setChatUnreadCount(0); return; }
      const roomIds = (rooms as { id: string }[]).map(r => r.id);
      const { data: receipts } = await supabase.from("chat_read_receipts").select("room_id, last_read_at")
        .eq("user_id", userId).eq("is_adm", false).in("room_id", roomIds);
      const receiptMap = new Map(((receipts ?? []) as { room_id: string; last_read_at: string }[]).map(r => [r.room_id, r.last_read_at]));
      let count = 0;
      for (const room of rooms as { id: string }[]) {
        const { count: c } = await supabase.from("chat_messages").select("id", { count: "exact", head: true })
          .eq("room_id", room.id).neq("sender_id", userId).gt("created_at", receiptMap.get(room.id) ?? "1970-01-01T00:00:00Z");
        if ((c ?? 0) > 0) count++;
      }
      if (alive) setChatUnreadCount(count);
    }

    refreshUnread();
    const ch = supabase.channel(`consultor-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refreshUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_read_receipts" }, refreshUnread)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [profile?.licensee_id, profile?.id]);

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (err) { console.error("[Logout]", err); }
    window.location.href = "/login";
  }

  if (checking) {
    return <div className="flex min-h-dvh items-center justify-center text-[13px] text-[var(--txt3)]">Verificando acesso...</div>;
  }

  return (
    <SupportDrawerProvider>
      <PublishQueueProvider>
      <Sidebar
        activePath={pathname}
        user={{ name: profile?.name || "Consultor", role: "vendedor", avatar_url: profile?.avatar_url || null }}
        onLogout={handleLogout}
        sections={VENDEDOR_SECTIONS}
        activeFeatures={features}
        brandLabel="Painel do Consultor"
        chatUnreadCount={chatUnreadCount}
      />
      <div className={`ml-[220px] flex flex-1 flex-col ${pathname === "/consultor/publicar" ? "h-[calc(100dvh-40px)] overflow-hidden" : "min-h-dvh overflow-x-hidden pb-10"}`}>
        <MaintenanceBanner />
        <main className="flex flex-1 flex-col" style={{padding: pathname === "/consultor/publicar" ? "0" : "1.5rem", gap: pathname === "/consultor/publicar" ? "0" : "1.25rem", minHeight: 0, overflow: pathname === "/consultor/publicar" ? "hidden" : "auto"}}>{children}</main>
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
      <WelcomeTour role="vendedor" />
      <PushPermission />
      <SupportFab />
      <PublishQueuePanel />
      </PublishQueueProvider>
    </SupportDrawerProvider>
  );
}

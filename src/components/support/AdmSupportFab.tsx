"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Headphones } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdmSupportFab({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const { count } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["bot", "human"])
        .eq("unread_adm", true);
      if (alive) setUnread(count ?? 0);
    }

    refresh();

    const ch = supabase
      .channel("adm-fab-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, refresh)
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  if (isOpen) return null;
  if (pathname && /\/adm\/suporte(\/|$)/.test(pathname)) return null;

  return (
    <>
      <style>{`
        .ah-adm-support-fab {
          opacity: 0;
          transform: scale(0.6);
          pointer-events: none;
          transition: opacity 300ms ease, transform 250ms ease, box-shadow 200ms ease;
          box-shadow: 0 6px 20px rgba(245,158,11,0.35);
        }
        .ah-adm-support-fab[data-ready="true"] {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .ah-adm-support-fab[data-ready="true"]:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 28px rgba(245,158,11,0.55);
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="Abrir painel de suporte"
        data-ready={ready ? "true" : "false"}
        className="ah-adm-support-fab fixed bottom-4 right-4 z-[9989] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-amber-500 text-white"
      >
        <Headphones size={22} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}

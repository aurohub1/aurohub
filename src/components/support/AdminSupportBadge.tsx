"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Badge de tickets de suporte não lidos para o ADM.
 * Assina Realtime em support_tickets; refaz count a cada evento.
 * Requer que Realtime replication esteja ativa em support_tickets.
 */
export default function AdminSupportBadge() {
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const { count: n } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("unread_adm", true);
      if (alive) setCount(n ?? 0);
    }

    refresh();

    const ch = supabase
      .channel("support-tickets-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => { refresh(); },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/adm/suporte")}
      aria-label={`${count} ticket(s) de suporte não lido(s)`}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <Headphones size={18} />
      <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Notif {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string;
  data: { url?: string } | null;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at, data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs((data ?? []) as Notif[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    const ids = notifs.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notificações"
        style={{
          position: "relative",
          width: 28, height: 28,
          borderRadius: 7,
          border: "none",
          background: open ? "rgba(212,168,67,0.12)" : "transparent",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--txt3)",
          flexShrink: 0,
        }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 13, height: 13,
            borderRadius: 99,
            background: "var(--orange, #FF7A1A)",
            color: "#fff",
            fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1, padding: "0 3px",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed",
          bottom: 44,
          left: 232,
          width: 300, maxHeight: 380,
          borderRadius: 13,
          border: "1px solid var(--bdr)",
          background: "var(--bg1, #ffffff)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          zIndex: 9999,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Cabeçalho */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 13px 8px",
            borderBottom: "1px solid var(--bdr)",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>Notificações</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ fontSize: 10, color: "var(--orange, #FF7A1A)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", display: "flex", alignItems: "center" }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "var(--txt3)" }}>
                Carregando...
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--txt3)" }}>
                Nenhuma notificação
              </div>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: "flex", gap: 9, padding: "9px 13px",
                  borderBottom: "0.5px solid var(--bdr)",
                  background: n.read ? "transparent" : "color-mix(in srgb, var(--orange, #FF7A1A) 6%, transparent)",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: n.read ? "transparent" : "var(--orange, #FF7A1A)",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: n.read ? 400 : 600, color: "var(--txt)", lineHeight: 1.35 }}>
                    {n.title}
                  </div>
                  {n.message && (
                    <div style={{ fontSize: 10, color: "var(--txt3)", marginTop: 2, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9, color: "var(--txt3)", flexShrink: 0, marginTop: 2 }}>
                  {relativeTime(n.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

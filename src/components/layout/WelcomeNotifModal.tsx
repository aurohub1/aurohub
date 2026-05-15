"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Notif {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
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

export default function WelcomeNotifModal({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    const key = `ah_welcome_shown_${userId}`;
    if (sessionStorage.getItem(key)) return;

    supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setNotifs(data as Notif[]);
          setOpen(true);
        }
        sessionStorage.setItem(key, "1");
      });
  }, [userId]);

  async function handleMarkAll() {
    const ids = notifs.map((n) => n.id);
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setOpen(false);
  }

  if (!open) return null;

  const first = userName.split(" ")[0];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.35)",
    }}>
      <div style={{
        width: 360, borderRadius: 16,
        background: "var(--bg2, #ffffff)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
        overflow: "hidden",
        border: "1px solid var(--bdr)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid var(--bdr)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={15} color="var(--orange, #FF7A1A)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>
              Olá, {first}! Tem novidades
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", display: "flex", alignItems: "center" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {notifs.map((n) => (
            <div key={n.id} style={{
              padding: "10px 16px",
              borderBottom: "0.5px solid var(--bdr)",
              display: "flex", gap: 10,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                background: "var(--orange, #FF7A1A)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)", lineHeight: 1.35 }}>
                  {n.title}
                </div>
                {n.message && (
                  <div style={{ fontSize: 11, color: "var(--txt3)", marginTop: 2, lineHeight: 1.4 }}>
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

        {/* Footer */}
        <div style={{
          padding: "10px 16px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 8,
              border: "1px solid var(--bdr)", background: "none",
              cursor: "pointer", color: "var(--txt3)",
            }}
          >
            Fechar
          </button>
          <button
            onClick={handleMarkAll}
            style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 8,
              border: "none", background: "var(--orange, #FF7A1A)",
              cursor: "pointer", color: "#fff", fontWeight: 600,
            }}
          >
            Ver tudo
          </button>
        </div>
      </div>
    </div>
  );
}

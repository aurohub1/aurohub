"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";

const DISMISSED_KEY = "ah_push_dismissed_until";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushPermission() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (!VAPID_PUBLIC) return;
    if (Notification.permission === "granted") return;   // já aceito (SW pode re-registrar silencioso)
    if (Notification.permission === "denied") return;    // usuário bloqueou, não insistir

    try {
      const until = Number(localStorage.getItem(DISMISSED_KEY) || "0");
      if (until && Date.now() < until) return;
    } catch { /* silent */ }

    // Aguarda 3s pra não atrapalhar o first paint
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS)); } catch { /* silent */ }
    setVisible(false);
  };

  const enable = async () => {
    if (!VAPID_PUBLIC) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { dismiss(); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });

      const profile = await getProfile(supabase);
      if (!profile) { dismiss(); return; }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          },
          userAgent: navigator.userAgent,
        }),
      });

      setVisible(false);
    } catch (err) {
      console.warn("[Push] enable falhou:", err);
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Ativar notificações"
      className="fixed bottom-4 right-4 z-[9500] flex max-w-[340px] items-start gap-3 rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] p-4 shadow-2xl"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--orange3)] text-[var(--orange)]">
        <Bell size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--txt)]">Ativar notificações?</div>
        <div className="mt-0.5 text-[11px] text-[var(--txt3)]">
          Avisamos quando um post for publicado, falhar ou o limite estiver chegando.
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-lg bg-[var(--orange)] px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Ativando..." : "Ativar"}
          </button>
          <button
            onClick={dismiss}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt2)]"
          >
            Agora não
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Fechar"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt2)]"
      >
        <X size={13} />
      </button>
    </div>
  );
}

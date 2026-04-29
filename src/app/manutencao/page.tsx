"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";

interface Status {
  active: boolean;
  message: string;
  scheduledEnd: string | null;
}

function useCountdown(target: string | null) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    if (!target) { setDiff(null); return; }
    const tick = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

/* ── Orbital animation ─────────────────────────── */
const ORBS = [
  { color: "#D4A843", r: 90,  speed: 6,   size: 8,  delay: 0 },
  { color: "#FF7A1A", r: 130, speed: 10,  size: 6,  delay: 2 },
  { color: "#4a9eff", r: 165, speed: 15,  size: 5,  delay: 1 },
];

const RINGS = [90, 130, 165, 200];

const KEYFRAMES = `
@keyframes orbit-0 { from { transform: rotate(0deg) translateX(90px) rotate(0deg); } to { transform: rotate(360deg) translateX(90px) rotate(-360deg); } }
@keyframes orbit-1 { from { transform: rotate(120deg) translateX(130px) rotate(-120deg); } to { transform: rotate(480deg) translateX(130px) rotate(-480deg); } }
@keyframes orbit-2 { from { transform: rotate(240deg) translateX(165px) rotate(-240deg); } to { transform: rotate(600deg) translateX(165px) rotate(-600deg); } }
@keyframes ring-pulse { 0%,100%{opacity:.12} 50%{opacity:.28} }
@keyframes dot-blink { 0%,100%{opacity:1} 50%{opacity:.2} }
@keyframes fade-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
`;

export default function ManutencaoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const diff = useCountdown(status?.scheduledEnd ?? null);

  // If ADM: redirect to home immediately
  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (p?.role === "adm") { router.replace("/inicio"); }
    })();
  }, [router]);

  // Load status + auto-refresh
  async function load() {
    try {
      const res = await fetch("/api/maintenance-status", { cache: "no-store" });
      const data: Status = await res.json();
      setStatus(data);
      if (!data.active) router.replace("/");
    } catch { /* silent */ }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#060D1A",
        backgroundImage: "radial-gradient(circle, rgba(26,86,196,0.08) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        padding: "24px",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: "#EEF2FF",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Glow central */}
        <div style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,86,196,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Orbital system */}
        <div style={{
          position: "relative",
          width: 440,
          height: 440,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          animation: "fade-in .6s ease both",
        }}>
          {/* Rings */}
          {RINGS.map((r, i) => (
            <div key={i} style={{
              position: "absolute",
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: "1px solid rgba(100,140,255,0.18)",
              animation: `ring-pulse ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}

          {/* Orbital dots */}
          {ORBS.map((orb, i) => (
            <div key={i} style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: `orbit-${i} ${orb.speed}s linear infinite`,
            }}>
              <div style={{
                width: orb.size,
                height: orb.size,
                borderRadius: "50%",
                background: orb.color,
                boxShadow: `0 0 12px 4px ${orb.color}88`,
              }} />
            </div>
          ))}

          {/* Center logo */}
          <div style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dxgj4bcch/image/upload/v1774115445/Logo_com_fundo_trans22_1_wujniv.png"
              alt="Aurohub"
              style={{ width: 56, height: 56, objectFit: "contain" }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#D4A843" }}>
              AUROHUB
            </span>
          </div>
        </div>

        {/* Text block */}
        <div style={{
          textAlign: "center",
          maxWidth: 480,
          animation: "fade-in .6s .2s ease both",
          opacity: 0,
        }}>
          <h1 style={{
            fontSize: "clamp(22px, 4vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 12px",
            background: "linear-gradient(135deg, #EEF2FF 0%, #a8c4ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Sistema em Manutenção
          </h1>

          <p style={{
            fontSize: 14,
            color: "rgba(200,215,255,0.7)",
            lineHeight: 1.65,
            margin: "0 0 28px",
          }}>
            {status?.message ?? "Estamos realizando melhorias para oferecer uma experiência ainda melhor. Voltamos em breve!"}
          </p>

          {/* Countdown */}
          {diff !== null && diff > 0 && (
            <div style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "12px 28px",
              marginBottom: 28,
            }}>
              <span style={{ fontSize: 10, color: "rgba(200,215,255,0.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Previsão de retorno
              </span>
              <span style={{
                fontSize: 28,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: ".04em",
                color: "#D4A843",
              }}>
                {formatCountdown(diff)}
              </span>
            </div>
          )}

          {/* Auto-refresh indicator */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "rgba(200,215,255,0.4)",
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#FF7A1A",
              animation: "dot-blink 1.4s ease-in-out infinite",
              flexShrink: 0,
            }} />
            Atualizando automaticamente...
          </div>
        </div>
      </div>
    </>
  );
}

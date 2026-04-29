"use client";

import { useEffect, useState } from "react";

interface Status {
  active: boolean;
  scheduledStart: string | null;
  bannerHours: number;
}

function timeLabel(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function MaintenanceBanner() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function check() {
      try {
        const res = await fetch("/api/maintenance-status", { cache: "no-store" });
        const data: Status = await res.json();
        if (data.active || !data.scheduledStart) { setLabel(null); return; }
        const startMs = new Date(data.scheduledStart).getTime();
        const diff = startMs - Date.now();
        const windowMs = data.bannerHours * 3_600_000;
        if (diff > 0 && diff <= windowMs) {
          setLabel(timeLabel(diff));
        } else {
          setLabel(null);
        }
      } catch { setLabel(null); }
    }

    check();
    timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!label) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, #FF7A1A, #D4A843)",
      padding: "8px 16px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: 600,
      color: "#000",
      letterSpacing: ".01em",
      flexShrink: 0,
    }}>
      ⚠ Manutenção programada em {label}. Salve seu trabalho.
    </div>
  );
}

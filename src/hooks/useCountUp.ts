"use client";

import { useEffect, useState } from "react";

/**
 * Conta de 0 até `target` com easeOutCubic. Só dispara quando `enabled=true`.
 *
 * Padrão de uso nas páginas com fade-in:
 *   const [countersEnabled, setCountersEnabled] = useState(false);
 *   useEffect(() => {
 *     if (loading) { setCountersEnabled(false); return; }
 *     const t = setTimeout(() => setCountersEnabled(true), 200);
 *     return () => clearTimeout(t);
 *   }, [loading]);
 *   const xAnim = useCountUp(x, countersEnabled);
 */
export function useCountUp(target: number, enabled: boolean, duration = 600): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!enabled) { setV(0); return; }
    if (!target || target <= 0) { setV(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, duration]);
  return v;
}

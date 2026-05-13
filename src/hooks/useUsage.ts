"use client";

import { useEffect, useState, useCallback } from "react";

export interface UsageItem {
  metric:  string;
  label:   string;
  count:   number;
  limit:   number;
  percent: number;
  allowed: boolean;
}

const METRICS: { metric: string; label: string }[] = [
  { metric: "feed_reels", label: "Feed + Reels hoje" },
  { metric: "stories",    label: "Stories hoje" },
  { metric: "roteiros",   label: "Roteiros este mês" },
];

export function useUsage(licenseeId: string | null) {
  const [items, setItems]     = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!licenseeId) { setLoading(false); return; }

    const results = await Promise.all(
      METRICS.map(async ({ metric, label }) => {
        try {
          const res = await fetch(
            `/api/usage/check?metric=${metric}&licensee_id=${encodeURIComponent(licenseeId)}`
          );
          const d = await res.json() as { count: number; limit: number; percent: number; allowed: boolean };
          return { metric, label, count: d.count, limit: d.limit, percent: d.percent, allowed: d.allowed };
        } catch {
          return { metric, label, count: 0, limit: -1, percent: 0, allowed: true };
        }
      })
    );

    setItems(results);
    setLoading(false);
  }, [licenseeId]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { items, loading, refresh: fetch_ };
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Format = "stories" | "feed" | "reels" | "tv";

interface PostCountersProps {
  userId: string;
  className?: string;
}

export function PostCounters({ userId, className = "" }: PostCountersProps) {
  const [postCounts, setPostCounts] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [postLimits, setPostLimits] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });

  useEffect(() => {
    if (!userId) return;

    // Buscar contadores de posts do mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    Promise.all([
      // Contadores
      supabase
        .from("activity_logs")
        .select("metadata")
        .gte("created_at", inicioMes.toISOString())
        .in("event_type", ["post_instagram", "post_scheduled"]),
      // Limites
      supabase
        .from("profiles")
        .select("limit_stories, limit_feed, limit_reels, limit_tv")
        .eq("id", userId)
        .single(),
    ])
      .then(([logsRes, limitsRes]) => {
        // Contar posts por formato
        const counts = { stories: 0, feed: 0, reels: 0, tv: 0 };
        (logsRes.data ?? []).forEach((log: any) => {
          if (log.metadata?.user_id === userId) {
            const fmt = log.metadata?.format as Format;
            if (fmt && fmt in counts) counts[fmt]++;
          }
        });
        setPostCounts(counts);

        // Limites do plano
        if (limitsRes.data) {
          setPostLimits({
            stories: limitsRes.data.limit_stories ?? 0,
            feed: limitsRes.data.limit_feed ?? 0,
            reels: limitsRes.data.limit_reels ?? 0,
            tv: limitsRes.data.limit_tv ?? 0,
          });
        }
      })
      .catch((err) => console.error("[PostCounters]", err));
  }, [userId]);

  const items = [
    { l: "Stories", k: "stories" as Format, c: "var(--brand-primary)" },
    { l: "Feed", k: "feed" as Format, c: "#f59e0b" },
    { l: "Reels", k: "reels" as Format, c: "#22c55e" },
    { l: "TV", k: "tv" as Format, c: "#a855f7" },
  ];

  return (
    <div className={`flex gap-6 ${className}`}>
      {items.map((x) => {
        const usado = postCounts[x.k];
        const limite = postLimits[x.k];
        const display = limite > 0 ? `${usado}/${limite}` : "∞";
        return (
          <div key={x.l} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: x.c,
                lineHeight: 1,
              }}
            >
              {display}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--txt3)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginTop: "2px",
              }}
            >
              {x.l}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Format = "stories" | "feed" | "reels" | "tv";

interface PostCountersProps {
  userId: string;
  planSlug?: string;
  className?: string;
}

export function PostCounters({ userId, planSlug, className = "" }: PostCountersProps) {
  const [postCounts, setPostCounts] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [postLimits, setPostLimits] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });

  useEffect(() => {
    if (!userId) return;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    async function load() {
      // Contadores do mês
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("metadata")
        .gte("created_at", inicioMes.toISOString())
        .in("event_type", ["post_instagram", "post_scheduled"]);

      const counts = { stories: 0, feed: 0, reels: 0, tv: 0 };
      (logs ?? []).forEach((log: any) => {
        if (log.metadata?.user_id === userId) {
          const fmt = log.metadata?.format as Format;
          if (fmt && fmt in counts) counts[fmt]++;
        }
      });
      setPostCounts(counts);

      // Limites do plano
      const slug =
        planSlug ??
        await (async () => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("licensee_id, licensees(plan_slug, plan)")
            .eq("id", userId)
            .single();
          const lic = (prof as any)?.licensees;
          return lic?.plan_slug || lic?.plan || null;
        })();

      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("max_posts_day, max_feed_reels_day, max_stories_day, is_enterprise")
          .eq("slug", slug)
          .single();
        if (plan) {
          const fr = (plan as any).max_feed_reels_day ?? 0;
          const st = (plan as any).max_stories_day ?? 0;
          setPostLimits({
            stories: st >= 99 ? 9999 : st,
            feed: fr,
            reels: fr,
            tv: (plan as any).is_enterprise ? ((plan as any).max_posts_day || 999) : 0,
          });
        }
      }
    }

    load().catch((err) => console.error("[PostCounters]", err));
  }, [userId, planSlug]);

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
                fontSize: "21px",
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

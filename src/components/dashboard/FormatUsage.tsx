"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface FormatData {
  name: string;
  count: number;
  color: string;
}

const FORMAT_COLORS: Record<string, string> = {
  stories: "#FF7A1A",
  feed: "#3B82F6",
  reels: "#A78BFA",
  tv: "#22C55E",
};

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV / IGTV",
};

export default function FormatUsage() {
  const [formats, setFormats] = useState<FormatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormats();
  }, []);

  async function loadFormats() {
    try {
      const { data } = await supabase
        .from("activity_logs")
        .select("event_type");

      const counts: Record<string, number> = {};
      (data ?? []).forEach((row) => {
        const fmt = (row.event_type || "stories").toLowerCase();
        counts[fmt] = (counts[fmt] || 0) + 1;
      });

      const result: FormatData[] = Object.entries(counts)
        .map(([name, count]) => ({
          name: FORMAT_LABELS[name] ?? name,
          count,
          color: FORMAT_COLORS[name] ?? "var(--txt2)",
        }))
        .sort((a, b) => b.count - a.count);

      setFormats(result);
    } catch {
      setFormats([]);
    } finally {
      setLoading(false);
    }
  }

  const maxCount = Math.max(...formats.map((f) => f.count), 1);

  return (
    <div className="card-glass flex flex-col p-5">
      <h3 className="mb-4 text-[13px] font-bold text-[var(--txt)]">
        Uso por formato
      </h3>

      {loading ? (
        <div className="py-6 text-center text-[12px] text-[var(--txt3)]">
          Carregando...
        </div>
      ) : formats.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-[var(--txt3)]">
          Nenhum dado disponivel
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {formats.map((f) => (
            <div key={f.name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--txt2)]">
                  {f.name}
                </span>
                <span className="text-[11px] font-bold" style={{ color: f.color }}>
                  {f.count}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(f.count / maxCount) * 100}%`,
                    background: f.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useUsage } from "@/hooks/useUsage";

function isUnlimited(limit: number): boolean {
  return limit === -1 || limit >= 9999;
}

function barColor(percent: number): string {
  if (percent >= 80) return "var(--red, #EF4444)";
  if (percent >= 60) return "#F59E0B";
  return "var(--green, #22C55E)";
}

export function UsageBars({ licenseeId }: { licenseeId: string }) {
  const { items, loading } = useUsage(licenseeId);

  if (loading || items.length === 0) return null;

  const visible = items.filter((i) => !isUnlimited(i.limit) || i.count > 0);
  if (visible.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-[var(--bdr)] px-4 py-3"
      style={{ background: "var(--card-bg)" }}
    >
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
        Uso do plano
      </div>
      <div className="flex flex-col gap-2.5">
        {visible.map((item) => {
          const unlimited = isUnlimited(item.limit);
          const color     = unlimited ? "var(--green, #22C55E)" : barColor(item.percent);
          const isWarn    = !unlimited && item.percent >= 80;

          return (
            <div key={item.metric}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[var(--txt2)]">
                  {isWarn && <span className="mr-1">⚠️</span>}
                  {item.label}
                </span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
                  {item.count} / {unlimited ? "∞" : item.limit}
                </span>
              </div>
              {unlimited ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                  <div className="h-full w-full rounded-full" style={{ background: "var(--green, #22C55E)", opacity: 0.25 }} />
                </div>
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(item.percent, 100)}%`, background: color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

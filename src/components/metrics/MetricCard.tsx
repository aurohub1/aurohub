"use client";

import { ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  accent?: "blue" | "gold" | "green" | "orange";
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  blue:   "#3B82F6",
  gold:   "#D4A843",
  green:  "#10B981",
  orange: "#FF7A1A",
};

export default function MetricCard({ label, value, icon, accent = "blue" }: Props) {
  const color = ACCENT[accent];
  return (
    <div
      className="relative overflow-hidden p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `${color}1A`,
              color,
              boxShadow: `0 0 24px ${color}33`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4 text-[40px] font-bold leading-none tabular-nums text-white">{value}</div>
    </div>
  );
}

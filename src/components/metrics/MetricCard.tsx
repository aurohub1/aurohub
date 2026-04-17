"use client";

import { ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  accent?: "blue" | "gold" | "green" | "orange";
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  blue:   "var(--blue)",
  gold:   "var(--gold)",
  green:  "var(--green)",
  orange: "var(--orange)",
};

const ACCENT_HEX: Record<NonNullable<Props["accent"]>, string> = {
  blue:   "#3B82F6",
  gold:   "#D4A843",
  green:  "#22C55E",
  orange: "#FF7A1A",
};

export default function MetricCard({ label, value, icon, accent = "blue" }: Props) {
  const colorVar = ACCENT[accent];
  const colorHex = ACCENT_HEX[accent];
  return (
    <div
      className="relative overflow-hidden p-6"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--bdr2)",
        borderRadius: 20,
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--txt3)" }}>
          {label}
        </span>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `${colorHex}1A`,
              color: colorVar,
              boxShadow: `0 0 24px ${colorHex}33`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4 text-[40px] font-bold leading-none tabular-nums" style={{ color: "var(--txt)" }}>
        {value}
      </div>
    </div>
  );
}

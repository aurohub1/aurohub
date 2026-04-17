"use client";

import { ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  accent?: "blue" | "gold" | "green" | "orange";
}

const ACCENT: Record<NonNullable<Props["accent"]>, { bg: string; text: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700"   },
  gold:   { bg: "bg-amber-50",  text: "text-amber-700"  },
  green:  { bg: "bg-green-50",  text: "text-green-700"  },
  orange: { bg: "bg-orange-50", text: "text-orange-700" },
};

export default function MetricCard({ label, value, icon, accent = "blue" }: Props) {
  const a = ACCENT[accent];
  return (
    <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</span>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}

"use client";

type KpiColor = "green" | "orange" | "gold" | "blue" | "red";

interface KpiCardProps {
  label: string;
  value: string | number;
  badge: string;
  color: KpiColor;
  icon: React.ReactNode;
  href?: string;
}

const COLOR_MAP: Record<KpiColor, { bg: string; text: string; gradient: string }> = {
  green: {
    bg: "var(--green3)",
    text: "var(--green)",
    gradient: "linear-gradient(90deg, #22C55E, #4ADE80)",
  },
  orange: {
    bg: "var(--orange3)",
    text: "var(--orange2)",
    gradient: "linear-gradient(90deg, #FF7A1A, #FF9A3C)",
  },
  gold: {
    bg: "var(--gold3)",
    text: "var(--gold2)",
    gradient: "linear-gradient(90deg, #D4A843, #E2BC68)",
  },
  blue: {
    bg: "var(--blue3)",
    text: "var(--blue)",
    gradient: "linear-gradient(90deg, #3B82F6, #60A5FA)",
  },
  red: {
    bg: "var(--red3)",
    text: "var(--red)",
    gradient: "linear-gradient(90deg, #EF4444, #F87171)",
  },
};

export default function KpiCard({ label, value, badge, color, icon, href }: KpiCardProps) {
  const colors = COLOR_MAP[color];

  const content = (
    <div className="card-glass group relative cursor-pointer p-4 transition-all duration-200 hover:-translate-y-[3px] hover:border-[rgba(212,168,67,0.2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,168,67,0.1)]">
      {/* Top accent line */}
      <div
        className="absolute left-0 right-0 top-0 h-0.5 rounded-t-[18px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: colors.gradient }}
      />

      {/* Header: icon + badge */}
      <div className="mb-2.5 flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: colors.bg, color: colors.text }}
        >
          {icon}
        </div>
        <span
          className="rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold"
          style={{ background: colors.bg, color: colors.text }}
        >
          {badge}
        </span>
      </div>

      {/* Value */}
      <div
        className="font-[family-name:var(--font-dm-serif)] text-[2rem] font-bold leading-none tracking-tight"
        style={{ color: color === "red" ? "var(--red)" : "var(--txt)" }}
      >
        {value}
      </div>

      {/* Label */}
      <div className="mt-1 text-[0.7rem] text-[var(--txt3)]">{label}</div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline">
        {content}
      </a>
    );
  }

  return content;
}

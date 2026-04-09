"use client";

import Link from "next/link";

interface QuickAction {
  label: string;
  sub: string;
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Editor de Templates",
    sub: "V1-V15 - todos os formatos",
    href: "/editor",
    color: "var(--gold2)",
    bg: "var(--gold3)",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <path d="M14.3 3.7a1 1 0 011.4 1.4l-9.5 9.5-2 .6.6-2 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Central de Publicação",
    sub: "Stories - Feed - Reels",
    href: "/publicacao",
    color: "var(--green)",
    bg: "var(--green3)",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Métricas Instagram",
    sub: "Alcance - engajamento",
    href: "/metricas",
    color: "var(--purple)",
    bg: "var(--purple3)",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Painel de Clientes",
    sub: "Licenciados - onboarding",
    href: "/clientes",
    color: "var(--green)",
    bg: "var(--green3)",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <path d="M16 11c0 3.866-2.686 7-6 7S4 14.866 4 11V5l6-2 6 2v6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Logs de Atividade",
    sub: "Ações em tempo real",
    href: "/logs",
    color: "var(--blue)",
    bg: "var(--blue3)",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <path d="M4 4h12M4 8h12M4 12h8M4 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function QuickActions() {
  return (
    <div className="card-glass flex flex-col p-5">
      <h3 className="mb-4 text-[13px] font-bold text-[var(--txt)]">
        Ações rápidas
      </h3>

      <div className="flex flex-col gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--txt2)] transition-all hover:-translate-y-px hover:border-[rgba(212,168,67,0.15)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: action.bg, color: action.color }}
            >
              {action.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold leading-tight">
                {action.label}
              </div>
              <div className="text-[10px] text-[var(--txt3)]">{action.sub}</div>
            </div>
            <span className="shrink-0 text-[12px] text-[var(--txt3)]">↗</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Types ───────────────────────────────────────── */

interface SidebarProps {
  activePath: string;
  user: { name: string; role: string };
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ── Navigation map ──────────────────────────────── */

const SECTIONS: NavSection[] = [
  {
    title: "Geral",
    items: [
      {
        label: "Início",
        href: "/inicio",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M3 10l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        label: "Editor de Templates",
        href: "/editor-de-templates",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M14.3 3.7a1 1 0 011.4 1.4l-9.5 9.5-2 .6.6-2 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Embarques",
        href: "/embarques",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        label: "Central de Publicação",
        href: "/central-de-publicacao",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        label: "Métricas Instagram",
        href: "/metricas",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        label: "Logs de Atividade",
        href: "/logs",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M4 4h12M4 8h12M4 12h8M4 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Clientes",
        href: "/clientes",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M16 11c0 3.866-2.686 7-6 7S4 14.866 4 11V5l6-2 6 2v6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 10l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        label: "Usuários",
        href: "/usuarios",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM1 16a7 7 0 0114 0H1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Planos",
        href: "/planos",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M10 2l1.83 3.72L16 6.55l-3 2.93.71 4.13L10 11.77l-3.71 1.84.71-4.13L4 6.55l4.17-.83L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Comercial",
    items: [
      {
        label: "Segmentos",
        href: "/segmentos",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h8M3 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="12" y="12" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        label: "Leads CRM",
        href: "/leads-crm",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 9h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Calculadora",
        href: "/calculadora",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 7h2m4 0h-2m-2 0h2M7 10h6M7 13h2m4 0h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "FAQ Suporte",
        href: "/faq-suporte",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 8a2 2 0 012-2 2 2 0 012 2c0 1-1 1.5-2 2M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Editor Landing",
        href: "/editor-landing",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 12h6M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
];

/* ── Role badge label ────────────────────────────── */

function roleBadgeLabel(role: string): string {
  const map: Record<string, string> = {
    adm: "ADM RAIZ",
    licensee: "LICENCIADO",
    store: "LOJA",
    employee: "FUNCIONARIO",
  };
  return map[role.toLowerCase()] ?? role.toUpperCase();
}

/* ── Component ───────────────────────────────────── */

export default function Sidebar({ activePath, user, onLogout }: SidebarProps) {
  const initial = user.name.charAt(0).toUpperCase();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);

    const onThemeChange = (e: Event) => {
      const t = (e as CustomEvent).detail as "dark" | "light";
      setTheme(t);
    };
    window.addEventListener("theme-change", onThemeChange);

    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme") as "dark" | "light";
      if (t) setTheme(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { observer.disconnect(); window.removeEventListener("theme-change", onThemeChange); };
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-dvh w-[220px] flex-col border-r border-[var(--bdr)] bg-[var(--sidebar-bg)] backdrop-blur-[24px]"
      style={{ WebkitBackdropFilter: "blur(24px)" }}
    >
      {/* ── Brand ───────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-[var(--bdr)] px-4 pb-3 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dxgj4bcch/image/upload/v1774115445/Logo_com_fundo_trans22_1_wujniv.png"
          alt="Aurohub"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          style={{
            filter: theme === "light"
              ? "brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(600%) hue-rotate(360deg) brightness(95%)"
              : "none"
          }}
        />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold leading-tight text-[var(--txt)]">
            Aurohub
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#D4A843]">
            Central ADM
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mt-5 mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-[rgba(255,122,26,0.12)] text-[#FF7A1A]"
                        : "text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
                    }`}
                  >
                    {/* Active indicator */}
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#FF7A1A]" />
                    )}

                    {/* Icon */}
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                        active ? "text-[#FF7A1A]" : "text-[var(--txt3)] group-hover:text-[var(--txt2)]"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────── */}
      <div className="shrink-0 border-t border-[var(--bdr)] px-3 py-3">
        {/* User row */}
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A6E] to-[#3B82F6] text-[12px] font-bold text-white">
            {initial}
          </div>

          {/* Name + role */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[var(--txt)]">
              {user.name}
            </div>
            <span className="inline-block rounded-full bg-[rgba(212,168,67,0.15)] px-2 py-px text-[9px] font-bold uppercase tracking-wider text-[#D4A843]">
              {roleBadgeLabel(user.role)}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sair"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#EF4444]"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path
                d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 14l4-4m0 0l-4-4m4 4H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

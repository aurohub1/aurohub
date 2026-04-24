"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow,
} from "lucide-react";
import { useSupportDrawer } from "@/components/support/SupportDrawerProvider";

/* ── Types ───────────────────────────────────────── */

interface SidebarProps {
  activePath: string;
  user: { name: string; role: string };
  onLogout: () => void;
  sections?: NavSection[];
  brandLabel?: string;
  /** Features ativas para o usuário. Itens com `feature` fora deste set são ocultados. */
  activeFeatures?: Set<string>;
  /** Slot opcional renderizado entre o menu e a barra de usuário (relógio, clima, etc). */
  extraPanel?: React.ReactNode;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Se definida, o item só aparece quando a feature estiver ativa para o usuário. */
  feature?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/* ── Navigation map ──────────────────────────────── */

/* Ícones compartilhados (reuso entre sections por role) */
const I = {
  home: (<svg viewBox="0 0 20 20" fill="none"><path d="M3 10l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  templates: (<svg viewBox="0 0 20 20" fill="none"><path d="M14.3 3.7a1 1 0 011.4 1.4l-9.5 9.5-2 .6.6-2 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  users: (<svg viewBox="0 0 20 20" fill="none"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM1 16a7 7 0 0114 0H1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  stores: (<svg viewBox="0 0 20 20" fill="none"><path d="M2 7l2-4h12l2 4M3 7h14v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM8 18v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>),
  metrics: (<svg viewBox="0 0 20 20" fill="none"><path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  settings: (<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  publish: (<svg viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  vendors: (<svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M1 17c0-3.3 2.7-6 6-6s6 2.7 6 6M13 6a3 3 0 110 6M19 17c0-2-1-3.5-3-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  calendar: (<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M7 2v4M13 2v4M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  bell: (<svg viewBox="0 0 20 20" fill="none"><path d="M5 9a5 5 0 0110 0v4l1.5 2h-13L5 13V9zM8 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  support: (<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M8 8a2 2 0 012-2 2 2 0 012 2c0 1-1 1.5-2 2M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  whatsapp: (<svg viewBox="0 0 20 20" fill="none"><path d="M3 17l1-3.5A7 7 0 113 17z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 9c0 2 1.5 3.5 3.5 3.5L12 11l2 1c-.5 1-2 1.5-3 1.5-2.5 0-5-2.5-5-5 0-1 .5-2.5 1.5-3l1 2-1 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>),
};

/* ── ADM Sections (default) ───────────────────── */
const ADM_SECTIONS: NavSection[] = [
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
        label: "Importar Template",
        href: "/importar-template",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Biblioteca",
        href: "/biblioteca",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
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
        label: "Métricas",
        href: "/adm/metricas",
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
      {
        label: "Músicas",
        href: "/musicas",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M8 17a3 3 0 100-6 3 3 0 000 6zM8 11V3l8-1v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        label: "Datas Comemorativas",
        href: "/adm/datas-comemorativas",
        icon: (
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="12" r="1" fill="currentColor" />
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
      { label: "Suporte", href: "/adm/suporte", icon: I.support },
    ],
  },
];

/* ── Sections por role ───────────────────────────── */

export const CLIENTE_SECTIONS: NavSection[] = [
  {
    title: "Gestão",
    items: [
      { label: "Início", href: "/cliente/inicio", icon: I.home },
      { label: "Template", href: "/cliente/publicar", icon: I.publish },
      { label: "Calendário", href: "/cliente/calendario", icon: I.calendar },
      { label: "Unidades", href: "/cliente/unidades", icon: I.stores, feature: "unidades" },
      { label: "Usuários", href: "/cliente/usuarios", icon: I.users, feature: "usuarios" },
      { label: "Métricas", href: "/cliente/metricas", icon: I.metrics, feature: "metricas" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Configurações", href: "/cliente/configuracoes", icon: I.settings },
      { label: "Suporte", href: "/cliente/suporte", icon: I.support },
    ],
  },
];

export const UNIDADE_SECTIONS: NavSection[] = [
  {
    title: "Operação",
    items: [
      { label: "Início", href: "/unidade/inicio", icon: I.home },
      { label: "Template", href: "/unidade/publicar", icon: I.publish, feature: "publicar" },
      { label: "Card WhatsApp", href: "/unidade/publicar/cards", icon: I.whatsapp, feature: "card_whatsapp" },
      { label: "Calendário", href: "/unidade/calendario", icon: I.calendar },
      { label: "Consultores", href: "/unidade/vendedores", icon: I.vendors, feature: "vendedores" },
      { label: "Métricas", href: "/unidade/metricas", icon: I.metrics, feature: "metricas" },
      { label: "Suporte", href: "/unidade/suporte", icon: I.support },
    ],
  },
];

export const GERENTE_SECTIONS: NavSection[] = [
  {
    title: "Operação",
    items: [
      { label: "Início", href: "/gerente/inicio", icon: I.home },
      { label: "Template", href: "/gerente/publicar", icon: I.publish, feature: "publicar" },
      { label: "Calendário", href: "/gerente/calendario", icon: I.calendar },
      { label: "Card WhatsApp", href: "/gerente/publicar/cards", icon: I.whatsapp, feature: "card_whatsapp" },
      { label: "Agendamentos", href: "/gerente/agendamentos", icon: I.calendar },
      { label: "Consultores", href: "/gerente/consultores", icon: I.vendors, feature: "vendedores" },
      { label: "Métricas", href: "/gerente/metricas", icon: I.metrics, feature: "metricas" },
      { label: "Suporte", href: "/gerente/suporte", icon: I.support },
    ],
  },
];

export const VENDEDOR_SECTIONS: NavSection[] = [
  {
    title: "Minhas atividades",
    items: [
      { label: "Início", href: "/consultor/inicio", icon: I.home },
      { label: "Template", href: "/consultor/publicar", icon: I.publish, feature: "publicar" },
      { label: "Calendário", href: "/consultor/calendario", icon: I.calendar },
      { label: "Card WhatsApp", href: "/consultor/publicar/cards", icon: I.whatsapp, feature: "card_whatsapp" },
      { label: "Suporte", href: "/consultor/suporte", icon: I.support },
    ],
  },
];

export const OPERADOR_SECTIONS: NavSection[] = [
  {
    title: "Operações",
    items: [
      { label: "Início", href: "/operador/inicio", icon: I.home },
      { label: "Editor de Templates", href: "/editor-de-templates", icon: I.template },
      { label: "Biblioteca", href: "/biblioteca", icon: I.image },
      { label: "Clientes", href: "/operador/clientes", icon: I.stores },
      { label: "Usuários", href: "/operador/usuarios", icon: I.users },
      { label: "Logs", href: "/operador/logs", icon: I.settings },
      { label: "Métricas", href: "/operador/metricas", icon: I.metrics },
      { label: "Suporte", href: "/operador/suporte", icon: I.support },
    ],
  },
];

/* ── Role badge label ────────────────────────────── */

function roleBadgeLabel(role: string): string {
  const map: Record<string, string> = {
    adm: "ADM RAIZ",
    operador: "OPERADOR",
    cliente: "CLIENTE",
    unidade: "UNIDADE",
    gerente: "GERENTE",
    vendedor: "CONSULTOR",
    licensee: "LICENCIADO",
    store: "LOJA",
    employee: "FUNCIONARIO",
  };
  return map[role.toLowerCase()] ?? role.toUpperCase();
}

/* ── Clock / Weather helpers ─────────────────────── */

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDateLong(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
}

function WeatherIconLucide({ code, size = 13 }: { code: number | null; size?: number }) {
  const color = "#FF7A1A";
  if (code === null) return <Cloud size={size} color={color} />;
  if (code === 0) return <Sun size={size} color={color} />;
  if (code <= 3) return <CloudSun size={size} color={color} />;
  if (code <= 48) return <CloudFog size={size} color={color} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} color={color} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} color={color} />;
  if (code >= 95) return <CloudLightning size={size} color={color} />;
  return <Cloud size={size} color={color} />;
}

/* ── Component ───────────────────────────────────── */

export default function Sidebar({ activePath, user, onLogout, sections, brandLabel, activeFeatures, extraPanel }: SidebarProps) {
  const supportDrawer = useSupportDrawer(); // null fora do provider (ex: ADM) → renderiza Link
  const rawSections = sections ?? ADM_SECTIONS;
  const navSections = activeFeatures
    ? rawSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.feature || activeFeatures.has(item.feature)),
        }))
        .filter((section) => section.items.length > 0)
    : rawSections;
  const initial = user.name.charAt(0).toUpperCase();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [now, setNow] = useState<Date>(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [cityName, setCityName] = useState<string>("Rio Preto");
  const [quote, setQuote] = useState<string>("");

  // Relógio (tick 1s)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch weather via geolocation (fallback Rio Preto) + ler frase do dia do localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ah_frase_do_dia") || "{}");
      if (saved?.frase) setQuote(saved.frase as string);
      else if (saved?.quote) setQuote(saved.quote as string);
    } catch { /* silent */ }

    (async () => {
      let lat = -20.8116, lon = -49.3755;
      try {
        const pos = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
          if (typeof window === "undefined" || !navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 600_000 }
          );
        });
        if (pos) {
          lat = pos.lat; lon = pos.lon;
          try {
            const rev = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt`);
            if (rev.ok) {
              const d = await rev.json();
              const name = d?.results?.[0]?.name;
              if (name) setCityName(name);
            }
          } catch { /* silent */ }
        }
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`);
        if (w.ok) {
          const d = await w.json();
          if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        }
      } catch { /* silent */ }
    })();
  }, []);

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
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="mt-5 mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = activePath === item.href;
                // "Suporte" dentro do provider (cliente/consultor/gerente/unidade): abre drawer.
                // Fora do provider (ADM/operador): href normal pra /adm/suporte.
                const isSupportButton = item.label === "Suporte" && !!supportDrawer;
                const shared = `group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors text-left w-full ${
                  active
                    ? "bg-[var(--orange3)] text-[var(--orange)]"
                    : "text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
                }`;
                const inner = (
                  <>
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[var(--orange)]" />
                    )}
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                        active ? "text-[var(--orange)]" : "text-[var(--txt3)] group-hover:text-[var(--txt2)]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                );
                return isSupportButton ? (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => supportDrawer?.open()}
                    className={shared}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link key={item.href} href={item.href} className={shared}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Slot opcional (contador de posts, etc) ── */}
      {extraPanel && (
        <div className="shrink-0 border-t border-[var(--bdr)]">
          {extraPanel}
        </div>
      )}

      {/* ── Clock + Weather + Quote ── */}
      <div className="shrink-0 border-t border-[var(--bdr)] px-3 py-2 flex flex-col gap-2">
        {/* Relógio + Clima */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2.5 py-2">
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-bold text-[var(--txt)] tabular-nums">
              {formatTime(now)}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-[var(--txt3)]">
              {formatDateLong(now)}
            </div>
          </div>
          {weather && (
            <div className="flex shrink-0 items-center gap-1">
              <WeatherIconLucide code={weather.code} size={13} />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[var(--txt)] tabular-nums leading-none">
                  {weather.temp}°
                </div>
                <div className="mt-0.5 truncate max-w-[60px] text-[8px] text-[var(--txt3)]">
                  {cityName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Frase do dia */}
        {quote && (
          <>
            <style>{`@keyframes motivacao-pulse{from{box-shadow:0 0 8px rgba(245,166,35,0.3),inset 0 0 8px rgba(245,166,35,0.05)}to{box-shadow:0 0 8px rgba(245,166,35,0.5),inset 0 0 8px rgba(245,166,35,0.08)}}`}</style>
            <div
              className="rounded-lg px-2.5 py-2"
              style={{
                border: '1px solid rgba(245,166,35,0.4)',
                background: 'rgba(255,122,26,0.05)',
                boxShadow: '0 0 8px rgba(245,166,35,0.3), inset 0 0 8px rgba(245,166,35,0.05)',
                animation: 'motivacao-pulse 2s ease-in-out infinite alternate'
              }}
            >
              <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-[#FF7A1A]">
                Motivação
              </div>
              <p
                className="text-[10px] italic leading-snug text-[var(--txt2)]"
                style={{ textShadow: '0 0 8px rgba(245,166,35,0.4)' }}
              >
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <div className="shrink-0 border-t border-[var(--bdr)] px-3 py-3">
        {/* User row */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-[12px] font-bold text-white">
            {initial}
          </div>

          {/* Name + role */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[var(--txt)]" title={user.name}>
              {user.name}
            </div>
            <span className="inline-block rounded-full bg-[var(--gold3)] px-2 py-px text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
              {roleBadgeLabel(user.role)}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              localStorage.setItem("ah_theme", next);
              document.documentElement.setAttribute("data-theme", next);
              window.dispatchEvent(new CustomEvent("theme-change", { detail: next }));
            }}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[var(--orange3)] hover:bg-[var(--orange3)] hover:text-[var(--orange)]"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sair"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[var(--red3)] hover:bg-[var(--red3)] hover:text-[var(--red)]"
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

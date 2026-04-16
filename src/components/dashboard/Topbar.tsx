"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/editor": "Editor de Templates",
  "/publicacao": "Central de Publicação",
  "/metricas": "Métricas Instagram",
  "/logs": "Logs de Atividade",
  "/clientes": "Clientes",
  "/usuarios": "Usuários",
  "/planos": "Planos",
  "/segmentos": "Segmentos",
  "/leads": "Leads CRM",
  "/calculadora": "Calculadora",
  "/configuracoes": "Configurações",
  "/faq": "FAQ Suporte",
  "/landing": "Editor Landing",
};

export default function Topbar() {
  const pathname = usePathname();
  const [dateStr, setDateStr] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    const h = new Date().getHours();
    const auto = (h >= 6 && h < 19) ? "light" : "dark";
    const resolved = saved || auto;
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);

    setDateStr(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );

    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");

    supabase.auth.getUser().then(({ data }) => {
      const name = data?.user?.email?.split("@")[0] || "ADM";
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ah_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: next }));
  }, [theme]);

  const title = PAGE_TITLES[pathname] ?? "Aurohub";

  return (
    <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center justify-between pt-4 border-b border-[var(--bdr)] bg-[var(--topbar-bg,var(--bg1))] px-6 backdrop-blur-[24px]">
      {/* Left: greeting + title + date */}
      <div className="flex flex-col justify-end gap-0.5 pb-2">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
          {greeting}
        </span>
        <h1 className="text-[1.15rem] font-bold leading-tight text-[var(--txt)]">
          Olá, {userName || "ADM"}
        </h1>
        <span className="text-[0.7rem] text-[var(--txt3)]">{dateStr}</span>
      </div>

      {/* Right: theme toggle + avatar */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="Alternar tema"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bdr2)] bg-[var(--input-bg)] text-[15px] text-[var(--txt3)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--txt2)]"
        >
          {theme === "dark" ? "\u2600" : "\uD83C\uDF19"}
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A6E] to-[#3B82F6] text-[12px] font-bold text-white">
          D
        </div>
      </div>
    </header>
  );
}

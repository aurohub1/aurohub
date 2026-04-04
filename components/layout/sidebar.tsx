"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";

const LOGO_URL = "https://res.cloudinary.com/dxgj4bcch/image/upload/f_auto,q_auto/page/page/logo_aurovista.png";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: "◎" },
  { label: "Publicar", href: "/publish", icon: "◫" },
  { label: "Editor", href: "/editor", icon: "✦" },
  { label: "Agendamentos", href: "/schedule", icon: "◷" },
  { label: "Métricas", href: "/metrics", icon: "◉" },
];

const ADMIN_ITEMS = [
  { label: "Usuários", href: "/admin/usuarios", icon: "◈" },
  { label: "Planos", href: "/admin/planos", icon: "◇" },
  { label: "Templates", href: "/admin/templates", icon: "◧" },
  { label: "Logs", href: "/admin/logs", icon: "▤" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const renderItem = (item: { label: string; href: string; icon: string }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link key={item.href} href={item.href} style={{
        width: 52, height: 52, borderRadius: 14, border: "none",
        background: active ? "var(--sidebar-active)" : "transparent",
        color: active ? "var(--sidebar-active-text)" : "var(--text-muted)",
        fontSize: 17, cursor: "pointer", textDecoration: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 2, transition: "all 0.2s",
        position: "relative",
      }}>
        <span>{item.icon}</span>
        <span style={{ fontSize: 7.5, letterSpacing: 0.3, fontWeight: 500 }}>{item.label}</span>
        {active && <div style={{
          position: "absolute", left: -1, top: "50%", transform: "translateY(-50%)",
          width: 3, height: 20, borderRadius: 2,
          background: "linear-gradient(180deg, var(--gold), var(--orange))",
        }} />}
      </Link>
    );
  };

  return (
    <aside style={{
      width: 72, minHeight: "100vh", position: "fixed", left: 0, top: 0,
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 16, gap: 2, zIndex: 50,
      backdropFilter: "blur(20px)",
      transition: "all 0.35s ease",
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        width: 42, height: 42, borderRadius: 13, marginBottom: 16,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.25)",
        boxShadow: "0 4px 16px rgba(255,122,26,0.15)",
        textDecoration: "none",
      }}>
        <img src={LOGO_URL} alt="Aurohub" style={{ width: 34, height: 34, objectFit: "contain" }} />
      </Link>

      {/* Nav */}
      {NAV_ITEMS.map(renderItem)}

      {/* Divider */}
      <div style={{
        width: 32, height: 1, margin: "8px 0",
        background: "linear-gradient(90deg, transparent, var(--border), transparent)",
      }} />

      {/* Admin */}
      <p style={{
        fontSize: 7, letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase",
        color: "var(--text-muted)", margin: "0 0 2px",
      }}>ADM</p>
      {ADMIN_ITEMS.map(renderItem)}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button onClick={toggle} style={{
        width: 40, height: 40, borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        fontSize: 16, cursor: "pointer", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.35s ease",
      }}>
        {theme === "dark" ? "☀" : "☾"}
      </button>

      {/* Logout */}
      <button onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }} style={{
        width: 40, height: 40, borderRadius: 12, border: "none",
        background: "transparent", color: "var(--text-muted)",
        fontSize: 12, cursor: "pointer", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        ✕
      </button>
    </aside>
  );
}

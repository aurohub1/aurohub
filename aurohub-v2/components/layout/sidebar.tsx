"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Nova Publicação", href: "/publish", icon: "📤" },
  { label: "Agendamentos", href: "/schedule", icon: "📅" },
  { label: "Métricas", href: "/metrics", icon: "📈" },
  { label: "Editor", href: "/editor", icon: "🎨" },
];

const ADMIN_ITEMS = [
  { label: "Usuários", href: "/admin/usuarios", icon: "👥" },
  { label: "Planos", href: "/admin/planos", icon: "💳" },
  { label: "Templates", href: "/admin/templates", icon: "📋" },
  { label: "Logs", href: "/admin/logs", icon: "📝" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[240px] flex flex-col border-r"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <Link href="/dashboard">
          <span className="text-xl font-bold text-gradient-gold">Aurohub</span>
        </Link>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">v2.0</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                background: active ? "var(--color-bg-hover)" : "transparent",
                color: active
                  ? "var(--color-gold)"
                  : "var(--color-text-secondary)",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Admin separator */}
        <div className="pt-4 pb-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Administração
          </p>
        </div>

        {ADMIN_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                background: active ? "var(--color-bg-hover)" : "transparent",
                color: active
                  ? "var(--color-gold)"
                  : "var(--color-text-secondary)",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

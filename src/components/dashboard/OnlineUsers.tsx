"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { GripVertical, ChevronDown } from "lucide-react";

interface OnlineUser {
  nome: string;
  nivel: string;
  loja: string | null;
  last_seen: string;
}

interface UsuarioData { nome: string; nivel: string; loja: string | null; }

interface OnlineRow {
  last_seen: string;
  usuarios: UsuarioData[] | UsuarioData | null;
}

const ROLE_LABEL: Record<string, string> = {
  adm: "ADM", gerente: "Gerente", consultor: "Consultor",
  vendedor: "Vendedor", cliente: "Cliente",
};

const AVATAR_COLORS: Record<string, string> = {
  adm: "#1A56C4",
  cliente: "#1A56C4",
  gerente: "#D4A843",
  consultor: "#22c55e",
};
const AVATAR_COLOR_DEFAULT = "#FF7A1A";

const STORAGE_KEY = "ah_widget_online_pos";

type Pos = { x: number; y: number };

function persistPos(p: Pos) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const DOT_STYLE: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "#22c55e", boxShadow: "0 0 6px #22c55e",
  display: "inline-block", flexShrink: 0,
};

const SMALL_DOT_STYLE: React.CSSProperties = {
  width: 7, height: 7, borderRadius: "50%",
  background: "#22c55e", boxShadow: "0 0 6px #22c55e",
  display: "inline-block", flexShrink: 0,
};

const BADGE_STYLE: React.CSSProperties = {
  background: "rgba(26,86,196,0.3)", color: "#6FA3F7",
  borderRadius: 999, padding: "2px 8px",
  fontSize: 11, fontWeight: 700, flexShrink: 0,
};

export default function OnlineUsers() {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const posRef = useRef<Pos | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchOnline = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("usuarios_online")
        .select("last_seen, usuarios(nome, nivel, loja)")
        .gt("last_seen", since)
        .order("last_seen", { ascending: false });
      setUsers(
        ((data ?? []) as OnlineRow[]).map((r) => {
          const u = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
          return { nome: u?.nome ?? "—", nivel: u?.nivel ?? "", loja: u?.loja ?? null, last_seen: r.last_seen };
        })
      );
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOnline();
    const id = setInterval(fetchOnline, 30_000);
    return () => clearInterval(id);
  }, [fetchOnline]);

  // Restore position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Pos;
        if (
          typeof p.x === "number" && typeof p.y === "number" &&
          p.x >= 0 && p.y >= 0 &&
          p.x < window.innerWidth - 40 &&
          p.y < window.innerHeight - 20
        ) {
          setPos(p);
          posRef.current = p;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Click outside to collapse
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
    const startMX = e.clientX, startMY = e.clientY;
    const startEX = rect.left, startEY = rect.top;

    document.body.style.cursor = "grabbing";

    const onMove = (ev: MouseEvent) => {
      if (!widgetRef.current) return;
      const w = widgetRef.current.offsetWidth;
      const h = widgetRef.current.offsetHeight;
      const nx = Math.max(0, Math.min(window.innerWidth - w, startEX + ev.clientX - startMX));
      const ny = Math.max(0, Math.min(window.innerHeight - h, startEY + ev.clientY - startMY));
      const np = { x: nx, y: ny };
      posRef.current = np;
      setPos(np);
    };

    const onUp = () => {
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (posRef.current) persistPos(posRef.current);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const onHeaderTouchStart = useCallback((e: React.TouchEvent) => {
    if (!widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
    const t0 = e.touches[0];
    const startMX = t0.clientX, startMY = t0.clientY;
    const startEX = rect.left, startEY = rect.top;

    const onMove = (ev: TouchEvent) => {
      ev.preventDefault();
      if (!widgetRef.current) return;
      const t = ev.touches[0];
      const w = widgetRef.current.offsetWidth;
      const h = widgetRef.current.offsetHeight;
      const nx = Math.max(0, Math.min(window.innerWidth - w, startEX + t.clientX - startMX));
      const ny = Math.max(0, Math.min(window.innerHeight - h, startEY + t.clientY - startMY));
      const np = { x: nx, y: ny };
      posRef.current = np;
      setPos(np);
    };

    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      if (posRef.current) persistPos(posRef.current);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  if (!mounted) return null;

  const isEmpty = !loading && users.length === 0;
  const pillDotStyle: React.CSSProperties = isEmpty
    ? { width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "inline-block", flexShrink: 0 }
    : DOT_STYLE;

  const posStyle: React.CSSProperties = pos
    ? { top: pos.y, left: pos.x, bottom: "auto", right: "auto" }
    : { bottom: 24, left: 24 };

  return (
    <div
      ref={widgetRef}
      style={{
        position: "fixed",
        zIndex: 9000,
        ...posStyle,
        background: "#060D1A",
        border: "1px solid rgba(26,86,196,0.4)",
        borderRadius: 12,
        userSelect: "none",
      }}
    >
      {!expanded ? (
        /* ── Pill recolhida ── */
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px",
            cursor: "pointer", background: "none", border: "none",
          }}
        >
          <span style={pillDotStyle} className={isEmpty ? undefined : "animate-pulse"} />
          <span style={{ fontSize: 13, color: "white", fontWeight: 500, whiteSpace: "nowrap" }}>
            Online agora
          </span>
          <span style={BADGE_STYLE}>{loading ? "…" : users.length}</span>
        </button>
      ) : (
        /* ── Card expandido ── */
        <div style={{ width: 260 }}>
          {/* Header arrastável */}
          <div
            onMouseDown={onHeaderMouseDown}
            onTouchStart={onHeaderTouchStart}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 12px 8px",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <GripVertical size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
            <span style={DOT_STYLE} />
            <span style={{ fontSize: 13, color: "white", fontWeight: 600, flex: 1 }}>
              Online agora
            </span>
            <span style={BADGE_STYLE}>{users.length}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.45)",
                display: "flex", alignItems: "center",
                padding: 0, marginLeft: 2, flexShrink: 0,
              }}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <div style={{ height: 1, background: "rgba(26,86,196,0.2)", margin: "0 0 2px" }} />

          {/* Lista de usuários */}
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 10px 10px" }}>
            {users.map((u, i) => {
              const color = AVATAR_COLORS[u.nivel] ?? AVATAR_COLOR_DEFAULT;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "white",
                    flexShrink: 0,
                  }}>
                    {u.nome.trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 500, color: "white",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {u.nome}
                    </div>
                    <div style={{
                      fontSize: 10, color: "rgba(255,255,255,0.35)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {ROLE_LABEL[u.nivel] ?? u.nivel}{u.loja ? ` · ${u.loja}` : ""}
                    </div>
                  </div>
                  <span style={SMALL_DOT_STYLE} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

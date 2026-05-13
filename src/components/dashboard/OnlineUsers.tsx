"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  adm:       { bg: "var(--purple3)", color: "var(--purple)" },
  gerente:   { bg: "var(--blue3)",   color: "var(--blue)"   },
  consultor: { bg: "var(--gold3)",   color: "var(--gold)"   },
  vendedor:  { bg: "var(--green3)",  color: "var(--green)"  },
  cliente:   { bg: "var(--bg3)",     color: "var(--txt3)"   },
};

export default function OnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

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
          return {
            nome: u?.nome ?? "—",
            nivel: u?.nivel ?? "",
            loja: u?.loja ?? null,
            last_seen: r.last_seen,
          };
        })
      );
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOnline();
    const id = setInterval(fetchOnline, 30_000);
    return () => clearInterval(id);
  }, [fetchOnline]);

  return (
    <div className="card-glass flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[var(--txt)]">Online agora</h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={
            !loading && users.length > 0
              ? { background: "rgba(34,197,94,0.15)", color: "var(--green)" }
              : { background: "var(--bg3)", color: "var(--txt3)" }
          }
        >
          {loading ? "…" : `${users.length} online`}
        </span>
      </div>

      {loading ? (
        <div className="py-2 text-[12px] text-[var(--txt3)]">Carregando...</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <svg viewBox="0 0 20 20" fill="none" className="h-7 w-7 text-[var(--txt3)] opacity-30">
            <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] text-[var(--txt3)]">Nenhum usuário online</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u, i) => {
            const rc = ROLE_COLORS[u.nivel] ?? ROLE_COLORS.cliente;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: rc.bg, color: rc.color }}
                >
                  {u.nome.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-[var(--txt)]">{u.nome}</div>
                  {u.loja && <div className="truncate text-[10px] text-[var(--txt3)]">{u.loja}</div>}
                </div>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={{ background: rc.bg, color: rc.color }}
                >
                  {ROLE_LABEL[u.nivel] ?? u.nivel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

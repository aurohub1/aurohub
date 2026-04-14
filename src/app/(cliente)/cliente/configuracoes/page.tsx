"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Palette, Lock, Sun, Moon, Check, AlertCircle } from "lucide-react";

/* ── Página ──────────────────────────────────────── */

export default function ClienteConfiguracoesPage() {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const t = (localStorage.getItem("ah_theme") as "dark" | "light" | null) || "light";
    setTheme(t);
  }, []);

  function applyTheme(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ah_theme", next);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw1.length < 6) { setPwMsg({ type: "err", text: "Senha deve ter pelo menos 6 caracteres." }); return; }
    if (pw1 !== pw2) { setPwMsg({ type: "err", text: "As senhas não coincidem." }); return; }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) { setPwMsg({ type: "err", text: error.message }); return; }
      setPwMsg({ type: "ok", text: "Senha atualizada com sucesso." });
      setPw1(""); setPw2("");
    } catch (err) {
      console.error("[changePassword]", err);
      setPwMsg({ type: "err", text: "Erro inesperado ao trocar senha." });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-[var(--txt)]">Configurações</h1>
        <p className="text-[12px] text-[var(--txt3)]">Segurança da conta e preferências visuais.</p>
      </header>

      {/* ── Segurança ─────────────────────────────── */}
      <Card icon={<Lock size={16} />} title="Segurança" subtitle="Defina uma nova senha de acesso">
        <form onSubmit={changePassword} className="flex flex-col gap-3">
          <Field label="Nova senha">
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Repita a senha"
              className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwBusy}
              className="flex h-9 items-center gap-2 rounded-md bg-[var(--orange)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Lock size={14} />
              {pwBusy ? "Atualizando…" : "Atualizar senha"}
            </button>
            {pwMsg && (
              <span className={`flex items-center gap-1 text-[11px] ${pwMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                {pwMsg.type === "ok" ? <Check size={12} /> : <AlertCircle size={12} />}
                {pwMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* ── Aparência ─────────────────────────────── */}
      <Card icon={<Palette size={16} />} title="Aparência" subtitle="Tema visual da interface">
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyTheme("light")}
            className={`flex h-10 items-center gap-2 rounded-md border px-4 text-[12px] font-semibold ${theme === "light" ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]" : "border-[var(--bdr)] bg-[var(--surface)] text-[var(--txt2)]"}`}
          >
            <Sun size={14} /> Claro
          </button>
          <button
            onClick={() => applyTheme("dark")}
            className={`flex h-10 items-center gap-2 rounded-md border px-4 text-[12px] font-semibold ${theme === "dark" ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]" : "border-[var(--bdr)] bg-[var(--surface)] text-[var(--txt2)]"}`}
          >
            <Moon size={14} /> Escuro
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ── UI Atoms ─────────────────────────────────── */

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-5">
      <header className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--orange)]/10 text-[var(--orange)]">
          {icon}
        </div>
        <div className="flex flex-col">
          <h2 className="text-[14px] font-bold text-[var(--txt)]">{title}</h2>
          {subtitle && <p className="text-[11px] text-[var(--txt3)]">{subtitle}</p>}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--txt3)]">{label}</label>
      {children}
    </div>
  );
}

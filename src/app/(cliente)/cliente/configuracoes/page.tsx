"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Building2, Send, Palette, Lock, Sun, Moon,
  Check, AlertCircle,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface LicenseeFull {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface PrefsForm {
  legenda_padrao: string;
  hashtags_padrao: string;
  horario_preferido: string;
}

const LS_PREFS_KEY = (licenseeId: string) => `ah_prefs_pub_${licenseeId}`;
const EMPTY_PREFS: PrefsForm = { legenda_padrao: "", hashtags_padrao: "", horario_preferido: "" };

/* ── Página ──────────────────────────────────────── */

export default function ClienteConfiguracoesPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [licensee, setLicensee] = useState<LicenseeFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [prefs, setPrefs] = useState<PrefsForm>(EMPTY_PREFS);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">("light");

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      // Seleciona defensivo: phone/address podem não existir — consulta fallback
      let licRow: LicenseeFull | null = null;
      const { data: licData, error: licErr } = await supabase
        .from("licensees")
        .select("id, name, email, phone, address")
        .eq("id", p.licensee_id)
        .single();
      if (licErr || !licData) {
        const { data: base } = await supabase
          .from("licensees")
          .select("id, name, email")
          .eq("id", p.licensee_id)
          .single();
        if (base) licRow = { id: base.id, name: base.name, email: base.email ?? null, phone: null, address: null };
      } else {
        licRow = licData as LicenseeFull;
      }
      setLicensee(licRow);

      // Preferências de publicação — localStorage por licensee
      try {
        const raw = localStorage.getItem(LS_PREFS_KEY(p.licensee_id));
        if (raw) setPrefs({ ...EMPTY_PREFS, ...JSON.parse(raw) });
      } catch { /* ignore */ }

      // Tema
      const t = (localStorage.getItem("ah_theme") as "dark" | "light" | null) || "light";
      setTheme(t);
    } catch (err) {
      console.error("[ClienteConfig] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function savePrefs() {
    if (!profile?.licensee_id) return;
    localStorage.setItem(LS_PREFS_KEY(profile.licensee_id), JSON.stringify(prefs));
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2400);
  }

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

  if (loading) {
    return <div className="text-[13px] text-[var(--txt3)]">Carregando configurações…</div>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-[var(--txt)]">Configurações</h1>
        <p className="text-[12px] text-[var(--txt3)]">Gerencie sua empresa, integrações e preferências de publicação.</p>
      </header>

      {/* ── Empresa ───────────────────────────────── */}
      <Card icon={<Building2 size={16} />} title="Empresa" subtitle="Dados cadastrais — somente ADM pode editar">
        <div className="grid grid-cols-2 gap-3">
          <Readonly label="Nome" value={licensee?.name || "—"} />
          <Readonly label="Email" value={licensee?.email || "—"} />
          <Readonly label="Telefone" value={licensee?.phone || "—"} />
          <Readonly label="Endereço" value={licensee?.address || "—"} />
        </div>
      </Card>

      {/* ── Publicação ────────────────────────────── */}
      <Card icon={<Send size={16} />} title="Publicação" subtitle="Preferências padrão aplicadas a novos posts">
        <div className="flex flex-col gap-3">
          <Field label="Legenda padrão">
            <textarea
              value={prefs.legenda_padrao}
              onChange={(e) => setPrefs({ ...prefs, legenda_padrao: e.target.value })}
              rows={3}
              placeholder="Texto que aparece por padrão ao criar uma nova publicação"
              className="w-full resize-y rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />
          </Field>
          <Field label="Hashtags padrão">
            <input
              value={prefs.hashtags_padrao}
              onChange={(e) => setPrefs({ ...prefs, hashtags_padrao: e.target.value })}
              placeholder="#viagem #turismo #agenciadeviagens"
              className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />
          </Field>
          <Field label="Horário preferido">
            <input
              type="time"
              value={prefs.horario_preferido}
              onChange={(e) => setPrefs({ ...prefs, horario_preferido: e.target.value })}
              className="w-40 rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              onClick={savePrefs}
              className="flex h-9 items-center gap-2 rounded-md bg-[var(--orange)] px-4 text-[12px] font-semibold text-white hover:opacity-90"
            >
              <Check size={14} />
              Salvar preferências
            </button>
            {prefsSaved && (
              <span className="flex items-center gap-1 text-[11px] text-green-500">
                <Check size={12} /> Preferências salvas
              </span>
            )}
          </div>
        </div>
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

      {/* ── Senha ─────────────────────────────────── */}
      <Card icon={<Lock size={16} />} title="Senha" subtitle="Defina uma nova senha de acesso">
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

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--txt3)]">{label}</span>
      <div className="rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)]">
        {value}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Palette, Lock, Sun, Moon, Check, AlertCircle, HelpCircle, ShieldCheck, FileText } from "lucide-react";
import { useTour } from "@/hooks/useTour";

/* ── Página ──────────────────────────────────────── */

interface IdentidadeFields {
  nome_comercial: string;
  telefone: string;
  email: string;
  site: string;
  logo_url: string;
}

export default function ClienteConfiguracoesPage() {
  const { startTour } = useTour({
    pageKey: "cliente-configuracoes",
    steps: [
      { element: "h1", popover: { title: "Configurações", description: "Gerencie as preferências da sua conta." } },
      { element: "form", popover: { title: "Segurança", description: "Altere sua senha de acesso quando necessário." } },
      { popover: { title: "Aparência", description: "Escolha entre tema claro e escuro conforme sua preferência." } },
    ],
    autoStart: true,
    delay: 1000,
  });

  const [theme, setTheme] = useState<"dark" | "light">("light");

  // Identidade para documentos
  const [storeId, setStoreId] = useState<string | null>(null);
  const [identidade, setIdentidade] = useState<IdentidadeFields>({ nome_comercial: "", telefone: "", email: "", site: "", logo_url: "" });
  const [idBusy, setIdBusy] = useState(false);
  const [idMsg, setIdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaFactor, setMfaFactor] = useState<{ id: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("ah_theme") as "dark" | "light" | null) || "light";
    setTheme(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("licensee_id").eq("id", user.id).single();
      const licId = (profile as { licensee_id?: string } | null)?.licensee_id;
      if (!licId) return;
      const { data: store } = await supabase
        .from("stores")
        .select("id, nome_comercial, telefone, email, site, logo_url")
        .eq("licensee_id", licId)
        .order("name")
        .limit(1)
        .single();
      if (store) {
        setStoreId((store as { id: string }).id);
        setIdentidade({
          nome_comercial: (store as Record<string, string | null>).nome_comercial ?? "",
          telefone: (store as Record<string, string | null>).telefone ?? "",
          email: (store as Record<string, string | null>).email ?? "",
          site: (store as Record<string, string | null>).site ?? "",
          logo_url: (store as Record<string, string | null>).logo_url ?? "",
        });
      }
    })();
  }, []);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === "verified") ?? null;
      setMfaFactor(totp ? { id: totp.id } : null);
      setMfaLoading(false);
    });
  }, []);

  async function saveIdentidade(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) { setIdMsg({ type: "err", text: "Nenhuma loja encontrada." }); return; }
    setIdBusy(true); setIdMsg(null);
    const { error } = await supabase.from("stores").update({
      nome_comercial: identidade.nome_comercial || null,
      telefone: identidade.telefone || null,
      email: identidade.email || null,
      site: identidade.site || null,
      logo_url: identidade.logo_url || null,
    }).eq("id", storeId);
    setIdBusy(false);
    setIdMsg(error ? { type: "err", text: error.message } : { type: "ok", text: "Identidade salva com sucesso." });
  }

  function applyTheme(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ah_theme", next);
  }

  async function startEnroll() {
    setMfaBusy(true); setMfaMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) { setMfaMsg({ type: "err", text: error?.message ?? "Erro ao iniciar." }); setMfaBusy(false); return; }
    setQrCode(data.totp.qr_code); setEnrollFactorId(data.id); setEnrolling(true); setMfaBusy(false);
  }

  async function confirmEnroll() {
    if (!enrollFactorId) return;
    setMfaBusy(true); setMfaMsg(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollFactorId, code: mfaCode });
    if (error) { setMfaMsg({ type: "err", text: "Código inválido. Tente novamente." }); setMfaBusy(false); return; }
    setMfaFactor({ id: enrollFactorId }); setEnrolling(false); setQrCode(null); setMfaCode("");
    setMfaMsg({ type: "ok", text: "2FA ativado com sucesso." }); setMfaBusy(false);
  }

  async function disableMfa() {
    if (!mfaFactor) return;
    setMfaBusy(true); setMfaMsg(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id });
    if (error) { setMfaMsg({ type: "err", text: error.message }); setMfaBusy(false); return; }
    setMfaFactor(null); setConfirmDisable(false);
    setMfaMsg({ type: "ok", text: "2FA desativado." }); setMfaBusy(false);
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
    <>
    <div className="flex max-w-3xl flex-col gap-6 page-fade">
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

      {/* ── Identidade para documentos ───────────── */}
      <Card icon={<FileText size={16} />} title="Identidade para documentos" subtitle="Aparece no cabeçalho de roteiros e PDFs gerados">
        <form onSubmit={saveIdentidade} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome comercial">
              <input value={identidade.nome_comercial} onChange={e => setIdentidade(v => ({ ...v, nome_comercial: e.target.value }))}
                placeholder="Agência Viagens XYZ"
                className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input value={identidade.telefone} onChange={e => setIdentidade(v => ({ ...v, telefone: e.target.value }))}
                placeholder="(11) 9 9999-9999"
                className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={identidade.email} onChange={e => setIdentidade(v => ({ ...v, email: e.target.value }))}
                placeholder="contato@agencia.com.br"
                className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
            </Field>
            <Field label="Site">
              <input value={identidade.site} onChange={e => setIdentidade(v => ({ ...v, site: e.target.value }))}
                placeholder="www.agencia.com.br"
                className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
            </Field>
          </div>
          <Field label="URL do logotipo">
            <input value={identidade.logo_url} onChange={e => setIdentidade(v => ({ ...v, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
          </Field>
          {identidade.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identidade.logo_url} alt="Preview logo" className="h-12 w-auto rounded border border-[var(--bdr)] object-contain" />
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={idBusy || !storeId}
              className="flex h-9 items-center gap-2 rounded-md bg-[var(--orange)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
              <FileText size={14} />
              {idBusy ? "Salvando…" : "Salvar identidade"}
            </button>
            {idMsg && (
              <span className={`flex items-center gap-1 text-[11px] ${idMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                {idMsg.type === "ok" ? <Check size={12} /> : <AlertCircle size={12} />}
                {idMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* ── 2FA ──────────────────────────────────── */}
      <Card icon={<ShieldCheck size={16} />} title="Autenticação em Dois Fatores" subtitle="Proteção adicional com código de autenticador">
        {mfaLoading ? (
          <p className="text-[12px] text-[var(--txt3)]">Verificando...</p>
        ) : mfaFactor ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] text-green-600"><Check size={14} /> 2FA ativo — sua conta está protegida.</div>
            {!confirmDisable ? (
              <button onClick={() => setConfirmDisable(true)} className="flex h-9 w-fit items-center gap-2 rounded-md border border-red-500/40 px-4 text-[12px] font-semibold text-red-500 hover:bg-red-500/10">Desativar 2FA</button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-[var(--txt2)]">Confirma desativar?</span>
                <button onClick={disableMfa} disabled={mfaBusy} className="rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{mfaBusy ? "Desativando…" : "Sim, desativar"}</button>
                <button onClick={() => setConfirmDisable(false)} className="text-[11px] text-[var(--txt3)] hover:underline">Cancelar</button>
              </div>
            )}
            {mfaMsg && <span className={`flex items-center gap-1 text-[11px] ${mfaMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>{mfaMsg.type === "ok" ? <Check size={12} /> : <AlertCircle size={12} />}{mfaMsg.text}</span>}
          </div>
        ) : enrolling && qrCode ? (
          <div className="flex flex-col gap-4">
            <p className="text-[12px] text-[var(--txt2)]">Escaneie com Google Authenticator ou similar:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code 2FA" className="h-40 w-40 rounded-md border border-[var(--bdr)]" />
            <Field label="Código de verificação">
              <input type="text" inputMode="numeric" maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-36 rounded-md border border-[var(--bdr)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]" />
            </Field>
            <div className="flex items-center gap-2">
              <button onClick={confirmEnroll} disabled={mfaBusy || mfaCode.length < 6} className="flex h-9 items-center gap-2 rounded-md bg-[var(--orange)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"><ShieldCheck size={14} />{mfaBusy ? "Verificando…" : "Confirmar"}</button>
              <button onClick={() => { setEnrolling(false); setQrCode(null); setMfaCode(""); }} className="text-[11px] text-[var(--txt3)] hover:underline">Cancelar</button>
            </div>
            {mfaMsg && <span className={`flex items-center gap-1 text-[11px] ${mfaMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>{mfaMsg.type === "ok" ? <Check size={12} /> : <AlertCircle size={12} />}{mfaMsg.text}</span>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-[var(--txt2)]">Adicione uma camada extra de segurança usando um aplicativo autenticador.</p>
            <button onClick={startEnroll} disabled={mfaBusy} className="flex h-9 w-fit items-center gap-2 rounded-md bg-[var(--orange)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"><ShieldCheck size={14} />{mfaBusy ? "Aguarde…" : "Ativar autenticação em 2 fatores"}</button>
            {mfaMsg && <span className={`flex items-center gap-1 text-[11px] ${mfaMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>{mfaMsg.type === "ok" ? <Check size={12} /> : <AlertCircle size={12} />}{mfaMsg.text}</span>}
          </div>
        )}
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
    <button
      onClick={startTour}
      title="Ver tour guiado"
      style={{ position: "fixed", bottom: "24px", right: "24px", width: "48px", height: "48px", borderRadius: "50%", background: "var(--orange)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
    >
      <HelpCircle size={24} strokeWidth={2.5} />
    </button>
    </>
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

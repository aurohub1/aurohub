"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import SplashScreen, { type SplashEffect, type TextoEfeito } from "@/components/splash/SplashScreen";

/* ── Types ───────────────────────────────────────── */

type ConfigMap = Record<string, string>;

type SectionKey = "geral" | "auth" | "integ" | "limites" | "splash" | "sistema";

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "geral", label: "Geral",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: "auth", label: "Autenticação",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: "integ", label: "Integrações",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 10h10M10 5v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    key: "limites", label: "Limites globais",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    key: "splash", label: "Splash ADM",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: "sistema", label: "Sistema",
    icon: <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" /><path d="M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
];

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Noronha",
];

/* ── Component ───────────────────────────────────── */

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("geral");
  const [uploading, setUploading] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpTestResult, setMpTestResult] = useState<"ok" | "fail" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const admSplashLogoRef = useRef<HTMLInputElement>(null);
  const admSplashSomRef = useRef<HTMLInputElement>(null);
  const [uploadingSom, setUploadingSom] = useState(false);
  const [splashReplayKey, setSplashReplayKey] = useState(0);

  /* ── Load ──────────────────────────────────────── */

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_config").select("key, value");
      const map: ConfigMap = {};
      (data ?? []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
      setConfig(map);
    } catch (err) {
      console.error("[Config] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  /* ── Helpers ───────────────────────────────────── */

  function set(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function getBool(key: string): boolean {
    return config[key] === "true";
  }

  function toggleBool(key: string) {
    set(key, config[key] === "true" ? "false" : "true");
  }

  /* ── Save ──────────────────────────────────────── */

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(config);
      for (const [key, value] of entries) {
        await supabase
          .from("system_config")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[Config] save error:", err);
    } finally {
      setSaving(false);
    }
  }

  /* ── Logo upload ───────────────────────────────── */

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/logos");
      set("logo_url", url);
    } catch (err) {
      console.error("[Logo upload]", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleAdmSplashLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/splash");
      set("adm_splash_logo", url);
    } catch (err) {
      console.error("[ADM Splash logo upload]", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleAdmSplashSomUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSom(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/splash-som");
      set("adm_splash_som", url);
    } catch (err) {
      console.error("[ADM Splash som upload]", err);
    } finally {
      setUploadingSom(false);
    }
  }

  function getNum(key: string, def: number): number {
    const v = Number(config[key]);
    return Number.isFinite(v) && v > 0 ? v : def;
  }

  /* ── MP test ───────────────────────────────────── */

  async function testMercadoPago() {
    const token = config.mp_access_token;
    if (!token) return;
    setMpTesting(true);
    setMpTestResult(null);
    try {
      const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMpTestResult(res.ok ? "ok" : "fail");
    } catch {
      setMpTestResult("fail");
    } finally {
      setMpTesting(false);
    }
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando configurações...</div>;
  }

  return (
    <>
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Configurações</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Configurações globais do sistema</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-5 py-2 text-[12px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </div>

      {/* ── Layout: sidebar nav + content ────────── */}
      <div className="flex gap-6">
        {/* Section nav */}
        <nav className="flex w-[200px] shrink-0 flex-col gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                activeSection === s.key
                  ? "bg-[var(--orange3)] text-[var(--orange)]"
                  : "text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="px-6 py-5">

              {/* ── GERAL ──────────────────────────── */}
              {activeSection === "geral" && (
                <div className="flex flex-col gap-5">
                  <SectionTitle title="Geral" desc="Identidade e informações básicas da plataforma" />

                  {/* Logo */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Logo da plataforma</label>
                    <div className="flex items-center gap-4">
                      {config.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={config.logo_url} alt="Logo" className="h-14 w-14 shrink-0 rounded-xl object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg3)] text-[18px] font-bold text-[var(--txt2)]">A</div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload logo"}
                        </button>
                        <input type="text" value={config.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="ou cole URL" className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nome da plataforma" value={config.platform_name ?? ""} onChange={(v) => set("platform_name", v)} placeholder="Aurohub" />
                    <Field label="URL base" value={config.base_url ?? ""} onChange={(v) => set("base_url", v)} placeholder="https://aurohub.vercel.app" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Email de suporte" value={config.support_email ?? ""} onChange={(v) => set("support_email", v)} placeholder="suporte@aurovista.com.br" type="email" />
                    <Field label="Telefone de contato" value={config.support_phone ?? ""} onChange={(v) => set("support_phone", v)} placeholder="(17) 99999-0000" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Fuso horário</label>
                    <select
                      value={config.timezone ?? "America/Sao_Paulo"}
                      onChange={(e) => set("timezone", e.target.value)}
                      className="h-9 w-full max-w-[300px] rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none"
                    >
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace("America/", "").replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* ── AUTENTICAÇÃO ────────────────────── */}
              {activeSection === "auth" && (
                <div className="flex flex-col gap-5">
                  <SectionTitle title="Autenticação" desc="Controle de sessão e cadastro de usuários" />
                  <Field label="Tempo de sessão (horas)" value={config.session_hours ?? "24"} onChange={(v) => set("session_hours", v)} type="number" />
                  <Toggle label="Permitir cadastro self-service" desc="Usuários podem se cadastrar sem convite do ADM" checked={getBool("allow_self_signup")} onChange={() => toggleBool("allow_self_signup")} />
                  <Toggle label="Exigir confirmação de email" desc="Novo usuário precisa confirmar email antes de acessar" checked={getBool("require_email_confirm")} onChange={() => toggleBool("require_email_confirm")} />
                </div>
              )}

              {/* ── INTEGRAÇÕES ──────────────────────── */}
              {activeSection === "integ" && (
                <div className="flex flex-col gap-6">
                  <SectionTitle title="Integrações" desc="Chaves de API e serviços externos" />

                  {/* Mercado Pago */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--txt)]">Mercado Pago</span>
                      {mpTestResult === "ok" && <span className="rounded-full bg-[var(--green3)] px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">Conectado</span>}
                      {mpTestResult === "fail" && <span className="rounded-full bg-[var(--red3)] px-2 py-0.5 text-[10px] font-bold text-[var(--red)]">Falhou</span>}
                    </div>
                    <Field label="Public Key" value={config.mp_public_key ?? ""} onChange={(v) => set("mp_public_key", v)} placeholder="APP_USR-..." />
                    <Field label="Access Token" value={config.mp_access_token ?? ""} onChange={(v) => set("mp_access_token", v)} placeholder="APP_USR-..." masked />
                    <button
                      onClick={testMercadoPago}
                      disabled={mpTesting || !config.mp_access_token}
                      className="w-fit rounded-lg border border-[var(--bdr)] px-4 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-40"
                    >
                      {mpTesting ? "Testando..." : "Testar conexão"}
                    </button>
                  </div>

                  <div className="h-px bg-[var(--bdr)]" />

                  {/* Resend */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold text-[var(--txt)]">Resend (Email)</span>
                    <Field label="API Key" value={config.resend_api_key ?? ""} onChange={(v) => set("resend_api_key", v)} placeholder="re_..." masked />
                    <Field label="Domínio verificado" value={config.resend_domain ?? ""} onChange={(v) => set("resend_domain", v)} placeholder="mail.aurovista.com.br" />
                  </div>

                  <div className="h-px bg-[var(--bdr)]" />

                  {/* Cloudinary */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold text-[var(--txt)]">Cloudinary</span>
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="Cloud name" value="dxgj4bcch" />
                      <ReadOnlyField label="Upload preset" value="aurohub17" />
                    </div>
                  </div>

                  <div className="h-px bg-[var(--bdr)]" />

                  {/* Instagram API */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold text-[var(--txt)]">Instagram API</span>
                    <ReadOnlyField label="Base URL" value="https://graph.instagram.com" />
                  </div>
                </div>
              )}

              {/* ── LIMITES GLOBAIS ──────────────────── */}
              {activeSection === "limites" && (
                <div className="flex flex-col gap-5">
                  <SectionTitle title="Limites globais" desc="Valores padrão para novos clientes" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Posts/dia padrão" value={config.default_posts_day ?? "5"} onChange={(v) => set("default_posts_day", v)} type="number" />
                    <Field label="Stories/dia padrão" value={config.default_stories_day ?? "5"} onChange={(v) => set("default_stories_day", v)} type="number" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Máx. lojas por licenciado" value={config.max_stores_per_licensee ?? "10"} onChange={(v) => set("max_stores_per_licensee", v)} type="number" />
                    <Field label="Máx. usuários por loja" value={config.max_users_per_store ?? "5"} onChange={(v) => set("max_users_per_store", v)} type="number" />
                  </div>
                </div>
              )}

              {/* ── SPLASH ADM ──────────────────────── */}
              {activeSection === "splash" && (
                <div className="flex flex-col gap-4">
                  <SectionTitle title="Splash ADM" desc="Animação de entrada do login do ADM. Salvo em system_config (adm_splash_*)." />

                  {/* Dropdown de efeito — mesmo set de clientes/page.tsx */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Efeito</label>
                    <select
                      value={config.adm_splash_effect || "aurovista_adm"}
                      onChange={(e) => set("adm_splash_effect", e.target.value)}
                      className="h-9 w-full max-w-[320px] rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none"
                    >
                      <option value="random">🎲 Aleatório</option>
                      <option value="aurovista_adm">✨ Aurovista ADM</option>
                      <option value="particles">Partículas</option>
                      <option value="cinematic">Cinemático</option>
                      <option value="slideup">Slide Up</option>
                      <option value="scalefade">Scale Fade</option>
                      <option value="fadesuave">Fade Suave</option>
                      <option value="ondas">Ondas</option>
                      <option value="flutuacao">Flutuação</option>
                      <option value="scanner">Scanner</option>
                      <option value="holofote">Holofote</option>
                      <option value="chuvapontos">Chuva de Pontos</option>
                      <option value="gradiente">Gradiente</option>
                      <option value="dissolve">Dissolve</option>
                      <option value="bigbang">Big Bang</option>
                      <option value="aurora">Aurora Boreal</option>
                      <option value="tinta">Tinta</option>
                      <option value="vagalumes">Vagalumes</option>
                      <option value="aurora_espacial">Aurora Espacial</option>
                      <option value="galaxia">🌀 Galáxia</option>
                      <option value="vidro_janela">🪟 Vidro Janela</option>
                      <option value="vidro_liquido">💧 Vidro Líquido</option>
                      <option value="cidade_a">🏙️ Cidade A</option>
                      <option value="cidade_b">🌃 Cidade B</option>
                      <option value="restaurante">🍽️ Restaurante</option>
                      <option value="saude">🧬 Saúde</option>
                      <option value="moda">👗 Moda</option>
                      <option value="imobiliaria">🏘️ Imobiliária</option>
                      <option value="educacao">🎓 Educação</option>
                      <option value="beleza">🌹 Beleza</option>
                    </select>
                  </div>

                  {/* Preview — wrapper relativo 16:9, max 280px, SplashScreen absolute inset:0 */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      overflow: "hidden",
                      borderRadius: 12,
                      maxHeight: 280,
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                      <SplashScreen
                        key={`adm-${splashReplayKey}-${JSON.stringify([
                          config.adm_splash_effect,
                          config.adm_splash_logo,
                          config.adm_splash_cor1, config.adm_splash_cor2,
                          config.adm_splash_cor3, config.adm_splash_cor4, config.adm_splash_cor5,
                          config.adm_splash_velocidade, config.adm_splash_quantidade, config.adm_splash_tamanho,
                          config.adm_splash_raio_orbital, config.adm_splash_nebulosa, config.adm_splash_opacidade,
                          config.adm_splash_dispersao, config.adm_splash_velocidade_texto,
                          config.adm_splash_texto_glow, config.adm_splash_texto_glow_intensidade,
                          config.adm_splash_texto_efeito,
                        ])}`}
                        logoUrl={config.adm_splash_logo || ""}
                        effect={(config.adm_splash_effect as SplashEffect) || "aurovista_adm"}
                        cor1={config.adm_splash_cor1 || "#D4A843"}
                        cor2={config.adm_splash_cor2 || "#FF7A1A"}
                        cor3={config.adm_splash_cor3 || "transparent"}
                        cor4={config.adm_splash_cor4 || "transparent"}
                        cor5={config.adm_splash_cor5 || "transparent"}
                        corFundo="#060B16"
                        velocidade={getNum("adm_splash_velocidade", 5)}
                        quantidade={getNum("adm_splash_quantidade", 5)}
                        tamanho={getNum("adm_splash_tamanho", 5)}
                        raioOrbital={getNum("adm_splash_raio_orbital", 5)}
                        nebulosa={getNum("adm_splash_nebulosa", 6)}
                        opacidade={getNum("adm_splash_opacidade", 8)}
                        dispersao={getNum("adm_splash_dispersao", 4)}
                        velocidadeTexto={getNum("adm_splash_velocidade_texto", 5)}
                        glowTexto={config.adm_splash_texto_glow !== "false"}
                        glowIntensidade={getNum("adm_splash_texto_glow_intensidade", 5)}
                        userName="AUROVISTA"
                        textoEfeito={(config.adm_splash_texto_efeito as TextoEfeito) || "typewriter"}
                        onDone={() => {}}
                        embedded={{ width: 498, height: 280 }}
                      />
                    </div>
                  </div>

                  {/* Cores em linha horizontal */}
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--bdr)] p-3" style={{ background: "var(--card-bg)" }}>
                    <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Cores</span>
                    <ColorSquare label="Cor 1" value={config.adm_splash_cor1 || "#D4A843"} onChange={(v) => set("adm_splash_cor1", v)} />
                    <ColorSquare label="Cor 2" value={config.adm_splash_cor2 || "#FF7A1A"} onChange={(v) => set("adm_splash_cor2", v)} />
                    <div className="mx-1 h-12 w-px bg-[var(--bdr)]" />
                    <OptionalColorSquare label="Cor 3" value={config.adm_splash_cor3} onChange={(v) => set("adm_splash_cor3", v)} onClear={() => set("adm_splash_cor3", "transparent")} />
                    <OptionalColorSquare label="Cor 4" value={config.adm_splash_cor4} onChange={(v) => set("adm_splash_cor4", v)} onClear={() => set("adm_splash_cor4", "transparent")} />
                    <OptionalColorSquare label="Cor 5" value={config.adm_splash_cor5} onChange={(v) => set("adm_splash_cor5", v)} onClear={() => set("adm_splash_cor5", "transparent")} />
                  </div>

                  {/* Grid 2 colunas: Partículas | Ambiente */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bdr)] p-4" style={{ background: "var(--card-bg)" }}>
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--orange)]">Partículas</div>
                      <div className="flex flex-col gap-3">
                        <Slider label="Velocidade" value={getNum("adm_splash_velocidade", 5)} onChange={(v) => set("adm_splash_velocidade", String(v))} />
                        <Slider label="Quantidade" value={getNum("adm_splash_quantidade", 5)} onChange={(v) => set("adm_splash_quantidade", String(v))} />
                        <Slider label="Tamanho" value={getNum("adm_splash_tamanho", 5)} onChange={(v) => set("adm_splash_tamanho", String(v))} />
                        <Slider label="Raio orbital" value={getNum("adm_splash_raio_orbital", 5)} onChange={(v) => set("adm_splash_raio_orbital", String(v))} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--bdr)] p-4" style={{ background: "var(--card-bg)" }}>
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--orange)]">Ambiente</div>
                      <div className="flex flex-col gap-3">
                        <Slider label="Nebulosa" value={getNum("adm_splash_nebulosa", 6)} onChange={(v) => set("adm_splash_nebulosa", String(v))} min={0} />
                        <Slider label="Opacidade" value={getNum("adm_splash_opacidade", 8)} onChange={(v) => set("adm_splash_opacidade", String(v))} />
                        <Slider label="Dispersão" value={getNum("adm_splash_dispersao", 4)} onChange={(v) => set("adm_splash_dispersao", String(v))} min={0} />
                        <Slider label="Velocidade texto" value={getNum("adm_splash_velocidade_texto", 5)} onChange={(v) => set("adm_splash_velocidade_texto", String(v))} />

                        {/* Glow no texto */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-[var(--txt3)]">Glow no texto</span>
                          <button
                            type="button"
                            onClick={() => set("adm_splash_texto_glow", config.adm_splash_texto_glow === "false" ? "true" : "false")}
                            className="relative h-5 w-9 rounded-full transition-colors"
                            style={{ background: config.adm_splash_texto_glow === "false" ? "var(--bg3)" : "var(--orange)" }}
                            aria-pressed={config.adm_splash_texto_glow !== "false"}
                          >
                            <span
                              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                              style={{ left: config.adm_splash_texto_glow === "false" ? "2px" : "18px" }}
                            />
                          </button>
                        </div>

                        {config.adm_splash_texto_glow !== "false" && (
                          <Slider label="Intensidade do glow" value={getNum("adm_splash_texto_glow_intensidade", 5)} onChange={(v) => set("adm_splash_texto_glow_intensidade", String(v))} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload logo + som lado a lado */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bdr)] p-4" style={{ background: "var(--card-bg)" }}>
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--txt3)]">Logo</div>
                      <div className="flex items-center gap-3">
                        {config.adm_splash_logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={config.adm_splash_logo} alt="Logo" className="h-12 w-12 shrink-0 rounded-lg object-contain border border-[var(--bdr)] bg-[var(--bg2)]" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[16px] font-bold text-[var(--txt2)]">A</div>
                        )}
                        <input ref={admSplashLogoRef} type="file" accept="image/*" onChange={handleAdmSplashLogoUpload} className="hidden" />
                        <button type="button" onClick={() => admSplashLogoRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload"}
                        </button>
                        {config.adm_splash_logo && (
                          <button type="button" onClick={() => set("adm_splash_logo", "")} className="text-[11px] text-[var(--red)] hover:underline">Remover</button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--bdr)] p-4" style={{ background: "var(--card-bg)" }}>
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--txt3)]">Som</div>
                      <div className="flex items-center gap-3">
                        {config.adm_splash_som ? (
                          <audio src={config.adm_splash_som} controls className="h-10 flex-1 min-w-0" />
                        ) : (
                          <div className="flex h-10 flex-1 items-center rounded-lg bg-[var(--bg2)] px-3 text-[11px] text-[var(--txt3)]">Sem som</div>
                        )}
                        <input ref={admSplashSomRef} type="file" accept="audio/*" onChange={handleAdmSplashSomUpload} className="hidden" />
                        <button type="button" onClick={() => admSplashSomRef.current?.click()} disabled={uploadingSom} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploadingSom ? "Enviando..." : "Upload"}
                        </button>
                        {config.adm_splash_som && (
                          <button type="button" onClick={() => set("adm_splash_som", "")} className="text-[11px] text-[var(--red)] hover:underline">Remover</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões Aplicar / Replay + Salvar */}
                  <div className="flex items-center justify-end gap-3 border-t border-[var(--bdr)] pt-4">
                    <button
                      type="button"
                      onClick={() => setSplashReplayKey((k) => k + 1)}
                      className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-semibold text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
                    >
                      ↻ Aplicar / Replay
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-[var(--orange)] px-5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SISTEMA ─────────────────────────── */}
              {activeSection === "sistema" && (
                <div className="flex flex-col gap-5">
                  <SectionTitle title="Sistema" desc="Controles de operação da plataforma" />
                  <Toggle
                    label="Modo manutenção"
                    desc="Bloqueia acesso de todos os usuários exceto ADM"
                    checked={getBool("maintenance_mode")}
                    onChange={() => toggleBool("maintenance_mode")}
                    danger
                  />
                  <Toggle
                    label="Aurohub vendas ativas"
                    desc="Habilita fluxo de vendas e onboarding de novos clientes"
                    checked={getBool("sales_active")}
                    onChange={() => toggleBool("sales_active")}
                  />
                  <ReadOnlyField label="Versão do sistema" value="Aurohub v6.0" />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function OptionalColorSquare({ label, value, onChange, onClear }: { label: string; value: string | undefined; onChange: (v: string) => void; onClear: () => void }) {
  const isTransparent = !value || value === "transparent" || !value.startsWith("#");
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[var(--bdr)] shadow-inner" style={isTransparent ? {
        background: "repeating-conic-gradient(#c0c0c0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px",
      } : { background: value }}>
        <input type="color" value={isTransparent ? "#888888" : (value as string)} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        {!isTransparent && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
            className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--red)] text-[10px] font-bold text-white shadow-md hover:scale-110"
            title="Limpar (torna transparente)"
          >
            ×
          </button>
        )}
      </div>
      <span className="text-[10px] font-medium text-[var(--txt3)]">{label}</span>
      <span className="font-mono text-[9px] text-[var(--txt3)]">{isTransparent ? "transparent" : value}</span>
    </div>
  );
}

function ColorSquare({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5">
      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[var(--bdr)] shadow-inner" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <span className="text-[10px] font-medium text-[var(--txt3)]">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-20 rounded border border-[var(--bdr)] bg-transparent px-1.5 text-center font-mono text-[10px] text-[var(--txt2)] outline-none" />
    </label>
  );
}

function Slider({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-[var(--txt3)]">{label}</span>
        <span className="font-mono text-[var(--txt2)]">{value}</span>
      </div>
      <input type="range" min={min} max={max} step="1" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-[var(--orange)]" />
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-[15px] font-bold text-[var(--txt)]">{title}</h3>
      <p className="text-[12px] text-[var(--txt3)]">{desc}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, masked }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; masked?: boolean;
}) {
  const [visible, setVisible] = useState(!masked);
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <div className="relative">
        <input
          type={masked && !visible ? "password" : type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
        />
        {masked && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--txt3)] hover:text-[var(--txt)]"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              {visible
                ? <><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" /></>
                : <><path d="M3 3l14 14M10 5c4 0 7 4 8 5-.4.5-1.2 1.4-2.3 2.3M14 10a4 4 0 00-4-4M10 15c-4 0-7-4-8-5 .4-.5 1.2-1.4 2.3-2.3M6 10a4 4 0 004 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>
              }
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <div className="flex h-9 items-center rounded-lg border border-[var(--bdr)] bg-[var(--bg3)] px-3 text-[13px] text-[var(--txt2)]">
        {value}
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, danger }: {
  label: string; desc: string; checked: boolean; onChange: () => void; danger?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)] ${
      danger && checked ? "border-[var(--red)] bg-[var(--red3)]" : "border-[var(--bdr)]"
    }`}>
      <div>
        <div className={`text-[13px] font-medium ${danger && checked ? "text-[var(--red)]" : "text-[var(--txt)]"}`}>{label}</div>
        <div className="text-[11px] text-[var(--txt3)]">{desc}</div>
      </div>
      <div
        onClick={(e) => { e.preventDefault(); onChange(); }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked
            ? danger ? "bg-[var(--red)]" : "bg-[var(--green)]"
            : "bg-[var(--bg3)]"
        }`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

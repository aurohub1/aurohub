"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";

/* ── Types ─────────────────────────────────────────── */
type ConfigMap = Record<string, string>;
type SectionKey = "identidade" | "hero" | "para-quem" | "servicos" | "processo" | "autoridade" | "vagas" | "footer" | "intro";

interface Vaga { role: string; title: string; desc: string; open: boolean; }

/* ── Constants ──────────────────────────────────────── */
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "identidade",  label: "Identidade" },
  { key: "hero",        label: "Hero" },
  { key: "intro",       label: "Intro (Áudio)" },
  { key: "para-quem",   label: "Para Quem" },
  { key: "servicos",    label: "Serviços" },
  { key: "processo",    label: "Processo" },
  { key: "autoridade",  label: "Autoridade" },
  { key: "vagas",       label: "Vagas" },
  { key: "footer",      label: "Footer" },
];

/* ── Helpers ────────────────────────────────────────── */
function parseJson<T>(val: string | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

/* ── Component ──────────────────────────────────────── */
export default function EditorLandingPage() {
  const [config, setConfig]   = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState<SectionKey>("hero");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [savingAudio, setSavingAudio] = useState(false);
  const [audioToast, setAudioToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  /* ── Load ───────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .like("key", "landing_%");
      const m: ConfigMap = {};
      (data ?? []).forEach((r: { key: string; value: string }) => { m[r.key] = r.value; });
      setConfig(m);
    } catch (err) { console.error("[Landing] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Config helpers ─────────────────────────────── */
  function get(key: string, fallback = "") { return config[key] ?? fallback; }
  function set(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }
  function getArr<T>(key: string, fallback: T[]) { return parseJson<T[]>(config[key], fallback); }
  function setArr<T>(key: string, arr: T[]) { set(key, JSON.stringify(arr)); }

  /* ── Save ───────────────────────────────────────── */
  async function saveSection() {
    setSaving(true);
    try {
      const prefix = active === "para-quem" ? "landing_paraquem_"
        : `landing_${active.replace("-", "")}_`;
      // Save all landing_ keys that match current section prefix
      const sectionPrefix = `landing_${active.replace("-", "")}_`;
      const keys = Object.entries(config).filter(([k]) => k.startsWith(sectionPrefix));
      // Also save generic landing_ keys if on hero/footer
      const genericKeys = active === "hero" || active === "footer"
        ? Object.entries(config).filter(([k]) => k.startsWith(`landing_${active}_`))
        : [];
      const toSave = [...keys, ...genericKeys];
      for (const [key, value] of toSave) {
        await supabase.from("system_config").upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("[Landing] save:", err); }
    finally { setSaving(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const entries = Object.entries(config).filter(([k]) => k.startsWith("landing_"));
      for (const [key, value] of entries) {
        await supabase.from("system_config").upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("[Landing] saveAll:", err); }
    finally { setSaving(false); }
  }

  /* ── Upload ─────────────────────────────────────── */
  async function handleUpload(targetKey: string) {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(file, "aurohubv2/landing");
        set(targetKey, url);
      } catch (err) { console.error("[Upload]", err); }
      finally { setUploading(false); }
    };
    input.click();
  }

  async function handleAudioUpload() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "audio/mpeg,audio/wav,audio/mp3,.mp3,.wav";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingAudio(true);
      setAudioToast(null);
      try {
        const url = await uploadToCloudinary(file, "aurohubv2/landing", "video");
        set("landing_intro_audio", url);
        const { error: dbErr } = await supabase.from("system_config").upsert(
          { key: "landing_intro_audio", value: url, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
        if (dbErr) throw new Error(dbErr.message);
        setAudioToast({ type: "ok", msg: `Áudio salvo: ${url}` });
        setTimeout(() => setAudioToast(null), 6000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido no upload";
        console.error("[AudioUpload]", err);
        setAudioToast({ type: "err", msg });
      } finally { setUploadingAudio(false); }
    };
    input.click();
  }

  async function saveAudio() {
    setSavingAudio(true);
    try {
      const url = config["landing_intro_audio"] ?? "";
      const vol = config["landing_intro_audio_volume"] ?? "0.4";
      await supabase.from("system_config").upsert(
        [
          { key: "landing_intro_audio", value: url, updated_at: new Date().toISOString() },
          { key: "landing_intro_audio_volume", value: vol, updated_at: new Date().toISOString() },
        ],
        { onConflict: "key" }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("[SaveAudio]", err); }
    finally { setSavingAudio(false); }
  }

  async function removeAudio() {
    set("landing_intro_audio", "");
    await supabase.from("system_config").upsert(
      { key: "landing_intro_audio", value: "", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }

  /* ── Vagas helpers ──────────────────────────────── */
  const DEFAULT_VAGAS: Vaga[] = [
    { role: "Criação", title: "Designer", desc: "Criação de identidade visual, peças para redes sociais e material gráfico. Domínio de Adobe CC.", open: true },
    { role: "Performance", title: "Tráfego Pago", desc: "Gestão de campanhas Meta e Google Ads orientadas por dados.", open: false },
  ];
  const vagas = getArr<Vaga>("landing_vagas_list", DEFAULT_VAGAS);
  function updateVaga(i: number, field: keyof Vaga, val: string | boolean) {
    const arr = [...vagas]; arr[i] = { ...arr[i], [field]: val }; setArr("landing_vagas_list", arr);
  }
  function addVaga() {
    if (vagas.length >= 6) return;
    setArr("landing_vagas_list", [...vagas, { role: "", title: "", desc: "", open: true }]);
  }
  function removeVaga(i: number) { setArr("landing_vagas_list", vagas.filter((_, idx) => idx !== i)); }

  /* ── Render ─────────────────────────────────────── */
  if (loading) return (
    <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">
      Carregando...
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Editor Landing Page</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Edite o conteúdo da página pública sem código</p>
        </div>
        <div className="flex gap-2">
          <button onClick={saveSection} disabled={saving}
            className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
            {saving ? "Salvando..." : `Salvar ${SECTIONS.find((s) => s.key === active)?.label}`}
          </button>
          <button onClick={saveAll} disabled={saving}
            className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-60">
            {saved ? "✓ Publicado!" : "Publicar tudo"}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 280px)" }}>

        {/* Nav lateral */}
        <nav className="flex w-[180px] shrink-0 flex-col gap-1">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setActive(s.key)}
              className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                active === s.key
                  ? "bg-[var(--orange3)] text-[var(--orange)]"
                  : "text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
              }`}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Editor */}
        <div className="flex-1 overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
          <div className="border-b border-[var(--bdr)] px-6 py-4">
            <h3 className="text-[15px] font-bold text-[var(--txt)]">
              {SECTIONS.find((s) => s.key === active)?.label}
            </h3>
          </div>
          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(100vh - 360px)" }}>

            {/* ── IDENTIDADE ───────────────────────── */}
            {active === "identidade" && (
              <div className="flex flex-col gap-4">
                <Note>Logo exibido na nav da landing. Substitui o arquivo icones.png padrão.</Note>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Logo atual</label>
                  <div className="flex items-center gap-4">
                    {get("landing_logo_url") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={get("landing_logo_url")} alt="Logo" className="h-10 w-10 rounded object-contain border border-[var(--bdr)]" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-[var(--bg3)] flex items-center justify-center text-[var(--txt3)] text-[11px]">A</div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => handleUpload("landing_logo_url")} disabled={uploading}
                        className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                        {uploading ? "Enviando..." : "Upload logo (PNG transparente)"}
                      </button>
                      <input type="text" value={get("landing_logo_url")} onChange={(e) => set("landing_logo_url", e.target.value)}
                        placeholder="ou cole URL do logo"
                        className="h-7 rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                    </div>
                  </div>
                  {get("landing_logo_url") && (
                    <button onClick={() => set("landing_logo_url", "")}
                      className="mt-2 text-[11px] text-[var(--txt3)] hover:text-[var(--red)]">
                      Remover — voltar ao padrão (icones.png)
                    </button>
                  )}
                </div>
                <div className="border-t border-[var(--bdr)] pt-4">
                  <Note>Botão "Ver Planos" na nav da landing. Quando ativo, aparece ao lado de Área do Cliente.</Note>
                  <div className="mt-3">
                    <Tgl
                      label='Exibir botão "Ver Planos" na nav'
                      checked={get("landing_planos_nav_show") === "true"}
                      onChange={(v) => set("landing_planos_nav_show", v ? "true" : "false")}
                    />
                  </div>
                </div>
                <div className="border-t border-[var(--bdr)] pt-4">
                  <Note>Favicon exibido na aba do browser. Recomendado: PNG quadrado 32x32 ou 64x64.</Note>
                  <div className="mt-3">
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Favicon atual</label>
                    <div className="flex items-center gap-4">
                      {get("landing_favicon_url") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={get("landing_favicon_url")} alt="Favicon" className="h-8 w-8 rounded object-contain border border-[var(--bdr)]" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-[var(--bg3)] flex items-center justify-center text-[var(--txt3)] text-[10px]">ico</div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => handleUpload("landing_favicon_url")} disabled={uploading}
                          className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload favicon (PNG 64x64)"}
                        </button>
                        <input type="text" value={get("landing_favicon_url")} onChange={(e) => set("landing_favicon_url", e.target.value)}
                          placeholder="ou cole URL do favicon"
                          className="h-7 rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HERO ──────────────────────────────── */}
            {active === "hero" && (
              <div className="flex flex-col gap-4">
                <Note>Título e subtítulo da primeira tela. O h1 atual é "Estratégia. Design. Tecnologia."</Note>
                <F label="Linha 1 do título (sem itálico)"
                  value={get("landing_hero_title", "Estratégia. Design.")}
                  onChange={(v) => set("landing_hero_title", v)} />
                <F label="Linha 2 do título (itálico dourado)"
                  value={get("landing_hero_title_em", "Tecnologia.")}
                  onChange={(v) => set("landing_hero_title_em", v)} />
                <F label="Subtítulo"
                  value={get("landing_hero_subtitle", "Do projeto ao lançamento - marketing, design e tecnologia integrados")}
                  onChange={(v) => set("landing_hero_subtitle", v)} />
                <div className="grid grid-cols-2 gap-4">
                  <F label="Botão primário — texto"
                    value={get("landing_hero_cta1_text", "WhatsApp direto")}
                    onChange={(v) => set("landing_hero_cta1_text", v)} />
                  <F label="Botão primário — URL"
                    value={get("landing_hero_cta1_url", "https://wa.me/5517996365247")}
                    onChange={(v) => set("landing_hero_cta1_url", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Botão secundário — texto"
                    value={get("landing_hero_cta2_text", "Falar por e-mail")}
                    onChange={(v) => set("landing_hero_cta2_text", v)} />
                  <F label="Botão secundário — URL"
                    value={get("landing_hero_cta2_url", "mailto:contato@aurovista.com.br")}
                    onChange={(v) => set("landing_hero_cta2_url", v)} />
                </div>
              </div>
            )}

            {/* ── INTRO (ÁUDIO) ────────────────────── */}
            {active === "intro" && (
              <div className="flex flex-col gap-5">
                <Note>Música de fundo da intro animada da landing. Aceita MP3 ou WAV. Hospedado no Cloudinary.</Note>

                {/* Player de preview */}
                {get("landing_intro_audio") && (
                  <div className="rounded-lg border border-[var(--bdr)] p-4">
                    <div className="mb-2 text-[11px] font-medium text-[var(--txt3)]">Áudio atual</div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={get("landing_intro_audio")} className="w-full h-9" />
                    <p className="mt-2 break-all text-[10px] text-[var(--txt3)]">{get("landing_intro_audio")}</p>
                  </div>
                )}

                {/* Upload */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="flex w-fit items-center gap-2 rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                      <path d="M8 2v8M5 5l3-3 3 3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {uploadingAudio ? "Enviando..." : "Upload música da intro (MP3 / WAV)"}
                  </button>

                  {/* URL manual */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">ou cole URL direta</label>
                    <input
                      type="text"
                      value={get("landing_intro_audio")}
                      onChange={(e) => set("landing_intro_audio", e.target.value)}
                      placeholder="https://..."
                      className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
                    />
                  </div>
                </div>

                {/* Toast upload */}
                {audioToast && (
                  <div className={`rounded-lg px-4 py-2.5 text-[12px] break-all ${audioToast.type === "ok" ? "bg-[var(--green3,#D1FAE5)] text-[var(--green,#16A34A)]" : "bg-[rgba(239,68,68,0.08)] text-[#EF4444]"}`}>
                    {audioToast.type === "ok" ? "✓ " : "✗ "}{audioToast.msg}
                  </div>
                )}

                {/* Volume da intro */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[var(--txt2)]">Volume da intro</label>
                    <span className="text-[12px] text-[var(--txt3)]">
                      {Math.round(Number(get("landing_intro_audio_volume", "0.4")) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(Number(get("landing_intro_audio_volume", "0.4")) * 100)}
                    onChange={(e) => set("landing_intro_audio_volume", String(Number(e.target.value) / 100))}
                    className="w-full accent-[var(--txt)]"
                  />
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveAudio}
                    disabled={savingAudio}
                    className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-60"
                  >
                    {savingAudio ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar áudio"}
                  </button>
                  {get("landing_intro_audio") && (
                    <button
                      onClick={removeAudio}
                      className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]"
                    >
                      Remover áudio
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── PARA QUEM ─────────────────────────── */}
            {active === "para-quem" && (
              <div className="flex flex-col gap-4">
                <Note>3 cards que qualificam o lead. Editáveis individualmente.</Note>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-[var(--bdr)] p-4">
                    <div className="mb-3 text-[11px] font-bold text-[var(--txt3)]">Card {n}</div>
                    <div className="flex flex-col gap-3">
                      <F label="Título (parte normal)"
                        value={get(`landing_paraquem_${n}_title`, ["Marcas que querem", "Negócios que querem", "Times que precisam"][n-1])}
                        onChange={(v) => set(`landing_paraquem_${n}_title`, v)} />
                      <F label="Título (parte itálica dourada)"
                        value={get(`landing_paraquem_${n}_em`, ["ser vistas.", "escalar.", "de parceiros."][n-1])}
                        onChange={(v) => set(`landing_paraquem_${n}_em`, v)} />
                      <F label="Descrição"
                        value={get(`landing_paraquem_${n}_desc`, "")}
                        onChange={(v) => set(`landing_paraquem_${n}_desc`, v)} />
                      <F label="Tag (ex: Branding · Conteúdo)"
                        value={get(`landing_paraquem_${n}_tag`, ["Branding · Conteúdo", "Marketing · Tech", "Estratégia · Consultoria"][n-1])}
                        onChange={(v) => set(`landing_paraquem_${n}_tag`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── SERVIÇOS ──────────────────────────── */}
            {active === "servicos" && (
              <div className="flex flex-col gap-4">
                <Note>4 cards de serviço. Título, descrição e tags editáveis.</Note>
                {["estrategia", "design", "tecnologia", "consultoria"].map((svc, i) => {
                  const labels = ["Estratégia de Marketing", "Design & Identidade", "Tecnologia & Automação", "Consultoria Estratégica"];
                  return (
                    <div key={svc} className="rounded-lg border border-[var(--bdr)] p-4">
                      <div className="mb-3 text-[11px] font-bold text-[var(--txt3)]">{labels[i]}</div>
                      <div className="flex flex-col gap-3">
                        <F label="Título"
                          value={get(`landing_svc_${svc}_title`, labels[i])}
                          onChange={(v) => set(`landing_svc_${svc}_title`, v)} />
                        <F label="Descrição"
                          value={get(`landing_svc_${svc}_desc`, "")}
                          onChange={(v) => set(`landing_svc_${svc}_desc`, v)} />
                        <F label="Tags (separadas por vírgula)"
                          value={get(`landing_svc_${svc}_tags`, "")}
                          onChange={(v) => set(`landing_svc_${svc}_tags`, v)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PROCESSO ──────────────────────────── */}
            {active === "processo" && (
              <div className="flex flex-col gap-4">
                <Note>5 etapas do processo. Fundo escuro na landing.</Note>
                {["diagnostico", "estrategia", "design", "tecnologia", "evolucao"].map((step, i) => {
                  const defaults = [
                    ["Diagnóstico", "Entender antes de propor."],
                    ["Estratégia", "O mapa antes do território."],
                    ["Design", "Forma que tem função."],
                    ["Tecnologia", "Sistemas que trabalham por você."],
                    ["Evolução", "Medir, aprender, ajustar."],
                  ];
                  return (
                    <div key={step} className="rounded-lg border border-[var(--bdr)] p-4">
                      <div className="mb-3 text-[11px] font-bold text-[var(--txt3)]">0{i + 1}</div>
                      <div className="flex flex-col gap-3">
                        <F label="Nome da etapa"
                          value={get(`landing_processo_${step}_title`, defaults[i][0])}
                          onChange={(v) => set(`landing_processo_${step}_title`, v)} />
                        <F label="Subtítulo da etapa"
                          value={get(`landing_processo_${step}_sub`, defaults[i][1])}
                          onChange={(v) => set(`landing_processo_${step}_sub`, v)} />
                        <F label="Descrição"
                          value={get(`landing_processo_${step}_desc`, "")}
                          onChange={(v) => set(`landing_processo_${step}_desc`, v)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── AUTORIDADE ────────────────────────── */}
            {active === "autoridade" && (
              <div className="flex flex-col gap-4">
                <Note>Card Meta Platforms e card do Fundador.</Note>
                <div className="rounded-lg border border-[var(--bdr)] p-4">
                  <div className="mb-3 text-[11px] font-bold text-[var(--txt3)]">Meta Platforms</div>
                  <div className="flex flex-col gap-3">
                    <F label="Título"
                      value={get("landing_meta_title", "Empresa verificada pela Meta Platforms")}
                      onChange={(v) => set("landing_meta_title", v)} />
                    <F label="Descrição"
                      value={get("landing_meta_desc", "Somos empresa verificada pela Meta como empresa de tecnologia.")}
                      onChange={(v) => set("landing_meta_desc", v)} />
                    <F label="Tag badge"
                      value={get("landing_meta_tag", "Parceiro Oficial Meta")}
                      onChange={(v) => set("landing_meta_tag", v)} />
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--bdr)] p-4">
                  <div className="mb-3 text-[11px] font-bold text-[var(--txt3)]">Fundador</div>
                  <div className="flex flex-col gap-3">
                    <F label="Nome"
                      value={get("landing_founder_name", "Duane Martins")}
                      onChange={(v) => set("landing_founder_name", v)} />
                    <F label="Cargo"
                      value={get("landing_founder_role", "Fundador & Estrategista")}
                      onChange={(v) => set("landing_founder_role", v)} />
                    <F label="Descrição"
                      value={get("landing_founder_desc", "Especialista em Neuromarketing, Design Gráfico e Tecnologia. À frente de mais de 575 campanhas e criador da plataforma Aurohub.")}
                      onChange={(v) => set("landing_founder_desc", v)} />
                    <F label="Skills (separadas por vírgula)"
                      value={get("landing_founder_skills", "Neuromarketing,Design Gráfico,Tecnologia,Gestão Comercial")}
                      onChange={(v) => set("landing_founder_skills", v)} />
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Foto (P&B)</label>
                      <div className="flex items-center gap-4">
                        {get("landing_founder_photo") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={get("landing_founder_photo")} alt="" className="h-14 w-14 rounded-full object-cover border border-[var(--bdr)] grayscale" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-[var(--bg3)] flex items-center justify-center text-[var(--txt3)] text-[11px]">Foto</div>
                        )}
                        <button onClick={() => handleUpload("landing_founder_photo")} disabled={uploading}
                          className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload foto"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── VAGAS ─────────────────────────────── */}
            {active === "vagas" && (
              <div className="flex flex-col gap-4">
                <Note>Controle o botão "Junte-se a nós" na landing e o status de cada vaga.</Note>

                {/* Toggle botão vagas */}
                <Tgl
                  label='Exibir botão "Junte-se a nós" no CTA final'
                  checked={get("landing_vagas_show") === "true"}
                  onChange={(v) => set("landing_vagas_show", v ? "true" : "false")}
                />

                <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                  Lista de vagas
                </div>

                {vagas.map((v, i) => (
                  <div key={i} className="rounded-lg border border-[var(--bdr)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[var(--txt3)]">Vaga {i + 1}</span>
                      <button onClick={() => removeVaga(i)}
                        className="text-[11px] text-[var(--txt3)] hover:text-[var(--red)]">
                        Remover
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Tgl
                        label="Vaga aberta"
                        checked={v.open}
                        onChange={(val) => updateVaga(i, "open", val)}
                      />
                      <F label="Área (ex: Criação)"
                        value={v.role}
                        onChange={(val) => updateVaga(i, "role", val)} />
                      <F label="Título da vaga"
                        value={v.title}
                        onChange={(val) => updateVaga(i, "title", val)} />
                      <F label="Descrição"
                        value={v.desc}
                        onChange={(val) => updateVaga(i, "desc", val)} />
                    </div>
                  </div>
                ))}

                {vagas.length < 6 && (
                  <button onClick={addVaga}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                    <svg viewBox="0 0 16 16" className="h-3 w-3">
                      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Adicionar vaga ({vagas.length}/6)
                  </button>
                )}
              </div>
            )}

            {/* ── FOOTER ────────────────────────────── */}
            {active === "footer" && (
              <div className="flex flex-col gap-4">
                <Note>Dados do rodapé da landing. Contato e links sociais.</Note>
                <F label="Texto de copyright"
                  value={get("landing_footer_text", "© 2025 Aurovista. Todos os direitos reservados.")}
                  onChange={(v) => set("landing_footer_text", v)} />
                <F label="WhatsApp URL"
                  value={get("landing_footer_whatsapp", "https://wa.me/5517996365247")}
                  onChange={(v) => set("landing_footer_whatsapp", v)} />
                <F label="E-mail"
                  value={get("landing_footer_email", "contato@aurovista.com.br")}
                  onChange={(v) => set("landing_footer_email", v)} />
                <F label="Instagram URL"
                  value={get("landing_footer_instagram", "https://instagram.com/aurovista")}
                  onChange={(v) => set("landing_footer_instagram", v)} />
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Endereço</label>
                  <textarea
                    value={get("landing_footer_address", "Mirassol/SP — CEP 15135-204")}
                    onChange={(e) => set("landing_footer_address", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none resize-none"
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function F({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
      />
    </div>
  );
}

function Tgl({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)]">
      <span className="text-[13px] font-medium text-[var(--txt)]">{label}</span>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--bg3)] px-4 py-2.5 text-[12px] text-[var(--txt3)]">
      {children}
    </div>
  );
}

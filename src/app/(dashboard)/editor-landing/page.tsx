"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";

/* ── Types ───────────────────────────────────────── */

type ConfigMap = Record<string, string>;
type SectionKey = "hero" | "features" | "planos" | "depoimentos" | "faq" | "footer";

interface Feature { icon: string; title: string; desc: string; }
interface Testimonial { name: string; role: string; text: string; photo: string; }
interface FaqArticle { id: string; title: string; category: string; status: string; }

/* ── Constants ───────────────────────────────────── */

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "features", label: "Features" },
  { key: "planos", label: "Planos" },
  { key: "depoimentos", label: "Depoimentos" },
  { key: "faq", label: "FAQ" },
  { key: "footer", label: "Footer" },
];

const PLAN_OPTIONS = [
  { value: "basic", label: "Essencial" },
  { value: "pro", label: "Profissional" },
  { value: "business", label: "Franquia" },
  { value: "enterprise", label: "Enterprise" },
];

/* ── Helpers ─────────────────────────────────────── */

function parseJson<T>(val: string | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

/* ── Component ───────────────────────────────────── */

export default function EditorLandingPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [faqArticles, setFaqArticles] = useState<FaqArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SectionKey>("hero");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [cfgR, faqR] = await Promise.all([
        supabase.from("system_config").select("key, value"),
        supabase.from("faq_articles").select("id, title, category, status").eq("status", "published").order("updated_at", { ascending: false }),
      ]);
      const m: ConfigMap = {};
      (cfgR.data ?? []).forEach((r: { key: string; value: string }) => { m[r.key] = r.value; });
      setConfig(m);
      setFaqArticles((faqR.data as FaqArticle[]) ?? []);
    } catch (err) { console.error("[Landing] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Config helpers ────────────────────────────── */

  function get(key: string, fallback = ""): string { return config[key] ?? fallback; }
  function set(key: string, value: string) { setConfig((prev) => ({ ...prev, [key]: value })); setSaved(false); }

  // JSON array helpers
  function getArr<T>(key: string, fallback: T[]): T[] { return parseJson<T[]>(config[key], fallback); }
  function setArr<T>(key: string, arr: T[]) { set(key, JSON.stringify(arr)); }

  /* ── Save ──────────────────────────────────────── */

  async function saveAll() {
    setSaving(true);
    try {
      const landingKeys = Object.entries(config).filter(([k]) => k.startsWith("landing_"));
      for (const [key, value] of landingKeys) {
        await supabase.from("system_config").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("[Landing] save:", err); }
    finally { setSaving(false); }
  }

  async function saveSection() {
    setSaving(true);
    try {
      const prefix = `landing_${active}_`;
      const keys = Object.entries(config).filter(([k]) => k.startsWith(prefix));
      for (const [key, value] of keys) {
        await supabase.from("system_config").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("[Landing] save section:", err); }
    finally { setSaving(false); }
  }

  /* ── Upload ────────────────────────────────────── */

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

  /* ── Features helpers ──────────────────────────── */

  const features = getArr<Feature>("landing_features_list", []);
  function updateFeature(i: number, field: keyof Feature, val: string) {
    const arr = [...features]; arr[i] = { ...arr[i], [field]: val }; setArr("landing_features_list", arr);
  }
  function addFeature() { if (features.length >= 6) return; setArr("landing_features_list", [...features, { icon: "✨", title: "", desc: "" }]); }
  function removeFeature(i: number) { setArr("landing_features_list", features.filter((_, idx) => idx !== i)); }
  function moveFeature(i: number, dir: -1 | 1) {
    const arr = [...features]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setArr("landing_features_list", arr);
  }

  /* ── Testimonials helpers ──────────────────────── */

  const testimonials = getArr<Testimonial>("landing_depoimentos_list", []);
  function updateTest(i: number, field: keyof Testimonial, val: string) {
    const arr = [...testimonials]; arr[i] = { ...arr[i], [field]: val }; setArr("landing_depoimentos_list", arr);
  }
  function addTest() { if (testimonials.length >= 5) return; setArr("landing_depoimentos_list", [...testimonials, { name: "", role: "", text: "", photo: "" }]); }
  function removeTest(i: number) { setArr("landing_depoimentos_list", testimonials.filter((_, idx) => idx !== i)); }

  /* ── FAQ selection ─────────────────────────────── */

  const faqSelected = getArr<string>("landing_faq_ids", []);
  function toggleFaq(id: string) {
    const arr = faqSelected.includes(id) ? faqSelected.filter((x) => x !== id) : [...faqSelected, id];
    setArr("landing_faq_ids", arr);
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Editor Landing Page</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Edite o conteúdo da página pública sem código</p>
        </div>
        <div className="flex gap-2">
          <button onClick={saveSection} disabled={saving} className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
            {saving ? "Salvando..." : `Salvar ${SECTIONS.find((s) => s.key === active)?.label}`}
          </button>
          <button onClick={saveAll} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-60">
            {saved ? "Publicado!" : "Publicar tudo"}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 280px)" }}>
        {/* Nav */}
        <nav className="flex w-[180px] shrink-0 flex-col gap-1">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setActive(s.key)} className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${active === s.key ? "bg-[var(--orange3)] text-[var(--orange)]" : "text-[var(--txt2)] hover:bg-[var(--hover-bg)]"}`}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Editor + Preview */}
        <div className="flex flex-1 gap-6">
          {/* Editor */}
          <div className="flex-1 overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <h3 className="text-[15px] font-bold text-[var(--txt)]">{SECTIONS.find((s) => s.key === active)?.label}</h3>
            </div>
            <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(100vh - 360px)" }}>

              {/* ── HERO ─────────────────────────── */}
              {active === "hero" && (
                <div className="flex flex-col gap-4">
                  <F label="Título principal" value={get("landing_hero_title", "Transforme o marketing da sua agência")} onChange={(v) => set("landing_hero_title", v)} />
                  <F label="Subtítulo" value={get("landing_hero_subtitle", "Plataforma completa para agências de viagem")} onChange={(v) => set("landing_hero_subtitle", v)} />
                  <div className="grid grid-cols-2 gap-4">
                    <F label="CTA primário — texto" value={get("landing_hero_cta1_text", "Começar agora")} onChange={(v) => set("landing_hero_cta1_text", v)} />
                    <F label="CTA primário — URL" value={get("landing_hero_cta1_url", "#planos")} onChange={(v) => set("landing_hero_cta1_url", v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="CTA secundário — texto" value={get("landing_hero_cta2_text", "Ver demo")} onChange={(v) => set("landing_hero_cta2_text", v)} />
                    <F label="CTA secundário — URL" value={get("landing_hero_cta2_url", "#demo")} onChange={(v) => set("landing_hero_cta2_url", v)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Imagem de fundo</label>
                    <div className="flex items-center gap-4">
                      {get("landing_hero_bg") ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={get("landing_hero_bg")} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[var(--txt3)] text-[11px]">Sem imagem</div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => handleUpload("landing_hero_bg")} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload"}
                        </button>
                        <input type="text" value={get("landing_hero_bg")} onChange={(e) => set("landing_hero_bg", e.target.value)} placeholder="ou cole URL" className="h-7 rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FEATURES ─────────────────────── */}
              {active === "features" && (
                <div className="flex flex-col gap-4">
                  {features.map((f, i) => (
                    <div key={i} className="rounded-lg border border-[var(--bdr)] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[12px] font-bold text-[var(--txt3)]">Card {i + 1}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveFeature(i, -1)} disabled={i === 0} className="text-[var(--txt3)] hover:text-[var(--txt)] disabled:opacity-30">↑</button>
                          <button onClick={() => moveFeature(i, 1)} disabled={i === features.length - 1} className="text-[var(--txt3)] hover:text-[var(--txt)] disabled:opacity-30">↓</button>
                          <button onClick={() => removeFeature(i)} className="ml-2 text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Remover</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[60px_1fr] gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] text-[var(--txt3)]">Ícone</label>
                          <input type="text" value={f.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-2 text-center text-[18px] outline-none" />
                        </div>
                        <F label="Título" value={f.title} onChange={(v) => updateFeature(i, "title", v)} />
                      </div>
                      <div className="mt-3">
                        <F label="Descrição" value={f.desc} onChange={(v) => updateFeature(i, "desc", v)} />
                      </div>
                    </div>
                  ))}
                  {features.length < 6 && (
                    <button onClick={addFeature} className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                      <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      Adicionar card ({features.length}/6)
                    </button>
                  )}
                </div>
              )}

              {/* ── PLANOS ───────────────────────── */}
              {active === "planos" && (
                <div className="flex flex-col gap-4">
                  <Tgl label="Exibir seção de planos" checked={get("landing_planos_show") !== "false"} onChange={(v) => set("landing_planos_show", v ? "true" : "false")} />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Plano em destaque</label>
                    <select value={get("landing_planos_highlight", "pro")} onChange={(e) => set("landing_planos_highlight", e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {PLAN_OPTIONS.map((p) => (
                    <F key={p.value} label={`CTA — ${p.label}`} value={get(`landing_planos_cta_${p.value}`, "Começar agora")} onChange={(v) => set(`landing_planos_cta_${p.value}`, v)} />
                  ))}
                </div>
              )}

              {/* ── DEPOIMENTOS ───────────────────── */}
              {active === "depoimentos" && (
                <div className="flex flex-col gap-4">
                  {testimonials.map((t, i) => (
                    <div key={i} className="rounded-lg border border-[var(--bdr)] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[12px] font-bold text-[var(--txt3)]">Depoimento {i + 1}</span>
                        <button onClick={() => removeTest(i)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Remover</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <F label="Nome" value={t.name} onChange={(v) => updateTest(i, "name", v)} />
                        <F label="Cargo / Empresa" value={t.role} onChange={(v) => updateTest(i, "role", v)} />
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Depoimento</label>
                        <textarea value={t.text} onChange={(e) => updateTest(i, "text", e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none resize-none" />
                      </div>
                      <div className="mt-3">
                        <F label="Foto (URL)" value={t.photo} onChange={(v) => updateTest(i, "photo", v)} placeholder="https://..." />
                      </div>
                    </div>
                  ))}
                  {testimonials.length < 5 && (
                    <button onClick={addTest} className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                      <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      Adicionar depoimento ({testimonials.length}/5)
                    </button>
                  )}
                </div>
              )}

              {/* ── FAQ ──────────────────────────── */}
              {active === "faq" && (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-[var(--txt3)] mb-2">Selecione os artigos publicados que aparecem na landing page</p>
                  {faqArticles.length === 0 ? (
                    <div className="text-[12px] text-[var(--txt3)]">Nenhum artigo publicado. Crie artigos em FAQ & Suporte.</div>
                  ) : (
                    faqArticles.map((a) => {
                      const sel = faqSelected.includes(a.id);
                      return (
                        <label key={a.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)] ${sel ? "border-[var(--green)] bg-[var(--green3)]" : "border-[var(--bdr)]"}`}>
                          <div>
                            <div className={`text-[13px] font-medium ${sel ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{a.title}</div>
                            <div className="text-[10px] text-[var(--txt3)]">{a.category}</div>
                          </div>
                          <input type="checkbox" checked={sel} onChange={() => toggleFaq(a.id)} className="accent-[var(--green)]" />
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── FOOTER ───────────────────────── */}
              {active === "footer" && (
                <div className="flex flex-col gap-4">
                  <F label="Texto do rodapé" value={get("landing_footer_text", "© 2025 Aurovista. Todos os direitos reservados.")} onChange={(v) => set("landing_footer_text", v)} />
                  <F label="Instagram URL" value={get("landing_footer_instagram", "https://instagram.com/aurovista")} onChange={(v) => set("landing_footer_instagram", v)} />
                  <F label="WhatsApp URL" value={get("landing_footer_whatsapp", "https://wa.me/5517999990000")} onChange={(v) => set("landing_footer_whatsapp", v)} />
                  <F label="Email" value={get("landing_footer_email", "contato@aurovista.com.br")} onChange={(v) => set("landing_footer_email", v)} />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Endereço</label>
                    <textarea value={get("landing_footer_address", "Mirassol/SP — CEP 15135-204")} onChange={(e) => set("landing_footer_address", e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none resize-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="w-[320px] shrink-0 overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--bg2)" }}>
            <div className="border-b border-[var(--bdr)] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Preview</div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 360px)" }}>

              {active === "hero" && (
                <div className="rounded-xl overflow-hidden">
                  {get("landing_hero_bg") && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={get("landing_hero_bg")} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4 bg-[var(--bg3)] rounded-b-xl">
                    <div className="text-[16px] font-bold text-[var(--txt)] leading-tight">{get("landing_hero_title", "Título principal")}</div>
                    <div className="mt-1 text-[11px] text-[var(--txt3)]">{get("landing_hero_subtitle", "Subtítulo")}</div>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-lg bg-[var(--orange)] px-3 py-1 text-[10px] font-bold text-white">{get("landing_hero_cta1_text", "CTA 1")}</span>
                      <span className="rounded-lg border border-[var(--bdr2)] px-3 py-1 text-[10px] font-medium text-[var(--txt2)]">{get("landing_hero_cta2_text", "CTA 2")}</span>
                    </div>
                  </div>
                </div>
              )}

              {active === "features" && (
                <div className="flex flex-col gap-2">
                  {features.length === 0 ? <div className="text-[11px] text-[var(--txt3)]">Nenhum card</div> : features.map((f, i) => (
                    <div key={i} className="rounded-lg border border-[var(--bdr)] p-3">
                      <div className="text-[16px]">{f.icon}</div>
                      <div className="mt-1 text-[12px] font-bold text-[var(--txt)]">{f.title || "Título"}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--txt3)]">{f.desc || "Descrição"}</div>
                    </div>
                  ))}
                </div>
              )}

              {active === "planos" && (
                <div className="flex flex-col gap-2">
                  {get("landing_planos_show") === "false" ? (
                    <div className="rounded-lg bg-[var(--red3)] p-3 text-[11px] text-[var(--red)] text-center font-medium">Seção oculta</div>
                  ) : (
                    PLAN_OPTIONS.map((p) => {
                      const highlight = get("landing_planos_highlight", "pro") === p.value;
                      return (
                        <div key={p.value} className={`rounded-lg border p-3 ${highlight ? "border-[var(--orange)] bg-[var(--orange3)]" : "border-[var(--bdr)]"}`}>
                          <div className="text-[12px] font-bold text-[var(--txt)]">{p.label}</div>
                          <div className="mt-1 text-[10px] text-[var(--orange)]">{get(`landing_planos_cta_${p.value}`, "Começar agora")}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {active === "depoimentos" && (
                <div className="flex flex-col gap-2">
                  {testimonials.length === 0 ? <div className="text-[11px] text-[var(--txt3)]">Nenhum depoimento</div> : testimonials.map((t, i) => (
                    <div key={i} className="rounded-lg border border-[var(--bdr)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {t.photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={t.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-[var(--bg3)]" />
                        )}
                        <div>
                          <div className="text-[11px] font-bold text-[var(--txt)]">{t.name || "Nome"}</div>
                          <div className="text-[9px] text-[var(--txt3)]">{t.role || "Cargo"}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-[var(--txt2)] italic">&ldquo;{t.text || "Depoimento..."}&rdquo;</div>
                    </div>
                  ))}
                </div>
              )}

              {active === "faq" && (
                <div className="flex flex-col gap-2">
                  {faqSelected.length === 0 ? <div className="text-[11px] text-[var(--txt3)]">Nenhum artigo selecionado</div> : (
                    faqArticles.filter((a) => faqSelected.includes(a.id)).map((a) => (
                      <div key={a.id} className="rounded-lg border border-[var(--bdr)] p-3">
                        <div className="text-[12px] font-bold text-[var(--txt)]">{a.title}</div>
                        <div className="text-[9px] text-[var(--txt3)]">{a.category}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active === "footer" && (
                <div className="rounded-lg bg-[var(--bg3)] p-4">
                  <div className="text-[10px] text-[var(--txt3)]">{get("landing_footer_text", "© 2025 Aurovista")}</div>
                  <div className="mt-2 flex gap-3 text-[10px] text-[var(--txt2)]">
                    {get("landing_footer_instagram") && <span>IG</span>}
                    {get("landing_footer_whatsapp") && <span>WA</span>}
                    {get("landing_footer_email") && <span>Email</span>}
                  </div>
                  <div className="mt-2 text-[9px] text-[var(--txt3)]">{get("landing_footer_address", "Endereço")}</div>
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

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
    </div>
  );
}

function Tgl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)]">
      <span className="text-[13px] font-medium text-[var(--txt)]">{label}</span>
      <div onClick={(e) => { e.preventDefault(); onChange(!checked); }} className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { EditorSchema, EditorElement } from "@/components/editor/canvas-editor";

const CanvasEditor = dynamic(
  () => import("@/components/editor/canvas-editor").then(m => m.CanvasEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>
        Carregando editor...
      </div>
    ),
  }
);

const FORMATS = [
  { id: "stories", label: "Stories", w: 1080, h: 1920, desc: "1080×1920" },
  { id: "feed", label: "Feed", w: 1080, h: 1350, desc: "1080×1350" },
  { id: "reels", label: "Reels", w: 1080, h: 1920, desc: "1080×1920" },
  { id: "transmissao", label: "Transmissão", w: 1080, h: 1920, desc: "1080×1920" },
  { id: "tv", label: "TV", w: 1920, h: 1080, desc: "1920×1080" },
];

const PALETTES = [
  { name: "Aurohub", colors: ["#0E1520", "#1E3A6E", "#3B82F6", "#D4A843", "#FF7A1A"] },
  { name: "Oceano", colors: ["#0B1120", "#0C4A6E", "#0EA5E9", "#38BDF8", "#BAE6FD"] },
  { name: "Sunset", colors: ["#1A0A2E", "#7C3AED", "#F472B6", "#FB923C", "#FDE68A"] },
  { name: "Floresta", colors: ["#052E16", "#166534", "#22C55E", "#86EFAC", "#F0FDF4"] },
  { name: "Escuro", colors: ["#000000", "#111111", "#1A1A1A", "#222222", "#333333"] },
  { name: "Claro", colors: ["#FFFFFF", "#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1"] },
];

const GRADIENTS = [
  { name: "Gold → Orange", css: "linear-gradient(135deg, #D4A843, #FF7A1A)" },
  { name: "Blue → Purple", css: "linear-gradient(135deg, #3B82F6, #8B5CF6)" },
  { name: "Dark Blue", css: "linear-gradient(180deg, #0F2847, #081428)" },
  { name: "Sunset", css: "linear-gradient(135deg, #F97316, #EC4899)" },
  { name: "Ocean", css: "linear-gradient(135deg, #06B6D4, #3B82F6)" },
  { name: "Forest", css: "linear-gradient(135deg, #22C55E, #16A34A)" },
  { name: "Night", css: "linear-gradient(180deg, #0E1520, #1A2436)" },
  { name: "Warm", css: "linear-gradient(135deg, #FDE68A, #F97316)" },
];

function emptySchema(): EditorSchema {
  return { background: "#0E1520", elements: [], duration: 5 };
}

function adaptElements(elements: EditorElement[], fromW: number, fromH: number, toW: number, toH: number): EditorElement[] {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const s = Math.min(sx, sy);
  return elements.map(el => ({
    ...el,
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: Math.round(el.x * sx),
    y: Math.round(el.y * sy),
    width: Math.round(el.width * s),
    height: Math.round(el.height * s),
    fontSize: el.fontSize ? Math.round(el.fontSize * s) : undefined,
  }));
}

interface CloudImage { url: string; id: string; width: number; height: number; }

export default function EditorPage() {
  const [activeFormat, setActiveFormat] = useState("stories");
  const [schemas, setSchemas] = useState<Record<string, EditorSchema>>({
    stories: emptySchema(), feed: emptySchema(), reels: emptySchema(), transmissao: emptySchema(), tv: emptySchema(),
  });

  const [statusMsg, setStatusMsg] = useState("");
  const [showAdaptMenu, setShowAdaptMenu] = useState(false);

  // Modais
  const [showBgModal, setShowBgModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<CloudImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [bgColor, setBgColor] = useState("#0E1520");
  const [bgGradient, setBgGradient] = useState("");
  const [bgTab, setBgTab] = useState<"cor" | "gradiente" | "paleta">("cor");
  const [uploading, setUploading] = useState(false);

  const fmt = FORMATS.find(f => f.id === activeFormat)!;
  const schema = schemas[activeFormat];

  const setSchema = useCallback((s: EditorSchema) => {
    setSchemas(prev => ({ ...prev, [activeFormat]: s }));
  }, [activeFormat]);

  // Sync bgColor com schema
  useEffect(() => { setBgColor(schema.background); }, [schema.background]);

  function showStatus(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  }

  // Background modal
  function applyBg(color: string) {
    setSchema({ ...schema, background: color });
    setBgColor(color);
    setShowBgModal(false);
    showStatus("Fundo alterado");
  }

  // Adaptar formato
  function handleAdapt(fromId: string) {
    const from = FORMATS.find(f => f.id === fromId)!;
    const fromSchema = schemas[fromId];
    if (!fromSchema.elements.length) { showStatus(`${from.label} está vazio`); return; }
    const adapted = adaptElements(fromSchema.elements, from.w, from.h, fmt.w, fmt.h);
    setSchema({ ...schema, elements: [...schema.elements, ...adapted] });
    setShowAdaptMenu(false);
    showStatus(`${adapted.length} elementos copiados de ${from.label}`);
  }

  function handleCopyStoriesToReels() {
    const s = schemas.stories;
    if (!s.elements.length) { showStatus("Stories está vazio"); return; }
    const copied = s.elements.map(el => ({ ...el, id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }));
    setSchemas(prev => ({ ...prev, reels: { ...s, elements: copied } }));
    setActiveFormat("reels");
    showStatus("Stories copiado para Reels");
  }

  // Upload de imagem
  async function handleUploadImage(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/cloudinary", { method: "POST", body: fd });
          const data = await res.json();
          setUploading(false);
          if (data.url) { showStatus("Imagem enviada!"); resolve(data.url); }
          else { showStatus("Erro no upload"); resolve(null); }
        } catch { setUploading(false); showStatus("Erro no upload"); resolve(null); }
      };
      input.click();
    });
  }

  // Galeria Cloudinary
  async function openGallery() {
    setShowGallery(true);
    if (galleryImages.length > 0) return;
    setGalleryLoading(true);
    try {
      const res = await fetch("/api/cloudinary/list");
      const data = await res.json();
      if (data.images) setGalleryImages(data.images);
    } catch { /* */ }
    setGalleryLoading(false);
  }

  function selectGalleryImage(url: string) {
    // Adiciona imagem ao canvas via schema (functional update para evitar stale closure)
    const el: EditorElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "image", name: "Imagem", x: fmt.w / 4, y: fmt.h / 4,
      width: fmt.w / 2, height: fmt.h / 3, src: url, opacity: 1,
      animation: "fadeIn", animDelay: 0, animDuration: 0.6,
    };
    setSchemas(prev => {
      const current = prev[activeFormat];
      return { ...prev, [activeFormat]: { ...current, elements: [...current.elements, el] } };
    });
    setShowGallery(false);
    showStatus("Imagem adicionada");
  }

  const handleExport = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `${activeFormat}-${Date.now()}.png`;
    link.href = dataUrl; link.click();
    showStatus("PNG exportado!");
  }, [activeFormat]);

  async function handleSave() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(schemas, null, 2));
      showStatus("Schema copiado!");
    } catch {
      const blob = new Blob([JSON.stringify(schemas, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "template.json"; a.click();
      URL.revokeObjectURL(url);
      showStatus("Schema baixado!");
    }
  }

  function handleLoad() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed.stories || parsed.feed) setSchemas(prev => ({ ...prev, ...parsed }));
        else if (parsed.elements) setSchema(parsed);
        showStatus("Carregado!");
      } catch { showStatus("JSON inválido"); }
    };
    input.click();
  }

  const counts = Object.fromEntries(FORMATS.map(f => [f.id, schemas[f.id]?.elements.length || 0]));

  // Styles compartilhados
  const btnStyle: React.CSSProperties = {
    padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-secondary)",
    fontSize: 10, fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "-24px", height: "calc(100vh)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)", flexShrink: 0,
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>Editor</h1>
          <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 10, background: "var(--bg-input)" }}>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => setActiveFormat(f.id)} title={f.desc} style={{
                padding: "5px 12px", borderRadius: 7, border: "none",
                background: activeFormat === f.id ? "rgba(212,168,67,0.12)" : "transparent",
                color: activeFormat === f.id ? "var(--gold)" : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", position: "relative",
              }}>
                {f.label}
                {counts[f.id] > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: 7, background: "var(--gold)", color: "#0B1120", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{counts[f.id]}</span>
                )}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmt.w}×{fmt.h}</span>
          {activeFormat === "tv" && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, background: "rgba(255,122,26,0.1)", color: "var(--orange)", fontWeight: 700 }}>Download</span>}
        </div>

        {/* Center */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Fundo */}
          <button onClick={() => setShowBgModal(true)} style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: schema.background, border: "1px solid var(--border)" }} />
            Fundo
          </button>

          {/* Galeria */}
          <button onClick={openGallery} style={btnStyle}>Galeria</button>

          {/* Copiar de */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAdaptMenu(!showAdaptMenu)} style={btnStyle}>Copiar de...</button>
            {showAdaptMenu && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: 4, minWidth: 180, boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}>
                {FORMATS.filter(f => f.id !== activeFormat).map(f => (
                  <button key={f.id} onClick={() => handleAdapt(f.id)} style={{
                    display: "block", width: "100%", padding: "8px 12px", borderRadius: 7,
                    border: "none", background: "transparent", color: "var(--text-secondary)",
                    fontSize: 11, cursor: "pointer", textAlign: "left",
                  }}>{f.label} <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({counts[f.id]})</span></button>
                ))}
                {activeFormat !== "reels" && (
                  <button onClick={handleCopyStoriesToReels} style={{
                    display: "block", width: "100%", padding: "8px 12px", borderRadius: 7, marginTop: 4,
                    border: "none", background: "rgba(212,168,67,0.06)", color: "var(--gold)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left", borderTop: "1px solid var(--border)",
                  }}>Stories → Reels (cópia direta)</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {uploading && <span style={{ fontSize: 10, color: "var(--blue)", fontWeight: 600 }}>Enviando...</span>}
          {statusMsg && <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>{statusMsg}</span>}
          <button onClick={handleLoad} style={btnStyle}>Abrir</button>
          <button onClick={handleSave} style={{ ...btnStyle, border: "none", background: "linear-gradient(135deg, var(--gold), var(--orange))", color: "#0B1120", fontWeight: 700 }}>Salvar</button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: "hidden" }} onClick={() => { showAdaptMenu && setShowAdaptMenu(false); }}>
        <CanvasEditor
          key={activeFormat}
          width={fmt.w}
          height={fmt.h}
          schema={schema}
          onChange={setSchema}
          onExport={handleExport}
          onUploadImage={handleUploadImage}
        />
      </div>

      {/* ===== MODAL: Fundo ===== */}
      {showBgModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowBgModal(false)} />
          <div style={{
            position: "relative", width: 420, maxHeight: "80vh", overflowY: "auto",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 20, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>Fundo do Canvas</h2>
              <button onClick={() => setShowBgModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 10, background: "var(--bg-input)", marginBottom: 20 }}>
              {(["cor", "gradiente", "paleta"] as const).map(t => (
                <button key={t} onClick={() => setBgTab(t)} style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, border: "none",
                  background: bgTab === t ? "rgba(212,168,67,0.12)" : "transparent",
                  color: bgTab === t ? "var(--gold)" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                }}>{t}</button>
              ))}
            </div>

            {/* Tab: Cor */}
            {bgTab === "cor" && (
              <div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 50, height: 50, borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", padding: 0 }} />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4 }}>HEX</label>
                    <input value={bgColor} onChange={e => setBgColor(e.target.value)} style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--bg-input)", color: "var(--text)", fontSize: 13, fontFamily: "monospace",
                    }} />
                  </div>
                </div>
                {/* Preview */}
                <div style={{ height: 60, borderRadius: 12, background: bgColor, border: "1px solid var(--border)", marginBottom: 16 }} />
                <button onClick={() => applyBg(bgColor)} style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, var(--gold), var(--orange))",
                  color: "#0B1120", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>Aplicar Cor</button>
              </div>
            )}

            {/* Tab: Gradiente */}
            {bgTab === "gradiente" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {GRADIENTS.map(g => (
                    <button key={g.name} onClick={() => applyBg(g.css)} style={{
                      padding: 0, border: "1px solid var(--border)", borderRadius: 12,
                      overflow: "hidden", cursor: "pointer", background: "none",
                    }}>
                      <div style={{ height: 56, background: g.css }} />
                      <div style={{ padding: "6px 10px", background: "var(--bg-input)" }}>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{g.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Custom gradient */}
                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>CSS Gradiente Customizado</label>
                  <input value={bgGradient} onChange={e => setBgGradient(e.target.value)}
                    placeholder="linear-gradient(135deg, #D4A843, #FF7A1A)"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text)", fontSize: 11, fontFamily: "monospace", boxSizing: "border-box" }}
                  />
                  {bgGradient && <div style={{ height: 40, borderRadius: 8, background: bgGradient, marginTop: 8, border: "1px solid var(--border)" }} />}
                  <button onClick={() => { if (bgGradient) applyBg(bgGradient); }} disabled={!bgGradient} style={{
                    width: "100%", padding: "10px 0", borderRadius: 8, border: "none", marginTop: 8,
                    background: bgGradient ? "linear-gradient(135deg, var(--gold), var(--orange))" : "var(--border)",
                    color: bgGradient ? "#0B1120" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: bgGradient ? "pointer" : "default",
                  }}>Aplicar Gradiente</button>
                </div>
              </div>
            )}

            {/* Tab: Paleta */}
            {bgTab === "paleta" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {PALETTES.map(p => (
                  <div key={p.name}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>{p.name}</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {p.colors.map(c => (
                        <button key={c} onClick={() => applyBg(c)} title={c} style={{
                          flex: 1, height: 40, borderRadius: 8, border: "1px solid var(--border)",
                          background: c, cursor: "pointer", transition: "transform 0.15s",
                        }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL: Galeria Cloudinary ===== */}
      {showGallery && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowGallery(false)} />
          <div style={{
            position: "relative", width: 600, maxHeight: "80vh",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 20, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)", display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>Galeria Cloudinary</h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={async () => {
                  const url = await handleUploadImage();
                  if (url) {
                    selectGalleryImage(url);
                    // Refresh gallery
                    setGalleryLoading(true);
                    const res = await fetch("/api/cloudinary/list");
                    const data = await res.json();
                    if (data.images) setGalleryImages(data.images);
                    setGalleryLoading(false);
                  }
                }} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, var(--gold), var(--orange))",
                  color: "#0B1120", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>Upload Nova</button>
                <button onClick={() => setShowGallery(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {galleryLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>Carregando imagens...</div>
              ) : galleryImages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>Nenhuma imagem encontrada. Faça upload!</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {galleryImages.map(img => (
                    <button key={img.id} onClick={() => selectGalleryImage(img.url)} style={{
                      padding: 0, border: "1px solid var(--border)", borderRadius: 12,
                      overflow: "hidden", cursor: "pointer", background: "var(--bg-input)",
                      transition: "all 0.2s",
                    }}>
                      <img src={img.url} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "6px 8px" }}>
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{img.width}×{img.height}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

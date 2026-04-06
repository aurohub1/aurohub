"use client";

import { useState, useCallback } from "react";
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
  { id: "reels", label: "Reels", w: 1080, h: 1920, desc: "1080×1920 (cópia Stories)" },
  { id: "transmissao", label: "Transmissão", w: 1920, h: 1080, desc: "1920×1080 (apenas download)" },
];

function emptySchema(): EditorSchema {
  return { background: "#0E1520", elements: [], duration: 5 };
}

/** Reescala elementos de um formato para outro proporcionalmente */
function adaptElements(elements: EditorElement[], fromW: number, fromH: number, toW: number, toH: number): EditorElement[] {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const s = Math.min(sx, sy); // escala uniforme para não distorcer
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

export default function EditorPage() {
  const [activeFormat, setActiveFormat] = useState("stories");

  // Cada formato tem seu schema independente
  const [schemas, setSchemas] = useState<Record<string, EditorSchema>>({
    stories: emptySchema(),
    feed: emptySchema(),
    reels: emptySchema(),
    transmissao: emptySchema(),
  });

  const [statusMsg, setStatusMsg] = useState("");
  const [showAdaptMenu, setShowAdaptMenu] = useState(false);

  const fmt = FORMATS.find(f => f.id === activeFormat)!;
  const schema = schemas[activeFormat];

  const setSchema = useCallback((s: EditorSchema) => {
    setSchemas(prev => ({ ...prev, [activeFormat]: s }));
  }, [activeFormat]);

  // Adaptar: copia elementos de um formato para o atual
  function handleAdapt(fromId: string) {
    const from = FORMATS.find(f => f.id === fromId)!;
    const to = fmt;
    const fromSchema = schemas[fromId];
    if (!fromSchema.elements.length) {
      setStatusMsg(`${from.label} está vazio`);
      setTimeout(() => setStatusMsg(""), 2000);
      return;
    }
    const adapted = adaptElements(fromSchema.elements, from.w, from.h, to.w, to.h);
    setSchema({ ...schema, elements: [...schema.elements, ...adapted] });
    setShowAdaptMenu(false);
    setStatusMsg(`${adapted.length} elementos copiados de ${from.label}`);
    setTimeout(() => setStatusMsg(""), 3000);
  }

  // Copiar Stories → Reels (cópia direta, mesmo tamanho)
  function handleCopyStoriesToReels() {
    const storiesSchema = schemas.stories;
    if (!storiesSchema.elements.length) {
      setStatusMsg("Stories está vazio");
      setTimeout(() => setStatusMsg(""), 2000);
      return;
    }
    const copied = storiesSchema.elements.map(el => ({
      ...el,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    setSchemas(prev => ({
      ...prev,
      reels: { ...storiesSchema, elements: copied },
    }));
    setActiveFormat("reels");
    setStatusMsg("Stories copiado para Reels");
    setTimeout(() => setStatusMsg(""), 3000);
  }

  // Exportar PNG
  const handleExport = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `${activeFormat}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setStatusMsg("PNG exportado!");
    setTimeout(() => setStatusMsg(""), 2000);
  }, [activeFormat]);

  // Salvar schema (JSON)
  async function handleSave() {
    try {
      const allSchemas = JSON.stringify(schemas, null, 2);
      await navigator.clipboard.writeText(allSchemas);
      setStatusMsg("Schema salvo no clipboard!");
    } catch {
      const blob = new Blob([JSON.stringify(schemas, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "template-schemas.json"; a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("Schema baixado!");
    }
    setTimeout(() => setStatusMsg(""), 3000);
  }

  // Carregar schema
  function handleLoad() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        // Se tem múltiplos formatos
        if (parsed.stories || parsed.feed || parsed.reels || parsed.transmissao) {
          setSchemas(prev => ({ ...prev, ...parsed }));
          setStatusMsg("Schemas carregados!");
        }
        // Se é um schema único
        else if (parsed.elements && parsed.background) {
          setSchema(parsed);
          setStatusMsg("Schema carregado!");
        }
      } catch { setStatusMsg("JSON inválido"); }
      setTimeout(() => setStatusMsg(""), 2000);
    };
    input.click();
  }

  // Cor de fundo
  function handleBgColor() {
    const color = prompt("Cor de fundo (hex):", schema.background);
    if (color) setSchema({ ...schema, background: color });
  }

  // Contagem de elementos por formato
  const counts = Object.fromEntries(FORMATS.map(f => [f.id, schemas[f.id]?.elements.length || 0]));

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "-24px", height: "calc(100vh)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)", flexShrink: 0,
      }}>
        {/* Left: title + formats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                  <span style={{
                    position: "absolute", top: -3, right: -3,
                    width: 14, height: 14, borderRadius: 7,
                    background: "var(--gold)", color: "#0B1120",
                    fontSize: 8, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{counts[f.id]}</span>
                )}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmt.w}×{fmt.h}</span>
        </div>

        {/* Center: adapt + bg */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Adaptar formato */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAdaptMenu(!showAdaptMenu)} style={{
              padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: "var(--text-secondary)",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>Copiar de...</button>
            {showAdaptMenu && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: 4, minWidth: 160,
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}>
                {FORMATS.filter(f => f.id !== activeFormat).map(f => (
                  <button key={f.id} onClick={() => handleAdapt(f.id)} style={{
                    display: "block", width: "100%", padding: "8px 12px", borderRadius: 7,
                    border: "none", background: "transparent", color: "var(--text-secondary)",
                    fontSize: 11, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  }}>
                    {f.label} <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({f.desc})</span>
                    {counts[f.id] > 0 && <span style={{ color: "var(--gold)", marginLeft: 6 }}>{counts[f.id]} elem.</span>}
                  </button>
                ))}
                {activeFormat !== "reels" && (
                  <button onClick={handleCopyStoriesToReels} style={{
                    display: "block", width: "100%", padding: "8px 12px", borderRadius: 7, marginTop: 4,
                    border: "none", background: "rgba(212,168,67,0.06)", color: "var(--gold)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    borderTop: "1px solid var(--border)",
                  }}>Stories → Reels (cópia direta)</button>
                )}
              </div>
            )}
          </div>

          {/* Cor de fundo */}
          <button onClick={handleBgColor} style={{
            padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--bg-input)", color: "var(--text-secondary)",
            fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: schema.background, border: "1px solid var(--border)" }} />
            Fundo
          </button>

          {activeFormat === "transmissao" && (
            <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, background: "rgba(255,122,26,0.1)", color: "var(--orange)", fontWeight: 700 }}>Apenas download</span>
          )}
        </div>

        {/* Right: save/load + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {statusMsg && <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>{statusMsg}</span>}
          <button onClick={handleLoad} style={{
            padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--bg-input)", color: "var(--text-secondary)",
            fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>Abrir</button>
          <button onClick={handleSave} style={{
            padding: "5px 10px", borderRadius: 7, border: "none",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            color: "#0B1120", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>Salvar</button>
        </div>
      </div>

      {/* Canvas Editor */}
      <div style={{ flex: 1, overflow: "hidden" }}
        onClick={() => showAdaptMenu && setShowAdaptMenu(false)}
      >
        <CanvasEditor
          key={activeFormat}
          width={fmt.w}
          height={fmt.h}
          schema={schema}
          onChange={setSchema}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}

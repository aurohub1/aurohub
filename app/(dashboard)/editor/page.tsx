"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EditorSchema } from "@/components/editor/canvas-editor";

// Konva needs window — dynamic import with loading fallback
const CanvasEditor = dynamic(
  () => import("@/components/editor/canvas-editor").then(m => m.CanvasEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        Carregando editor...
      </div>
    ),
  }
);

const FORMATS = [
  { id: "stories", label: "Stories", w: 1080, h: 1920 },
  { id: "feed", label: "Feed", w: 1080, h: 1350 },
  { id: "reels", label: "Reels", w: 1080, h: 1920 },
  { id: "tv", label: "TV", w: 1920, h: 1080 },
];

const DEFAULT_SCHEMA: EditorSchema = {
  background: "#0E1520",
  elements: [],
};

export default function EditorPage() {
  const [format, setFormat] = useState("stories");
  const [schema, setSchema] = useState<EditorSchema>(DEFAULT_SCHEMA);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const fmt = FORMATS.find(f => f.id === format)!;

  const handleExport = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `template-${format}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setStatusMsg("PNG exportado!");
    setTimeout(() => setStatusMsg(""), 2000);
  }, [format]);

  const handleSaveSchema = useCallback(async () => {
    setSaving(true);
    try {
      // Copy to clipboard as JSON
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setStatusMsg("Schema copiado para clipboard!");
    } catch {
      // Fallback: download as file
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `schema-${format}.json`; a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("Schema baixado como JSON!");
    }
    setSaving(false);
    setTimeout(() => setStatusMsg(""), 3000);
  }, [schema, format]);

  const handleLoadSchema = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text) as EditorSchema;
        if (parsed.elements && parsed.background) {
          setSchema(parsed);
          setStatusMsg("Schema carregado!");
          setTimeout(() => setStatusMsg(""), 2000);
        }
      } catch { setStatusMsg("JSON inválido"); }
    };
    input.click();
  }, []);

  const handleBgColor = useCallback(() => {
    const color = prompt("Cor de fundo (hex):", schema.background);
    if (color) setSchema(s => ({ ...s, background: color }));
  }, [schema.background]);

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "-24px", height: "calc(100vh)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>Editor</h1>

          {/* Format switcher */}
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-input)" }}>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)} style={{
                padding: "5px 14px", borderRadius: 8, border: "none",
                background: format === f.id ? "rgba(212,168,67,0.12)" : "transparent",
                color: format === f.id ? "var(--gold)" : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>{f.label}</button>
            ))}
          </div>

          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt.w}×{fmt.h}</span>

          <button onClick={handleBgColor} style={{
            padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-input)", color: "var(--text-secondary)",
            fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: schema.background, border: "1px solid var(--border)" }} />
            Fundo
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {statusMsg && (
            <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{statusMsg}</span>
          )}

          <button onClick={handleLoadSchema} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-input)", color: "var(--text-secondary)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>Carregar JSON</button>

          <button onClick={handleSaveSchema} disabled={saving} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-input)", color: "var(--text-secondary)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>Salvar Schema</button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <CanvasEditor
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

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type Konva from "konva";
import { EditorElement, EditorSchema, genId } from "./types";
import Toolbar from "./toolbar";
import ToolsPanel from "./tools-panel";
import PropsPanel from "./props-panel";
import CanvasStage from "./canvas-stage";
import ParameterView from "./parameter-view";

export type { EditorSchema, EditorElement };

const HISTORY_LIMIT = 50;

interface CanvasEditorProps {
  width: number; height: number;
  schema: EditorSchema;
  onChange: (s: EditorSchema) => void;
  onExport?: (dataUrl: string) => void;
  onSave?: () => void;
  saving?: boolean;
  format?: string;
  onFormatChange?: (f: string) => void;
}

export function CanvasEditor({ width, height, schema, onChange, onExport, onSave, saving, format, onFormatChange }: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [history, setHistory] = useState<EditorSchema[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const skipHistoryRef = useRef(false);
  const clipboardRef = useRef<EditorElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const [propsTab, setPropsTab] = useState<"design" | "animate">("design");
  const [paramView, setParamView] = useState(false);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const totalDuration = schema.duration || 5;
  const selected = schema.elements.find(el => el.id === selectedId) ?? null;

  // Fit canvas
  useEffect(() => {
    const cw = Math.max(window.innerWidth - 42 - 232 - 40, 200);
    const ch = Math.max(window.innerHeight - 44 - 26 - 40, 200);
    setStageScale(Math.min(cw / width, ch / height, 1));
  }, [width, height]);

  // History
  const pushHistory = useCallback((s: EditorSchema) => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    setHistory(h => { const n = [...h.slice(0, historyIdx + 1), s].slice(-HISTORY_LIMIT); setHistoryIdx(n.length - 1); return n; });
  }, [historyIdx]);

  const changeSchema = useCallback((s: EditorSchema) => { onChange(s); pushHistory(s); }, [onChange, pushHistory]);

  useEffect(() => { if (history.length === 0) { setHistory([schema]); setHistoryIdx(0); } }, []);

  const undo = useCallback(() => { if (historyIdx <= 0) return; skipHistoryRef.current = true; setHistoryIdx(historyIdx - 1); onChange(history[historyIdx - 1]); }, [historyIdx, history, onChange]);
  const redo = useCallback(() => { if (historyIdx >= history.length - 1) return; skipHistoryRef.current = true; setHistoryIdx(historyIdx + 1); onChange(history[historyIdx + 1]); }, [historyIdx, history, onChange]);

  // Animation
  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = performance.now() - currentTime * 1000;
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= totalDuration) { setCurrentTime(totalDuration); setPlaying(false); return; }
      setCurrentTime(elapsed); animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, totalDuration]);

  // Element ops
  const updateElement = useCallback((id: string, attrs: Partial<EditorElement>) => {
    changeSchema({ ...schemaRef.current, elements: schemaRef.current.elements.map(el => el.id === id ? { ...el, ...attrs } : el) });
  }, [changeSchema]);

  const addElement = useCallback((el: EditorElement) => {
    changeSchema({ ...schemaRef.current, elements: [...schemaRef.current.elements, el] });
    setSelectedId(el.id);
  }, [changeSchema]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    changeSchema({ ...schema, elements: schema.elements.filter(el => el.id !== selectedId) });
    setSelectedId(null);
  }, [selectedId, schema, changeSchema]);

  const duplicateSelected = useCallback(() => {
    const el = schema.elements.find(e => e.id === selectedId);
    if (!el) return;
    addElement({ ...el, id: genId(), x: el.x + 20, y: el.y + 20, name: (el.name || el.type) + " cópia" });
  }, [selectedId, schema, addElement]);

  const copySelected = useCallback(() => { const el = schema.elements.find(e => e.id === selectedId); if (el) clipboardRef.current = { ...el }; }, [selectedId, schema]);
  const paste = useCallback(() => { if (!clipboardRef.current) return; addElement({ ...clipboardRef.current, id: genId(), x: clipboardRef.current.x + 20, y: clipboardRef.current.y + 20 }); }, [addElement]);

  const moveLayer = useCallback((dir: "up" | "down") => {
    if (!selectedId) return;
    const els = [...schema.elements]; const idx = els.findIndex(el => el.id === selectedId);
    const newIdx = dir === "up" ? Math.min(idx + 1, els.length - 1) : Math.max(idx - 1, 0);
    if (newIdx === idx) return;
    const [item] = els.splice(idx, 1); els.splice(newIdx, 0, item);
    changeSchema({ ...schema, elements: els });
  }, [selectedId, schema, changeSchema]);

  const alignSelected = useCallback((align: string) => {
    const el = schema.elements.find(e => e.id === selectedId); if (!el) return;
    const u: Partial<EditorElement> = {};
    if (align === "left") u.x = 0; if (align === "center-h") u.x = (width - el.width) / 2; if (align === "right") u.x = width - el.width;
    if (align === "top") u.y = 0; if (align === "center-v") u.y = (height - el.height) / 2; if (align === "bottom") u.y = height - el.height;
    updateElement(el.id, u);
  }, [selectedId, schema, width, height, updateElement]);

  const play = useCallback(() => { setSelectedId(null); setCurrentTime(0); setPlaying(true); }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => { setPlaying(false); setCurrentTime(0); }, []);

  // Export
  const handleExport = useCallback(() => {
    if (!stageRef.current || !onExport) return;
    const old = stageRef.current.scaleX();
    stageRef.current.scale({ x: 1, y: 1 });
    const uri = stageRef.current.toDataURL({ x: 0, y: 0, width, height, pixelRatio: 3 });
    stageRef.current.scale({ x: old, y: old });
    onExport(uri);
  }, [width, height, onExport]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); e.preventDefault(); }
      if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); copySelected(); }
      if (e.ctrlKey && e.key === "v") { e.preventDefault(); paste(); }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); onSave?.(); }
      if (e.ctrlKey && e.key === "e") { e.preventDefault(); handleExport(); }
      if (e.ctrlKey && e.key === "[") { e.preventDefault(); moveLayer("down"); }
      if (e.ctrlKey && e.key === "]") { e.preventDefault(); moveLayer("up"); }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); /* Select all — selects last element for now */ if (schema.elements.length > 0) setSelectedId(schema.elements[schema.elements.length - 1].id); }
      if (selectedId && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault(); const step = e.shiftKey ? 10 : 1;
        const el = schema.elements.find(x => x.id === selectedId); if (!el || el.locked) return;
        const u: Partial<EditorElement> = {};
        if (e.key === "ArrowUp") u.y = el.y - step; if (e.key === "ArrowDown") u.y = el.y + step;
        if (e.key === "ArrowLeft") u.x = el.x - step; if (e.key === "ArrowRight") u.x = el.x + step;
        updateElement(el.id, u);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, playing, pause, play, undo, redo, copySelected, paste, duplicateSelected, selectedId, schema, updateElement, handleExport, onSave]);

  const fitScreen = useCallback(() => {
    const cw = Math.max(window.innerWidth - 42 - 232 - 40, 200);
    const ch = Math.max(window.innerHeight - 44 - 26 - 40, 200);
    setStageScale(Math.min(cw / width, ch / height, 1));
  }, [width, height]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden", background: "var(--ed-bg)" }}>
      <Toolbar
        onUndo={undo} onRedo={redo} onCopy={copySelected} onPaste={paste}
        onDuplicate={duplicateSelected} onDelete={deleteSelected}
        onExport={onExport ? handleExport : undefined}
        onSave={onSave} saving={saving}
        zoom={stageScale} format={format} onFormatChange={onFormatChange}
        canUndo={historyIdx > 0} canRedo={historyIdx < history.length - 1}
        onToggleParamView={() => setParamView(!paramView)} paramViewActive={paramView}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ToolsPanel
          schema={schema} selectedId={selectedId}
          canvasW={width} canvasH={height}
          onAdd={addElement} onSelect={setSelectedId}
          onUpdate={updateElement} onMoveLayer={moveLayer} onRemove={deleteSelected}
          stageScale={stageScale} onZoom={setStageScale} onFit={fitScreen}
        />

        <CanvasStage
          width={width} height={height} schema={schema}
          selectedId={selectedId} stageScale={stageScale}
          playing={playing} currentTime={currentTime}
          onSelect={setSelectedId} onUpdate={updateElement}
          onStageRef={(r) => { stageRef.current = r; }}
          onScaleChange={setStageScale}
        />

        {paramView ? (
          <ParameterView schema={schema} onUpdate={updateElement} />
        ) : (
          <PropsPanel
            selected={selected} canvasW={width} canvasH={height}
            onUpdate={updateElement} onAlign={alignSelected}
            activeTab={propsTab} onTabChange={setPropsTab}
          />
        )}
      </div>

      {/* Statusbar with timeline */}
      <div style={{ height: 26, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "var(--ed-surface)", borderTop: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--ed-txt3)" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} /> Pronto</span>
        <span style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{width}×{height}</span>
        <span style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{schema.elements.length} elem</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: "var(--ed-txt2)", fontVariantNumeric: "tabular-nums" }}>{currentTime.toFixed(1)}s / {totalDuration}s</span>
        <button onClick={playing ? pause : play} style={{ width: 22, height: 18, borderRadius: 4, border: "none", background: playing ? "var(--ed-active)" : "var(--ed-hover)", color: playing ? "var(--ed-active-txt)" : "var(--ed-txt2)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{playing ? "⏸" : "▶"}</button>
        <button onClick={reset} style={{ width: 22, height: 18, borderRadius: 4, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⏹</button>
        <div style={{ width: 100, height: 4, borderRadius: 2, background: "var(--ed-input)", position: "relative", cursor: "pointer" }}
          onClick={e => { if (playing) return; const r = e.currentTarget.getBoundingClientRect(); setCurrentTime(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * totalDuration); }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 2, width: `${(currentTime / totalDuration) * 100}%`, background: "linear-gradient(90deg, #D4A843, #FF7A1A)", transition: playing ? "none" : "width 0.1s" }} />
        </div>
        <select value={totalDuration} onChange={e => onChange({ ...schema, duration: +e.target.value })} style={{ height: 18, borderRadius: 4, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt2)", fontSize: 9, cursor: "pointer", outline: "none" }}>
          {[3, 5, 8, 10, 15, 20, 30].map(d => <option key={d} value={d}>{d}s</option>)}
        </select>
      </div>
    </div>
  );
}

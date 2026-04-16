"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type Konva from "konva";
import { EditorElement, EditorSchema, genId } from "./types";
import Toolbar from "./toolbar";
import ToolsPanel from "./tools-panel";
import LayersPanel from "./layers-panel";
import PropsPanel from "./props-panel";
import CanvasStage from "./canvas-stage";
import ParameterView from "./parameter-view";
import { AssetsPanel, ComponentsPanel, DestinosPanel, HistoryPanel, InstagramPreviewModal, VariantsModal, SaveComponentModal, CropModal } from "./modals";

const BADGE_ALLINCLUSIVE_URL = "https://res.cloudinary.com/dxgj4bcch/image/upload/aurohubv2/badges/allinclusive.png";

export type { EditorSchema, EditorElement };

const HISTORY_LIMIT = 50;

interface CanvasEditorProps {
  width: number; height: number;
  schema: EditorSchema;
  onChange: (s: EditorSchema) => void;
  onExport?: (dataUrl: string) => void;
  onSave?: (thumbnail?: string) => void;
  saving?: boolean;
  format?: string; onFormatChange?: (f: string) => void;
  formType?: string; onFormTypeChange?: (f: string) => void;
  qtdDestinos?: number; onQtdDestinosChange?: (n: number) => void;
  templateId?: string | null;
  variantsEnabled?: boolean;
  onSaveVariants?: (variants: { format: string; width: number; height: number; schema: EditorSchema }[]) => void;
  onNew?: () => void;
}

export function CanvasEditor({ width, height, schema, onChange, onExport, onSave, saving, format, onFormatChange, formType, onFormTypeChange, qtdDestinos, onQtdDestinosChange, templateId, variantsEnabled, onSaveVariants, onNew }: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stageScale, setStageScale] = useState(1);
  const [history, setHistory] = useState<EditorSchema[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const skipHistoryRef = useRef(false);
  const clipboardRef = useRef<EditorElement[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const [propsTab, setPropsTab] = useState<"design" | "animate">("design");
  const [paramView, setParamView] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showAssets, setShowAssets] = useState(false);
  const [showComponents, setShowComponents] = useState(false);
  const [showDestinos, setShowDestinos] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string>("");
  const [showVariants, setShowVariants] = useState(false);
  const [showSaveComponent, setShowSaveComponent] = useState(false);
  const [cropElementId, setCropElementId] = useState<string | null>(null);
  const lastBadgeCheckRef = useRef<string>("");
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  // Load snap preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem("ah_snap_enabled");
    if (v !== null) setSnapEnabled(v === "1");
  }, []);

  const toggleSnap = useCallback(() => {
    setSnapEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("ah_snap_enabled", next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  }, []);

  const totalDuration = schema.duration || 5;
  const selected = schema.elements.find(el => el.id === selectedId) ?? null;

  // Selection helpers
  const selectSingle = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedIds(id ? [id] : []);
  }, []);

  const shiftSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSelectedId(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const ids = schema.elements.map(el => el.id);
    setSelectedIds(ids);
    setSelectedId(ids.length > 0 ? ids[ids.length - 1] : null);
  }, [schema.elements]);

  const clearSelection = useCallback(() => { setSelectedId(null); setSelectedIds([]); }, []);

  // Fit canvas
  useEffect(() => {
    const cw = Math.max(window.innerWidth - 42 - 160 - 232 - 40, 200);
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
    selectSingle(el.id);
  }, [changeSchema, selectSingle]);

  // Multi-aware ops
  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    changeSchema({ ...schema, elements: schema.elements.filter(el => !selectedIds.includes(el.id)) });
    clearSelection();
  }, [selectedIds, schema, changeSchema, clearSelection]);

  const duplicateSelected = useCallback(() => {
    const toDup = schema.elements.filter(e => selectedIds.includes(e.id));
    if (toDup.length === 0) return;
    const newEls = toDup.map(el => ({ ...el, id: genId(), x: el.x + 20, y: el.y + 20, name: (el.name || el.type) + " cópia" }));
    changeSchema({ ...schema, elements: [...schema.elements, ...newEls] });
    setSelectedIds(newEls.map(e => e.id));
    setSelectedId(newEls[newEls.length - 1].id);
  }, [selectedIds, schema, changeSchema]);

  const copySelected = useCallback(() => {
    clipboardRef.current = schema.elements.filter(e => selectedIds.includes(e.id)).map(e => ({ ...e }));
  }, [selectedIds, schema]);

  const paste = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    const newEls = clipboardRef.current.map(el => ({ ...el, id: genId(), x: el.x + 20, y: el.y + 20 }));
    changeSchema({ ...schema, elements: [...schema.elements, ...newEls] });
    setSelectedIds(newEls.map(e => e.id));
    setSelectedId(newEls[newEls.length - 1].id);
  }, [schema, changeSchema]);

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

  const play = useCallback(() => { clearSelection(); setCurrentTime(0); setPlaying(true); }, [clearSelection]);
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

  // Save com thumbnail JPEG do canvas real (pixelRatio 1, quality 0.85)
  const handleSaveClick = useCallback(() => {
    if (!onSave) return;
    let thumb: string | undefined;
    if (stageRef.current) {
      const old = stageRef.current.scaleX();
      stageRef.current.scale({ x: 1, y: 1 });
      try {
        thumb = stageRef.current.toDataURL({
          x: 0, y: 0, width, height,
          pixelRatio: 1,
          mimeType: "image/jpeg",
          quality: 0.85,
        });
      } catch (err) { console.warn("[Thumbnail]", err); }
      stageRef.current.scale({ x: old, y: old });
    }
    onSave(thumb);
  }, [onSave, width, height]);

  // Keyboard — multi-aware
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); e.preventDefault(); }
      if (e.key === "Escape") { clearSelection(); e.preventDefault(); }
      if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); copySelected(); }
      if (e.ctrlKey && e.key === "v") { e.preventDefault(); paste(); }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSaveClick(); }
      if (e.ctrlKey && e.key === "e") { e.preventDefault(); handleExport(); }
      if (e.ctrlKey && e.key === "[") { e.preventDefault(); moveLayer("down"); }
      if (e.ctrlKey && e.key === "]") { e.preventDefault(); moveLayer("up"); }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); selectAll(); }
      // Arrows move ALL selected
      if (selectedIds.length > 0 && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault(); const step = e.shiftKey ? 10 : 1;
        const updates: Record<string, Partial<EditorElement>> = {};
        for (const id of selectedIds) {
          const el = schema.elements.find(x => x.id === id);
          if (!el || el.locked) continue;
          if (e.key === "ArrowUp") updates[id] = { y: el.y - step };
          if (e.key === "ArrowDown") updates[id] = { y: el.y + step };
          if (e.key === "ArrowLeft") updates[id] = { x: el.x - step };
          if (e.key === "ArrowRight") updates[id] = { x: el.x + step };
        }
        const newEls = schema.elements.map(el => updates[el.id] ? { ...el, ...updates[el.id] } : el);
        changeSchema({ ...schema, elements: newEls });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, clearSelection, playing, pause, play, undo, redo, copySelected, paste, duplicateSelected, selectAll, selectedIds, schema, changeSchema, handleExport, handleSaveClick, moveLayer]);

  /* ── Badge automático (item 10) ───────────────────── */
  useEffect(() => {
    const servicosEl = schema.elements.find(el => el.bindParam === "servicos");
    const trigger = (servicosEl?.text || "").toLowerCase();
    const key = `${servicosEl?.id || ""}|${trigger}`;
    if (key === lastBadgeCheckRef.current) return;
    lastBadgeCheckRef.current = key;
    const hasAI = trigger.includes("all inclusive") || trigger.includes("allinclusive") || trigger.includes("all-inclusive");
    const existingBadge = schema.elements.find(el => el.bindParam === "allinclusivo");
    if (hasAI && !existingBadge) {
      const badge: EditorElement = {
        id: genId(), type: "image", name: "Badge All Inclusive",
        x: width - 220, y: 60, width: 180, height: 180,
        src: BADGE_ALLINCLUSIVE_URL, bindParam: "allinclusivo", opacity: 1,
      };
      changeSchema({ ...schemaRef.current, elements: [...schemaRef.current.elements, badge] });
    }
  }, [schema.elements, width, changeSchema]);

  /* ── Assets / Components / Destinos inserts ───────── */
  const insertImageFromUrl = useCallback((url: string, imgW: number, imgH: number, name = "Imagem") => {
    const ratio = imgW / imgH;
    const maxW = width * 0.5;
    const w = Math.min(imgW, maxW);
    const h = w / ratio;
    addElement({ id: genId(), type: "image", name, x: (width - w) / 2, y: (height - h) / 2, width: w, height: h, src: url, opacity: 1 });
  }, [addElement, width, height]);

  const insertComponents = useCallback((els: EditorElement[]) => {
    const offset = 30;
    const newEls = els.map(el => ({ ...el, id: genId(), x: el.x + offset, y: el.y + offset }));
    changeSchema({ ...schemaRef.current, elements: [...schemaRef.current.elements, ...newEls] });
    setSelectedIds(newEls.map(e => e.id));
    setSelectedId(newEls[newEls.length - 1].id);
  }, [changeSchema]);

  const insertDestino = useCallback((url: string, asBackground: boolean) => {
    if (asBackground) {
      const existingBg = schema.elements.find(el => el.bindParam === "imgfundo");
      if (existingBg) {
        updateElement(existingBg.id, { src: url });
      } else {
        addElement({ id: genId(), type: "image", name: "Fundo", x: 0, y: 0, width, height, src: url, bindParam: "imgfundo", opacity: 1 });
      }
    } else {
      insertImageFromUrl(url, 1200, 800, "Destino");
    }
  }, [schema.elements, width, height, updateElement, addElement, insertImageFromUrl]);

  /* ── Preview Instagram (item 11) ──────────────────── */
  const openPreview = useCallback(() => {
    if (!stageRef.current) return;
    const old = stageRef.current.scaleX();
    stageRef.current.scale({ x: 1, y: 1 });
    const uri = stageRef.current.toDataURL({ x: 0, y: 0, width, height, pixelRatio: 1 });
    stageRef.current.scale({ x: old, y: old });
    setPreviewData(uri);
    setShowPreview(true);
  }, [width, height]);

  /* ── Variantes (item 12) ──────────────────────────── */
  const handleVariantsConfirm = useCallback((variants: { format: string; width: number; height: number; schema: EditorSchema }[]) => {
    if (onSaveVariants) onSaveVariants(variants);
    setShowVariants(false);
  }, [onSaveVariants]);

  /* ── Save Component (item 5) ──────────────────────── */
  const selectedElements = schema.elements.filter(el => selectedIds.includes(el.id));

  /* ── Crop confirm (item 2) ────────────────────────── */
  const handleCropConfirm = useCallback((crop: { x: number; y: number; width: number; height: number }) => {
    if (!cropElementId) return;
    updateElement(cropElementId, { cropX: crop.x, cropY: crop.y, cropW: crop.width, cropH: crop.height });
    setCropElementId(null);
  }, [cropElementId, updateElement]);

  const croppingEl = cropElementId ? schema.elements.find(el => el.id === cropElementId) : null;

  const fitScreen = useCallback(() => {
    const cw = Math.max(window.innerWidth - 42 - 160 - 232 - 40, 200);
    const ch = Math.max(window.innerHeight - 44 - 26 - 40, 200);
    setStageScale(Math.min(cw / width, ch / height, 1));
  }, [width, height]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden", background: "var(--ed-bg)" }}>
      <Toolbar
        onUndo={undo} onRedo={redo} onCopy={copySelected} onPaste={paste}
        onDuplicate={duplicateSelected} onDelete={deleteSelected}
        onExport={onExport ? handleExport : undefined}
        onSave={onSave ? handleSaveClick : undefined} saving={saving}
        zoom={stageScale} format={format} onFormatChange={onFormatChange}
        formType={formType} onFormTypeChange={onFormTypeChange}
        qtdDestinos={qtdDestinos} onQtdDestinosChange={onQtdDestinosChange}
        canUndo={historyIdx > 0} canRedo={historyIdx < history.length - 1}
        onToggleParamView={() => setParamView(!paramView)} paramViewActive={paramView}
        onToggleSnap={toggleSnap} snapEnabled={snapEnabled}
        onPreview={openPreview}
        onVariants={() => setShowVariants(true)} variantsEnabled={!!variantsEnabled}
        onHistory={templateId ? () => setShowHistory(true) : undefined}
        onSaveComponent={() => setShowSaveComponent(true)} canSaveComponent={selectedIds.length > 0}
        onNew={onNew}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ToolsPanel
          schema={schema} selectedId={selectedId} selectedIds={selectedIds}
          canvasW={width} canvasH={height}
          onAdd={addElement} onSelect={selectSingle}
          onUpdate={updateElement} onMoveLayer={moveLayer} onRemove={deleteSelected}
          stageScale={stageScale} onZoom={setStageScale} onFit={fitScreen}
          formType={formType} qtdDestinos={qtdDestinos}
          onOpenAssets={() => setShowAssets(true)}
          onOpenComponents={() => setShowComponents(true)}
          onOpenDestinos={() => setShowDestinos(true)}
        />

        <LayersPanel
          elements={schema.elements}
          selectedIds={selectedIds}
          onSelect={selectSingle}
          onShiftSelect={shiftSelect}
          onUpdate={updateElement}
        />

        <CanvasStage
          width={width} height={height} schema={schema}
          selectedIds={selectedIds} stageScale={stageScale}
          playing={playing} currentTime={currentTime}
          snapEnabled={snapEnabled}
          onSelect={selectSingle} onShiftSelect={shiftSelect}
          onUpdate={updateElement}
          onStageRef={(r) => { stageRef.current = r; }}
          onScaleChange={setStageScale}
        />

        {paramView ? (
          <ParameterView schema={schema} onUpdate={updateElement} onExport={onExport ? handleExport : undefined} />
        ) : (
          <PropsPanel
            selected={selected} canvasW={width} canvasH={height} allElements={schema.elements}
            onUpdate={updateElement} onAlign={alignSelected}
            activeTab={propsTab} onTabChange={setPropsTab}
            selectedCount={selectedIds.length}
            onOpenCrop={selected?.type === "image" && selected.src ? () => setCropElementId(selected.id) : undefined}
            formType={formType || schema.formType}
          />
        )}
      </div>

      {/* Statusbar */}
      <div style={{ position: "relative", height: 26, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "var(--ed-surface)", borderTop: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--ed-txt3)" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} /> Pronto</span>
        <span style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{width}×{height}</span>
        <span style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{schema.elements.length} elem</span>
        {selectedIds.length > 1 && <span style={{ fontSize: 9, color: "var(--ed-bind)", fontWeight: 700 }}>✦ {selectedIds.length} sel</span>}
        <div style={{ position: "absolute", right: 240, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
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

      {/* ── Modals ──────────────────────────── */}
      {showAssets && <AssetsPanel onClose={() => setShowAssets(false)} onInsert={(url, w, h) => insertImageFromUrl(url, w, h, "Asset")} />}
      {showComponents && <ComponentsPanel onClose={() => setShowComponents(false)} onInsert={insertComponents} />}
      {showDestinos && <DestinosPanel onClose={() => setShowDestinos(false)} onPick={insertDestino} />}
      {showHistory && templateId && <HistoryPanel templateId={templateId} onClose={() => setShowHistory(false)} onRestore={s => { onChange(s); pushHistory(s); }} />}
      {showPreview && <InstagramPreviewModal dataUrl={previewData} format={format || "stories"} onClose={() => setShowPreview(false)} />}
      {showVariants && <VariantsModal schema={schema} srcFormat={format || "stories"} srcW={width} srcH={height} onClose={() => setShowVariants(false)} onConfirm={handleVariantsConfirm} />}
      {showSaveComponent && <SaveComponentModal elements={selectedElements} onClose={() => setShowSaveComponent(false)} onSaved={() => {}} />}
      {croppingEl?.src && <CropModal src={croppingEl.src} initial={croppingEl.cropW && croppingEl.cropH ? { x: croppingEl.cropX || 0, y: croppingEl.cropY || 0, width: croppingEl.cropW, height: croppingEl.cropH } : undefined} onClose={() => setCropElementId(null)} onConfirm={handleCropConfirm} />}
    </div>
  );
}

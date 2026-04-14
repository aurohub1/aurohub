"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";

/* ── Lazy-load react-konva (SSR incompatível) ──── */

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const KRect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const KCircle = dynamic(() => import("react-konva").then((m) => m.Circle), { ssr: false });
const KText = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const KImage = dynamic(() => import("react-konva").then((m) => m.Image), { ssr: false });
const KTransformer = dynamic(() => import("react-konva").then((m) => m.Transformer), { ssr: false });

/* ── Types ───────────────────────────────────────── */

type Tool = "select" | "text" | "image" | "rect" | "circle";
type Format = "feed" | "stories" | "reels" | "tv";

interface BaseElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number;
  visible: boolean; locked: boolean;
  name: string;
}

interface TextEl extends BaseElement {
  type: "text";
  text: string; fontSize: number; fontFamily: string;
  fill: string; fontStyle: string; align: string;
  isBind: boolean; bindKey: string;
}

interface ImageEl extends BaseElement {
  type: "image";
  src: string;
}

interface RectEl extends BaseElement {
  type: "rect";
  fill: string; stroke: string; strokeWidth: number; cornerRadius: number;
}

interface CircleEl extends BaseElement {
  type: "circle";
  fill: string; stroke: string; strokeWidth: number;
}

type CanvasElement = TextEl | ImageEl | RectEl | CircleEl;

interface HistoryState { elements: CanvasElement[]; }

/* ── Constants ───────────────────────────────────── */

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed:    { w: 1080, h: 1080, label: "Feed 1:1" },
  stories: { w: 1080, h: 1920, label: "Stories 9:16" },
  reels:   { w: 1080, h: 1920, label: "Reels 9:16" },
  tv:      { w: 1920, h: 1080, label: "TV 16:9" },
};

const BIND_GROUPS: { group: string; fields: string[] }[] = [
  { group: "Destino",  fields: ["destino", "subdestino"] },
  { group: "Datas",    fields: ["dataida", "datavolta", "noites"] },
  { group: "Hotel",    fields: ["hotel", "categoria"] },
  { group: "Preço",    fields: ["preco", "parcelas", "entrada", "moeda"] },
  { group: "Loja",     fields: ["loja", "agente", "fone"] },
  { group: "Genérico", fields: ["titulo", "subtitulo", "texto1", "texto2"] },
];

const FONTS = ["DM Sans", "DM Serif Display", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Bebas Neue", "Montserrat", "Poppins"];

let idCounter = 0;
function uid(): string { return `el_${Date.now()}_${++idCounter}`; }

/* ── Component ───────────────────────────────────── */

export default function EditorPage() {
  const [format, setFormat] = useState<Format>("feed");
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgSrc, setBgSrc] = useState("");
  const [bindOpen, setBindOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // History
  const [history, setHistory] = useState<HistoryState[]>([{ elements: [] }]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Refs
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  // Canvas scale
  const fmt = FORMATS[format];
  const maxW = 680;
  const scale = Math.min(maxW / fmt.w, 600 / fmt.h);
  const stageW = fmt.w * scale;
  const stageH = fmt.h * scale;

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  /* ── History ───────────────────────────────────── */

  function pushHistory(newElements: CanvasElement[]) {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push({ elements: newElements });
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  }

  function undo() {
    if (historyIdx <= 0) return;
    const idx = historyIdx - 1;
    setHistoryIdx(idx);
    setElements(history[idx].elements);
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const idx = historyIdx + 1;
    setHistoryIdx(idx);
    setElements(history[idx].elements);
  }

  /* ── Update element ────────────────────────────── */

  function updateEl(id: string, updates: Partial<CanvasElement>) {
    const next = elements.map((e) => e.id === id ? { ...e, ...updates } as CanvasElement : e);
    setElements(next);
    pushHistory(next);
  }

  function removeEl(id: string) {
    const next = elements.filter((e) => e.id !== id);
    setElements(next);
    setSelectedId(null);
    pushHistory(next);
  }

  /* ── Add elements ──────────────────────────────── */

  function addText(text = "Texto", isBind = false, bindKey = "") {
    const el: TextEl = {
      id: uid(), type: "text", x: 100, y: 100, width: 300, height: 50,
      rotation: 0, opacity: 1, visible: true, locked: false,
      name: isBind ? `[${bindKey}]` : "Texto",
      text: isBind ? `[${bindKey}]` : text,
      fontSize: 32, fontFamily: "DM Sans", fill: isBind ? "#FF7A1A" : "#000000",
      fontStyle: "normal", align: "left", isBind, bindKey,
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addRect() {
    const el: RectEl = {
      id: uid(), type: "rect", x: 100, y: 100, width: 200, height: 150,
      rotation: 0, opacity: 1, visible: true, locked: false, name: "Retângulo",
      fill: "#3B82F6", stroke: "", strokeWidth: 0, cornerRadius: 0,
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addCircle() {
    const el: CircleEl = {
      id: uid(), type: "circle", x: 300, y: 300, width: 100, height: 100,
      rotation: 0, opacity: 1, visible: true, locked: false, name: "Círculo",
      fill: "#D4A843", stroke: "", strokeWidth: 0,
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addImage(src: string) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImages((prev) => ({ ...prev, [src]: img }));
      const el: ImageEl = {
        id: uid(), type: "image", x: 50, y: 50,
        width: Math.min(img.width, fmt.w * 0.5), height: Math.min(img.height, fmt.h * 0.5),
        rotation: 0, opacity: 1, visible: true, locked: false, name: "Imagem", src,
      };
      const next = [...elements, el];
      setElements(next);
      setSelectedId(el.id);
      setTool("select");
      pushHistory(next);
    };
    img.src = src;
  }

  /* ── Background image ──────────────────────────── */

  function loadBgImage(src: string) {
    setBgSrc(src);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImage(img);
    img.src = src;
  }

  /* ── Load image elements ───────────────────────── */

  useEffect(() => {
    elements.forEach((el) => {
      if (el.type === "image" && !loadedImages[el.src]) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setLoadedImages((prev) => ({ ...prev, [el.src]: img }));
        img.src = el.src;
      }
    });
  }, [elements, loadedImages]);

  /* ── Transformer sync ──────────────────────────── */

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedId) {
      const node = stageRef.current.findOne("#" + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    } else {
      trRef.current.nodes([]);
    }
  }, [selectedId]);

  /* ── Stage click ───────────────────────────────── */

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      return;
    }
    const clickedId = e.target.id();
    if (tool === "select" && clickedId) {
      setSelectedId(clickedId);
    }
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === "select") return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const x = pos.x / scale;
    const y = pos.y / scale;

    if (tool === "text") addText("Texto");
    if (tool === "rect") { addRect(); }
    if (tool === "circle") { addCircle(); }
    if (tool === "image") {
      const url = prompt("URL da imagem:");
      if (url) addImage(url);
    }
  }

  /* ── Export PNG ────────────────────────────────── */

  function exportPng() {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 1 / scale });
    const a = document.createElement("a");
    a.href = uri;
    a.download = `template-${format}-${Date.now()}.png`;
    a.click();
  }

  /* ── Save JSON ─────────────────────────────────── */

  function saveTemplate() {
    const stage = stageRef.current;

    // Normaliza coordenadas para o sistema absoluto do canvas (sem zoom/pan)
    // x_real = (x_elemento - stage.x()) / stage.scaleX()
    const stageX = stage?.x() || 0;
    const stageY = stage?.y() || 0;
    const stageSx = stage?.scaleX() || 1;
    const stageSy = stage?.scaleY() || 1;

    const normalized = elements.map((el) => {
      const base = { ...el,
        x: (el.x - stageX) / stageSx,
        y: (el.y - stageY) / stageSy,
        width: el.width / stageSx,
        height: el.height / stageSy,
      };

      // Força width/height para Text nodes a partir do node real
      if (el.type === "text" && stage) {
        const node = stage.findOne(`#${el.id}`) as Konva.Text | undefined;
        if (node) {
          return {
            ...base,
            width: node.width() / stageSx,
            height: node.height() / stageSy,
          };
        }
      }
      return base;
    });

    const data = { format, bgColor, bgSrc, elements: normalized };
    console.log("[Editor] Template JSON:", JSON.stringify(data, null, 2));
    alert("Template salvo no console (integração Supabase pendente)");
  }

  /* ── Layer reorder ─────────────────────────────── */

  function moveLayer(id: string, dir: -1 | 1) {
    const idx = elements.findIndex((e) => e.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= elements.length) return;
    const arr = [...elements];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setElements(arr);
    pushHistory(arr);
  }

  /* ── Image upload handler ──────────────────────── */

  function handleImageUpload() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) addImage(reader.result as string); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function handleBgUpload() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) loadBgImage(reader.result as string); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">

      {/* ═══ TOOLBAR ════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-[var(--bdr)] pb-3 mb-3 flex-wrap">
        {/* Format */}
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="h-8 rounded-lg border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] outline-none">
          {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="w-px h-6 bg-[var(--bdr)]" />

        {/* Tools */}
        {([
          { key: "select" as Tool, label: "Selecionar", icon: "↖" },
          { key: "text" as Tool, label: "Texto", icon: "T" },
          { key: "rect" as Tool, label: "Retângulo", icon: "▭" },
          { key: "circle" as Tool, label: "Círculo", icon: "○" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTool(t.key)} title={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-[14px] transition-colors ${tool === t.key ? "bg-[var(--orange3)] text-[var(--orange)]" : "text-[var(--txt3)] hover:bg-[var(--hover-bg)]"}`}>
            {t.icon}
          </button>
        ))}
        <button onClick={handleImageUpload} title="Imagem" className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] text-[var(--txt3)] hover:bg-[var(--hover-bg)]">🖼</button>

        <div className="w-px h-6 bg-[var(--bdr)]" />

        {/* Bind field */}
        <div className="relative">
          <button onClick={() => setBindOpen(!bindOpen)} className="flex h-8 items-center gap-1 rounded-lg border border-[var(--bdr)] px-2 text-[11px] font-medium text-[var(--orange)] hover:bg-[var(--orange3)]">
            + Campo bind
          </button>
          {bindOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-[220px] rounded-xl border border-[var(--bdr)] p-2 shadow-lg" style={{ background: "var(--card-bg)" }}>
              {BIND_GROUPS.map((g) => (
                <div key={g.group} className="mb-2">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">{g.group}</div>
                  <div className="flex flex-wrap gap-1">
                    {g.fields.map((f) => (
                      <button key={f} onClick={() => { addText(`[${f}]`, true, f); setBindOpen(false); }}
                        className="rounded-md bg-[var(--orange3)] px-2 py-0.5 text-[10px] font-medium text-[var(--orange)] hover:opacity-80">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-[var(--bdr)]" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyIdx <= 0} title="Desfazer" className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] text-[var(--txt3)] hover:bg-[var(--hover-bg)] disabled:opacity-30">↩</button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} title="Refazer" className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] text-[var(--txt3)] hover:bg-[var(--hover-bg)] disabled:opacity-30">↪</button>

        <div className="flex-1" />

        {/* Export + Save */}
        <button onClick={exportPng} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--bdr)] px-3 text-[11px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]">
          📥 Exportar PNG
        </button>
        <button onClick={saveTemplate} className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}>
          💾 Salvar template
        </button>
      </div>

      {/* ═══ MAIN: Layers + Canvas + Properties ═══ */}
      <div className="flex flex-1 gap-4 overflow-hidden">

        {/* ── LAYERS (esquerda) ───────────────────── */}
        <div className="w-[180px] shrink-0 overflow-y-auto rounded-xl border border-[var(--bdr)] p-3" style={{ background: "var(--card-bg)" }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Camadas</div>

          {/* Background */}
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--bdr)] px-2 py-1.5">
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-5 w-5 cursor-pointer rounded border-0" />
            <span className="text-[10px] text-[var(--txt3)]">Fundo</span>
            <button onClick={handleBgUpload} className="ml-auto text-[9px] text-[var(--txt3)] hover:text-[var(--txt)]">img</button>
          </div>

          {/* Elements */}
          {[...elements].reverse().map((el) => (
            <div key={el.id}
              onClick={() => setSelectedId(el.id)}
              className={`mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] cursor-pointer ${selectedId === el.id ? "bg-[var(--orange3)] text-[var(--orange)]" : "text-[var(--txt2)] hover:bg-[var(--hover-bg)]"}`}>
              <span className="text-[10px]">{el.type === "text" ? (el as TextEl).isBind ? "🔗" : "T" : el.type === "image" ? "🖼" : el.type === "rect" ? "▭" : "○"}</span>
              <span className="flex-1 truncate">{el.name}</span>
              <button onClick={(e) => { e.stopPropagation(); updateEl(el.id, { visible: !el.visible }); }} className="text-[9px] opacity-50 hover:opacity-100">{el.visible ? "👁" : "—"}</button>
              <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 1); }} className="text-[9px] opacity-50 hover:opacity-100">↑</button>
              <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, -1); }} className="text-[9px] opacity-50 hover:opacity-100">↓</button>
            </div>
          ))}

          {elements.length === 0 && <div className="text-[10px] text-[var(--txt3)] text-center py-4">Canvas vazio</div>}
        </div>

        {/* ── CANVAS (centro) ────────────────────── */}
        <div className="flex-1 flex items-center justify-center overflow-auto rounded-xl" style={{ background: "var(--bg3)" }}>
          <div style={{ width: stageW, height: stageH }} className="shadow-2xl">
            <Stage
              ref={(node: Konva.Stage | null) => { stageRef.current = node; }}
              width={stageW}
              height={stageH}
              scaleX={scale}
              scaleY={scale}
              onClick={handleStageClick}
              onMouseDown={handleStageMouseDown}
            >
              <Layer>
                {/* Background */}
                <KRect x={0} y={0} width={fmt.w} height={fmt.h} fill={bgColor} />
                {bgImage && <KImage image={bgImage} x={0} y={0} width={fmt.w} height={fmt.h} />}

                {/* Elements */}
                {elements.filter((e) => e.visible).map((el) => {
                  const common = {
                    id: el.id,
                    x: el.x, y: el.y,
                    rotation: el.rotation,
                    opacity: el.opacity,
                    draggable: !el.locked && tool === "select",
                    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                      updateEl(el.id, { x: e.target.x(), y: e.target.y() });
                    },
                    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                      const node = e.target;
                      updateEl(el.id, {
                        x: node.x(), y: node.y(),
                        width: Math.max(5, node.width() * node.scaleX()),
                        height: Math.max(5, node.height() * node.scaleY()),
                        rotation: node.rotation(),
                      });
                      node.scaleX(1);
                      node.scaleY(1);
                    },
                    onClick: () => { if (tool === "select") setSelectedId(el.id); },
                  };

                  if (el.type === "text") {
                    const t = el as TextEl;
                    return <KText key={el.id} {...common} text={t.text} fontSize={t.fontSize} fontFamily={t.fontFamily} fill={t.fill} fontStyle={t.fontStyle} align={t.align} width={t.width} />;
                  }
                  if (el.type === "rect") {
                    const r = el as RectEl;
                    return <KRect key={el.id} {...common} width={r.width} height={r.height} fill={r.fill} stroke={r.stroke} strokeWidth={r.strokeWidth} cornerRadius={r.cornerRadius} />;
                  }
                  if (el.type === "circle") {
                    const c = el as CircleEl;
                    return <KCircle key={el.id} {...common} radius={c.width / 2} fill={c.fill} stroke={c.stroke} strokeWidth={c.strokeWidth} />;
                  }
                  if (el.type === "image") {
                    const img = el as ImageEl;
                    const imgObj = loadedImages[img.src];
                    if (!imgObj) return null;
                    return <KImage key={el.id} {...common} image={imgObj} width={img.width} height={img.height} />;
                  }
                  return null;
                })}

                {/* Transformer */}
                <KTransformer ref={(node: Konva.Transformer | null) => { trRef.current = node; }} />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* ── PROPERTIES (direita) ────────────────── */}
        <div className="w-[220px] shrink-0 overflow-y-auto rounded-xl border border-[var(--bdr)] p-4" style={{ background: "var(--card-bg)" }}>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Propriedades</div>

          {!selected ? (
            <div className="text-[11px] text-[var(--txt3)] text-center py-8">Selecione um elemento</div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Name */}
              <Prop label="Nome">
                <input type="text" value={selected.name} onChange={(e) => updateEl(selected.id, { name: e.target.value })} className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] outline-none" />
              </Prop>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <Prop label="X"><NumInput value={Math.round(selected.x)} onChange={(v) => updateEl(selected.id, { x: v })} /></Prop>
                <Prop label="Y"><NumInput value={Math.round(selected.y)} onChange={(v) => updateEl(selected.id, { y: v })} /></Prop>
                <Prop label="W"><NumInput value={Math.round(selected.width)} onChange={(v) => updateEl(selected.id, { width: v })} /></Prop>
                <Prop label="H"><NumInput value={Math.round(selected.height)} onChange={(v) => updateEl(selected.id, { height: v })} /></Prop>
              </div>

              <Prop label="Rotação"><NumInput value={Math.round(selected.rotation)} onChange={(v) => updateEl(selected.id, { rotation: v })} /></Prop>
              <Prop label="Opacidade"><input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => updateEl(selected.id, { opacity: parseFloat(e.target.value) })} className="w-full accent-[var(--orange)]" /></Prop>

              {/* Text properties */}
              {selected.type === "text" && (() => {
                const t = selected as TextEl;
                return (
                  <>
                    <Prop label="Texto">
                      <textarea value={t.text} onChange={(e) => updateEl(t.id, { text: e.target.value })} rows={2} className="w-full rounded border border-[var(--bdr)] bg-transparent px-2 py-1 text-[11px] text-[var(--txt)] outline-none resize-none" />
                    </Prop>
                    <Prop label="Fonte">
                      <select value={t.fontFamily} onChange={(e) => updateEl(t.id, { fontFamily: e.target.value })} className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-1 text-[10px] text-[var(--txt)] outline-none">
                        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Prop>
                    <div className="grid grid-cols-2 gap-2">
                      <Prop label="Tamanho"><NumInput value={t.fontSize} onChange={(v) => updateEl(t.id, { fontSize: v })} /></Prop>
                      <Prop label="Cor"><input type="color" value={t.fill} onChange={(e) => updateEl(t.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-[var(--bdr)]" /></Prop>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateEl(t.id, { fontStyle: t.fontStyle === "bold" ? "normal" : "bold" })} className={`flex-1 rounded py-1 text-[11px] font-bold ${t.fontStyle === "bold" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>B</button>
                      <button onClick={() => updateEl(t.id, { fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })} className={`flex-1 rounded py-1 text-[11px] italic ${t.fontStyle === "italic" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>I</button>
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} onClick={() => updateEl(t.id, { align: a })} className={`flex-1 rounded py-1 text-[11px] ${t.align === a ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>
                          {a === "left" ? "◧" : a === "center" ? "☰" : "◨"}
                        </button>
                      ))}
                    </div>
                    {t.isBind && <div className="rounded-lg bg-[var(--orange3)] px-2 py-1 text-[10px] font-medium text-[var(--orange)]">🔗 Bind: {t.bindKey}</div>}
                  </>
                );
              })()}

              {/* Rect properties */}
              {selected.type === "rect" && (() => {
                const r = selected as RectEl;
                return (
                  <>
                    <Prop label="Cor"><input type="color" value={r.fill} onChange={(e) => updateEl(r.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-[var(--bdr)]" /></Prop>
                    <Prop label="Borda cor"><input type="color" value={r.stroke || "#000000"} onChange={(e) => updateEl(r.id, { stroke: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-[var(--bdr)]" /></Prop>
                    <Prop label="Borda px"><NumInput value={r.strokeWidth} onChange={(v) => updateEl(r.id, { strokeWidth: v })} /></Prop>
                    <Prop label="Radius"><NumInput value={r.cornerRadius} onChange={(v) => updateEl(r.id, { cornerRadius: v })} /></Prop>
                  </>
                );
              })()}

              {/* Circle properties */}
              {selected.type === "circle" && (() => {
                const c = selected as CircleEl;
                return (
                  <>
                    <Prop label="Cor"><input type="color" value={c.fill} onChange={(e) => updateEl(c.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-[var(--bdr)]" /></Prop>
                    <Prop label="Borda cor"><input type="color" value={c.stroke || "#000000"} onChange={(e) => updateEl(c.id, { stroke: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-[var(--bdr)]" /></Prop>
                    <Prop label="Borda px"><NumInput value={c.strokeWidth} onChange={(v) => updateEl(c.id, { strokeWidth: v })} /></Prop>
                  </>
                );
              })()}

              {/* Image properties */}
              {selected.type === "image" && (
                <Prop label="URL">
                  <input type="text" value={(selected as ImageEl).src} readOnly className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[10px] text-[var(--txt3)] outline-none truncate" />
                </Prop>
              )}

              <div className="h-px bg-[var(--bdr)]" />
              <button onClick={() => removeEl(selected.id)} className="rounded-lg py-1.5 text-[11px] font-medium text-[var(--red)] hover:bg-[var(--red3)]">Excluir elemento</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[9px] font-medium text-[var(--txt3)]">{label}</div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] outline-none" />;
}

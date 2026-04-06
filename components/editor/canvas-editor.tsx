"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Text, Image as KImage, Circle, Transformer, Group, Line } from "react-konva";
import Konva from "konva";

/* ===== Types ===== */
export type AnimationType = "none" | "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "zoomIn" | "zoomOut" | "typewriter" | "bounce" | "rotate360";

export interface ShadowConfig {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface EditorElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: string;
  verticalAlign?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  textTransform?: string;
  // Image
  src?: string;
  // Shape
  cornerRadius?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Shadow
  shadow?: ShadowConfig;
  // Flip
  flipX?: boolean;
  flipY?: boolean;
  // Lock/Visibility
  locked?: boolean;
  visible?: boolean;
  // Animation
  animation?: AnimationType;
  animDelay?: number;
  animDuration?: number;
}

export interface EditorSchema {
  elements: EditorElement[];
  background: string;
  duration?: number;
}

interface CanvasEditorProps {
  width: number;
  height: number;
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  onExport?: (dataUrl: string) => void;
  onExportVideo?: (blob: Blob) => void;
  onUploadImage?: () => Promise<string | null>;
}

const SCALE_MIN = 0.1;
const SCALE_MAX = 3;
const SNAP_THRESHOLD = 6;
const HISTORY_LIMIT = 50;

const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: "none", label: "Nenhuma" },
  { value: "fadeIn", label: "Fade In" },
  { value: "slideUp", label: "Slide Up" },
  { value: "slideDown", label: "Slide Down" },
  { value: "slideLeft", label: "Slide Left" },
  { value: "slideRight", label: "Slide Right" },
  { value: "zoomIn", label: "Zoom In" },
  { value: "zoomOut", label: "Zoom Out" },
  { value: "typewriter", label: "Typewriter" },
  { value: "bounce", label: "Bounce" },
  { value: "rotate360", label: "Rotação 360" },
];

const FONTS: { value: string; label: string }[] = [
  { value: "Helvetica Neue, Arial, sans-serif", label: "Helvetica Neue" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Open Sans, sans-serif", label: "Open Sans" },
  { value: "Lato, sans-serif", label: "Lato" },
  { value: "Raleway, sans-serif", label: "Raleway" },
  { value: "Oswald, sans-serif", label: "Oswald" },
  { value: "Bebas Neue, sans-serif", label: "Bebas Neue" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
  { value: "Courier New, monospace", label: "Courier New" },
];

function genId() { return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

/* ===== Animation engine ===== */
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBounce(t: number) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

interface AnimState { opacity: number; offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation: number; textClip?: number; }

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none";
  const delay = el.animDelay || 0;
  const dur = el.animDuration || 0.6;
  const elapsed = time - delay;
  const baseOpacity = el.opacity ?? 1;
  const done: AnimState = { opacity: baseOpacity, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };

  if (anim === "none" || elapsed >= dur) return done;
  if (elapsed < 0) {
    const hidden: AnimState = { ...done, opacity: 0 };
    if (anim === "zoomIn") return { ...hidden, scaleX: 0, scaleY: 0 };
    if (anim === "zoomOut") return { ...hidden, scaleX: 2, scaleY: 2 };
    if (anim === "slideUp") return { ...hidden, offsetY: 100 };
    if (anim === "slideDown") return { ...hidden, offsetY: -100 };
    if (anim === "slideLeft") return { ...hidden, offsetX: 100 };
    if (anim === "slideRight") return { ...hidden, offsetX: -100 };
    if (anim === "bounce") return { ...done, opacity: 0, offsetY: -80 };
    if (anim === "rotate360") return { ...hidden, rotation: -360 };
    return hidden;
  }

  const t = Math.min(elapsed / dur, 1);
  const e = easeOutCubic(t);

  switch (anim) {
    case "fadeIn": return { ...done, opacity: baseOpacity * e };
    case "slideUp": return { ...done, opacity: baseOpacity * e, offsetY: 100 * (1 - e) };
    case "slideDown": return { ...done, opacity: baseOpacity * e, offsetY: -100 * (1 - e) };
    case "slideLeft": return { ...done, opacity: baseOpacity * e, offsetX: 100 * (1 - e) };
    case "slideRight": return { ...done, opacity: baseOpacity * e, offsetX: -100 * (1 - e) };
    case "zoomIn": return { ...done, opacity: baseOpacity * e, scaleX: e, scaleY: e };
    case "zoomOut": return { ...done, opacity: baseOpacity * e, scaleX: 2 - e, scaleY: 2 - e };
    case "typewriter": return { ...done, textClip: Math.floor((el.text || "").length * t) };
    case "bounce": return { ...done, offsetY: -80 * (1 - easeOutBounce(t)) };
    case "rotate360": return { ...done, opacity: baseOpacity * e, rotation: -360 * (1 - e) };
    default: return done;
  }
}

/* ===== Image loader ===== */
function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  return img;
}

/* ===== Snap guides ===== */
function calcSnapLines(el: EditorElement, elements: EditorElement[], canvasW: number, canvasH: number) {
  const guides: { orientation: "h" | "v"; pos: number }[] = [];
  const targets = [
    // Canvas edges and center
    { x: 0 }, { x: canvasW / 2 }, { x: canvasW },
    { y: 0 }, { y: canvasH / 2 }, { y: canvasH },
  ];
  // Other elements
  for (const other of elements) {
    if (other.id === el.id || other.locked || other.visible === false) continue;
    targets.push({ x: other.x }, { x: other.x + other.width / 2 }, { x: other.x + other.width });
    targets.push({ y: other.y }, { y: other.y + other.height / 2 }, { y: other.y + other.height });
  }

  const elEdges = { left: el.x, cx: el.x + el.width / 2, right: el.x + el.width, top: el.y, cy: el.y + el.height / 2, bottom: el.y + el.height };

  for (const t of targets) {
    if ("x" in t && t.x !== undefined) {
      for (const edge of [elEdges.left, elEdges.cx, elEdges.right]) {
        if (Math.abs(edge - t.x) < SNAP_THRESHOLD) guides.push({ orientation: "v", pos: t.x });
      }
    }
    if ("y" in t && t.y !== undefined) {
      for (const edge of [elEdges.top, elEdges.cy, elEdges.bottom]) {
        if (Math.abs(edge - t.y) < SNAP_THRESHOLD) guides.push({ orientation: "h", pos: t.y });
      }
    }
  }
  return guides;
}

/* ===== Element renderers with animation ===== */
function RenderElement({ el, isSelected, playing, animState, onSelect, onChange, stageRef }: {
  el: EditorElement; isSelected: boolean; playing: boolean; animState: AnimState;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const shapeRef = useRef<Konva.Node>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const img = useImage(el.type === "image" ? el.src : undefined);

  useEffect(() => {
    if (isSelected && !playing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, playing]);

  if (el.visible === false) return null;

  const commonProps = {
    ref: shapeRef as React.RefObject<Konva.Node>,
    x: el.x + animState.offsetX,
    y: el.y + animState.offsetY,
    rotation: (el.rotation || 0) + animState.rotation,
    opacity: animState.opacity,
    scaleX: animState.scaleX * (el.flipX ? -1 : 1),
    scaleY: animState.scaleY * (el.flipY ? -1 : 1),
    draggable: !playing && !el.locked,
    onClick: onSelect,
    onTap: onSelect,
    shadowColor: el.shadow?.color,
    shadowOffsetX: el.shadow?.offsetX,
    shadowOffsetY: el.shadow?.offsetY,
    shadowBlur: el.shadow?.blur,
    shadowEnabled: !!el.shadow,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY });
    },
    onTransformEnd: () => {
      const node = shapeRef.current!;
      const sx = node.scaleX();
      const sy = node.scaleY();
      onChange({
        x: node.x(), y: node.y(),
        width: Math.max(5, (el.type === "circle" ? el.width : node.width()) * Math.abs(sx)),
        height: Math.max(5, (el.type === "circle" ? el.height : node.height()) * Math.abs(sy)),
        rotation: node.rotation(),
      });
      node.scaleX(el.flipX ? -1 : 1);
      node.scaleY(el.flipY ? -1 : 1);
    },
  };

  const displayText = animState.textClip !== undefined ? (el.text || "").slice(0, animState.textClip) : (el.text || "");

  let shape: React.ReactNode = null;

  if (el.type === "text") {
    shape = (
      <Text
        {...commonProps}
        ref={shapeRef as React.RefObject<Konva.Text>}
        width={el.width}
        text={displayText}
        fontSize={el.fontSize || 32}
        fontFamily={el.fontFamily || FONTS[0].value}
        fontStyle={el.fontStyle || "normal"}
        fill={el.fill || "#FFFFFF"}
        align={el.align || "left"}
        verticalAlign={el.verticalAlign || "top"}
        letterSpacing={el.letterSpacing || 0}
        lineHeight={el.lineHeight || 1.2}
        textDecoration={el.textDecoration || ""}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth || 0}
        onDblClick={() => {
          if (playing || el.locked) return;
          const newText = prompt("Editar texto:", el.text || "");
          if (newText !== null) onChange({ text: newText });
        }}
      />
    );
  } else if (el.type === "rect") {
    shape = (
      <Rect
        {...commonProps}
        ref={shapeRef as React.RefObject<Konva.Rect>}
        width={el.width} height={el.height}
        fill={el.fill} cornerRadius={el.cornerRadius || 0}
        stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
      />
    );
  } else if (el.type === "circle") {
    const radius = Math.min(el.width, el.height) / 2;
    shape = (
      <Circle
        {...commonProps}
        ref={shapeRef as React.RefObject<Konva.Circle>}
        radius={radius}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
      />
    );
  } else if (el.type === "image" && img) {
    shape = (
      <KImage
        {...commonProps}
        ref={shapeRef as React.RefObject<Konva.Image>}
        image={img}
        width={el.width} height={el.height}
        cornerRadius={el.cornerRadius || 0}
      />
    );
  }

  if (!shape) return null;

  const trAnchors = el.type === "text"
    ? ["middle-left", "middle-right"]
    : undefined;

  return (
    <>
      {shape}
      {isSelected && !playing && !el.locked && (
        <Transformer ref={trRef} enabledAnchors={trAnchors} boundBoxFunc={(_, nw) => nw} />
      )}
    </>
  );
}

/* ===== Main Component ===== */
export function CanvasEditor({ width, height, schema, onChange, onExport, onExportVideo, onUploadImage }: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Undo/Redo
  const [history, setHistory] = useState<EditorSchema[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const skipHistoryRef = useRef(false);

  // Clipboard
  const clipboardRef = useRef<EditorElement | null>(null);

  // Animation
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const [exporting, setExporting] = useState(false);

  // Snap guides
  const [snapLines, setSnapLines] = useState<{ orientation: "h" | "v"; pos: number }[]>([]);

  // Layers panel
  const [showLayers, setShowLayers] = useState(false);

  const totalDuration = schema.duration || 5;

  // Fit canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth - 40;
    const ch = containerRef.current.clientHeight - 40;
    setStageScale(Math.min(cw / width, ch / height, 1));
  }, [width, height]);

  // History tracking
  const pushHistory = useCallback((s: EditorSchema) => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    setHistory(h => {
      const newH = [...h.slice(0, historyIdx + 1), s].slice(-HISTORY_LIMIT);
      setHistoryIdx(newH.length - 1);
      return newH;
    });
  }, [historyIdx]);

  // Wrap onChange to track history
  const changeSchema = useCallback((s: EditorSchema) => {
    onChange(s);
    pushHistory(s);
  }, [onChange, pushHistory]);

  // Init history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([schema]);
      setHistoryIdx(0);
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    skipHistoryRef.current = true;
    setHistoryIdx(newIdx);
    onChange(history[newIdx]);
  }, [historyIdx, history, onChange]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    skipHistoryRef.current = true;
    setHistoryIdx(newIdx);
    onChange(history[newIdx]);
  }, [historyIdx, history, onChange]);

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = performance.now() - currentTime * 1000;
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= totalDuration) { setCurrentTime(totalDuration); setPlaying(false); return; }
      setCurrentTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, totalDuration]);

  const play = useCallback(() => { setSelectedId(null); setCurrentTime(0); setPlaying(true); }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => { setPlaying(false); setCurrentTime(0); }, []);

  // Element operations
  const updateElement = useCallback((id: string, attrs: Partial<EditorElement>) => {
    const elements = schema.elements.map(el => el.id === id ? { ...el, ...attrs } : el);
    changeSchema({ ...schema, elements });
  }, [schema, changeSchema]);

  const addElement = useCallback((el: EditorElement) => {
    changeSchema({ ...schema, elements: [...schema.elements, el] });
    setSelectedId(el.id);
  }, [schema, changeSchema]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    changeSchema({ ...schema, elements: schema.elements.filter(el => el.id !== selectedId) });
    setSelectedId(null);
  }, [selectedId, schema, changeSchema]);

  const duplicateSelected = useCallback(() => {
    const el = schema.elements.find(e => e.id === selectedId);
    if (!el) return;
    const dup = { ...el, id: genId(), x: el.x + 20, y: el.y + 20, name: (el.name || el.type) + " cópia" };
    addElement(dup);
  }, [selectedId, schema, addElement]);

  const copySelected = useCallback(() => {
    const el = schema.elements.find(e => e.id === selectedId);
    if (el) clipboardRef.current = { ...el };
  }, [selectedId, schema]);

  const paste = useCallback(() => {
    if (!clipboardRef.current) return;
    const el = { ...clipboardRef.current, id: genId(), x: clipboardRef.current.x + 20, y: clipboardRef.current.y + 20 };
    addElement(el);
  }, [addElement]);

  const moveLayer = useCallback((dir: "up" | "down") => {
    if (!selectedId) return;
    const els = [...schema.elements];
    const idx = els.findIndex(el => el.id === selectedId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? Math.min(idx + 1, els.length - 1) : Math.max(idx - 1, 0);
    if (newIdx === idx) return;
    const [item] = els.splice(idx, 1);
    els.splice(newIdx, 0, item);
    changeSchema({ ...schema, elements: els });
  }, [selectedId, schema, changeSchema]);

  // Align selected to canvas
  const alignSelected = useCallback((align: string) => {
    const el = schema.elements.find(e => e.id === selectedId);
    if (!el) return;
    const updates: Partial<EditorElement> = {};
    switch (align) {
      case "left": updates.x = 0; break;
      case "center-h": updates.x = (width - el.width) / 2; break;
      case "right": updates.x = width - el.width; break;
      case "top": updates.y = 0; break;
      case "center-v": updates.y = (height - el.height) / 2; break;
      case "bottom": updates.y = height - el.height; break;
    }
    updateElement(el.id, updates);
  }, [selectedId, schema, width, height, updateElement]);

  // Export PNG
  const handleExport = useCallback(() => {
    if (!stageRef.current || !onExport) return;
    const old = stageRef.current.scaleX();
    stageRef.current.scale({ x: 1, y: 1 });
    stageRef.current.position({ x: 0, y: 0 });
    const uri = stageRef.current.toDataURL({ x: 0, y: 0, width, height, pixelRatio: 3 });
    stageRef.current.scale({ x: old, y: old });
    onExport(uri);
  }, [width, height, onExport]);

  // Export video
  const exportVideo = useCallback(async () => {
    if (!stageRef.current) return;
    setExporting(true);
    setSelectedId(null);
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    stage.scale({ x: 1, y: 1 });
    stage.size({ width, height });

    const canvas = stage.toCanvas({ x: 0, y: 0, width, height, pixelRatio: 1 }) as HTMLCanvasElement;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
      videoBitsPerSecond: 8_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); });
    recorder.start();

    const fps = 30;
    const totalFrames = Math.ceil(totalDuration * fps);
    const ctx = canvas.getContext("2d")!;
    for (let frame = 0; frame <= totalFrames; frame++) {
      const time = frame / fps;
      for (const el of schema.elements) {
        const node = stage.findOne(`#${el.id}`);
        if (!node) continue;
        const a = getAnimState(el, time);
        node.opacity(a.opacity);
        node.x(el.x + a.offsetX);
        node.y(el.y + a.offsetY);
        node.scaleX(a.scaleX);
        node.scaleY(a.scaleY);
        node.rotation((el.rotation || 0) + a.rotation);
        if (el.type === "text" && a.textClip !== undefined) (node as Konva.Text).text((el.text || "").slice(0, a.textClip));
      }
      stage.batchDraw();
      const sc = stage.toCanvas({ x: 0, y: 0, width, height, pixelRatio: 1 });
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(sc, 0, 0);
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
    recorder.stop();
    const blob = await done;
    stage.scale({ x: oldScale, y: oldScale });
    stage.size({ width: width * oldScale, height: height * oldScale });
    setExporting(false);

    if (onExportVideo) onExportVideo(blob);
    else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `reels-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
    }
  }, [width, height, schema, totalDuration, onExportVideo]);

  // Zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setStageScale(s => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s * (e.evt.deltaY < 0 ? 1.08 : 0.92))));
  }, []);

  const selected = schema.elements.find(el => el.id === selectedId);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); e.preventDefault(); }
      // Space = play/pause
      if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
      // Ctrl+Z / Ctrl+Y
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      // Ctrl+C / Ctrl+V / Ctrl+D
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); copySelected(); }
      if (e.ctrlKey && e.key === "v") { e.preventDefault(); paste(); }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      // Ctrl+A
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); /* select all - future */ }
      // Arrows
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const el = schema.elements.find(el => el.id === selectedId);
        if (!el || el.locked) return;
        const updates: Partial<EditorElement> = {};
        if (e.key === "ArrowUp") updates.y = el.y - step;
        if (e.key === "ArrowDown") updates.y = el.y + step;
        if (e.key === "ArrowLeft") updates.x = el.x - step;
        if (e.key === "ArrowRight") updates.x = el.x + step;
        updateElement(el.id, updates);
      }
      // Ctrl+[ / Ctrl+]
      if (e.ctrlKey && e.key === "[") { e.preventDefault(); moveLayer("down"); }
      if (e.ctrlKey && e.key === "]") { e.preventDefault(); moveLayer("up"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, playing, pause, play, undo, redo, copySelected, paste, duplicateSelected, selectedId, schema, updateElement, moveLayer]);

  // Image upload handler
  const handleImageUpload = useCallback(async () => {
    if (onUploadImage) {
      const url = await onUploadImage();
      if (url) addElement({
        id: genId(), type: "image", x: width / 4, y: height / 4,
        width: width / 2, height: height / 3, src: url, opacity: 1,
        animation: "fadeIn", animDelay: 0, animDuration: 0.6,
      });
    } else {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        // Upload via Cloudinary API
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/cloudinary", { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) {
            addElement({
              id: genId(), type: "image", x: width / 4, y: height / 4,
              width: width / 2, height: height / 3, src: data.url, opacity: 1,
              animation: "fadeIn", animDelay: 0, animDuration: 0.6,
            });
          }
        } catch { alert("Erro no upload"); }
      };
      input.click();
    }
  }, [onUploadImage, addElement, width, height]);

  // URL image
  const handleImageUrl = useCallback(() => {
    const src = prompt("URL da imagem:");
    if (!src) return;
    addElement({
      id: genId(), type: "image", x: width / 4, y: height / 4,
      width: width / 2, height: height / 3, src, opacity: 1,
      animation: "fadeIn", animDelay: 0, animDuration: 0.6,
    });
  }, [addElement, width, height]);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Toolbar left */}
      <div style={{
        width: 52, padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)", overflowY: "auto",
      }}>
        <ToolBtn label="T" title="Texto" onClick={() => addElement({
          id: genId(), type: "text", name: "Texto", x: width / 4, y: height / 3,
          width: width / 2, height: 60, text: "Texto", fontSize: 32,
          fontFamily: FONTS[0].value, fontStyle: "bold", fill: "#FFFFFF", align: "center",
          animation: "fadeIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="□" title="Retângulo" onClick={() => addElement({
          id: genId(), type: "rect", name: "Retângulo", x: width / 4, y: height / 3,
          width: width / 3, height: height / 6, fill: "#D4A843", cornerRadius: 12, opacity: 1,
          animation: "fadeIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="○" title="Círculo" onClick={() => addElement({
          id: genId(), type: "circle", name: "Círculo", x: width / 2, y: height / 2,
          width: 120, height: 120, fill: "#3B82F6", opacity: 1,
          animation: "zoomIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="📁" title="Upload Imagem" onClick={handleImageUpload} />
        <ToolBtn label="🔗" title="Imagem URL" onClick={handleImageUrl} />

        <Divider />
        <ToolBtn label="↩" title="Desfazer (Ctrl+Z)" onClick={undo} />
        <ToolBtn label="↪" title="Refazer (Ctrl+Y)" onClick={redo} />
        <ToolBtn label="📋" title="Copiar (Ctrl+C)" onClick={copySelected} />
        <ToolBtn label="📄" title="Colar (Ctrl+V)" onClick={paste} />
        <ToolBtn label="⊕" title="Duplicar (Ctrl+D)" onClick={duplicateSelected} />

        <Divider />
        <ToolBtn label={playing ? "⏸" : "▶"} title="Play/Pause (Space)" onClick={playing ? pause : play} gold />
        <ToolBtn label="⏹" title="Reset" onClick={reset} />

        <div style={{ flex: 1 }} />
        <ToolBtn label="≡" title="Camadas" onClick={() => setShowLayers(!showLayers)} active={showLayers} />
        <ToolBtn label="↑" title="Camada +" onClick={() => moveLayer("up")} />
        <ToolBtn label="↓" title="Camada -" onClick={() => moveLayer("down")} />
        <ToolBtn label="🗑" title="Deletar (Del)" onClick={deleteSelected} danger />
        {onExport && <ToolBtn label="📸" title="Exportar PNG 3x" onClick={handleExport} gold />}
        <ToolBtn label="🎬" title="Exportar Vídeo" onClick={exportVideo} gold />
      </div>

      {/* Layers panel */}
      {showLayers && (
        <div style={{
          width: 200, padding: "8px 0", overflowY: "auto",
          background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)",
        }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase", padding: "4px 12px", margin: 0 }}>Camadas</h3>
          {[...schema.elements].reverse().map((el, i) => (
            <div key={el.id} onClick={() => setSelectedId(el.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", cursor: "pointer",
              background: el.id === selectedId ? "rgba(212,168,67,0.1)" : "transparent",
              borderLeft: el.id === selectedId ? "2px solid var(--gold)" : "2px solid transparent",
              opacity: el.visible === false ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 12 }}>{el.type === "text" ? "T" : el.type === "rect" ? "□" : el.type === "circle" ? "○" : "🖼"}</span>
              <span style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {el.name || el.type}
              </span>
              <button onClick={e => { e.stopPropagation(); updateElement(el.id, { visible: el.visible === false ? true : false }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text-muted)", padding: 0 }}>
                {el.visible === false ? "👁‍🗨" : "👁"}
              </button>
              <button onClick={e => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: el.locked ? "var(--danger)" : "var(--text-muted)", padding: 0 }}>
                {el.locked ? "🔒" : "🔓"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Canvas + Timeline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div ref={containerRef} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg)", overflow: "hidden", position: "relative",
        }} onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.3, pointerEvents: "none", backgroundImage: "repeating-conic-gradient(var(--border-light) 0% 25%, transparent 0% 50%)", backgroundSize: "16px 16px" }} />
          {exporting && <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", color: "var(--gold)", fontSize: 16, fontWeight: 700 }}>Exportando vídeo...</div>}

          <Stage ref={stageRef} width={width * stageScale} height={height * stageScale} scaleX={stageScale} scaleY={stageScale}
            onWheel={handleWheel}
            onMouseDown={e => { if (e.target === e.target.getStage()) setSelectedId(null); }}
            style={{ borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}
          >
            <Layer>
              <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />
              {schema.elements.map(el => (
                <RenderElement key={el.id} el={el}
                  isSelected={el.id === selectedId} playing={playing}
                  animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={attrs => updateElement(el.id, attrs)}
                  stageRef={stageRef}
                />
              ))}
              {/* Snap guides */}
              {snapLines.map((g, i) => (
                <Line key={i}
                  points={g.orientation === "v" ? [g.pos, 0, g.pos, height] : [0, g.pos, width, g.pos]}
                  stroke="#D4A843" strokeWidth={1} dash={[4, 4]} opacity={0.6} listening={false}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Timeline */}
        <div style={{ height: 44, padding: "0 16px", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", minWidth: 50 }}>{currentTime.toFixed(1)}s / {totalDuration}s</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border-light)", cursor: "pointer", position: "relative" }}
            onClick={e => { if (playing) return; const r = e.currentTarget.getBoundingClientRect(); setCurrentTime(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * totalDuration); }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3, width: `${(currentTime / totalDuration) * 100}%`, background: "linear-gradient(90deg, var(--gold), var(--orange))", transition: playing ? "none" : "width 0.1s" }} />
            {schema.elements.map(el => {
              if (!el.animation || el.animation === "none") return null;
              return <div key={el.id} title={`${el.name || el.type}: ${el.animation}`} style={{ position: "absolute", left: `${((el.animDelay || 0) / totalDuration) * 100}%`, width: `${((el.animDuration || 0.6) / totalDuration) * 100}%`, top: -4, height: 4, borderRadius: 2, background: el.id === selectedId ? "var(--gold)" : "rgba(212,168,67,0.4)", cursor: "pointer" }} onClick={e => { e.stopPropagation(); setSelectedId(el.id); }} />;
            })}
          </div>
          <select value={totalDuration} onChange={e => changeSchema({ ...schema, duration: +e.target.value })} style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text)", fontSize: 11, cursor: "pointer" }}>
            {[3, 5, 8, 10, 15, 20, 30].map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>
      </div>

      {/* Properties panel */}
      {selected && !playing && (
        <div style={{ width: 250, padding: 12, overflowY: "auto", background: "var(--bg-sidebar)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase" }}>Propriedades</h3>

          {/* Name */}
          <PropField label="Nome" type="text" value={selected.name || ""} onChange={v => updateElement(selected.id, { name: v })} />

          {/* Position/Size */}
          <PropRow>
            <PropField label="X" type="number" value={Math.round(selected.x)} onChange={v => updateElement(selected.id, { x: +v })} />
            <PropField label="Y" type="number" value={Math.round(selected.y)} onChange={v => updateElement(selected.id, { y: +v })} />
          </PropRow>
          <PropRow>
            <PropField label="W" type="number" value={Math.round(selected.width)} onChange={v => updateElement(selected.id, { width: +v })} />
            <PropField label="H" type="number" value={Math.round(selected.height)} onChange={v => updateElement(selected.id, { height: +v })} />
          </PropRow>
          <PropRow>
            <PropField label="Rotação" type="number" value={Math.round(selected.rotation || 0)} onChange={v => updateElement(selected.id, { rotation: +v })} />
            <PropField label="Opacidade" type="number" value={selected.opacity ?? 1} onChange={v => updateElement(selected.id, { opacity: Math.min(1, Math.max(0, +v)) })} step="0.1" />
          </PropRow>

          {/* Align */}
          <div>
            <label style={propLabelStyle}>Alinhar</label>
            <div style={{ display: "flex", gap: 3 }}>
              {[
                { key: "left", icon: "⇤" }, { key: "center-h", icon: "⇔" }, { key: "right", icon: "⇥" },
                { key: "top", icon: "⤒" }, { key: "center-v", icon: "⇕" }, { key: "bottom", icon: "⤓" },
              ].map(a => (
                <button key={a.key} onClick={() => alignSelected(a.key)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 5, border: "1px solid var(--border)",
                  background: "var(--bg-input)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                }}>{a.icon}</button>
              ))}
            </div>
          </div>

          {/* Flip */}
          <div>
            <label style={propLabelStyle}>Espelhar</label>
            <div style={{ display: "flex", gap: 4 }}>
              <ToggleBtn label="Flip H" active={!!selected.flipX} onClick={() => updateElement(selected.id, { flipX: !selected.flipX })} />
              <ToggleBtn label="Flip V" active={!!selected.flipY} onClick={() => updateElement(selected.id, { flipY: !selected.flipY })} />
            </div>
          </div>

          {/* Color */}
          {selected.type !== "image" && (
            <PropField label="Cor" type="color" value={selected.fill || "#FFFFFF"} onChange={v => updateElement(selected.id, { fill: v })} />
          )}

          {/* Text props */}
          {selected.type === "text" && (
            <>
              <div>
                <label style={propLabelStyle}>Texto</label>
                <textarea rows={3} value={selected.text || ""} onChange={e => updateElement(selected.id, { text: e.target.value })}
                  style={{ ...propInputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <PropField label="Tamanho" type="number" value={selected.fontSize || 32} onChange={v => updateElement(selected.id, { fontSize: +v })} />
              <div>
                <label style={propLabelStyle}>Fonte</label>
                <select value={selected.fontFamily || FONTS[0].value} onChange={e => updateElement(selected.id, { fontFamily: e.target.value })} style={{ ...propInputStyle, cursor: "pointer" }}>
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={propLabelStyle}>Estilo</label>
                <div style={{ display: "flex", gap: 3 }}>
                  {["normal", "bold", "italic"].map(s => (
                    <ToggleBtn key={s} label={s === "normal" ? "N" : s === "bold" ? "B" : "I"} active={selected.fontStyle === s} onClick={() => updateElement(selected.id, { fontStyle: s })} />
                  ))}
                  {["none", "underline", "line-through"].map(d => (
                    <ToggleBtn key={d} label={d === "none" ? "—" : d === "underline" ? "U̲" : "S̶"} active={selected.textDecoration === d} onClick={() => updateElement(selected.id, { textDecoration: d })} />
                  ))}
                </div>
              </div>
              <div>
                <label style={propLabelStyle}>Alinhamento H</label>
                <div style={{ display: "flex", gap: 3 }}>
                  {["left", "center", "right", "justify"].map(a => (
                    <ToggleBtn key={a} label={a === "left" ? "←" : a === "center" ? "↔" : a === "right" ? "→" : "⇔"} active={selected.align === a} onClick={() => updateElement(selected.id, { align: a })} />
                  ))}
                </div>
              </div>
              <PropRow>
                <PropField label="Espaçamento" type="number" value={selected.letterSpacing || 0} onChange={v => updateElement(selected.id, { letterSpacing: +v })} />
                <PropField label="Altura Linha" type="number" value={selected.lineHeight || 1.2} onChange={v => updateElement(selected.id, { lineHeight: +v })} step="0.1" />
              </PropRow>
              <PropRow>
                <PropField label="Stroke Cor" type="color" value={selected.stroke || "#000000"} onChange={v => updateElement(selected.id, { stroke: v })} />
                <PropField label="Stroke W" type="number" value={selected.strokeWidth || 0} onChange={v => updateElement(selected.id, { strokeWidth: +v })} />
              </PropRow>
            </>
          )}

          {/* Rect/Circle props */}
          {selected.type === "rect" && (
            <PropField label="Borda Raio" type="number" value={selected.cornerRadius || 0} onChange={v => updateElement(selected.id, { cornerRadius: +v })} />
          )}
          {selected.type === "image" && (
            <>
              <PropField label="URL" type="text" value={selected.src || ""} onChange={v => updateElement(selected.id, { src: v })} />
              <PropField label="Borda Raio" type="number" value={selected.cornerRadius || 0} onChange={v => updateElement(selected.id, { cornerRadius: +v })} />
            </>
          )}
          {(selected.type === "rect" || selected.type === "circle") && (
            <PropRow>
              <PropField label="Borda Cor" type="color" value={selected.stroke || "#000000"} onChange={v => updateElement(selected.id, { stroke: v })} />
              <PropField label="Borda W" type="number" value={selected.strokeWidth || 0} onChange={v => updateElement(selected.id, { strokeWidth: +v })} />
            </PropRow>
          )}

          {/* Shadow */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...propLabelStyle, marginBottom: 0 }}>Sombra</label>
              <ToggleBtn label={selected.shadow ? "ON" : "OFF"} active={!!selected.shadow} onClick={() => {
                if (selected.shadow) updateElement(selected.id, { shadow: undefined });
                else updateElement(selected.id, { shadow: { color: "rgba(0,0,0,0.5)", offsetX: 4, offsetY: 4, blur: 10 } });
              }} />
            </div>
            {selected.shadow && (
              <>
                <PropField label="Cor Sombra" type="color" value={selected.shadow.color} onChange={v => updateElement(selected.id, { shadow: { ...selected.shadow!, color: v } })} />
                <PropRow>
                  <PropField label="Off X" type="number" value={selected.shadow.offsetX} onChange={v => updateElement(selected.id, { shadow: { ...selected.shadow!, offsetX: +v } })} />
                  <PropField label="Off Y" type="number" value={selected.shadow.offsetY} onChange={v => updateElement(selected.id, { shadow: { ...selected.shadow!, offsetY: +v } })} />
                </PropRow>
                <PropField label="Blur" type="number" value={selected.shadow.blur} onChange={v => updateElement(selected.id, { shadow: { ...selected.shadow!, blur: +v } })} />
              </>
            )}
          </div>

          {/* Animation */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, margin: "0 0 8px", color: "var(--orange)", letterSpacing: 1, textTransform: "uppercase" }}>Animação</h3>
            <div>
              <label style={propLabelStyle}>Tipo</label>
              <select value={selected.animation || "none"} onChange={e => updateElement(selected.id, { animation: e.target.value as AnimationType })} style={{ ...propInputStyle, cursor: "pointer" }}>
                {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {selected.animation && selected.animation !== "none" && (
              <PropRow>
                <PropField label="Delay" type="number" value={selected.animDelay || 0} onChange={v => updateElement(selected.id, { animDelay: Math.max(0, +v) })} step="0.1" />
                <PropField label="Duração" type="number" value={selected.animDuration || 0.6} onChange={v => updateElement(selected.id, { animDuration: Math.max(0.1, +v) })} step="0.1" />
              </PropRow>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== UI Helpers ===== */
function ToolBtn({ label, title, onClick, danger, gold, active }: {
  label: string; title: string; onClick: () => void; danger?: boolean; gold?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 36, height: 36, borderRadius: 8, border: "1px solid",
      borderColor: active ? "rgba(212,168,67,0.35)" : "var(--border)",
      background: active ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
      color: danger ? "var(--danger)" : gold ? "var(--gold)" : active ? "var(--gold)" : "var(--text-secondary)",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "5px 0", borderRadius: 5, border: "1px solid",
      borderColor: active ? "rgba(212,168,67,0.35)" : "var(--border)",
      background: active ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
      color: active ? "var(--gold)" : "var(--text-muted)",
      fontSize: 10, fontWeight: 600, cursor: "pointer",
    }}>{label}</button>
  );
}

function Divider() {
  return <div style={{ width: 28, height: 1, background: "var(--border)", margin: "2px 0" }} />;
}

const propLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: "var(--text-muted)",
  letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4,
};

const propInputStyle: React.CSSProperties = {
  width: "100%", padding: "5px 8px", borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--bg-input)",
  color: "var(--text)", fontSize: 11, outline: "none", boxSizing: "border-box",
};

function PropRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 6 }}>{children}</div>;
}

function PropField({ label, type, value, onChange, step }: {
  label: string; type: string; value: string | number; onChange: (v: string) => void; step?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={propLabelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} step={step} style={propInputStyle} />
    </div>
  );
}

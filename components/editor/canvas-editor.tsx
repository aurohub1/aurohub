"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Text, Image as KImage, Circle, Transformer } from "react-konva";
import Konva from "konva";

/* ===== Types ===== */
export type AnimationType = "none" | "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "zoomIn" | "zoomOut" | "typewriter" | "bounce" | "rotate360";

export interface EditorElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: string;
  src?: string;
  cornerRadius?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Animation
  animation?: AnimationType;
  animDelay?: number;    // seconds
  animDuration?: number; // seconds
}

export interface EditorSchema {
  elements: EditorElement[];
  background: string;
  duration?: number; // total video duration in seconds
}

interface CanvasEditorProps {
  width: number;
  height: number;
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  onExport?: (dataUrl: string) => void;
  onExportVideo?: (blob: Blob) => void;
}

const SCALE_MIN = 0.2;
const SCALE_MAX = 3;

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

function genId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ===== Animation engine ===== */
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBounce(t: number) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

interface AnimState {
  opacity: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  textClip?: number; // for typewriter: chars to show
}

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none";
  const delay = el.animDelay || 0;
  const dur = el.animDuration || 0.6;
  const elapsed = time - delay;
  const baseOpacity = el.opacity ?? 1;

  if (anim === "none" || elapsed >= dur) {
    return { opacity: baseOpacity, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  }

  if (elapsed < 0) {
    // Before animation starts — hide for most animations
    if (anim === "fadeIn" || anim === "typewriter") return { opacity: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "zoomIn") return { opacity: 0, offsetX: 0, offsetY: 0, scaleX: 0, scaleY: 0, rotation: 0 };
    if (anim === "zoomOut") return { opacity: 0, offsetX: 0, offsetY: 0, scaleX: 2, scaleY: 2, rotation: 0 };
    if (anim === "slideUp") return { opacity: 0, offsetX: 0, offsetY: 100, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "slideDown") return { opacity: 0, offsetX: 0, offsetY: -100, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "slideLeft") return { opacity: 0, offsetX: 100, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "slideRight") return { opacity: 0, offsetX: -100, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "bounce") return { opacity: 0, offsetX: 0, offsetY: -80, scaleX: 1, scaleY: 1, rotation: 0 };
    if (anim === "rotate360") return { opacity: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: -360 };
    return { opacity: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  }

  const t = Math.min(elapsed / dur, 1);
  const e = easeOutCubic(t);

  switch (anim) {
    case "fadeIn":
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    case "slideUp":
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: 100 * (1 - e), scaleX: 1, scaleY: 1, rotation: 0 };
    case "slideDown":
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: -100 * (1 - e), scaleX: 1, scaleY: 1, rotation: 0 };
    case "slideLeft":
      return { opacity: baseOpacity * e, offsetX: 100 * (1 - e), offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    case "slideRight":
      return { opacity: baseOpacity * e, offsetX: -100 * (1 - e), offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    case "zoomIn":
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: 0, scaleX: e, scaleY: e, rotation: 0 };
    case "zoomOut": {
      const s = 2 - e;
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: 0, scaleX: s, scaleY: s, rotation: 0 };
    }
    case "typewriter": {
      const totalChars = (el.text || "").length;
      const chars = Math.floor(totalChars * t);
      return { opacity: baseOpacity, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, textClip: chars };
    }
    case "bounce": {
      const eb = easeOutBounce(t);
      return { opacity: baseOpacity, offsetX: 0, offsetY: -80 * (1 - eb), scaleX: 1, scaleY: 1, rotation: 0 };
    }
    case "rotate360":
      return { opacity: baseOpacity * e, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: -360 * (1 - e) };
    default:
      return { opacity: baseOpacity, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  }
}

/* ===== Image loader hook ===== */
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

/* ===== Animated element renderers ===== */
function AnimatedImageElement({ el, isSelected, onSelect, onChange, animState, playing }: {
  el: EditorElement; isSelected: boolean; playing: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
  animState: AnimState;
}) {
  const img = useImage(el.src);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && !playing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, playing]);

  if (!img) return null;
  return (
    <>
      <KImage
        ref={shapeRef}
        image={img}
        x={el.x + animState.offsetX} y={el.y + animState.offsetY}
        width={el.width} height={el.height}
        rotation={(el.rotation || 0) + animState.rotation}
        opacity={animState.opacity}
        scaleX={animState.scaleX} scaleY={animState.scaleY}
        draggable={!playing}
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          onChange({
            x: node.x(), y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          });
          node.scaleX(1); node.scaleY(1);
        }}
      />
      {isSelected && !playing && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

function AnimatedTextElement({ el, isSelected, onSelect, onChange, animState, playing }: {
  el: EditorElement; isSelected: boolean; playing: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
  animState: AnimState;
}) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && !playing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, playing]);

  const displayText = animState.textClip !== undefined
    ? (el.text || "").slice(0, animState.textClip)
    : (el.text || "");

  return (
    <>
      <Text
        ref={shapeRef}
        x={el.x + animState.offsetX} y={el.y + animState.offsetY}
        width={el.width}
        text={displayText}
        fontSize={el.fontSize || 32}
        fontFamily={el.fontFamily || "Helvetica Neue, Arial, sans-serif"}
        fontStyle={el.fontStyle || "normal"}
        fill={el.fill || "#FFFFFF"}
        align={el.align || "left"}
        rotation={(el.rotation || 0) + animState.rotation}
        opacity={animState.opacity}
        scaleX={animState.scaleX} scaleY={animState.scaleY}
        draggable={!playing}
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          onChange({ x: node.x(), y: node.y(), width: Math.max(20, node.width() * node.scaleX()), rotation: node.rotation() });
          node.scaleX(1); node.scaleY(1);
        }}
        onDblClick={() => {
          if (playing) return;
          const newText = prompt("Editar texto:", el.text || "");
          if (newText !== null) onChange({ text: newText });
        }}
      />
      {isSelected && !playing && <Transformer ref={trRef} enabledAnchors={["middle-left", "middle-right"]} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

function AnimatedRectElement({ el, isSelected, onSelect, onChange, animState, playing }: {
  el: EditorElement; isSelected: boolean; playing: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
  animState: AnimState;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && !playing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, playing]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={el.x + animState.offsetX} y={el.y + animState.offsetY}
        width={el.width} height={el.height}
        fill={el.fill} cornerRadius={el.cornerRadius || 0}
        stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
        rotation={(el.rotation || 0) + animState.rotation}
        opacity={animState.opacity}
        scaleX={animState.scaleX} scaleY={animState.scaleY}
        draggable={!playing}
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          onChange({
            x: node.x(), y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          });
          node.scaleX(1); node.scaleY(1);
        }}
      />
      {isSelected && !playing && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

function AnimatedCircleElement({ el, isSelected, onSelect, onChange, animState, playing }: {
  el: EditorElement; isSelected: boolean; playing: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
  animState: AnimState;
}) {
  const shapeRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && !playing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, playing]);

  const radius = Math.min(el.width, el.height) / 2;
  return (
    <>
      <Circle
        ref={shapeRef}
        x={el.x + animState.offsetX} y={el.y + animState.offsetY}
        radius={radius}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
        rotation={(el.rotation || 0) + animState.rotation}
        opacity={animState.opacity}
        scaleX={animState.scaleX} scaleY={animState.scaleY}
        draggable={!playing}
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          const scl = Math.max(node.scaleX(), node.scaleY());
          onChange({ x: node.x(), y: node.y(), width: Math.max(10, radius * 2 * scl), height: Math.max(10, radius * 2 * scl) });
          node.scaleX(1); node.scaleY(1);
        }}
      />
      {isSelected && !playing && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

/* ===== Main Component ===== */
export function CanvasEditor({ width, height, schema, onChange, onExport, onExportVideo }: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const [exporting, setExporting] = useState(false);

  const totalDuration = schema.duration || 5;

  // Fit canvas in container
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth - 40;
    const ch = containerRef.current.clientHeight - 40;
    const scale = Math.min(cw / width, ch / height, 1);
    setStageScale(scale);
  }, [width, height]);

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = performance.now() - currentTime * 1000;

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      if (elapsed >= totalDuration) {
        setCurrentTime(totalDuration);
        setPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, totalDuration]);

  const play = useCallback(() => {
    setSelectedId(null);
    setCurrentTime(0);
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => { setPlaying(false); setCurrentTime(0); }, []);

  // Export video via MediaRecorder
  const exportVideo = useCallback(async () => {
    if (!stageRef.current) return;
    setExporting(true);
    setSelectedId(null);

    const stage = stageRef.current;
    const oldScale = stage.scaleX();

    // Set to full resolution
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

    const done = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start();

    // Render each frame
    const fps = 30;
    const totalFrames = Math.ceil(totalDuration * fps);
    const ctx = canvas.getContext("2d")!;

    for (let frame = 0; frame <= totalFrames; frame++) {
      const time = frame / fps;

      // Update elements with animation state and redraw
      for (const el of schema.elements) {
        const node = stage.findOne(`#${el.id}`);
        if (!node) continue;
        const anim = getAnimState(el, time);
        node.opacity(anim.opacity);
        node.x(el.x + anim.offsetX);
        node.y(el.y + anim.offsetY);
        node.scaleX(anim.scaleX);
        node.scaleY(anim.scaleY);
        node.rotation((el.rotation || 0) + anim.rotation);
        if (el.type === "text" && anim.textClip !== undefined) {
          (node as Konva.Text).text((el.text || "").slice(0, anim.textClip));
        }
      }

      stage.batchDraw();

      // Draw stage to recording canvas
      const stageCanvas = stage.toCanvas({ x: 0, y: 0, width, height, pixelRatio: 1 });
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(stageCanvas, 0, 0);

      // Wait for next frame timing
      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    recorder.stop();
    const blob = await done;

    // Restore scale
    stage.scale({ x: oldScale, y: oldScale });
    stage.size({ width: width * oldScale, height: height * oldScale });

    setExporting(false);

    if (onExportVideo) {
      onExportVideo(blob);
    } else {
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reels-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [width, height, schema, totalDuration, onExportVideo]);

  const updateElement = useCallback((id: string, attrs: Partial<EditorElement>) => {
    const elements = schema.elements.map(el => el.id === id ? { ...el, ...attrs } : el);
    onChange({ ...schema, elements });
  }, [schema, onChange]);

  const addElement = useCallback((el: EditorElement) => {
    onChange({ ...schema, elements: [...schema.elements, el] });
    setSelectedId(el.id);
  }, [schema, onChange]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    onChange({ ...schema, elements: schema.elements.filter(el => el.id !== selectedId) });
    setSelectedId(null);
  }, [selectedId, schema, onChange]);

  const moveLayer = useCallback((dir: "up" | "down") => {
    if (!selectedId) return;
    const els = [...schema.elements];
    const idx = els.findIndex(el => el.id === selectedId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? Math.min(idx + 1, els.length - 1) : Math.max(idx - 1, 0);
    if (newIdx === idx) return;
    const [item] = els.splice(idx, 1);
    els.splice(newIdx, 0, item);
    onChange({ ...schema, elements: els });
  }, [selectedId, schema, onChange]);

  const handleExport = useCallback(() => {
    if (!stageRef.current || !onExport) return;
    const oldScale = stageRef.current.scaleX();
    stageRef.current.scale({ x: 1, y: 1 });
    stageRef.current.position({ x: 0, y: 0 });
    const uri = stageRef.current.toDataURL({ x: 0, y: 0, width, height, pixelRatio: 1 });
    stageRef.current.scale({ x: oldScale, y: oldScale });
    onExport(uri);
  }, [width, height, onExport]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, stageScale * (e.evt.deltaY < 0 ? 1.08 : 0.92)));
    setStageScale(newScale);
  }, [stageScale]);

  const selected = schema.elements.find(el => el.id === selectedId);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "SELECT") return;
        deleteSelected();
      }
      if (e.key === " " && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")) {
        e.preventDefault();
        playing ? pause() : play();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, playing, pause, play]);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Toolbar left */}
      <div style={{
        width: 52, padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)",
      }}>
        <ToolBtn label="T" title="Texto" onClick={() => addElement({
          id: genId(), type: "text", x: width / 4, y: height / 3,
          width: width / 2, height: 60, text: "Texto", fontSize: 32,
          fontFamily: "Helvetica Neue, Arial, sans-serif", fontStyle: "bold",
          fill: "#FFFFFF", align: "center", animation: "fadeIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="□" title="Retângulo" onClick={() => addElement({
          id: genId(), type: "rect", x: width / 4, y: height / 3,
          width: width / 3, height: height / 6, fill: "#D4A843", cornerRadius: 12, opacity: 1,
          animation: "fadeIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="○" title="Círculo" onClick={() => addElement({
          id: genId(), type: "circle", x: width / 2, y: height / 2,
          width: 120, height: 120, fill: "#3B82F6", opacity: 1,
          animation: "zoomIn", animDelay: 0, animDuration: 0.6,
        })} />
        <ToolBtn label="🖼" title="Imagem (URL)" onClick={() => {
          const src = prompt("URL da imagem:");
          if (!src) return;
          addElement({
            id: genId(), type: "image", x: width / 4, y: height / 4,
            width: width / 2, height: height / 3, src, opacity: 1,
            animation: "fadeIn", animDelay: 0, animDuration: 0.6,
          });
        }} />

        <div style={{ width: 30, height: 1, background: "var(--border)", margin: "4px 0" }} />

        {/* Playback */}
        <ToolBtn label={playing ? "⏸" : "▶"} title="Play/Pause (Space)" onClick={playing ? pause : play} gold />
        <ToolBtn label="⏹" title="Reset" onClick={reset} />

        <div style={{ flex: 1 }} />
        <ToolBtn label="↑" title="Camada acima" onClick={() => moveLayer("up")} />
        <ToolBtn label="↓" title="Camada abaixo" onClick={() => moveLayer("down")} />
        <ToolBtn label="🗑" title="Deletar (Del)" onClick={deleteSelected} danger />
        {onExport && <ToolBtn label="📸" title="Exportar PNG" onClick={handleExport} gold />}
        <ToolBtn label="🎬" title={exporting ? "Exportando..." : "Exportar Vídeo"} onClick={exportVideo} gold />
      </div>

      {/* Canvas + Timeline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Canvas area */}
        <div ref={containerRef} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg)", overflow: "hidden", position: "relative",
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div style={{
            position: "absolute", inset: 0, opacity: 0.3, pointerEvents: "none",
            backgroundImage: "repeating-conic-gradient(var(--border-light) 0% 25%, transparent 0% 50%)",
            backgroundSize: "16px 16px",
          }} />

          {exporting && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.7)", color: "var(--gold)", fontSize: 16, fontWeight: 700,
            }}>Exportando vídeo...</div>
          )}

          <Stage
            ref={stageRef}
            width={width * stageScale}
            height={height * stageScale}
            scaleX={stageScale}
            scaleY={stageScale}
            onWheel={handleWheel}
            onMouseDown={e => { if (e.target === e.target.getStage()) setSelectedId(null); }}
            style={{ borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}
          >
            <Layer>
              <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />

              {schema.elements.map(el => {
                const isSelected = el.id === selectedId;
                const animState = playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999);

                const props = { el, isSelected, playing, onSelect: () => setSelectedId(el.id), onChange: (attrs: Partial<EditorElement>) => updateElement(el.id, attrs), animState };

                if (el.type === "text") return <AnimatedTextElement key={el.id} {...props} />;
                if (el.type === "image") return <AnimatedImageElement key={el.id} {...props} />;
                if (el.type === "rect") return <AnimatedRectElement key={el.id} {...props} />;
                if (el.type === "circle") return <AnimatedCircleElement key={el.id} {...props} />;
                return null;
              })}
            </Layer>
          </Stage>
        </div>

        {/* Timeline bar */}
        <div style={{
          height: 48, padding: "0 16px", display: "flex", alignItems: "center", gap: 12,
          background: "var(--bg-card)", borderTop: "1px solid var(--border)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", minWidth: 50 }}>
            {currentTime.toFixed(1)}s / {totalDuration}s
          </span>

          {/* Progress bar */}
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border-light)", cursor: "pointer", position: "relative" }}
            onClick={e => {
              if (playing) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setCurrentTime(pct * totalDuration);
            }}
          >
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3,
              width: `${(currentTime / totalDuration) * 100}%`,
              background: "linear-gradient(90deg, var(--gold), var(--orange))",
              transition: playing ? "none" : "width 0.1s",
            }} />
            {/* Element markers */}
            {schema.elements.map(el => {
              if (!el.animation || el.animation === "none") return null;
              const left = ((el.animDelay || 0) / totalDuration) * 100;
              const w = ((el.animDuration || 0.6) / totalDuration) * 100;
              return (
                <div key={el.id} title={`${el.type}: ${el.animation}`} style={{
                  position: "absolute", left: `${left}%`, width: `${w}%`, top: -4, height: 4, borderRadius: 2,
                  background: el.id === selectedId ? "var(--gold)" : "rgba(212,168,67,0.4)",
                  cursor: "pointer",
                }} onClick={e => { e.stopPropagation(); setSelectedId(el.id); }} />
              );
            })}
          </div>

          {/* Duration control */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Duração:</span>
            <select value={totalDuration} onChange={e => onChange({ ...schema, duration: +e.target.value })}
              style={{
                padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: "var(--text)", fontSize: 11, cursor: "pointer",
              }}>
              {[3, 5, 8, 10, 15, 20, 30].map(d => <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Properties panel */}
      {selected && !playing && (
        <div style={{
          width: 240, padding: 16, overflowY: "auto",
          background: "var(--bg-sidebar)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase" }}>
            Propriedades
          </h3>

          <PropRow>
            <PropField label="X" type="number" value={Math.round(selected.x)} onChange={v => updateElement(selected.id, { x: +v })} />
            <PropField label="Y" type="number" value={Math.round(selected.y)} onChange={v => updateElement(selected.id, { y: +v })} />
          </PropRow>
          <PropRow>
            <PropField label="W" type="number" value={Math.round(selected.width)} onChange={v => updateElement(selected.id, { width: +v })} />
            <PropField label="H" type="number" value={Math.round(selected.height)} onChange={v => updateElement(selected.id, { height: +v })} />
          </PropRow>

          <PropField label="Rotação" type="number" value={Math.round(selected.rotation || 0)} onChange={v => updateElement(selected.id, { rotation: +v })} />
          <PropField label="Opacidade" type="number" value={selected.opacity ?? 1} onChange={v => updateElement(selected.id, { opacity: Math.min(1, Math.max(0, +v)) })} step="0.1" />

          {selected.type !== "image" && (
            <PropField label="Cor" type="color" value={selected.fill || "#FFFFFF"} onChange={v => updateElement(selected.id, { fill: v })} />
          )}

          {/* Text props */}
          {selected.type === "text" && (
            <>
              <div>
                <label style={propLabelStyle}>Texto</label>
                <textarea rows={3} value={selected.text || ""} onChange={e => updateElement(selected.id, { text: e.target.value })}
                  style={{ ...propInputStyle, resize: "none", fontFamily: "inherit" }} />
              </div>
              <PropField label="Tamanho" type="number" value={selected.fontSize || 32} onChange={v => updateElement(selected.id, { fontSize: +v })} />
              <div>
                <label style={propLabelStyle}>Fonte</label>
                <select value={selected.fontFamily || "Helvetica Neue, Arial, sans-serif"}
                  onChange={e => updateElement(selected.id, { fontFamily: e.target.value })}
                  style={{ ...propInputStyle, cursor: "pointer" }}>
                  <option value="Helvetica Neue, Arial, sans-serif">Helvetica Neue</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="monospace">Monospace</option>
                  <option value="Impact, sans-serif">Impact</option>
                </select>
              </div>
              <div>
                <label style={propLabelStyle}>Estilo</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["normal", "bold", "italic"].map(s => (
                    <button key={s} onClick={() => updateElement(selected.id, { fontStyle: s })} style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid",
                      borderColor: selected.fontStyle === s ? "rgba(212,168,67,0.35)" : "var(--border)",
                      background: selected.fontStyle === s ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                      color: selected.fontStyle === s ? "var(--gold)" : "var(--text-muted)",
                      fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                    }}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={propLabelStyle}>Alinhamento</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["left", "center", "right"].map(a => (
                    <button key={a} onClick={() => updateElement(selected.id, { align: a })} style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid",
                      borderColor: selected.align === a ? "rgba(212,168,67,0.35)" : "var(--border)",
                      background: selected.align === a ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                      color: selected.align === a ? "var(--gold)" : "var(--text-muted)",
                      fontSize: 10, fontWeight: 600, cursor: "pointer",
                    }}>{a === "left" ? "←" : a === "center" ? "↔" : "→"}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {selected.type === "rect" && (
            <PropField label="Borda Raio" type="number" value={selected.cornerRadius || 0} onChange={v => updateElement(selected.id, { cornerRadius: +v })} />
          )}
          {selected.type === "image" && (
            <PropField label="URL Imagem" type="text" value={selected.src || ""} onChange={v => updateElement(selected.id, { src: v })} />
          )}
          {(selected.type === "rect" || selected.type === "circle") && (
            <>
              <PropField label="Borda Cor" type="color" value={selected.stroke || "#000000"} onChange={v => updateElement(selected.id, { stroke: v })} />
              <PropField label="Borda Espessura" type="number" value={selected.strokeWidth || 0} onChange={v => updateElement(selected.id, { strokeWidth: +v })} />
            </>
          )}

          {/* Animation section */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 12px", color: "var(--orange)", letterSpacing: 1, textTransform: "uppercase" }}>
              Animação
            </h3>
            <div>
              <label style={propLabelStyle}>Tipo</label>
              <select value={selected.animation || "none"} onChange={e => updateElement(selected.id, { animation: e.target.value as AnimationType })}
                style={{ ...propInputStyle, cursor: "pointer" }}>
                {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {selected.animation && selected.animation !== "none" && (
              <>
                <PropField label="Delay (s)" type="number" value={selected.animDelay || 0} onChange={v => updateElement(selected.id, { animDelay: Math.max(0, +v) })} step="0.1" />
                <PropField label="Duração (s)" type="number" value={selected.animDuration || 0.6} onChange={v => updateElement(selected.id, { animDuration: Math.max(0.1, +v) })} step="0.1" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== UI Helpers ===== */
function ToolBtn({ label, title, onClick, danger, gold }: {
  label: string; title: string; onClick: () => void; danger?: boolean; gold?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
      background: "var(--bg-input)", cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: 16,
      color: danger ? "var(--danger)" : gold ? "var(--gold)" : "var(--text-secondary)",
      transition: "all 0.2s",
    }}>{label}</button>
  );
}

const propLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: "var(--text-muted)",
  letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4,
};

const propInputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-input)",
  color: "var(--text)", fontSize: 12, outline: "none",
};

function PropRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8 }}>{children}</div>;
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

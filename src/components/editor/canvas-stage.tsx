import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Image as KImage, Transformer, Line, Group } from "react-konva";
import type Konva from "konva";
import QRCode from "qrcode";
import { EditorElement, EditorSchema, SnapLine, calcSnapLines } from "./types";

interface Props {
  width: number; height: number;
  schema: EditorSchema;
  selectedIds: string[];
  stageScale: number;
  playing: boolean; currentTime: number;
  snapEnabled?: boolean;
  onSelect: (id: string | null) => void;
  onShiftSelect: (id: string) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onStageRef: (r: Konva.Stage | null) => void;
  onScaleChange: (s: number) => void;
}

function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!src) { setImg(null); return; } const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

function useQrImage(url: string, fg: string, bg: string, size: number): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    let cancel = false;
    const px = Math.max(64, Math.min(1024, Math.round(size)));
    QRCode.toDataURL(url, { margin: 1, width: px, color: { dark: fg || "#000000", light: bg || "#FFFFFF" } })
      .then(dataUrl => {
        if (cancel) return;
        const i = new window.Image();
        i.onload = () => { if (!cancel) setImg(i); };
        i.src = dataUrl;
      })
      .catch(() => { if (!cancel) setImg(null); });
    return () => { cancel = true; };
  }, [url, fg, bg, size]);
  return img;
}

/* ── Fit-font helper ─────────────────────────────── */
function fitFontSize(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontFamily: string,
  fontStyle: string,
  startSize: number,
  _lineHeight: number
): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let size = startSize;
  while (size > 8) {
    ctx.font = `${fontStyle} ${size}px ${fontFamily}`;
    const words = text.split(" ");
    let lines = 1;
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines++;
        line = word;
      } else {
        line = test;
      }
    }
    if (lines <= maxLines) return size;
    size -= 1;
  }
  return 8;
}

/* ── Animation ───────────────────────────────────── */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBounce(t: number) { if (t < 1/2.75) return 7.5625*t*t; if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75; if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375; return 7.5625*(t-=2.625/2.75)*t+0.984375; }

interface AnimState { opacity: number; offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation: number; textClip?: number; }

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none"; const delay = el.animDelay || 0; const dur = el.animDuration || 0.6;
  const elapsed = time - delay; const base = el.opacity ?? 1;
  const done: AnimState = { opacity: base, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  if (anim === "none" || elapsed >= dur) return done;
  if (elapsed < 0) return { ...done, opacity: 0 };
  const t = Math.min(elapsed / dur, 1); const e = easeOut(t);
  switch (anim) {
    case "fadeIn": return { ...done, opacity: base * e };
    case "slideUp": return { ...done, opacity: base * e, offsetY: 100 * (1 - e) };
    case "slideDown": return { ...done, opacity: base * e, offsetY: -100 * (1 - e) };
    case "slideLeft": return { ...done, opacity: base * e, offsetX: 100 * (1 - e) };
    case "slideRight": return { ...done, opacity: base * e, offsetX: -100 * (1 - e) };
    case "zoomIn": return { ...done, opacity: base * e, scaleX: e, scaleY: e };
    case "zoomOut": return { ...done, opacity: base * e, scaleX: 2 - e, scaleY: 2 - e };
    case "typewriter": return { ...done, textClip: Math.floor((el.text || "").length * t) };
    case "bounce": return { ...done, offsetY: -80 * (1 - easeOutBounce(t)) };
    case "rotate360": return { ...done, opacity: base * e, rotation: -360 * (1 - e) };
    case "pulse": return { ...done, scaleX: 1 + 0.1 * Math.sin(t * Math.PI * 4), scaleY: 1 + 0.1 * Math.sin(t * Math.PI * 4) };
    case "shake": return { ...done, offsetX: 10 * Math.sin(t * Math.PI * 8) * (1 - t) };
    case "float": return { ...done, offsetY: -20 * Math.sin(t * Math.PI * 2) };
    default: return done;
  }
}

/* ── Per-element renderer (NO Transformer inside) ── */
function RenderElement({ el, allElements, playing, animState, onClick, onChange, onRegisterRef, onDragMoveSnap, onDragEndClear }: {
  el: EditorElement;
  allElements: EditorElement[];
  playing: boolean;
  animState: AnimState;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (u: Partial<EditorElement>) => void;
  onRegisterRef: (id: string, node: Konva.Node | null) => void;
  onDragMoveSnap: (id: string, rawX: number, rawY: number) => { x: number; y: number };
  onDragEndClear: () => void;
}) {
  const shapeRef = useRef<Konva.Node>(null);
  const img = useImage(el.type === "image" ? el.src : undefined);
  const qrImg = useQrImage(
    el.type === "qrcode" ? (el.qrUrl || "") : "",
    el.qrFg || "#000000",
    el.qrBg || "#FFFFFF",
    el.width
  );

  useEffect(() => { onRegisterRef(el.id, shapeRef.current); return () => onRegisterRef(el.id, null); }, [el.id, shapeRef.current]);

  if (el.visible === false) return null;

  const common = {
    ref: shapeRef as React.RefObject<Konva.Node>,
    x: el.x + animState.offsetX, y: el.y + animState.offsetY,
    rotation: (el.rotation || 0) + animState.rotation,
    opacity: animState.opacity,
    scaleX: animState.scaleX * (el.flipX ? -1 : 1),
    scaleY: animState.scaleY * (el.flipY ? -1 : 1),
    draggable: !playing && !el.locked,
    // onClick/onTap handled per-element below
    shadowColor: el.shadow?.color, shadowOffsetX: el.shadow?.offsetX, shadowOffsetY: el.shadow?.offsetY, shadowBlur: el.shadow?.blur, shadowEnabled: !!el.shadow,
    // globalCompositeOperation applied via node attrs
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const tgt = e.target;
      const rawX = tgt.x() - animState.offsetX;
      const rawY = tgt.y() - animState.offsetY;
      const snapped = onDragMoveSnap(el.id, rawX, rawY);
      if (snapped.x !== rawX) tgt.x(snapped.x + animState.offsetX);
      if (snapped.y !== rawY) tgt.y(snapped.y + animState.offsetY);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEndClear();
      onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY });
    },
    onTransformEnd: () => {
      const n = shapeRef.current!;
      const sx = Math.abs(n.scaleX()); const sy = Math.abs(n.scaleY());
      if (el.type === "text") {
        onChange({ x: n.x(), y: n.y(), width: Math.max(20, n.width() * sx), rotation: n.rotation() });
      } else {
        onChange({ x: n.x(), y: n.y(), width: Math.max(5, (el.type === "circle" ? el.width : n.width()) * sx), height: Math.max(5, (el.type === "circle" ? el.height : n.height()) * sy), rotation: n.rotation() });
      }
      n.scaleX(el.flipX ? -1 : 1); n.scaleY(el.flipY ? -1 : 1);
    },
  };

  const displayText = animState.textClip !== undefined ? (el.text || "").slice(0, animState.textClip) : (el.text || "");

  if (el.type === "text") {
    const baseFont = el.fontSize || 32;
    const fSize = el.linhas && typeof window !== "undefined"
      ? fitFontSize(
          displayText || el.text || "",
          el.width,
          el.linhas,
          el.fontFamily || "DM Sans",
          el.fontStyle || "normal",
          baseFont,
          el.lineHeight || 1.2
        )
      : baseFont;
    return <Text ref={shapeRef as React.RefObject<Konva.Text>}
      x={common.x} y={common.y} rotation={common.rotation} opacity={common.opacity} scaleX={common.scaleX} scaleY={common.scaleY} draggable={common.draggable}
      shadowColor={common.shadowColor} shadowOffsetX={common.shadowOffsetX} shadowOffsetY={common.shadowOffsetY} shadowBlur={common.shadowBlur} shadowEnabled={common.shadowEnabled}
      onDragMove={common.onDragMove} onDragEnd={common.onDragEnd} onTransformEnd={common.onTransformEnd}
      onClick={(e) => onClick(e)} onDblClick={() => { if (!playing && !el.locked) { const t = prompt("Editar texto:", el.text || ""); if (t !== null) onChange({ text: t }); } }}
      width={el.width}
      height={el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : undefined}
      wrap="word"
      ellipsis={!!el.linhas}
      text={displayText} fontSize={fSize} fontFamily={el.fontFamily || "DM Sans"} fontStyle={el.fontStyle || "normal"} fill={el.fill || "#FFF"} align={el.align || "left"} letterSpacing={el.letterSpacing || 0} lineHeight={el.lineHeight || 1.2} textDecoration={el.textDecoration || ""} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "rect") {
    const linkedText = el.autoHeightRef
      ? allElements.find(e => e.id === el.autoHeightRef && e.type === "text")
      : null;
    const rectHeight = linkedText?.linhas
      ? Math.ceil((linkedText.fontSize || 32) * (linkedText.lineHeight || 1.2) * linkedText.linhas)
      : el.height;
    return <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={rectHeight} fill={el.fill} cornerRadius={el.cornerRadius || 0} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "circle") {
    return <Circle {...common} ref={shapeRef as React.RefObject<Konva.Circle>} onClick={(e) => onClick(e)} radius={Math.min(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "image") {
    if (!img) {
      return <>
        <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={el.height} fill="#e8e8e8" stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} cornerRadius={el.cornerRadius || 0} />
        <Text x={el.x + el.width / 2 - 40} y={el.y + el.height / 2 - 8} text={el.bindParam ? `📸 ${el.bindParam}` : "Placeholder"} fontSize={14} fill="#888" listening={false} />
      </>;
    }
    // Crop: explícito (do CropModal) tem precedência; senão auto-calc via imageFit
    let crop = (el.cropW && el.cropH) ? { x: el.cropX || 0, y: el.cropY || 0, width: el.cropW, height: el.cropH } : undefined;
    if (!crop && img.naturalWidth > 0 && img.naturalHeight > 0 && el.imageFit && el.imageFit !== "fill") {
      const targetAspect = el.width / el.height;
      const srcAspect = img.naturalWidth / img.naturalHeight;
      if (el.imageFit === "cover") {
        if (srcAspect > targetAspect) {
          // Fonte mais larga — corta nas laterais
          const cw = img.naturalHeight * targetAspect;
          crop = { x: (img.naturalWidth - cw) / 2, y: 0, width: cw, height: img.naturalHeight };
        } else {
          // Fonte mais alta — corta topo/base
          const ch = img.naturalWidth / targetAspect;
          crop = { x: 0, y: (img.naturalHeight - ch) / 2, width: img.naturalWidth, height: ch };
        }
      } else if (el.imageFit === "contain") {
        // Contain: expande a source region para que a imagem inteira caiba (letterbox).
        // Não há "cropsmall" padrão no Konva pro contain, mas podemos simular aumentando o crop além da source — Konva renderiza fundo transparente nas bordas.
        if (srcAspect > targetAspect) {
          // Fonte mais larga — adiciona padding vertical
          const ch = img.naturalWidth / targetAspect;
          crop = { x: 0, y: (img.naturalHeight - ch) / 2, width: img.naturalWidth, height: ch };
        } else {
          // Fonte mais alta — adiciona padding horizontal
          const cw = img.naturalHeight * targetAspect;
          crop = { x: (img.naturalWidth - cw) / 2, y: 0, width: cw, height: img.naturalHeight };
        }
      }
    }
    const clipShape = el.clipShape || "none";
    if (clipShape !== "none") {
      const radius = el.clipRadius ?? Math.min(el.width, el.height) * 0.25;
      const clipFunc = clipShape === "circle"
        ? (rawCtx: unknown) => {
            const ctx = rawCtx as CanvasRenderingContext2D;
            ctx.beginPath();
            ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
            ctx.closePath();
          }
        : (rawCtx: unknown) => {
            const ctx = rawCtx as CanvasRenderingContext2D;
            const r = Math.min(radius, el.width / 2, el.height / 2);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(el.width - r, 0);
            ctx.quadraticCurveTo(el.width, 0, el.width, r);
            ctx.lineTo(el.width, el.height - r);
            ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height);
            ctx.lineTo(r, el.height);
            ctx.quadraticCurveTo(0, el.height, 0, el.height - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
          };
      return (
        <Group {...common} ref={shapeRef as React.RefObject<Konva.Group>} onClick={(e) => onClick(e)} width={el.width} height={el.height} clipFunc={clipFunc as unknown as (ctx: Konva.Context) => void}>
          <KImage image={img} x={0} y={0} width={el.width} height={el.height} crop={crop} />
        </Group>
      );
    }
    return <KImage {...common} ref={shapeRef as React.RefObject<Konva.Image>} onClick={(e) => onClick(e)} image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius || 0} crop={crop} />;
  }
  if (el.type === "qrcode") {
    if (!qrImg) {
      return <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={el.height} fill={el.qrBg || "#FFFFFF"} stroke="#aaa" strokeWidth={1} dash={[4, 3]} cornerRadius={4} />;
    }
    return <KImage {...common} ref={shapeRef as React.RefObject<Konva.Image>} onClick={(e) => onClick(e)} image={qrImg} width={el.width} height={el.height} />;
  }
  return null;
}

/* ── Main canvas component ───────────────────────── */
export default function CanvasStage(p: Props) {
  const { width, height, schema, selectedIds, stageScale, playing, currentTime, snapEnabled = true } = p;
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const [guides, setGuides] = useState<SnapLine[]>([]);

  const handleDragMoveSnap = useCallback((id: string, rawX: number, rawY: number) => {
    if (!snapEnabled) return { x: rawX, y: rawY };
    const el = schema.elements.find(e => e.id === id);
    if (!el) return { x: rawX, y: rawY };
    const r = calcSnapLines({ id, x: rawX, y: rawY, width: el.width, height: el.height }, schema.elements, width, height);
    setGuides(r.lines);
    return { x: r.x, y: r.y };
  }, [schema.elements, width, height, snapEnabled]);

  const handleDragEndClear = useCallback(() => setGuides([]), []);

  useEffect(() => { p.onStageRef(stageRef.current); }, [stageRef.current]);

  // Sync Transformer with selectedIds
  useEffect(() => {
    if (!trRef.current || playing) { trRef.current?.nodes([]); return; }
    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const node = nodeRefs.current.get(id);
      if (node) nodes.push(node);
    }
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, playing, schema.elements]);

  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    p.onScaleChange(Math.min(3, Math.max(0.1, stageScale * (e.evt.deltaY < 0 ? 1.08 : 0.92))));
  }, [stageScale, p.onScaleChange]);

  const handleElementClick = useCallback((elId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      p.onShiftSelect(elId);
    } else {
      p.onSelect(elId);
    }
  }, [p.onSelect, p.onShiftSelect]);

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
      background: "var(--ed-canvas-bg, #12121a)",
      backgroundImage: "radial-gradient(circle, var(--ed-bdr) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    }} onClick={e => { if (e.target === e.currentTarget) p.onSelect(null); }}>
      <Stage ref={stageRef} width={width * stageScale} height={height * stageScale} scaleX={stageScale} scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={e => { if (e.target === e.target.getStage()) p.onSelect(null); }}
        style={{ borderRadius: 4, boxShadow: "0 10px 48px rgba(0,0,0,0.5)" }}>
        <Layer>
          <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />
          {schema.elements.map(el => (
            <RenderElement key={el.id} el={el} allElements={schema.elements} playing={playing}
              animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
              onClick={(e) => handleElementClick(el.id, e)}
              onChange={attrs => p.onUpdate(el.id, attrs)}
              onRegisterRef={registerRef}
              onDragMoveSnap={handleDragMoveSnap}
              onDragEndClear={handleDragEndClear} />
          ))}
          {snapEnabled && guides.map((g, i) => (
            <Line key={`g${i}`}
              points={g.orientation === "V"
                ? [g.position, 0, g.position, height]
                : [0, g.position, width, g.position]}
              stroke={g.kind === "edge" ? "#4444FF" : "#FF4444"}
              strokeWidth={1 / stageScale}
              dash={[4 / stageScale, 4 / stageScale]}
              opacity={0.8}
              listening={false} />
          ))}
          <Transformer ref={trRef} borderStroke="#FF7A1A" anchorStroke="#FF7A1A" anchorFill="#0c0c12" anchorCornerRadius={3} anchorSize={7} borderStrokeWidth={1.5} boundBoxFunc={(_, nw) => nw} />
        </Layer>
      </Stage>
    </div>
  );
}

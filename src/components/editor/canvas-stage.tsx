import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Image as KImage, Transformer, Line } from "react-konva";
import type Konva from "konva";
import { EditorElement, EditorSchema, ShadowConfig } from "./types";

interface Props {
  width: number; height: number;
  schema: EditorSchema;
  selectedId: string | null;
  stageScale: number;
  playing: boolean; currentTime: number;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onStageRef: (r: Konva.Stage | null) => void;
  onScaleChange: (s: number) => void;
}

function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!src) { setImg(null); return; } const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

/* ── Animation engine ────────────────────────────── */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBounce(t: number) { if (t < 1/2.75) return 7.5625*t*t; if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75; if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375; return 7.5625*(t-=2.625/2.75)*t+0.984375; }

interface AnimState { opacity: number; offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation: number; textClip?: number; }

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none";
  const delay = el.animDelay || 0;
  const dur = el.animDuration || 0.6;
  const elapsed = time - delay;
  const base = el.opacity ?? 1;
  const done: AnimState = { opacity: base, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  if (anim === "none" || elapsed >= dur) return done;
  if (elapsed < 0) return { ...done, opacity: 0 };
  const t = Math.min(elapsed / dur, 1);
  const e = easeOut(t);
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

/* ── Per-element renderer ────────────────────────── */
function RenderElement({ el, isSelected, playing, animState, onSelect, onChange, stageRef }: {
  el: EditorElement; isSelected: boolean; playing: boolean; animState: AnimState;
  onSelect: () => void; onChange: (u: Partial<EditorElement>) => void; stageRef: React.RefObject<Konva.Stage | null>;
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

  const common = {
    ref: shapeRef as React.RefObject<Konva.Node>,
    x: el.x + animState.offsetX, y: el.y + animState.offsetY,
    rotation: (el.rotation || 0) + animState.rotation,
    opacity: animState.opacity,
    scaleX: animState.scaleX * (el.flipX ? -1 : 1),
    scaleY: animState.scaleY * (el.flipY ? -1 : 1),
    draggable: !playing && !el.locked,
    onClick: onSelect, onTap: onSelect,
    shadowColor: el.shadow?.color, shadowOffsetX: el.shadow?.offsetX, shadowOffsetY: el.shadow?.offsetY, shadowBlur: el.shadow?.blur, shadowEnabled: !!el.shadow,
    globalCompositeOperation: el.blendMode || "source-over",
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x() - animState.offsetX, y: e.target.y() - animState.offsetY }),
    onTransformEnd: () => {
      const n = shapeRef.current!;
      const sx = Math.abs(n.scaleX()); const sy = Math.abs(n.scaleY());
      if (el.type === "text") {
        // Text: só absorve width (lateral), height é automático
        onChange({ x: n.x(), y: n.y(), width: Math.max(20, n.width() * sx), rotation: n.rotation() });
      } else {
        onChange({ x: n.x(), y: n.y(), width: Math.max(5, (el.type === "circle" ? el.width : n.width()) * sx), height: Math.max(5, (el.type === "circle" ? el.height : n.height()) * sy), rotation: n.rotation() });
      }
      n.scaleX(el.flipX ? -1 : 1); n.scaleY(el.flipY ? -1 : 1);
    },
  };

  const displayText = animState.textClip !== undefined ? (el.text || "").slice(0, animState.textClip) : (el.text || "");
  let shape: React.ReactNode = null;

  if (el.type === "text") {
    shape = <Text {...common} ref={shapeRef as React.RefObject<Konva.Text>} width={el.width} text={displayText} fontSize={el.fontSize || 32} fontFamily={el.fontFamily || "DM Sans"} fontStyle={el.fontStyle || "normal"} fill={el.fill || "#FFF"} align={el.align || "left"} letterSpacing={el.letterSpacing || 0} lineHeight={el.lineHeight || 1.2} textDecoration={el.textDecoration || ""} stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
      onDblClick={() => { if (!playing && !el.locked) { const t = prompt("Editar texto:", el.text || ""); if (t !== null) onChange({ text: t }); } }} />;
  } else if (el.type === "rect") {
    shape = <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} width={el.width} height={el.height} fill={el.fill} cornerRadius={el.cornerRadius || 0} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  } else if (el.type === "circle") {
    shape = <Circle {...common} ref={shapeRef as React.RefObject<Konva.Circle>} radius={Math.min(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  } else if (el.type === "image") {
    if (!img) {
      // Placeholder
      shape = <>
        <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} width={el.width} height={el.height} fill="#e8e8e8" stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} cornerRadius={el.cornerRadius || 0} />
        <Text x={el.x + el.width / 2 - 40} y={el.y + el.height / 2 - 8} text={el.bindParam ? `📸 ${el.bindParam}` : "Placeholder"} fontSize={14} fill="#888" listening={false} />
      </>;
    } else {
      shape = <KImage {...common} ref={shapeRef as React.RefObject<Konva.Image>} image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius || 0} />;
    }
  }

  if (!shape) return null;
  const trAnchors = el.type === "text" ? ["middle-left", "middle-right"] : undefined;

  return <>{shape}{isSelected && !playing && !el.locked && <Transformer ref={trRef} enabledAnchors={trAnchors} boundBoxFunc={(_, nw) => nw} borderStroke="#FF7A1A" anchorStroke="#FF7A1A" anchorFill="#0c0c12" anchorCornerRadius={3} anchorSize={7} borderStrokeWidth={1.5} />}</>;
}

/* ── Main canvas component ───────────────────────── */
export default function CanvasStage(p: Props) {
  const { width, height, schema, selectedId, stageScale, playing, currentTime } = p;
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { p.onStageRef(stageRef.current); }, [stageRef.current]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    p.onScaleChange(Math.min(3, Math.max(0.1, stageScale * (e.evt.deltaY < 0 ? 1.08 : 0.92))));
  }, [stageScale, p.onScaleChange]);

  return (
    <div ref={containerRef} style={{
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
            <RenderElement key={el.id} el={el} isSelected={el.id === selectedId} playing={playing}
              animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
              onSelect={() => p.onSelect(el.id)}
              onChange={attrs => p.onUpdate(el.id, attrs)}
              stageRef={stageRef} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

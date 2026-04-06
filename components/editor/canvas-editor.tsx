"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Text, Image as KImage, Circle, Transformer } from "react-konva";
import Konva from "konva";

/* ===== Types ===== */
export interface EditorElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
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
  // Image
  src?: string;
  // Shape
  cornerRadius?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface EditorSchema {
  elements: EditorElement[];
  background: string;
}

interface CanvasEditorProps {
  width: number;
  height: number;
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  onExport?: (dataUrl: string) => void;
}

const SCALE_MIN = 0.2;
const SCALE_MAX = 3;

function genId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

/* ===== Element renderers ===== */
function ImageElement({ el, isSelected, onSelect, onChange }: {
  el: EditorElement; isSelected: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
}) {
  const img = useImage(el.src);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!img) return null;
  return (
    <>
      <KImage
        ref={shapeRef}
        image={img}
        x={el.x} y={el.y}
        width={el.width} height={el.height}
        rotation={el.rotation || 0}
        opacity={el.opacity ?? 1}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
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
      {isSelected && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

/* ===== Main Component ===== */
export function CanvasEditor({ width, height, schema, onChange, onExport }: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fit canvas in container
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth - 40;
    const ch = containerRef.current.clientHeight - 40;
    const scale = Math.min(cw / width, ch / height, 1);
    setStageScale(scale);
  }, [width, height]);

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

  // Wheel zoom
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
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);

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
          fill: "#FFFFFF", align: "center",
        })} />
        <ToolBtn label="□" title="Retângulo" onClick={() => addElement({
          id: genId(), type: "rect", x: width / 4, y: height / 3,
          width: width / 3, height: height / 6, fill: "#D4A843", cornerRadius: 12, opacity: 1,
        })} />
        <ToolBtn label="○" title="Círculo" onClick={() => addElement({
          id: genId(), type: "circle", x: width / 2, y: height / 2,
          width: 120, height: 120, fill: "#3B82F6", opacity: 1,
        })} />
        <ToolBtn label="🖼" title="Imagem (URL)" onClick={() => {
          const src = prompt("URL da imagem:");
          if (!src) return;
          addElement({
            id: genId(), type: "image", x: width / 4, y: height / 4,
            width: width / 2, height: height / 3, src, opacity: 1,
          });
        }} />
        <div style={{ flex: 1 }} />
        <ToolBtn label="↑" title="Camada acima" onClick={() => moveLayer("up")} />
        <ToolBtn label="↓" title="Camada abaixo" onClick={() => moveLayer("down")} />
        <ToolBtn label="🗑" title="Deletar (Del)" onClick={deleteSelected} danger />
        {onExport && <ToolBtn label="📥" title="Exportar PNG" onClick={handleExport} gold />}
      </div>

      {/* Canvas */}
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
            {/* Background */}
            <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />

            {schema.elements.map(el => {
              const isSelected = el.id === selectedId;

              if (el.type === "text") return (
                <TextElement key={el.id} el={el} isSelected={isSelected}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={attrs => updateElement(el.id, attrs)} />
              );

              if (el.type === "image") return (
                <ImageElement key={el.id} el={el} isSelected={isSelected}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={attrs => updateElement(el.id, attrs)} />
              );

              if (el.type === "rect") return (
                <RectElement key={el.id} el={el} isSelected={isSelected}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={attrs => updateElement(el.id, attrs)} />
              );

              if (el.type === "circle") return (
                <CircleElement key={el.id} el={el} isSelected={isSelected}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={attrs => updateElement(el.id, attrs)} />
              );

              return null;
            })}
          </Layer>
        </Stage>
      </div>

      {/* Properties panel */}
      {selected && (
        <div style={{
          width: 240, padding: 16, overflowY: "auto",
          background: "var(--bg-sidebar)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase" }}>
            Propriedades
          </h3>

          {/* Position */}
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
                    <button key={s} onClick={() => updateElement(selected.id, { fontStyle: s })}
                      style={{
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
                    <button key={a} onClick={() => updateElement(selected.id, { align: a })}
                      style={{
                        flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid",
                        borderColor: selected.align === a ? "rgba(212,168,67,0.35)" : "var(--border)",
                        background: selected.align === a ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                        color: selected.align === a ? "var(--gold)" : "var(--text-muted)",
                        fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                      }}>{a === "left" ? "←" : a === "center" ? "↔" : "→"}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Rect props */}
          {selected.type === "rect" && (
            <PropField label="Borda Raio" type="number" value={selected.cornerRadius || 0} onChange={v => updateElement(selected.id, { cornerRadius: +v })} />
          )}

          {/* Image src */}
          {selected.type === "image" && (
            <PropField label="URL Imagem" type="text" value={selected.src || ""} onChange={v => updateElement(selected.id, { src: v })} />
          )}

          {/* Stroke */}
          {(selected.type === "rect" || selected.type === "circle") && (
            <>
              <PropField label="Borda Cor" type="color" value={selected.stroke || "#000000"} onChange={v => updateElement(selected.id, { stroke: v })} />
              <PropField label="Borda Espessura" type="number" value={selected.strokeWidth || 0} onChange={v => updateElement(selected.id, { strokeWidth: +v })} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Element components ===== */
function TextElement({ el, isSelected, onSelect, onChange }: {
  el: EditorElement; isSelected: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
}) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={shapeRef}
        x={el.x} y={el.y}
        width={el.width}
        text={el.text || ""}
        fontSize={el.fontSize || 32}
        fontFamily={el.fontFamily || "Helvetica Neue, Arial, sans-serif"}
        fontStyle={el.fontStyle || "normal"}
        fill={el.fill || "#FFFFFF"}
        align={el.align || "left"}
        rotation={el.rotation || 0}
        opacity={el.opacity ?? 1}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          onChange({
            x: node.x(), y: node.y(),
            width: Math.max(20, node.width() * node.scaleX()),
            rotation: node.rotation(),
          });
          node.scaleX(1); node.scaleY(1);
        }}
        onDblClick={() => {
          const newText = prompt("Editar texto:", el.text || "");
          if (newText !== null) onChange({ text: newText });
        }}
      />
      {isSelected && <Transformer ref={trRef} enabledAnchors={["middle-left", "middle-right"]} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

function RectElement({ el, isSelected, onSelect, onChange }: {
  el: EditorElement; isSelected: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={el.x} y={el.y} width={el.width} height={el.height}
        fill={el.fill} cornerRadius={el.cornerRadius || 0}
        stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
        rotation={el.rotation || 0} opacity={el.opacity ?? 1}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
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
      {isSelected && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
  );
}

function CircleElement({ el, isSelected, onSelect, onChange }: {
  el: EditorElement; isSelected: boolean;
  onSelect: () => void; onChange: (attrs: Partial<EditorElement>) => void;
}) {
  const shapeRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const radius = Math.min(el.width, el.height) / 2;
  return (
    <>
      <Circle
        ref={shapeRef}
        x={el.x} y={el.y} radius={radius}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
        rotation={el.rotation || 0} opacity={el.opacity ?? 1}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          const scl = Math.max(node.scaleX(), node.scaleY());
          onChange({
            x: node.x(), y: node.y(),
            width: Math.max(10, radius * 2 * scl),
            height: Math.max(10, radius * 2 * scl),
          });
          node.scaleX(1); node.scaleY(1);
        }}
      />
      {isSelected && <Transformer ref={trRef} boundBoxFunc={(_, nw) => nw} />}
    </>
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

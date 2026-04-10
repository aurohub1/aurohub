"use client";

import { Eye, EyeOff, Type, Square, Circle, Image as ImgIcon, QrCode, Hexagon } from "lucide-react";
import { EditorElement } from "./types";

interface Props {
  elements: EditorElement[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
}

function TypeIcon({ el }: { el: EditorElement }) {
  const color = el.bindParam ? "var(--ed-bind)" : "var(--ed-txt2)";
  const size = 12;
  if (el.type === "text") return <Type size={size} color={color} />;
  if (el.type === "rect") return <Square size={size} color={color} />;
  if (el.type === "circle") return <Circle size={size} color={color} />;
  if (el.type === "image") return <ImgIcon size={size} color={color} />;
  if (el.type === "qrcode") return <QrCode size={size} color={color} />;
  return null;
}

export default function LayersPanel({ elements, selectedIds, onSelect, onUpdate }: Props) {
  const reversed = [...elements].reverse();
  return (
    <div style={{ width: 160, display: "flex", flexDirection: "column", background: "var(--ed-surface)", borderRight: "1px solid var(--ed-bdr)", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 12px 8px", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", borderBottom: "1px solid var(--ed-bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Layers</span>
        <span style={{ fontWeight: 600, opacity: 0.6 }}>{elements.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {reversed.length === 0 && (
          <div style={{ padding: 20, fontSize: 10, color: "var(--ed-txt3)", textAlign: "center", lineHeight: 1.5 }}>
            Canvas vazio.<br />Use os botões à esquerda para adicionar elementos.
          </div>
        )}
        {reversed.map(el => {
          const isSelected = selectedIds.includes(el.id);
          const isHidden = el.visible === false;
          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className="ah-layer-row"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 28, padding: "0 8px 0 5px", cursor: "pointer",
                fontSize: 11,
                background: isSelected ? "var(--ed-active)" : "transparent",
                borderLeft: isSelected ? "3px solid #FF7A1A" : "3px solid transparent",
                color: isSelected ? "var(--ed-txt)" : "var(--ed-txt2)",
                opacity: isHidden ? 0.45 : 1,
                transition: "background 0.12s",
              }}
            >
              {el.bindParam && <Hexagon size={9} color="var(--ed-bind)" fill="var(--ed-bind)" style={{ flexShrink: 0 }} />}
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><TypeIcon el={el} /></span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.name || el.type}</span>
              <button
                className={isHidden ? "ah-layer-eye-always" : "ah-layer-eye"}
                onClick={e => { e.stopPropagation(); onUpdate(el.id, { visible: isHidden ? true : false }); }}
                title={isHidden ? "Mostrar" : "Ocultar"}
                style={{
                  width: 18, height: 18, border: "none", background: "transparent",
                  color: isHidden ? "var(--ed-danger)" : "var(--ed-txt3)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                  display: isHidden ? "flex" : "none",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        .ah-layer-row:hover { background: var(--ed-hover) !important; }
        .ah-layer-row:hover .ah-layer-eye { display: flex !important; }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Type, Square, Circle, Image as ImgIcon, QrCode, Hexagon, Search, Shapes, Sparkles } from "lucide-react";
import { EditorElement } from "./types";

interface Props {
  elements: EditorElement[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onShiftSelect?: (id: string) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
}

function TypeIcon({ el }: { el: EditorElement }) {
  const color = el.bindParam ? "var(--ed-bind)" : "var(--ed-txt)";
  const size = 15;
  if (el.type === "text") return <Type size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "rect") return <Square size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "circle") return <Circle size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "image") return <ImgIcon size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "imageBind") return <ImgIcon size={size} color="#3B82F6" strokeWidth={2.5} />;
  if (el.type === "qrcode") return <QrCode size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "svg") return <Shapes size={size} color={color} strokeWidth={2.5} />;
  if (el.type === "particles") return <Sparkles size={size} color={color} strokeWidth={2.5} />;
  return null;
}

export default function LayersPanel({ elements, selectedIds, onSelect, onShiftSelect, onUpdate }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const reversed = [...elements].reverse();

  return (
    <div style={{ width: 160, display: "flex", flexDirection: "column", background: "var(--ed-surface)", borderRight: "1px solid var(--ed-bdr)", flexShrink: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px 8px", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--ed-txt3)", borderBottom: "1px solid var(--ed-bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Layers</span>
        <span style={{ fontWeight: 600, opacity: 0.6 }}>{elements.length}</span>
      </div>

      {/* Busca */}
      <div style={{ padding: "5px 7px", borderBottom: "1px solid var(--ed-bdr)" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={10} style={{ position: "absolute", left: 6, color: "var(--ed-txt3)", pointerEvents: "none" as const }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar..."
            style={{
              width: "100%", height: 22, paddingLeft: 20, paddingRight: 6,
              borderRadius: 5, border: "1px solid var(--ed-bdr)",
              background: "var(--ed-input)", color: "var(--ed-txt)",
              fontSize: 10, outline: "none", boxSizing: "border-box" as const,
            }}
          />
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto" as const }}>
        {reversed.length === 0 && (
          <div style={{ padding: 20, fontSize: 10, color: "var(--ed-txt3)", textAlign: "center" as const, lineHeight: 1.5 }}>
            Canvas vazio.<br />Use os botões à esquerda para adicionar elementos.
          </div>
        )}
        {reversed.map(el => {
          const isSelected = selectedIds.includes(el.id);
          const isHidden = el.visible === false;
          const isLocked = !!el.locked;
          const matches = !q ||
            (el.name?.toLowerCase().includes(q) ?? false) ||
            (el.bindParam?.toLowerCase().includes(q) ?? false);

          return (
            <div
              key={el.id}
              onClick={(e) => (e.shiftKey && onShiftSelect ? onShiftSelect(el.id) : onSelect(el.id))}
              className="ah-layer-row"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                height: 28, padding: "0 4px 0 5px", cursor: "pointer",
                fontSize: 11,
                background: isSelected ? "var(--ed-active)" : "transparent",
                borderLeft: isSelected ? "3px solid #FF7A1A" : "3px solid transparent",
                color: isSelected ? "var(--ed-txt)" : "var(--ed-txt2)",
                opacity: isHidden ? 0.45 : (q && !matches ? 0.2 : 1),
                transition: "background 0.12s, opacity 0.15s",
              }}
            >
              {el.bindParam && <Hexagon size={9} color="var(--ed-bind)" fill="var(--ed-bind)" style={{ flexShrink: 0 }} />}
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><TypeIcon el={el} /></span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{el.name || el.type}</span>

              {/* Visibilidade */}
              <button
                className={isHidden ? "ah-layer-eye-always" : "ah-layer-eye"}
                onClick={e => { e.stopPropagation(); onUpdate(el.id, { visible: !isHidden }); }}
                title={isHidden ? "Mostrar" : "Ocultar"}
                style={{
                  width: 16, height: 16, border: "none", background: "transparent",
                  color: isHidden ? "var(--ed-danger)" : "var(--ed-txt3)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                  display: isHidden ? "flex" : "none",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>

              {/* Trava */}
              <button
                className={isLocked ? "ah-layer-lock-always" : "ah-layer-lock"}
                onClick={e => { e.stopPropagation(); onUpdate(el.id, { locked: !isLocked }); }}
                title={isLocked ? "Desbloquear" : "Bloquear"}
                style={{
                  width: 16, height: 16, border: "none", background: "transparent",
                  color: isLocked ? "var(--ed-bind)" : "var(--ed-txt3)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                  display: isLocked ? "flex" : "none",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .ah-layer-row:hover { background: var(--ed-hover) !important; }
        .ah-layer-row:hover .ah-layer-eye { display: flex !important; }
        .ah-layer-row:hover .ah-layer-lock { display: flex !important; }
      `}</style>
    </div>
  );
}

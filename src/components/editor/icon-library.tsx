"use client";
import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { ICON_CATEGORIES, ALL_ICONS, buildSvgDataUrl, EditorIcon } from "./icon-data";

interface Props {
  onSelect: (icon: EditorIcon) => void;
  onClose: () => void;
}

const DEFAULT_COLOR = "#FFFFFF";

export default function IconLibrary({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("viagem");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return ICON_CATEGORIES.find(c => c.id === activeCategory)?.icons ?? [];
    }
    return ALL_ICONS.filter(ic =>
      ic.name.toLowerCase().includes(q) ||
      ic.keywords?.some(k => k.includes(q))
    );
  }, [query, activeCategory]);

  return (
    <div style={{
      position: "absolute", left: 54, top: 44, zIndex: 800,
      width: 280, maxHeight: "calc(100vh - 80px)",
      background: "var(--ed-surface)", border: "1px solid var(--ed-bdr)",
      borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 6px", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ed-txt)" }}>Biblioteca de Ícones</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--ed-txt3)", cursor: "pointer", padding: 2, display: "flex" }}>
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "6px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--ed-input)", border: "1px solid var(--ed-bdr)", borderRadius: 6, padding: "4px 8px" }}>
          <Search size={11} style={{ color: "var(--ed-txt3)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar ícone..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 10, color: "var(--ed-txt)", }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "var(--ed-txt3)", cursor: "pointer", padding: 0, display: "flex" }}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!query && (
        <div style={{ display: "flex", gap: 2, padding: "0 8px 6px", flexWrap: "wrap", flexShrink: 0 }}>
          {ICON_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "3px 7px", borderRadius: 5, border: "none", fontSize: 9, fontWeight: 600, cursor: "pointer",
                background: activeCategory === cat.id ? "var(--ed-accent)" : "var(--ed-hover)",
                color: activeCategory === cat.id ? "#fff" : "var(--ed-txt2)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
      {query && (
        <div style={{ padding: "0 12px 4px", fontSize: 9, color: "var(--ed-txt3)", flexShrink: 0 }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Icon grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 10px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, alignContent: "start" }}>
        {filtered.map(icon => {
          const dataUrl = buildSvgDataUrl(icon, DEFAULT_COLOR, 32);
          return (
            <button
              key={icon.id}
              title={icon.name}
              onClick={() => onSelect(icon)}
              onMouseEnter={() => setHovered(icon.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, padding: "6px 2px", borderRadius: 6, border: "1px solid",
                borderColor: hovered === icon.id ? "var(--ed-accent)" : "transparent",
                background: hovered === icon.id ? "var(--ed-hover)" : "transparent",
                cursor: "pointer", transition: "all 0.1s",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt={icon.name} width={24} height={24} style={{ imageRendering: "crisp-edges" }} />
              <span style={{ fontSize: 7, color: "var(--ed-txt3)", textAlign: "center", lineHeight: 1.2, maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {icon.name}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px 0", fontSize: 10, color: "var(--ed-txt3)" }}>
            Nenhum ícone encontrado
          </div>
        )}
      </div>
    </div>
  );
}

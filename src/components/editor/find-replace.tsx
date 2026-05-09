"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Replace, ChevronUp, ChevronDown, CaseSensitive } from "lucide-react";
import { EditorElement } from "./types";

interface Props {
  elements: EditorElement[];
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export default function FindReplacePanel({ elements, onUpdate, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchIdx, setMatchIdx] = useState(0);
  const [lastResult, setLastResult] = useState<{ count: number; action: "all" | "one" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Reset match index when search changes
  useEffect(() => { setMatchIdx(0); setLastResult(null); }, [search, caseSensitive]);

  const textElements = elements.filter(el => el.type === "text" && el.text);

  const matches = search.trim()
    ? textElements.filter(el => {
        const txt = el.text ?? "";
        return caseSensitive ? txt.includes(search) : txt.toLowerCase().includes(search.toLowerCase());
      })
    : [];

  const currentMatch = matches[matchIdx] ?? null;

  // Selects the element for the current match index
  const focusMatch = useCallback((idx: number, list: EditorElement[]) => {
    const el = list[idx];
    if (el) onSelect(el.id);
  }, [onSelect]);

  useEffect(() => {
    if (matches.length > 0) focusMatch(Math.min(matchIdx, matches.length - 1), matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIdx, search, caseSensitive]);

  const replaceInText = (text: string) => {
    if (caseSensitive) return text.replaceAll(search, replace);
    // Case-insensitive replaceAll via regex
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(escaped, "gi"), replace);
  };

  const handleReplaceAll = () => {
    if (!search.trim() || matches.length === 0) return;
    matches.forEach(el => {
      if (!el.text) return;
      onUpdate(el.id, { text: replaceInText(el.text) });
    });
    setLastResult({ count: matches.length, action: "all" });
    setMatchIdx(0);
    onSelect(null);
  };

  const handleReplaceOne = () => {
    if (!search.trim() || !currentMatch?.text) return;
    onUpdate(currentMatch.id, { text: replaceInText(currentMatch.text) });
    setLastResult({ count: 1, action: "one" });
    // Move to next (list will shrink if text no longer matches)
    const nextIdx = matchIdx >= matches.length - 1 ? 0 : matchIdx + 1;
    setMatchIdx(nextIdx);
  };

  const goNext = () => {
    if (matches.length === 0) return;
    const next = (matchIdx + 1) % matches.length;
    setMatchIdx(next);
  };

  const goBack = () => {
    if (matches.length === 0) return;
    const prev = (matchIdx - 1 + matches.length) % matches.length;
    setMatchIdx(prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); goNext(); }
    if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); goBack(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleReplaceAll(); }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute", right: 240, top: 10, zIndex: 900,
        width: 320,
        background: "var(--ed-surface)",
        border: "1px solid var(--ed-bdr)",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "9px 12px", borderBottom: "1px solid var(--ed-bdr)", gap: 6 }}>
        <Search size={13} style={{ color: "var(--ed-txt3)", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--ed-txt)" }}>Buscar e Substituir</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--ed-txt3)", cursor: "pointer", display: "flex", padding: 2 }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Search row */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ ...inputStyle, paddingRight: 28 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={clearBtnStyle}>
                <X size={10} />
              </button>
            )}
          </div>
          {/* Case sensitive toggle */}
          <button
            title={caseSensitive ? "Diferenciar maiúsculas: ativo" : "Diferenciar maiúsculas: inativo"}
            onClick={() => setCaseSensitive(s => !s)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid",
              borderColor: caseSensitive ? "var(--ed-accent)" : "var(--ed-bdr)",
              background: caseSensitive ? "var(--ed-active)" : "var(--ed-hover)",
              color: caseSensitive ? "var(--ed-active-txt)" : "var(--ed-txt3)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CaseSensitive size={13} />
          </button>
        </div>

        {/* Replace row */}
        <div style={{ position: "relative" }}>
          <Replace size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ed-txt3)", pointerEvents: "none" }} />
          <input
            value={replace}
            onChange={e => setReplace(e.target.value)}
            placeholder="Substituir por..."
            style={{ ...inputStyle, paddingLeft: 26 }}
          />
        </div>

        {/* Match status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 18 }}>
          {search.trim() ? (
            matches.length === 0 ? (
              <span style={{ fontSize: 10, color: "var(--ed-danger, #ef4444)" }}>Nenhuma ocorrência</span>
            ) : (
              <span style={{ fontSize: 10, color: "var(--ed-txt3)" }}>
                <strong style={{ color: "var(--ed-txt)" }}>{matchIdx + 1}</strong> de <strong style={{ color: "var(--ed-txt)" }}>{matches.length}</strong> correspondência{matches.length !== 1 ? "s" : ""}
              </span>
            )
          ) : (
            <span style={{ fontSize: 10, color: "var(--ed-txt3)" }}>Digite o texto a buscar</span>
          )}
          {/* Prev / Next */}
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={goBack} disabled={matches.length < 2} title="Anterior (Shift+Enter)" style={navBtnStyle(matches.length < 2)}>
              <ChevronUp size={13} />
            </button>
            <button onClick={goNext} disabled={matches.length < 2} title="Próxima (Enter)" style={navBtnStyle(matches.length < 2)}>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>

        {/* Current match preview */}
        {currentMatch && (
          <div style={{ padding: "5px 8px", borderRadius: 5, background: "var(--ed-hover)", fontSize: 10, color: "var(--ed-txt2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--ed-txt3)", marginRight: 4 }}>{currentMatch.name || "Texto"}:</span>
            {highlightMatch(currentMatch.text ?? "", search, caseSensitive)}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button
            onClick={handleReplaceOne}
            disabled={!search.trim() || matches.length === 0}
            title="Substituir ocorrência atual e avançar"
            style={actionBtnStyle(false, !search.trim() || matches.length === 0)}
          >
            Substituir
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={!search.trim() || matches.length === 0}
            title="Substituir todas as ocorrências (Ctrl+Enter)"
            style={actionBtnStyle(true, !search.trim() || matches.length === 0)}
          >
            Substituir tudo
          </button>
        </div>

        {/* Feedback */}
        {lastResult && (
          <div style={{ fontSize: 10, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
            ✓ {lastResult.action === "all"
              ? `${lastResult.count} elemento${lastResult.count !== 1 ? "s" : ""} substituído${lastResult.count !== 1 ? "s" : ""}`
              : "1 substituição feita"}
          </div>
        )}

        <div style={{ fontSize: 9, color: "var(--ed-txt3)", marginTop: -2 }}>
          Enter=próxima · Shift+Enter=anterior · Ctrl+Enter=substituir tudo
        </div>
      </div>
    </div>
  );
}

// Renders text with highlighted match
function highlightMatch(text: string, search: string, caseSensitive: boolean): React.ReactNode {
  if (!search) return text;
  const idx = caseSensitive ? text.indexOf(search) : text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return <>
    {text.slice(0, idx)}
    <mark style={{ background: "#FF7A1A44", color: "var(--ed-txt)", borderRadius: 2 }}>{text.slice(idx, idx + search.length)}</mark>
    {text.slice(idx + search.length)}
  </>;
}

/* ── Styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%", height: 28, borderRadius: 6,
  border: "1px solid var(--ed-bdr)",
  background: "var(--ed-input)", color: "var(--ed-txt)",
  fontSize: 11, padding: "0 8px", outline: "none",
  boxSizing: "border-box",
};

const clearBtnStyle: React.CSSProperties = {
  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", color: "var(--ed-txt3)", cursor: "pointer",
  display: "flex", padding: 2,
};

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: 24, height: 24, borderRadius: 5,
  border: "1px solid var(--ed-bdr)",
  background: "var(--ed-hover)",
  color: disabled ? "var(--ed-txt3)" : "var(--ed-txt2)",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
  display: "flex", alignItems: "center", justifyContent: "center",
});

const actionBtnStyle = (primary: boolean, disabled: boolean): React.CSSProperties => ({
  flex: 1, height: 28, borderRadius: 6, border: "none",
  background: disabled ? "var(--ed-hover)" : primary ? "#FF7A1A" : "var(--ed-hover)",
  color: disabled ? "var(--ed-txt3)" : primary ? "#fff" : "var(--ed-txt2)",
  fontSize: 10, fontWeight: primary ? 700 : 600,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

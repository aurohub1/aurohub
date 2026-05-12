"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import {
  useRoteiro, STYLES, BUDGETS, buildWhatsAppText, parseItinerary,
  type FormData, type PackageData,
} from "@/hooks/useRoteiro";

/* ── Helpers ─────────────────────────────────────── */

const inp = {
  width: "100%", height: 36, padding: "0 10px",
  background: "var(--bg2)", border: "1px solid var(--bdr)",
  borderRadius: 8, color: "var(--txt)", fontSize: 13, outline: "none",
  boxSizing: "border-box" as const,
};
const inpAuto = { ...inp, borderColor: "var(--orange)", background: "rgba(255,122,26,0.07)" };
const label12: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--txt3)", marginBottom: 4, display: "block" };
const card: React.CSSProperties = { background: "var(--bg1)", border: "1px solid var(--bdr)", borderRadius: 16, padding: 20 };
const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

/* ── Style icons — SVG 14×14, padrão do sistema ──────────────────────────── */
const SI: Record<string, React.ReactNode> = {
  cultural:    <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M4 17h12M6 17V9M10 17V9M14 17V9M3 9h14M10 3L3 9h14L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  aventura:    <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M2 17L8 7l4 5.5 2.5-3.5L18 17H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  relaxamento: <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  gastronomia: <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M7 3v5a2 2 0 01-2 2v7M13 3v14M11 3v5a2 2 0 002 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  romantico:   <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M10 15C7 12.5 3 10 3 7a3.5 3.5 0 017-.5 3.5 3.5 0 017 .5c0 3-4 5.5-7 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  familia:     <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><circle cx="7" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="14.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M13 12c.5 0 4.5 1 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  cruzeiro:    <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M5 11h10l-2-5H7L5 11zM10 6V3M8 3h4M2 15c1.5-1.5 4-1.5 5.5 0s4 1.5 5.5 0 3.5-1.5 5-0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ecoturismo:  <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M17 3c0 0-7-1-11 6-2 3-1.5 6.5 0 8 2-4 6-5 9-5 0-3 1-7 2-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 17c1-3 3-5 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  religioso:   <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M10 2v4M8 4h4M4 18V10l6-5 6 5v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="8" y="13" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  negocios:    <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><rect x="2" y="7" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7V5a2 2 0 014 0v2M2 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  mochileiro:  <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><rect x="5" y="5" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5V4a2 2 0 014 0v1M5 10h10M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  luxo:        <svg viewBox="0 0 20 20" fill="none" style={{width:14,height:14,flexShrink:0}}><path d="M10 2l2.5 5H18l-4.5 3.5L15 16l-5-3-5 3 1.5-5.5L2 7h5.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function LabeledInput({ label, value, onChange, placeholder, isAuto, type = "text", style }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; isAuto?: boolean; type?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={label12}>{label}{isAuto && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: 9, verticalAlign: "middle" }}>●AUTO</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...(isAuto ? inpAuto : inp), ...style }} />
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--txt2)" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: "var(--orange)", cursor: "pointer" }} />
      {label}
    </label>
  );
}

/* ── Markdown helpers ────────────────────────────── */

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
}

function parseMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const lis = listItems
      .map(it => `<li style="display:flex;gap:8px;margin-bottom:6px;line-height:1.7"><span style="color:var(--orange);flex-shrink:0;font-weight:700">•</span><span>${inlineMarkdown(it)}</span></li>`)
      .join("");
    out.push(`<ul style="list-style:none;padding:0;margin:0 0 12px">${lis}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushList(); continue; }
    if (/^###\s/.test(t)) {
      flushList();
      out.push(`<h3 style="font-size:15px;font-weight:700;margin:14px 0 6px;color:var(--orange)">${inlineMarkdown(t.slice(4))}</h3>`);
    } else if (/^##\s/.test(t)) {
      flushList();
      out.push(`<h2 style="font-size:17px;font-weight:700;margin:18px 0 8px;color:var(--orange)">${inlineMarkdown(t.slice(3))}</h2>`);
    } else if (/^#\s/.test(t)) {
      flushList();
      out.push(`<h2 style="font-size:19px;font-weight:800;margin:0 0 10px">${inlineMarkdown(t.slice(2))}</h2>`);
    } else if (/^[-*•]\s/.test(t)) {
      listItems.push(t.replace(/^[-*•]\s+/, ""));
    } else {
      flushList();
      out.push(`<p style="margin:0 0 10px;line-height:1.7">${inlineMarkdown(t)}</p>`);
    }
  }
  flushList();
  return out.join("");
}

/* ── Step bar ─────────────────────────────────────── */

function StepBar({ step }: { step: string }) {
  const steps = [
    { id: "modo",   label: "1. Modo" },
    { id: "form",   label: "2. Viagem" },
    { id: "pkg",    label: "3. Pacote" },
    { id: "result", label: "4. Roteiro" },
  ];
  const idx = step === "generating" || step === "result" ? 3 : step === "pkg" ? 2 : step === "form" ? 1 : 0;
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: i === idx ? "var(--orange)" : i < idx ? "rgba(255,122,26,0.15)" : "var(--bg2)",
            color: i === idx ? "#fff" : i < idx ? "var(--orange)" : "var(--txt3)",
            transition: "all 0.2s",
          }}>{s.label}</div>
          {i < steps.length - 1 && (
            <div style={{ width: 32, height: 1, background: i < idx ? "var(--orange)" : "var(--bdr)", margin: "0 4px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 0: Modo ─────────────────────────────────── */

function StepModo({ r }: { r: ReturnType<typeof useRoteiro> }) {
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.length >= 2) r.searchCircuits(v);
      else r.setCircuitResults([]);
    }, 400);
  }

  const canNext = r.mode === "livre" || (r.mode === "europamundo" && r.selectedCircuit !== null);

  function handleNext() {
    if (r.mode === "europamundo" && r.selectedCircuit) {
      r.setF("destination", r.selectedCircuit.cities || r.selectedCircuit.name);
      r.setF("days", String(r.selectedCircuit.days));
    }
    r.setStep("form");
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Roteiro Livre */}
        <button
          onClick={() => r.setMode("livre")}
          style={{
            ...card, cursor: "pointer", textAlign: "left", border: "2px solid",
            borderColor: r.mode === "livre" ? "var(--orange)" : "var(--bdr)",
            background: r.mode === "livre" ? "rgba(255,122,26,0.07)" : "var(--bg1)",
            transition: "all 0.15s",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 32, height: 32 }}>
              <path d="M7 3L3 5v12l4-2 6 2 4-2V3l-4 2-6-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 3v12M13 5v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>Roteiro Livre</div>
          <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.6 }}>
            Crie um roteiro personalizado para qualquer destino do mundo, com base nas preferências do cliente.
          </div>
          {r.mode === "livre" && (
            <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: "var(--orange)" }}>✓ Selecionado</div>
          )}
        </button>

        {/* Circuito Europamundo */}
        <button
          onClick={() => r.setMode("europamundo")}
          style={{
            ...card, cursor: "pointer", textAlign: "left", border: "2px solid",
            borderColor: r.mode === "europamundo" ? "#3B82F6" : "var(--bdr)",
            background: r.mode === "europamundo" ? "rgba(59,130,246,0.07)" : "var(--bg1)",
            transition: "all 0.15s",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 32, height: 32 }}>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 3c-2 2.5-3 4.5-3 7s1 4.5 3 7M10 3c2 2.5 3 4.5 3 7s-1 4.5-3 7M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4.5 6.5c1.5.7 3.4 1.1 5.5 1.1s4-.4 5.5-1.1M4.5 13.5c1.5-.7 3.4-1.1 5.5-1.1s4 .4 5.5 1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>Circuito Europamundo</div>
          <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.6 }}>
            Selecione um dos 254 circuitos Europamundo. O roteiro será gerado com base no itinerário oficial.
          </div>
          {r.mode === "europamundo" && (
            <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: "#3B82F6" }}>✓ Selecionado</div>
          )}
        </button>
      </div>

      {/* Busca de circuito */}
      {r.mode === "europamundo" && (
        <div style={{ ...card, marginBottom: 20 }}>
          <label style={label12}>Buscar circuito</label>
          <input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Ex: Paris, Espanha, Mediterrâneo..."
            style={inp}
            autoFocus
          />

          {r.circuitSearching && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--txt3)" }}>Buscando...</div>
          )}

          {!r.circuitSearching && r.circuitResults.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
              {r.circuitResults.map(c => {
                const isSelected = r.selectedCircuit?.id === c.id;
                const isLoading = isSelected && r.circuitSelecting;
                return (
                  <button
                    key={c.id}
                    onClick={() => r.selectCircuit(c.id)}
                    disabled={r.circuitSelecting}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px",
                      borderRadius: 10, border: "1.5px solid", cursor: "pointer", textAlign: "left",
                      borderColor: isSelected ? "#3B82F6" : "var(--bdr)",
                      background: isSelected ? "rgba(59,130,246,0.1)" : "var(--bg2)",
                      transition: "all 0.15s", width: "100%", opacity: r.circuitSelecting && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--txt3)" }}>
                        {c.days} dias · {c.region}{c.cities ? ` · ${c.cities}` : ""}
                      </div>
                    </div>
                    {c.preco_usd != null && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>
                        US$ {c.preco_usd}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: "#3B82F6", flexShrink: 0, minWidth: 16, textAlign: "center" }}>
                      {isLoading ? "⏳" : isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {r.selectedCircuit && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Circuito selecionado</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{r.selectedCircuit.name}</div>
              <div style={{ fontSize: 11, color: "var(--txt3)", marginTop: 2 }}>{r.selectedCircuit.days} dias · {r.selectedCircuit.region}</div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!canNext}
        style={{
          height: 44, width: "100%", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
          background: canNext ? "var(--orange)" : "var(--bg2)", color: canNext ? "#fff" : "var(--txt3)",
          transition: "all 0.2s",
        }}
      >
        {r.mode === "europamundo" && !r.selectedCircuit ? "Selecione um circuito para continuar" : "Próximo: Dados da Viagem →"}
      </button>
    </div>
  );
}

/* ── Step 1: Form ─────────────────────────────────── */

function StepForm({ r, fileRef, onDrop }: {
  r: ReturnType<typeof useRoteiro>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
}) {
  const canNext = !!r.form.destination && !!r.form.days && !!r.form.travelers;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
      {/* Upload zone */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={card}>
          <p style={{ ...label12, marginBottom: 12 }}>Importar voucher / orçamento</p>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--bdr2)", borderRadius: 12, padding: "28px 16px",
              cursor: "pointer", textAlign: "center",
              background: r.extracting ? "rgba(255,122,26,0.05)" : "var(--bg2)",
              transition: "border-color 0.2s",
            }}
          >
            {r.extracting ? (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: 28, height: 28 }}>
                    <path d="M5 3h10M5 17h10M6 3c0 4 4 5 4 7s-4 3-4 7M14 3c0 4-4 5-4 7s4 3 4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt2)" }}>Analisando documento...</div>
              </div>
            ) : r.fileName ? (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: 24, height: 24 }}>
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 10l2 2.5L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt2)", marginBottom: 4 }}>{r.fileName}</div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700 }}>{r.autoCount} campo{r.autoCount !== 1 ? "s" : ""} preenchido{r.autoCount !== 1 ? "s" : ""} automaticamente</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: 28, height: 28 }}>
                    <path d="M14 9l-5.5 5.5a3 3 0 01-4.24-4.24l6-6a2 2 0 012.83 2.83l-6 6a1 1 0 01-1.42-1.42L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt2)", marginBottom: 4 }}>Arraste o voucher ou orçamento aqui</div>
                <div style={{ fontSize: 11, color: "var(--txt3)" }}>PDF, JPG ou PNG · máx 10MB</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) r.extractFromFile(f); e.target.value = ""; }} />
          {r.extractErr && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 8 }}>{r.extractErr}</p>}
          {r.fileName && (
            <button onClick={() => { r.reset(); }} style={{ marginTop: 10, fontSize: 11, color: "var(--txt3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Limpar e recomeçar
            </button>
          )}
        </div>

        <div style={{ ...card, fontSize: 11, color: "var(--txt3)", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: "var(--txt2)", marginBottom: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}>
              <rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Privacidade
          </div>
          O documento não é armazenado. Apenas dados logísticos são extraídos. CPF, RG e dados pessoais dos passageiros são ignorados automaticamente.
        </div>
      </div>

      {/* Form fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <LabeledInput label="Destino" value={r.form.destination} onChange={v => r.setF("destination", v)}
            placeholder="ex: Lisboa, Portugal" isAuto={r.isAuto("destination")} />
        </div>

        <div style={card}>
          <div style={row2}>
            <div>
              <label style={label12}>Dias{r.isAuto("days") && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: 9 }}>●AUTO</span>}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => r.setF("days", String(Math.max(1, Number(r.form.days) - 1)))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>−</button>
                <input type="number" min="1" max="30" value={r.form.days} onChange={e => r.setF("days", e.target.value)}
                  style={{ ...inp, width: 60, textAlign: "center", MozAppearance: "textfield" } as React.CSSProperties} />
                <button onClick={() => r.setF("days", String(Math.min(30, Number(r.form.days) + 1)))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>+</button>
              </div>
            </div>
            <div>
              <label style={label12}>Viajantes{r.isAuto("travelers") && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: 9 }}>●AUTO</span>}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => r.setF("travelers", String(Math.max(1, Number(r.form.travelers) - 1)))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>−</button>
                <input type="number" min="1" max="50" value={r.form.travelers} onChange={e => r.setF("travelers", e.target.value)}
                  style={{ ...inp, width: 60, textAlign: "center", MozAppearance: "textfield" } as React.CSSProperties} />
                <button onClick={() => r.setF("travelers", String(Math.min(50, Number(r.form.travelers) + 1)))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>+</button>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <label style={label12}>Orçamento{r.isAuto("budget") && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: 9 }}>●AUTO</span>}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BUDGETS.map(b => (
              <button key={b} onClick={() => r.setF("budget", b)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: "1.5px solid", transition: "all 0.15s",
                borderColor: r.form.budget === b ? "var(--orange)" : "var(--bdr)",
                background: r.form.budget === b ? "rgba(255,122,26,0.12)" : "var(--bg2)",
                color: r.form.budget === b ? "var(--orange)" : "var(--txt2)",
              }}>{b}</button>
            ))}
          </div>
        </div>

        <div style={card}>
          <label style={label12}>Estilo da viagem{r.isAuto("styles") && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: 9 }}>●AUTO</span>}</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {STYLES.map(s => {
              const active = r.form.styles.includes(s.id);
              return (
                <button key={s.id} onClick={() => r.toggleStyle(s.id)} style={{
                  padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: "1.5px solid", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
                  borderColor: active ? "var(--orange)" : "var(--bdr)",
                  background: active ? "rgba(255,122,26,0.1)" : "var(--bg2)",
                  color: active ? "var(--orange)" : "var(--txt3)",
                }}>
                  {SI[s.id]} {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={card}>
          <label style={label12}>Observações do cliente</label>
          <textarea value={r.form.notes} onChange={e => r.setF("notes", e.target.value)}
            placeholder="Preferências especiais, restrições alimentares, comemoração..."
            rows={3} style={{ ...inp, height: "auto", padding: "8px 10px", resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => r.setStep("modo")} style={{
            height: 44, padding: "0 20px", borderRadius: 12, border: "1.5px solid var(--bdr)",
            background: "var(--bg2)", color: "var(--txt2)", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>← Voltar</button>
          <button onClick={() => r.setStep("pkg")} disabled={!canNext} style={{
            flex: 1, height: 44, borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
            background: canNext ? "var(--orange)" : "var(--bg2)", color: canNext ? "#fff" : "var(--txt3)",
            transition: "all 0.2s",
          }}>
            Próximo: Dados do Pacote →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Package ──────────────────────────────── */

function StepPackage({ r }: { r: ReturnType<typeof useRoteiro> }) {
  const ia = r.isAuto;
  const sf = (k: keyof PackageData) => (v: string | boolean) => r.setP(k, v as never);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      {r.limitError && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "var(--red)", fontSize: 13, lineHeight: 1.5 }}>
          <strong>Limite atingido:</strong> {r.limitError}
        </div>
      )}
      {/* Agency */}
      <div style={card}>
        <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>AGÊNCIA</p>
        <div style={{ ...row2, marginBottom: 12 }}>
          <LabeledInput label="Nome da agência" value={r.pkg.agencia} onChange={sf("agencia") as (v: string) => void} isAuto={ia("agencia")} placeholder="Agência XYZ" />
          <LabeledInput label="Consultor" value={r.pkg.consultor} onChange={sf("consultor") as (v: string) => void} isAuto={ia("consultor")} placeholder="Nome do consultor" />
        </div>
        <LabeledInput label="Telefone / WhatsApp" value={r.pkg.telefone} onChange={sf("telefone") as (v: string) => void} isAuto={ia("telefone")} placeholder="(17) 9 9999-9999" style={{ maxWidth: 260 }} />
      </div>

      {/* Voos */}
      <div style={card}>
        <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>VOO IDA</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 100px 120px 90px", gap: 10, marginBottom: 16 }}>
          <LabeledInput label="Origem" value={r.pkg.vooIdaOrigem} onChange={sf("vooIdaOrigem") as (v: string) => void} isAuto={ia("vooIdaOrigem")} placeholder="GRU" />
          <LabeledInput label="Destino" value={r.pkg.vooIdaDestino} onChange={sf("vooIdaDestino") as (v: string) => void} isAuto={ia("vooIdaDestino")} placeholder="LIS" />
          <LabeledInput label="Data" value={r.pkg.vooIdaData} onChange={sf("vooIdaData") as (v: string) => void} isAuto={ia("vooIdaData")} placeholder="dd/mm/aaaa" />
          <LabeledInput label="Horário" value={r.pkg.vooIdaHorario} onChange={sf("vooIdaHorario") as (v: string) => void} isAuto={ia("vooIdaHorario")} placeholder="22:30" />
          <LabeledInput label="Companhia" value={r.pkg.vooIdaCia} onChange={sf("vooIdaCia") as (v: string) => void} isAuto={ia("vooIdaCia")} placeholder="LATAM" />
          <LabeledInput label="Número" value={r.pkg.vooIdaNum} onChange={sf("vooIdaNum") as (v: string) => void} isAuto={ia("vooIdaNum")} placeholder="LA 8084" />
        </div>
        <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>VOO VOLTA</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 100px 120px 90px", gap: 10 }}>
          <LabeledInput label="Origem" value={r.pkg.vooVoltaOrigem} onChange={sf("vooVoltaOrigem") as (v: string) => void} isAuto={ia("vooVoltaOrigem")} placeholder="LIS" />
          <LabeledInput label="Destino" value={r.pkg.vooVoltaDestino} onChange={sf("vooVoltaDestino") as (v: string) => void} isAuto={ia("vooVoltaDestino")} placeholder="GRU" />
          <LabeledInput label="Data" value={r.pkg.vooVoltaData} onChange={sf("vooVoltaData") as (v: string) => void} isAuto={ia("vooVoltaData")} placeholder="dd/mm/aaaa" />
          <LabeledInput label="Horário" value={r.pkg.vooVoltaHorario} onChange={sf("vooVoltaHorario") as (v: string) => void} isAuto={ia("vooVoltaHorario")} placeholder="10:45" />
          <LabeledInput label="Companhia" value={r.pkg.vooVoltaCia} onChange={sf("vooVoltaCia") as (v: string) => void} isAuto={ia("vooVoltaCia")} placeholder="LATAM" />
          <LabeledInput label="Número" value={r.pkg.vooVoltaNum} onChange={sf("vooVoltaNum") as (v: string) => void} isAuto={ia("vooVoltaNum")} placeholder="LA 8085" />
        </div>
      </div>

      {/* Hospedagem */}
      <div style={card}>
        <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>HOSPEDAGEM</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 10 }}>
          <LabeledInput label="Hotel / Navio" value={r.pkg.hotel} onChange={sf("hotel") as (v: string) => void} isAuto={ia("hotel")} placeholder="Hotel Bairro Alto" />
          <LabeledInput label="Cat. ★" value={r.pkg.hotelCat} onChange={sf("hotelCat") as (v: string) => void} isAuto={ia("hotelCat")} placeholder="5" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <LabeledInput label="Check-in" value={r.pkg.checkin} onChange={sf("checkin") as (v: string) => void} isAuto={ia("checkin")} placeholder="dd/mm/aaaa" />
          <LabeledInput label="Check-out" value={r.pkg.checkout} onChange={sf("checkout") as (v: string) => void} isAuto={ia("checkout")} placeholder="dd/mm/aaaa" />
          <LabeledInput label="Tipo de quarto" value={r.pkg.quarto} onChange={sf("quarto") as (v: string) => void} isAuto={ia("quarto")} placeholder="Double Standard" />
        </div>
      </div>

      {/* Valores e incluso */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>VALORES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <LabeledInput label="Preço total (R$)" value={r.pkg.precoTotal} onChange={sf("precoTotal") as (v: string) => void} isAuto={ia("precoTotal")} placeholder="12.500,00" />
            <LabeledInput label="Por pessoa (R$)" value={r.pkg.precoPessoa} onChange={sf("precoPessoa") as (v: string) => void} isAuto={ia("precoPessoa")} placeholder="6.250,00" />
            <LabeledInput label="Parcelamento" value={r.pkg.parcelas} onChange={sf("parcelas") as (v: string) => void} isAuto={ia("parcelas")} placeholder="12x s/ juros" />
          </div>
        </div>
        <div style={card}>
          <p style={{ ...label12, marginBottom: 12, fontSize: 11 }}>INCLUSO NO PACOTE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <CheckItem label="Transfer" checked={r.pkg.incTransfer} onChange={v => r.setP("incTransfer", v)} />
            <CheckItem label="Café da manhã" checked={r.pkg.incCafe} onChange={v => r.setP("incCafe", v)} />
            <CheckItem label="Seguro viagem" checked={r.pkg.incSeguro} onChange={v => r.setP("incSeguro", v)} />
            <CheckItem label="Passeios inclusos" checked={r.pkg.incPasseios} onChange={v => r.setP("incPasseios", v)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <LabeledInput label="Obs. do pacote" value={r.pkg.obs} onChange={sf("obs") as (v: string) => void} isAuto={ia("obs")} placeholder="Válido p/ 2 adultos..." />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => r.setStep("form")} style={{
          height: 44, padding: "0 20px", borderRadius: 12, border: "1.5px solid var(--bdr)",
          background: "var(--bg2)", color: "var(--txt2)", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>← Voltar</button>
        <button onClick={r.generate} style={{
          flex: 1, height: 44, borderRadius: 12, border: "none",
          background: "var(--orange)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16, display: "inline", verticalAlign: "middle", marginRight: 6 }}>
            <path d="M17 10L3 15l2.5-5L3 5l14 5zM5.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Gerar Roteiro com IA
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Generating ───────────────────────────── */

function StepGenerating({ r }: { r: ReturnType<typeof useRoteiro> }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <svg viewBox="0 0 20 20" fill="none" style={{ width: 48, height: 48 }}>
          <path d="M17 10L3 15l2.5-5L3 5l14 5zM5.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--txt)", marginBottom: 8 }}>Gerando seu roteiro...</h2>
      <p style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 24 }}>A IA está criando um roteiro personalizado para {r.form.destination}.</p>
      <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${r.progress}%`, background: "var(--orange)", borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--txt3)", marginBottom: 24 }}>{Math.round(r.progress)}%</div>
      {r.streamText && (
        <div style={{
          ...card, textAlign: "left", maxHeight: 320, overflowY: "auto",
          fontSize: 12, color: "var(--txt2)", lineHeight: 1.8, whiteSpace: "pre-wrap",
        }}>
          {r.streamText}
        </div>
      )}
    </div>
  );
}

/* ── Step 4: Result ───────────────────────────────── */

function StepResult({ r }: { r: ReturnType<typeof useRoteiro> }) {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(r.streamText);

  // Re-parse after edits so all outputs stay in sync with edited content
  const editedParsed = parseItinerary(editedText) ?? r.parsed ?? [];
  const waText = buildWhatsAppText(r.form, r.pkg, editedParsed.length ? editedParsed : null, r.pkg.agencia);

  const days = editMode ? [] : editedParsed;
  const activeDay = days[r.activeDay];
  const styleLabels = r.form.styles
    .map(s => STYLES.find(x => x.id === s)?.label)
    .filter(Boolean).join(", ");

  return (
    <>
      {/* Print stylesheet — display:block !important sobrescreve o inline display:none */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #roteiro-print { display: block !important; visibility: visible; position: absolute; inset: 0; padding: 36px; background: #fff; color: #111; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; line-height: 1.6; }
          #roteiro-print * { visibility: visible; }
          .no-print { display: none !important; }
          #roteiro-print h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
          #roteiro-print h2 { font-size: 15px; font-weight: 700; color: #ea580c; margin: 16px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          #roteiro-print ul { list-style: none; padding: 0; margin: 0 0 10px; }
          #roteiro-print li { padding-left: 12px; margin-bottom: 4px; }
          #roteiro-print li::before { content: "• "; color: #ea580c; font-weight: 700; }
          #roteiro-print .print-day { page-break-inside: avoid; margin-bottom: 18px; }
          #roteiro-print strong { font-weight: 700; }
        }
      `}</style>

      {/* Usage warning */}
      {r.usageWarning && (
        <div className="no-print" style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.4)", color: "#ca8a04", fontSize: 12, marginBottom: 8 }}>
          ⚠ {r.usageWarning}
        </div>
      )}

      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => r.setStep("pkg")}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          ← Voltar
        </button>
        <button
          onClick={r.reset}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Novo roteiro
        </button>
        <div style={{ flex: 1 }} />
        {/* Edit/View toggle */}
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            height: 36, padding: "0 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, border: "1.5px solid",
            borderColor: editMode ? "var(--orange)" : "var(--bdr)",
            background: editMode ? "rgba(255,122,26,0.1)" : "var(--bg2)",
            color: editMode ? "var(--orange)" : "var(--txt2)",
          }}
        >
          {editMode ? (
            <><svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}><path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>Visualizar</>
          ) : (
            <><svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}><path d="M3 17l4-1L17.5 5.5a1.5 1.5 0 00-2.1-2.1L5 14l-2 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Editar</>
          )}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(waText)}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}><path d="M7 3H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-2M7 3a1 1 0 001 1h4a1 1 0 001-1M7 3a1 1 0 011-1h2a1 1 0 011 1M7 9h6M7 12h6M7 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Copiar para WhatsApp
        </button>
        <button
          onClick={() => r.downloadTxt(waText, r.form.destination)}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}><path d="M10 3v10M6 9l4 4 4-4M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Baixar .txt
        </button>
        <button
          onClick={() => window.print()}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--orange)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}><path d="M5 7V3h10v4M5 15H3a1 1 0 01-1-1V9a1 1 0 011-1h14a1 1 0 011 1v5a1 1 0 01-1 1h-2M5 11h10v6H5v-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Imprimir / PDF
        </button>
      </div>

      {/* Header card */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--txt)", margin: 0 }}>{r.form.destination}</h2>
            <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 4 }}>
              {r.form.days} dias · {r.form.travelers} viajante(s) · {r.form.budget}
              {styleLabels && ` · ${styleLabels}`}
            </div>
          </div>
          {(r.pkg.agencia || r.pkg.consultor) && (
            <div style={{ textAlign: "right" }}>
              {r.pkg.agencia && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{r.pkg.agencia}</div>}
              {r.pkg.consultor && <div style={{ fontSize: 12, color: "var(--txt3)" }}>{r.pkg.consultor}{r.pkg.telefone ? ` · ${r.pkg.telefone}` : ""}</div>}
            </div>
          )}
        </div>
        {(r.pkg.hotel || r.pkg.vooIdaOrigem || r.pkg.precoTotal) && (
          <div style={{ display: "flex", gap: 20, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bdr)", fontSize: 12, color: "var(--txt2)", flexWrap: "wrap" }}>
            {r.pkg.vooIdaOrigem && <span>✈ {r.pkg.vooIdaOrigem}→{r.pkg.vooIdaDestino}{r.pkg.vooIdaData ? ` ${r.pkg.vooIdaData}` : ""}{r.pkg.vooIdaHorario ? ` ${r.pkg.vooIdaHorario}` : ""}</span>}
            {r.pkg.hotel && <span>🏨 {r.pkg.hotel}{r.pkg.hotelCat ? ` (${r.pkg.hotelCat}★)` : ""}{r.pkg.checkin ? ` · ${r.pkg.checkin}→${r.pkg.checkout}` : ""}</span>}
            {r.pkg.precoTotal && (
              <span style={{ fontWeight: 700, color: "var(--orange)" }}>
                R$ {r.pkg.precoTotal}{r.pkg.precoPessoa ? ` · R$ ${r.pkg.precoPessoa}/pax` : ""}{r.pkg.parcelas ? ` · ${r.pkg.parcelas}` : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Edit mode — textarea full width */}
      {editMode ? (
        <div style={card}>
          <p style={{ ...label12, marginBottom: 10 }}>
            Editando roteiro · alterações refletidas no WhatsApp, download e impressão
          </p>
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            style={{
              width: "100%", minHeight: 520, background: "var(--bg2)",
              border: "1px solid var(--bdr)", borderRadius: 8, color: "var(--txt)",
              fontSize: 13, lineHeight: 1.8, padding: "12px 14px",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              resize: "vertical", outline: "none", boxSizing: "border-box" as const,
            }}
          />
        </div>
      ) : (
        /* View mode — sidebar + day content */
        <div style={{ display: "grid", gridTemplateColumns: days.length > 0 ? "180px 1fr" : "1fr", gap: 16 }}>
          {days.length > 0 && (
            <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => r.setActiveDay(i)} style={{
                  padding: "8px 12px", borderRadius: 10, border: "1.5px solid",
                  borderColor: r.activeDay === i ? "var(--orange)" : "var(--bdr)",
                  background: r.activeDay === i ? "rgba(255,122,26,0.1)" : "var(--bg2)",
                  color: r.activeDay === i ? "var(--orange)" : "var(--txt2)",
                  fontSize: 11, fontWeight: r.activeDay === i ? 700 : 500,
                  textAlign: "left", cursor: "pointer", transition: "all 0.15s", lineHeight: 1.4,
                }}>
                  {d.title.length > 36 ? d.title.slice(0, 33) + "…" : d.title}
                </button>
              ))}
            </div>
          )}
          <div style={card}>
            {days.length > 0 && activeDay ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--orange)", margin: "0 0 14px", paddingBottom: 10, borderBottom: "1px solid var(--bdr)" }}>
                  {activeDay.title}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeDay.items.map((item, j) => (
                    <li key={j} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--txt2)", lineHeight: 1.7 }}>
                      <span style={{ color: "var(--orange)", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>•</span>
                      <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div
                style={{ fontSize: 13.5, color: "var(--txt2)" }}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(editedText) }}
              />
            )}
          </div>
        </div>
      )}

      {/* Print-only content — display:none na tela, display:block !important no print via CSS */}
      <div id="roteiro-print" style={{ display: "none" }}>
        {(r.pkg.agencia || r.pkg.consultor) && (
          <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #e5e7eb" }}>
            {r.pkg.agencia && <div style={{ fontSize: 20, fontWeight: 800 }}>{r.pkg.agencia}</div>}
            {r.pkg.consultor && <div style={{ fontSize: 13, color: "#555" }}>Consultor: {r.pkg.consultor}{r.pkg.telefone ? ` · ${r.pkg.telefone}` : ""}</div>}
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <h1>{r.form.destination} — Roteiro de Viagem</h1>
          <div style={{ fontSize: 13, color: "#555" }}>{r.form.days} dias · {r.form.travelers} viajante(s) · {r.form.budget}{styleLabels ? ` · ${styleLabels}` : ""}</div>
          {r.pkg.hotel && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>🏨 {r.pkg.hotel}{r.pkg.hotelCat ? ` (${r.pkg.hotelCat}★)` : ""}{r.pkg.checkin ? ` · ${r.pkg.checkin} → ${r.pkg.checkout}` : ""}</div>}
          {r.pkg.vooIdaOrigem && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>✈ Ida: {r.pkg.vooIdaOrigem}→{r.pkg.vooIdaDestino} {r.pkg.vooIdaData} {r.pkg.vooIdaHorario}{r.pkg.vooVoltaData ? ` · Volta: ${r.pkg.vooVoltaData} ${r.pkg.vooVoltaHorario}` : ""}</div>}
          {r.pkg.precoTotal && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>R$ {r.pkg.precoTotal}{r.pkg.precoPessoa ? ` · R$ ${r.pkg.precoPessoa}/pax` : ""}{r.pkg.parcelas ? ` · ${r.pkg.parcelas}` : ""}</div>}
        </div>
        {editedParsed.length > 0 ? editedParsed.map((d, i) => (
          <div key={i} className="print-day">
            <h2>{d.title}</h2>
            <ul>
              {d.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
              ))}
            </ul>
          </div>
        )) : (
          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(editedText) }} />
        )}
      </div>
    </>
  );
}

/* ── Page ─────────────────────────────────────────── */

export default function RoteiroPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      if (!p) { router.push("/login"); return; }
      if (p.role !== "adm") {
        const feats = await getFeatures(supabase, p);
        if (!feats.has("roteiro")) {
          router.push(homeForRole(p.role));
          return;
        }
      }
      setAllowed(true);
    })();
  }, [router]);

  const r = useRoteiro();
  const fileRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) r.extractFromFile(file);
  }, [r]);

  if (allowed === null) return <div className="text-[13px] text-[var(--txt3)]" style={{ padding: 32 }}>Carregando...</div>;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 22, height: 22, flexShrink: 0 }}>
            <path d="M17 10L3 15l2.5-5L3 5l14 5zM5.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--txt)", margin: 0 }}>AuroRoteiro</h1>
          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(255,122,26,0.15)", color: "var(--orange)" }}>BETA</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--txt3)", margin: 0 }}>
          Gere roteiros de viagem personalizados com IA, com dados extraídos diretamente do voucher.
        </p>
      </div>

      <StepBar step={r.step} />

      {r.step === "modo" && <StepModo r={r} />}
      {r.step === "form" && <StepForm r={r} fileRef={fileRef} onDrop={handleDrop} />}
      {r.step === "pkg" && <StepPackage r={r} />}
      {r.step === "generating" && <StepGenerating r={r} />}
      {r.step === "result" && <StepResult r={r} />}
    </div>
  );
}

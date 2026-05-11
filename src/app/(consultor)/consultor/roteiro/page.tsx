"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import {
  useRoteiro, STYLES, BUDGETS, buildWhatsAppText,
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

/* ── Step bar ─────────────────────────────────────── */

function StepBar({ step }: { step: string }) {
  const steps = [
    { id: "form", label: "1. Viagem" },
    { id: "pkg",  label: "2. Pacote" },
    { id: "result", label: "3. Roteiro" },
  ];
  const idx = step === "generating" || step === "result" ? 2 : step === "pkg" ? 1 : 0;
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
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 12, color: "var(--txt2)" }}>Analisando documento...</div>
              </div>
            ) : r.fileName ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 12, color: "var(--txt2)", marginBottom: 4 }}>{r.fileName}</div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700 }}>{r.autoCount} campo{r.autoCount !== 1 ? "s" : ""} preenchido{r.autoCount !== 1 ? "s" : ""} automaticamente</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
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
          <div style={{ fontWeight: 700, color: "var(--txt2)", marginBottom: 6, fontSize: 12 }}>🔒 Privacidade</div>
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
                  <span>{s.icon}</span> {s.label}
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

        <button onClick={() => r.setStep("pkg")} disabled={!canNext} style={{
          height: 44, borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
          background: canNext ? "var(--orange)" : "var(--bg2)", color: canNext ? "#fff" : "var(--txt3)",
          transition: "all 0.2s",
        }}>
          Próximo: Dados do Pacote →
        </button>
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
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 130px 130px 1fr", gap: 10 }}>
          <LabeledInput label="Hotel / Navio" value={r.pkg.hotel} onChange={sf("hotel") as (v: string) => void} isAuto={ia("hotel")} placeholder="Hotel Bairro Alto" />
          <LabeledInput label="Cat. ★" value={r.pkg.hotelCat} onChange={sf("hotelCat") as (v: string) => void} isAuto={ia("hotelCat")} placeholder="5" />
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
          ✈ Gerar Roteiro com IA
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Generating ───────────────────────────── */

function StepGenerating({ r }: { r: ReturnType<typeof useRoteiro> }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
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
  const waText = buildWhatsAppText(r.form, r.pkg, r.parsed, r.pkg.agencia);
  const days = r.parsed ?? [];

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #roteiro-print, #roteiro-print * { visibility: visible; }
          #roteiro-print { position: absolute; inset: 0; padding: 32px; background: #fff; color: #111; font-family: 'Helvetica Neue', Arial, sans-serif; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={r.reset} style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          ← Novo roteiro
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { navigator.clipboard.writeText(waText); }}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          📋 Copiar para WhatsApp
        </button>
        <button
          onClick={() => r.downloadTxt(waText, r.form.destination)}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "var(--bg2)", color: "var(--txt2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          ⬇ Baixar .txt
        </button>
        <button
          onClick={() => window.print()}
          style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--orange)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          🖨 Imprimir
        </button>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        {/* Day list sidebar */}
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => r.setActiveDay(i)} style={{
              padding: "8px 12px", borderRadius: 10, border: "1.5px solid",
              borderColor: r.activeDay === i ? "var(--orange)" : "var(--bdr)",
              background: r.activeDay === i ? "rgba(255,122,26,0.1)" : "var(--bg2)",
              color: r.activeDay === i ? "var(--orange)" : "var(--txt2)",
              fontSize: 12, fontWeight: r.activeDay === i ? 700 : 500,
              textAlign: "left", cursor: "pointer", transition: "all 0.15s",
            }}>
              {d.title.length > 36 ? d.title.slice(0, 33) + "…" : d.title}
            </button>
          ))}
          {days.length === 0 && (
            <div style={{ ...card, fontSize: 12, color: "var(--txt3)", whiteSpace: "pre-wrap" }}>{r.streamText}</div>
          )}
        </div>

        {/* Day content */}
        <div style={card}>
          {days.length > 0 && days[r.activeDay] ? (
            <>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--txt)", marginBottom: 16 }}>{days[r.activeDay].title}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {days[r.activeDay].items.map((item, j) => (
                  <li key={j} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--txt2)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--orange)", flexShrink: 0, fontWeight: 700 }}>→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--txt3)", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{r.streamText}</div>
          )}
        </div>
      </div>

      {/* Print-only white-label content */}
      <div id="roteiro-print" style={{ display: "none" }}>
        {(r.pkg.agencia || r.pkg.consultor) && (
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #e5e7eb" }}>
            {r.pkg.agencia && <div style={{ fontSize: 20, fontWeight: 800 }}>{r.pkg.agencia}</div>}
            {r.pkg.consultor && <div style={{ fontSize: 14, color: "#555" }}>Consultor: {r.pkg.consultor}{r.pkg.telefone ? ` · ${r.pkg.telefone}` : ""}</div>}
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Roteiro de Viagem</h1>
          <div style={{ fontSize: 15, color: "#555", marginTop: 4 }}>
            {r.form.destination} · {r.form.days} dias · {r.form.travelers} viajante(s)
          </div>
          {r.pkg.hotel && (
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
              🏨 {r.pkg.hotel}{r.pkg.hotelCat ? ` (${r.pkg.hotelCat}★)` : ""} · {r.pkg.checkin} → {r.pkg.checkout}
            </div>
          )}
          {r.pkg.vooIdaOrigem && (
            <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
              ✈ Ida: {r.pkg.vooIdaOrigem}→{r.pkg.vooIdaDestino} {r.pkg.vooIdaData} {r.pkg.vooIdaHorario} · Volta: {r.pkg.vooVoltaData} {r.pkg.vooVoltaHorario}
            </div>
          )}
          {r.pkg.precoTotal && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginTop: 6 }}>
              R$ {r.pkg.precoTotal}{r.pkg.precoPessoa ? ` · R$ ${r.pkg.precoPessoa}/pax` : ""}{r.pkg.parcelas ? ` · ${r.pkg.parcelas}` : ""}
            </div>
          )}
        </div>
        {days.map((d, i) => (
          <div key={i} style={{ marginBottom: 20, pageBreakInside: "avoid" }}>
            <div style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ddd", paddingBottom: 4, marginBottom: 8 }}>{d.title}</div>
            {d.items.map((item, j) => (
              <div key={j} style={{ fontSize: 13, marginBottom: 4, paddingLeft: 12 }}>→ {item}</div>
            ))}
          </div>
        ))}
        {days.length === 0 && <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{r.streamText}</div>}
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
      const feats = await getFeatures(supabase, p);
      if (!feats.has("roteiro")) {
        router.push(homeForRole(p.role));
        return;
      }
      setAllowed(true);
    })();
  }, [router]);

  const r = useRoteiro();
  const fileRef = useRef<HTMLInputElement>(null);

  if (allowed === null) return <div className="text-[13px] text-[var(--txt3)]" style={{ padding: 32 }}>Carregando...</div>;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) r.extractFromFile(file);
  }, [r]);

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>✈</span>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--txt)", margin: 0 }}>AuroRoteiro</h1>
          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(255,122,26,0.15)", color: "var(--orange)" }}>BETA</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--txt3)", margin: 0 }}>
          Gere roteiros de viagem personalizados com IA, com dados extraídos diretamente do voucher.
        </p>
      </div>

      <StepBar step={r.step} />

      {r.step === "form" && <StepForm r={r} fileRef={fileRef} onDrop={handleDrop} />}
      {r.step === "pkg" && <StepPackage r={r} />}
      {r.step === "generating" && <StepGenerating r={r} />}
      {r.step === "result" && <StepResult r={r} />}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Config {
  active: boolean;
  message: string;
  scheduledEnd: string | null;
  scheduledStart: string | null;
  bannerHours: number;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
function fromLocalInput(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}
function timeUntil(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "agora";
  const m = Math.ceil(ms / 60_000);
  if (m < 60) return `em ${m} min`;
  return `em ${Math.ceil(m / 60)}h`;
}

async function upsert(key: string, value: string) {
  await supabase.from("system_config").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

export default function ManutencaoAdmPage() {
  const [cfg, setCfg] = useState<Config>({
    active: false,
    message: "",
    scheduledEnd: null,
    scheduledStart: null,
    bannerHours: 2,
  });
  const [saving, setSaving] = useState(false);
  const [confirmOn, setConfirmOn] = useState(false);
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/maintenance-status", { cache: "no-store" });
    const data = await res.json();
    setCfg(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) { setSaved(msg); setTimeout(() => setSaved(""), 3000); }

  async function toggleActive() {
    if (!cfg.active && !confirmOn) { setConfirmOn(true); return; }
    setConfirmOn(false);
    setSaving(true);
    await upsert("maintenance_active", (!cfg.active).toString());
    await load();
    flash(cfg.active ? "Sistema reativado." : "Manutenção ativada.");
    setSaving(false);
  }

  async function saveMessage() {
    setSaving(true);
    await upsert("maintenance_message", cfg.message);
    flash("Mensagem salva.");
    setSaving(false);
  }

  async function saveSchedule() {
    setSaving(true);
    await upsert("maintenance_scheduled_start", cfg.scheduledStart ?? "null");
    await upsert("maintenance_scheduled_end", cfg.scheduledEnd ?? "null");
    flash("Agendamento salvo.");
    setSaving(false);
  }

  async function clearSchedule() {
    setSaving(true);
    await upsert("maintenance_scheduled_start", "null");
    await upsert("maintenance_scheduled_end", "null");
    setCfg(c => ({ ...c, scheduledStart: null, scheduledEnd: null }));
    flash("Agendamento cancelado.");
    setSaving(false);
  }

  async function saveBanner() {
    setSaving(true);
    await upsert("maintenance_banner_hours", String(cfg.bannerHours));
    flash("Configuração salva.");
    setSaving(false);
  }

  const cardStyle: React.CSSProperties = {
    background: "#111827",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "24px 28px",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "rgba(200,210,255,0.5)",
    marginBottom: 10,
  };
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#EEF2FF",
    fontSize: 13,
    padding: "10px 14px",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
  };
  const btnPrimary: React.CSSProperties = {
    background: "#D4A843",
    color: "#000",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 12,
    fontWeight: 700,
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.6 : 1,
  };
  const btnGhost: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#EEF2FF",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 12,
    fontWeight: 600,
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.6 : 1,
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#EEF2FF", margin: 0 }}>Manutenção do Sistema</h1>
        <p style={{ fontSize: 12, color: "rgba(200,210,255,0.5)", marginTop: 4 }}>
          Controla o acesso de usuários ao Aurohub durante atualizações.
        </p>
      </div>

      {saved && (
        <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#22C55E", marginBottom: 20 }}>
          ✓ {saved}
        </div>
      )}

      {/* 1. STATUS */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={labelStyle}>Status atual</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: cfg.active ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.12)",
              border: `1px solid ${cfg.active ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              color: cfg.active ? "#f87171" : "#4ade80",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
              {cfg.active ? "SISTEMA EM MANUTENÇÃO" : "Sistema operacional"}
            </div>
          </div>

          {confirmOn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#fbbf24" }}>Confirmar ativação?</span>
              <button onClick={toggleActive} disabled={saving} style={{ ...btnPrimary, background: "#ef4444", color: "#fff" }}>Ativar</button>
              <button onClick={() => setConfirmOn(false)} style={btnGhost}>Cancelar</button>
            </div>
          ) : (
            <button onClick={toggleActive} disabled={saving} style={{
              ...btnPrimary,
              background: cfg.active ? "#4ade80" : "#ef4444",
              color: cfg.active ? "#000" : "#fff",
              minWidth: 140,
            }}>
              {saving ? "..." : cfg.active ? "Desativar manutenção" : "Ativar manutenção"}
            </button>
          )}
        </div>
      </div>

      {/* 2. AGENDAMENTO */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={labelStyle}>Agendamento</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 6 }}>Início</label>
            <input
              type="datetime-local"
              value={toLocalInput(cfg.scheduledStart)}
              onChange={e => setCfg(c => ({ ...c, scheduledStart: fromLocalInput(e.target.value) }))}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
            {cfg.scheduledStart && (
              <p style={{ fontSize: 10, color: "#D4A843", marginTop: 4 }}>{timeUntil(cfg.scheduledStart)}</p>
            )}
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 6 }}>Fim previsto</label>
            <input
              type="datetime-local"
              value={toLocalInput(cfg.scheduledEnd)}
              onChange={e => setCfg(c => ({ ...c, scheduledEnd: fromLocalInput(e.target.value) }))}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveSchedule} disabled={saving} style={btnPrimary}>Salvar agendamento</button>
          {(cfg.scheduledStart || cfg.scheduledEnd) && (
            <button onClick={clearSchedule} disabled={saving} style={{ ...btnGhost, color: "#f87171" }}>Cancelar agendamento</button>
          )}
        </div>
      </div>

      {/* 3. MENSAGEM */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={labelStyle}>Mensagem personalizada</p>
        <textarea
          value={cfg.message}
          onChange={e => setCfg(c => ({ ...c, message: e.target.value }))}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Estamos realizando melhorias..."
        />

        {/* Mini preview */}
        <div style={{
          marginTop: 14,
          background: "#060D1A",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 9, color: "rgba(200,210,255,0.3)", letterSpacing: ".1em", textTransform: "uppercase" }}>preview da tela de manutenção</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#EEF2FF" }}>Sistema em Manutenção</span>
          <span style={{ fontSize: 11, color: "rgba(200,215,255,0.6)", textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>{cfg.message || "(sem mensagem)"}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={saveMessage} disabled={saving} style={btnPrimary}>Salvar mensagem</button>
          <a href="/manutencao" target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Ver tela completa ↗
          </a>
        </div>
      </div>

      {/* 4. AVISO ANTECIPADO */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={labelStyle}>Aviso antecipado (banner)</p>
        <p style={{ fontSize: 12, color: "rgba(200,210,255,0.5)", marginBottom: 14 }}>
          Mostrar banner de aviso X horas antes do início agendado.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <input
            type="range" min={0} max={24} step={1}
            value={cfg.bannerHours}
            onChange={e => setCfg(c => ({ ...c, bannerHours: +e.target.value }))}
            style={{ flex: 1, accentColor: "#D4A843" }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#D4A843", minWidth: 40, textAlign: "right" }}>
            {cfg.bannerHours}h
          </span>
        </div>

        {/* Banner preview */}
        <div style={{
          background: "linear-gradient(90deg, #FF7A1A, #D4A843)",
          padding: "8px 16px",
          borderRadius: 6,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "#000",
          marginBottom: 14,
        }}>
          ⚠ Manutenção programada em {cfg.bannerHours}h. Salve seu trabalho.
        </div>

        <button onClick={saveBanner} disabled={saving} style={btnPrimary}>Salvar configuração</button>
      </div>
    </div>
  );
}

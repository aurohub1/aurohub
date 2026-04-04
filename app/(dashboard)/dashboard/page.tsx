"use client";

import { useState } from "react";

const STATS = [
  { label: "Clientes Ativos", value: "12", delta: "+3", up: true, accent: "var(--blue)" },
  { label: "Posts Hoje", value: "34", delta: "+12", up: true, accent: "var(--gold)" },
  { label: "Engajamento", value: "7.8%", delta: "+1.2%", up: true, accent: "var(--success)" },
  { label: "Tokens", value: "Ativo", delta: "3 contas", up: true, accent: "var(--orange)" },
];

const ACTIVITY = [
  { user: "AZV Rio Preto", action: "Publicou 3 stories — Cancún", time: "15 min", dot: "var(--gold)" },
  { user: "AZV Barretos", action: "Agendou post — Cruzeiro MSC", time: "1h", dot: "var(--orange)" },
  { user: "AZV Damha", action: "Baixou arte — Porto Seguro", time: "2h", dot: "var(--blue)" },
  { user: "Sistema", action: "Pack 30 ativado — AZV Rio Preto", time: "5h", dot: "var(--border)" },
  { user: "Sistema", action: "Cron — 2 posts publicados", time: "6h", dot: "var(--border)" },
];

const FORMATS = [
  { label: "Stories", used: 24, total: 60, color: "var(--blue)" },
  { label: "Feed", used: 18, total: 30, color: "var(--gold)" },
  { label: "Reels", used: 6, total: 30, color: "var(--orange)" },
  { label: "TV", used: 2, total: 10, color: "var(--blue-deep)" },
];

const CHART = [28,45,38,62,55,72,68,85,78,92,88,95,90,105,98,112,108,118,115,125,120,130,128,135,132,140,138,142,140,145];

function Chart() {
  const max = Math.max(...CHART), min = Math.min(...CHART);
  const w = 500, h = 120;
  const pts = CHART.map((v, i) => ({ x: (i / (CHART.length - 1)) * w, y: h - ((v - min) / (max - min)) * h }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 120 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--blue)" />
          <stop offset="50%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--orange)" />
        </linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={d + ` L${w},${h} L0,${h} Z`} fill="url(#cg)" />
      <path d={d} fill="none" stroke="url(#cl)" strokeWidth="2.5" filter="url(#gl)" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="4" fill="var(--orange)" filter="url(#gl)" />
    </svg>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Aurohub v2 — Visão geral</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/publish" style={{
            padding: "8px 18px", borderRadius: 10, textDecoration: "none",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 12, color: "#0B1120", fontWeight: 700,
            boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
          }}>+ Nova Publicação</a>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "var(--gold)",
          }}>D</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            padding: "20px 22px", borderRadius: 18,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            position: "relative", overflow: "hidden",
            boxShadow: "var(--card-shadow)", transition: "all 0.35s ease",
          }}>
            <div style={{
              position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%",
              background: `radial-gradient(circle, ${s.accent} 0%, transparent 70%)`, opacity: 0.08,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.4,
              background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`,
            }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>{s.label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: "var(--text)" }}>{s.value}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "var(--success)",
                padding: "2px 8px", borderRadius: 6, background: "rgba(72,187,120,0.1)",
              }}>{s.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Chart */}
        <div style={{
          padding: 24, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)", transition: "all 0.35s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Performance de Posts</h2>
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-input)" }}>
              {["7d", "30d", "90d"].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none",
                  background: period === p ? "rgba(212,168,67,0.12)" : "transparent",
                  color: period === p ? "var(--gold)" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>{p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}</button>
              ))}
            </div>
          </div>
          <Chart />

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 14px", color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase" }}>Uso por Formato</h3>
            {FORMATS.map((f) => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.used}/{f.total}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--border-light)" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, width: `${(f.used / f.total) * 100}%`,
                    background: f.color, transition: "width 1s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick actions */}
          <div style={{
            padding: 20, borderRadius: 18,
            background: "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(255,122,26,0.04))",
            border: "1px solid rgba(212,168,67,0.1)",
            boxShadow: "var(--card-shadow)",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "var(--gold)" }}>Ações Rápidas</h3>
            {["Criar Post", "Abrir Editor", "Ver Agendamentos", "Gerenciar Templates"].map((a) => (
              <a key={a} href="#" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: "var(--text)", textDecoration: "none",
                fontSize: 12, fontWeight: 500, marginBottom: 8, transition: "all 0.2s",
              }}>{a}<span style={{ color: "var(--text-muted)" }}>→</span></a>
            ))}
          </div>

          {/* Activity */}
          <div style={{
            padding: 20, borderRadius: 18, flex: 1,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "var(--text-secondary)" }}>Atividade Recente</h3>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0,
                  background: a.dot,
                }} />
                <div>
                  <p style={{ fontSize: 12, margin: 0, color: "var(--text)", fontWeight: 500, lineHeight: 1.4 }}>
                    <span style={{ color: "var(--gold)" }}>{a.user}</span> {a.action}
                  </p>
                  <p style={{ fontSize: 10, margin: "3px 0 0", color: "var(--text-muted)" }}>{a.time} atrás</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

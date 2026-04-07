"use client";

import { useState, useEffect } from "react";

interface MetricsData {
  stats: {
    totalPosts: number;
    publicados: number;
    agendados: number;
    erros: number;
    rascunhos: number;
    taxaSucesso: string;
  };
  chart: { data: string; publicado: number; agendado: number; erro: number; rascunho: number }[];
  formatos: { stories: number; feed: number; reels: number; transmissao: number };
  topUsers: { nome: string; total: number; publicados: number }[];
  horasPublicacao: number[];
  ultimosErros: { formato: string; erro: string; data: string }[];
}

export default function MetricsPage() {
  const [periodo, setPeriodo] = useState("30d");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics?periodo=${periodo}`)
      .then(r => r.json())
      .then(d => { if (d.stats) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [periodo]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
        Carregando métricas...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
        Erro ao carregar métricas
      </div>
    );
  }

  const s = data.stats;
  const fmt = data.formatos;
  const totalFmt = Math.max(fmt.stories + fmt.feed + fmt.reels + fmt.transmissao, 1);

  const STATS = [
    { label: "Total de Posts", value: String(s.totalPosts), accent: "var(--blue)" },
    { label: "Publicados", value: String(s.publicados), accent: "var(--success)" },
    { label: "Agendados", value: String(s.agendados), accent: "var(--gold)" },
    { label: "Taxa de Sucesso", value: `${s.taxaSucesso}%`, accent: s.erros > 0 ? "var(--orange)" : "var(--success)" },
  ];

  const FORMATS = [
    { label: "Stories", count: fmt.stories, color: "var(--blue)" },
    { label: "Feed", count: fmt.feed, color: "var(--gold)" },
    { label: "Reels", count: fmt.reels, color: "var(--orange)" },
    { label: "Transmissão", count: fmt.transmissao, color: "#6366f1" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Métricas</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Relatórios de publicações e uso</p>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: periodo === p ? "rgba(212,168,67,0.12)" : "transparent",
              color: periodo === p ? "var(--gold)" : "var(--text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>{p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}</button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {STATS.map((st, i) => (
          <div key={i} style={{
            padding: "20px 22px", borderRadius: 18,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            position: "relative", overflow: "hidden", boxShadow: "var(--card-shadow)",
          }}>
            <div style={{
              position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%",
              background: `radial-gradient(circle, ${st.accent} 0%, transparent 70%)`, opacity: 0.08,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.4,
              background: `linear-gradient(90deg, transparent, ${st.accent}, transparent)`,
            }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>{st.label}</p>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: "var(--text)", display: "block", marginTop: 8 }}>{st.value}</span>
          </div>
        ))}
      </div>

      {/* Grid principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
        {/* Chart de posts ao longo do tempo */}
        <div style={{
          padding: 24, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Posts ao Longo do Tempo</h2>
          <TimeChart chart={data.chart} />
          <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center" }}>
            <Legend color="var(--success)" label="Publicados" />
            <Legend color="var(--gold)" label="Agendados" />
            <Legend color="var(--danger)" label="Erros" />
          </div>
        </div>

        {/* Formato breakdown */}
        <div style={{
          padding: 24, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)", display: "flex", flexDirection: "column",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Distribuição por Formato</h2>
          <DonutChart formatos={FORMATS} total={totalFmt} />
          <div style={{ marginTop: 20 }}>
            {FORMATS.map(f => (
              <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.count}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 36, textAlign: "right" }}>
                    {totalFmt > 0 ? ((f.count / totalFmt) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid inferior */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Horários mais ativos */}
        <div style={{
          padding: 24, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Horários de Publicação</h2>
          <HoursChart horas={data.horasPublicacao} />
        </div>

        {/* Top Usuários + Erros */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Usuários */}
          <div style={{
            padding: 24, borderRadius: 18, flex: 1,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Top Usuários</h2>
            {data.topUsers.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum dado no período</p>
            ) : (
              data.topUsers.map((u, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < data.topUsers.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, background: i === 0 ? "rgba(212,168,67,0.15)" : "var(--bg-input)",
                      color: i === 0 ? "var(--gold)" : "var(--text-muted)",
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{u.nome}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{u.total}</span>
                    <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>{u.publicados} pub</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Últimos Erros */}
          {data.ultimosErros.length > 0 && (
            <div style={{
              padding: 20, borderRadius: 18,
              background: "rgba(245,101,101,0.04)", border: "1px solid rgba(245,101,101,0.12)",
              boxShadow: "var(--card-shadow)",
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--danger)" }}>Últimos Erros</h2>
              {data.ultimosErros.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--orange)", fontWeight: 700, textTransform: "uppercase" }}>{e.formato}</span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{new Date(e.data).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.4 }}>{e.erro}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Chart Components ===== */

function TimeChart({ chart }: { chart: MetricsData["chart"] }) {
  if (!chart.length) return null;

  const totals = chart.map(d => d.publicado + d.agendado + d.erro + d.rascunho);
  const max = Math.max(...totals, 1);
  const w = 600, h = 140;
  const step = w / (chart.length - 1 || 1);

  const makePath = (getter: (d: MetricsData["chart"][0]) => number) => {
    const pts = chart.map((d, i) => ({ x: i * step, y: h - (getter(d) / max) * h }));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  };

  const pubPath = makePath(d => d.publicado);
  const agdPath = makePath(d => d.agendado);
  const errPath = makePath(d => d.erro);

  // Labels de data
  const labelInterval = chart.length <= 7 ? 1 : chart.length <= 30 ? 5 : 15;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: "100%", height: 160 }}>
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
          <filter id="mgl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1="0" y1={h * pct} x2={w} y2={h * pct} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.5" />
        ))}
        {/* Area under published */}
        <path d={pubPath + ` L${(chart.length - 1) * step},${h} L0,${h} Z`} fill="url(#mg)" />
        {/* Lines */}
        <path d={pubPath} fill="none" stroke="var(--success)" strokeWidth="2" filter="url(#mgl)" strokeLinecap="round" strokeLinejoin="round" />
        <path d={agdPath} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d={errPath} fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        {/* X labels */}
        {chart.map((d, i) => {
          if (i % labelInterval !== 0 && i !== chart.length - 1) return null;
          const label = d.data.slice(5).replace("-", "/");
          return (
            <text key={i} x={i * step} y={h + 16} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{label}</text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ formatos, total }: { formatos: { label: string; count: number; color: string }[]; total: number }) {
  const size = 140;
  const cx = size / 2, cy = size / 2, r = 52, stroke = 14;

  let cumAngle = -90;
  const arcs = formatos.filter(f => f.count > 0).map(f => {
    const pct = f.count / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...f, startAngle, angle };
  });

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity="0.3" />
        {arcs.map((a, i) => {
          const start = toRad(a.startAngle);
          const end = toRad(a.startAngle + a.angle - 1);
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end);
          const y2 = cy + r * Math.sin(end);
          const largeArc = a.angle > 180 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="var(--text-muted)" letterSpacing="1">POSTS</text>
      </svg>
    </div>
  );
}

function HoursChart({ horas }: { horas: number[] }) {
  const max = Math.max(...horas, 1);
  const barW = 100 / 24;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", height: 100, gap: 2, padding: "0 2px" }}>
        {horas.map((h, i) => {
          const pct = (h / max) * 100;
          const isActive = pct > 50;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "100%", maxWidth: 18, height: `${Math.max(pct, 3)}%`, borderRadius: 3,
                background: isActive
                  ? "linear-gradient(180deg, var(--gold), var(--orange))"
                  : h > 0 ? "rgba(212,168,67,0.25)" : "var(--border)",
                transition: "height 0.5s ease",
              }} title={`${i}h — ${h} publicações`} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", marginTop: 6, padding: "0 2px" }}>
        {horas.map((_, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            {i % 3 === 0 && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{i}h</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 3, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

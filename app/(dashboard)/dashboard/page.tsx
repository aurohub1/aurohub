"use client";

import { useState, useEffect } from "react";

interface DashData {
  stats: {
    usuarios_ativos: number;
    clientes_ativos: number;
    posts_hoje: number;
    total_posts: number;
    posts_publicados: number;
    lojas_com_ig: number;
    total_lojas: number;
    mrr: number;
    notificacoes_nao_lidas: number;
    agendamentos_pendentes: number;
  };
  tokens_expirando: { nome: string; dias: number }[];
  online: { nome: string; loja: string; pagina: string }[];
  formatos: { stories: number; feed: number; reels: number; transmissao: number };
  chart: number[];
  activity: { user: string; action: string; formato: string; time: string }[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Chart({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 500, h = 120;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - (v / max) * h }));
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
      {pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="var(--orange)" filter="url(#gl)" />}
    </svg>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");
  const [dash, setDash] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setDash(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s = dash?.stats;
  const taxa = s && s.total_posts > 0 ? ((s.posts_publicados / s.total_posts) * 100).toFixed(1) : "0";

  const STATS = [
    { label: "Clientes Ativos", value: s ? String(s.clientes_ativos) : "—", delta: s ? `${s.usuarios_ativos} usuários` : "", accent: "var(--blue)", href: "/admin/clientes" },
    { label: "Posts Hoje", value: s ? String(s.posts_hoje) : "—", delta: s ? `${s.total_posts} total` : "", accent: "var(--gold)", href: "/admin/logs" },
    { label: "MRR", value: s ? `R$ ${s.mrr.toLocaleString("pt-BR")}` : "—", delta: "receita mensal", accent: "var(--success)", href: "/admin/planos" },
    { label: "Instagram", value: s ? `${s.lojas_com_ig}/${s.total_lojas}` : "—", delta: s && s.lojas_com_ig > 0 ? "Conectado" : "Sem token", accent: "var(--orange)", href: "/admin/instagram" },
  ];

  const fmt = dash?.formatos || { stories: 0, feed: 0, reels: 0, transmissao: 0 };
  const totalFmt = Math.max(fmt.stories + fmt.feed + fmt.reels + fmt.transmissao, 1);
  const FORMATS = [
    { label: "Stories", used: fmt.stories, total: totalFmt, color: "var(--blue)" },
    { label: "Feed", used: fmt.feed, total: totalFmt, color: "var(--gold)" },
    { label: "Reels", used: fmt.reels, total: totalFmt, color: "var(--orange)" },
    { label: "TV", used: fmt.transmissao, total: totalFmt, color: "var(--text-muted)" },
  ];

  const DOT_COLORS: Record<string, string> = {
    stories: "var(--blue)", feed: "var(--gold)", reels: "var(--orange)", transmissao: "var(--text-muted)",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Aurohub — Visão geral</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(s?.notificacoes_nao_lidas || 0) > 0 && (
            <div style={{
              padding: "6px 14px", borderRadius: 10, background: "rgba(245,101,101,0.1)",
              border: "1px solid rgba(245,101,101,0.2)", fontSize: 11, fontWeight: 700, color: "var(--danger)",
            }}>{s?.notificacoes_nao_lidas} notificações</div>
          )}
          {(s?.agendamentos_pendentes || 0) > 0 && (
            <a href="/schedule" style={{
              padding: "6px 14px", borderRadius: 10, background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)", fontSize: 11, fontWeight: 700, color: "var(--blue)",
              textDecoration: "none",
            }}>{s?.agendamentos_pendentes} agendados</a>
          )}
          <a href="/publish" style={{
            padding: "8px 18px", borderRadius: 10, textDecoration: "none",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 12, color: "#0B1120", fontWeight: 700,
            boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
          }}>+ Nova Publicação</a>
        </div>
      </div>

      {/* Token alerts */}
      {dash?.tokens_expirando && dash.tokens_expirando.length > 0 && (
        <div style={{
          padding: "12px 20px", borderRadius: 12, marginBottom: 20,
          background: "rgba(255,122,26,0.06)", border: "1px solid rgba(255,122,26,0.15)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--orange)" }}>Tokens expirando: </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {dash.tokens_expirando.map(t => `${t.nome} (${t.dias}d)`).join(" · ")}
            </span>
          </div>
          <a href="/admin/instagram" style={{ fontSize: 11, color: "var(--orange)", fontWeight: 600, textDecoration: "none" }}>Renovar →</a>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {STATS.map((st, i) => (
          <a key={i} href={st.href} style={{
            padding: "20px 22px", borderRadius: 18,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            position: "relative", overflow: "hidden", textDecoration: "none",
            boxShadow: "var(--card-shadow)", transition: "all 0.35s ease",
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: "var(--text)" }}>{st.value}</span>
              {st.delta && (
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)" }}>{st.delta}</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Left: Chart + Formats */}
        <div style={{
          padding: 24, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--text)" }}>Performance de Posts</h2>
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-input)" }}>
              {["7d", "30d", "90d"].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none",
                  background: period === p ? "rgba(212,168,67,0.12)" : "transparent",
                  color: period === p ? "var(--gold)" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>{p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}</button>
              ))}
            </div>
          </div>
          <Chart data={dash?.chart || []} />

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 14px", color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase" }}>Uso por Formato</h3>
            {FORMATS.map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.used}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--border-light)" }}>
                  <div style={{ height: "100%", borderRadius: 2, width: `${(f.used / f.total) * 100}%`, background: f.color, transition: "width 1s ease", minWidth: f.used > 0 ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Online users */}
          {dash?.online && dash.online.length > 0 && (
            <div style={{
              padding: 20, borderRadius: 18,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              boxShadow: "var(--card-shadow)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--success)", animation: "pulse 2s infinite" }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-secondary)" }}>Online agora ({dash.online.length})</h3>
              </div>
              {dash.online.map((u, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < dash.online.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{u.nome}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>{u.loja}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4, background: "var(--bg-input)" }}>{u.pagina || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div style={{
            padding: 20, borderRadius: 18,
            background: "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(255,122,26,0.04))",
            border: "1px solid rgba(212,168,67,0.1)",
            boxShadow: "var(--card-shadow)",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "var(--gold)" }}>Ações Rápidas</h3>
            {[
              { label: "Criar Post", href: "/publish" },
              { label: "Ver Agendamentos", href: "/schedule" },
              { label: "Gerenciar Clientes", href: "/admin/clientes" },
              { label: "Gerenciar Usuários", href: "/admin/usuarios" },
              { label: "Templates", href: "/admin/templates" },
            ].map(a => (
              <a key={a.label} href={a.href} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: "var(--text)", textDecoration: "none",
                fontSize: 12, fontWeight: 500, marginBottom: 8,
              }}>{a.label}<span style={{ color: "var(--text-muted)" }}>→</span></a>
            ))}
          </div>

          {/* Activity */}
          <div style={{
            padding: 20, borderRadius: 18, flex: 1,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "var(--text-secondary)" }}>Atividade Recente</h3>
            {(!dash?.activity || dash.activity.length === 0) ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhuma atividade ainda</p>
            ) : dash.activity.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0,
                  background: DOT_COLORS[a.formato] || "var(--border)",
                }} />
                <div>
                  <p style={{ fontSize: 12, margin: 0, color: "var(--text)", fontWeight: 500, lineHeight: 1.4 }}>
                    <span style={{ color: "var(--gold)" }}>{a.user}</span> {a.action}
                  </p>
                  <p style={{ fontSize: 10, margin: "2px 0 0", color: "var(--text-muted)" }}>{timeAgo(a.time)} atrás</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

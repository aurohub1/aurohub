"use client";

import { useEffect, useState } from "react";

interface Log {
  id: string;
  usuario_id: string;
  loja_id: string;
  acao: string;
  formato: string;
  detalhes: Record<string, unknown>;
  created_at: string;
  usuario_nome: string;
  loja_nome: string;
}

interface LogUser { id: string; nome: string; }

const FORMATO_COLORS: Record<string, string> = {
  stories: "var(--blue)", feed: "var(--gold)", reels: "var(--orange)", transmissao: "#6366f1", tv: "var(--text-muted)",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<LogUser[]>([]);

  // Filtros
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroFormato, setFiltroFormato] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("30d");
  const [busca, setBusca] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  async function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit), periodo: filtroPeriodo });
    if (filtroAcao) params.set("acao", filtroAcao);
    if (filtroFormato) params.set("formato", filtroFormato);
    if (filtroUsuario) params.set("usuario_id", filtroUsuario);
    if (busca) params.set("busca", busca);

    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotal(data.total);
        setAcoes(data.acoes);
        setUsuarios(data.usuarios);
      }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, [page, filtroAcao, filtroFormato, filtroUsuario, filtroPeriodo]);

  function handleSearch() { setPage(1); fetchLogs(); }

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--bg-input)",
    color: "var(--text)", fontSize: 13, outline: "none",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Logs de Atividade</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {total} registros no período
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d", "all"] as const).map(p => (
            <button key={p} onClick={() => { setFiltroPeriodo(p); setPage(1); }} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: filtroPeriodo === p ? "rgba(212,168,67,0.12)" : "transparent",
              color: filtroPeriodo === p ? "var(--gold)" : "var(--text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "90d" ? "90 dias" : "Todos"}</button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
        padding: 16, borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <input
          placeholder="Buscar ação..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filtroAcao} onChange={e => { setFiltroAcao(e.target.value); setPage(1); }} style={{ ...inputStyle, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroFormato} onChange={e => { setFiltroFormato(e.target.value); setPage(1); }} style={{ ...inputStyle, width: "auto", minWidth: 130, cursor: "pointer" }}>
          <option value="">Todos formatos</option>
          {["stories", "feed", "reels", "transmissao", "tv"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filtroUsuario} onChange={e => { setFiltroUsuario(e.target.value); setPage(1); }} style={{ ...inputStyle, width: "auto", minWidth: 150, cursor: "pointer" }}>
          <option value="">Todos os usuários</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>
      ) : logs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13,
        }}>Nenhum log encontrado para os filtros selecionados</div>
      ) : (
        <div style={{
          borderRadius: 18, overflow: "hidden",
          background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Quando", "Usuário", "Ação", "Formato", "Loja", "Detalhes"].map(h => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: "left", fontSize: 10,
                    fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    <div>{timeAgo(log.created_at)}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.6 }}>
                      {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>{log.usuario_nome}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text)" }}>{log.acao}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {log.formato ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                        background: `${FORMATO_COLORS[log.formato] || "var(--text-muted)"}15`,
                        color: FORMATO_COLORS[log.formato] || "var(--text-muted)",
                        letterSpacing: 0.8, textTransform: "uppercase",
                      }}>{log.formato}</span>
                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{log.loja_nome}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {log.detalhes && Object.keys(log.detalhes).length > 0 ? (
                      <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} style={{
                        padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)",
                        background: "var(--bg-input)", color: "var(--blue)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                      }}>{expandedId === log.id ? "Fechar" : "Ver"}</button>
                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detalhes expandidos */}
          {expandedId && (() => {
            const log = logs.find(l => l.id === expandedId);
            if (!log || !log.detalhes) return null;
            return (
              <div style={{
                margin: "0 16px 16px", padding: 14, borderRadius: 10,
                background: "var(--bg-input)", border: "1px solid var(--border)",
                fontSize: 11, fontFamily: "monospace", color: "var(--text-secondary)",
                maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap",
              }}>
                {JSON.stringify(log.detalhes, null, 2)}
              </div>
            );
          })()}

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              padding: "16px 0", borderTop: "1px solid var(--border)",
            }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: page <= 1 ? "var(--text-muted)" : "var(--text)",
                fontSize: 12, fontWeight: 600, cursor: page <= 1 ? "default" : "pointer",
              }}>Anterior</button>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {page} de {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: page >= totalPages ? "var(--text-muted)" : "var(--text)",
                fontSize: 12, fontWeight: 600, cursor: page >= totalPages ? "default" : "pointer",
              }}>Próxima</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

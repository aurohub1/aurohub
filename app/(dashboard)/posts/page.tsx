"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string;
  imagem_url: string;
  legenda: string;
  formato: string;
  status: "rascunho" | "agendado" | "publicado" | "erro";
  ig_media_id: string | null;
  agendado_para: string | null;
  publicado_em: string | null;
  erro_msg: string | null;
  created_at: string;
  loja_nome: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: "Rascunho", color: "var(--text-muted)", bg: "rgba(255,255,255,0.05)" },
  agendado: { label: "Agendado", color: "var(--blue)", bg: "rgba(59,130,246,0.1)" },
  publicado: { label: "Publicado", color: "var(--success)", bg: "rgba(72,187,120,0.1)" },
  erro: { label: "Erro", color: "var(--danger)", bg: "rgba(245,101,101,0.1)" },
};

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

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLegenda, setEditLegenda] = useState("");

  const limit = 30;
  const totalPages = Math.ceil(total / limit);

  async function fetchPosts() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filtroStatus) params.set("status", filtroStatus);

    try {
      const res = await fetch(`/api/postagens?${params}`);
      const data = await res.json();
      if (res.ok) { setPosts(data.posts); setTotal(data.total); }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, [page, filtroStatus]);

  async function handleEditLegenda(id: string) {
    await fetch("/api/postagens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, legenda: editLegenda }),
    });
    setEditingId(null);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, legenda: editLegenda } : p));
  }

  async function handleDelete(post: Post) {
    if (!confirm("Excluir este rascunho?")) return;
    await fetch("/api/postagens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id }),
    });
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setTotal(t => t - 1);
  }

  const counts = {
    todos: total,
    rascunho: posts.filter(p => p.status === "rascunho").length,
    publicado: posts.filter(p => p.status === "publicado").length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Meus Posts</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{total} postagens</p>
        </div>
        <a href="/publish" style={{
          padding: "8px 18px", borderRadius: 10, textDecoration: "none",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Nova Publicação</a>
      </div>

      {/* Tabs de status */}
      <div style={{
        display: "flex", gap: 3, padding: 3, borderRadius: 12,
        background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: 20, width: "fit-content",
      }}>
        {[
          { value: "", label: "Todos" },
          { value: "rascunho", label: "Rascunhos" },
          { value: "publicado", label: "Publicados" },
          { value: "agendado", label: "Agendados" },
          { value: "erro", label: "Erros" },
        ].map(tab => (
          <button key={tab.value} onClick={() => { setFiltroStatus(tab.value); setPage(1); }} style={{
            padding: "8px 16px", borderRadius: 9, border: "none",
            background: filtroStatus === tab.value ? "rgba(212,168,67,0.12)" : "transparent",
            color: filtroStatus === tab.value ? "var(--gold)" : "var(--text-muted)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Grid de posts */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13,
        }}>Nenhum post encontrado</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280, 1fr))", gap: 16 }}>
          {posts.map(post => {
            const st = STATUS_CONFIG[post.status] || STATUS_CONFIG.rascunho;
            const isEditing = editingId === post.id;

            return (
              <div key={post.id} style={{
                borderRadius: 16, overflow: "hidden",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                boxShadow: "var(--card-shadow)", transition: "all 0.2s",
              }}>
                {/* Thumbnail */}
                <div style={{ position: "relative", height: 180, overflow: "hidden", background: "#0a0f18" }}>
                  <img src={post.imagem_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
                      background: st.bg, color: st.color, backdropFilter: "blur(8px)",
                    }}>{st.label}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
                      background: `${FORMATO_COLORS[post.formato] || "var(--text-muted)"}20`,
                      color: FORMATO_COLORS[post.formato] || "var(--text-muted)",
                      backdropFilter: "blur(8px)", textTransform: "uppercase",
                    }}>{post.formato}</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "12px 14px" }}>
                  {/* Legenda */}
                  {isEditing ? (
                    <div style={{ marginBottom: 8 }}>
                      <textarea value={editLegenda} onChange={e => setEditLegenda(e.target.value)}
                        rows={3} style={{
                          width: "100%", padding: "8px 10px", borderRadius: 8,
                          border: "1px solid var(--border)", background: "var(--bg-input)",
                          color: "var(--text)", fontSize: 11, resize: "vertical", boxSizing: "border-box",
                          fontFamily: "inherit",
                        }} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button onClick={() => handleEditLegenda(post.id)} style={{
                          flex: 1, padding: "6px 0", borderRadius: 6, border: "none",
                          background: "var(--gold)", color: "#0B1120", fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>Salvar</button>
                        <button onClick={() => setEditingId(null)} style={{
                          padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                          background: "var(--bg-input)", color: "var(--text-muted)", fontSize: 10, cursor: "pointer",
                        }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px",
                      lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{post.legenda || "Sem legenda"}</p>
                  )}

                  {/* Meta */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{post.loja_nome}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                  </div>

                  {/* Erro */}
                  {post.status === "erro" && post.erro_msg && (
                    <p style={{ fontSize: 9, color: "var(--danger)", margin: "0 0 8px", lineHeight: 1.3 }}>
                      {post.erro_msg.slice(0, 80)}
                    </p>
                  )}

                  {/* Ações */}
                  {!isEditing && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingId(post.id); setEditLegenda(post.legenda); }} style={{
                        flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid var(--border)",
                        background: "var(--bg-input)", color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                      }}>Editar</button>
                      {post.status === "rascunho" && (
                        <button onClick={() => handleDelete(post)} style={{
                          padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                          background: "var(--bg-input)", color: "var(--danger)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                        }}>Excluir</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
          padding: "24px 0",
        }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-card)", color: page <= 1 ? "var(--text-muted)" : "var(--text)",
            fontSize: 12, fontWeight: 600, cursor: page <= 1 ? "default" : "pointer",
          }}>Anterior</button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-card)", color: page >= totalPages ? "var(--text-muted)" : "var(--text)",
            fontSize: 12, fontWeight: 600, cursor: page >= totalPages ? "default" : "pointer",
          }}>Próxima</button>
        </div>
      )}
    </div>
  );
}

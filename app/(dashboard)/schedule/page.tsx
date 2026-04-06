"use client";

import { useEffect, useState, useMemo } from "react";

interface Post {
  id: string;
  imagem_url: string;
  legenda: string;
  formato: string;
  status: string;
  agendado_para: string | null;
  publicado_em: string | null;
  erro_msg: string | null;
  created_at: string;
  usuario_nome: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  agendado: { bg: "rgba(59,130,246,0.1)", color: "var(--blue)", label: "Agendado" },
  publicado: { bg: "rgba(72,187,120,0.1)", color: "var(--success)", label: "Publicado" },
  erro: { bg: "rgba(245,101,101,0.1)", color: "var(--danger)", label: "Erro" },
};

const FORMATO_COLORS: Record<string, string> = {
  stories: "var(--blue)", feed: "var(--gold)", reels: "var(--orange)", tv: "var(--text-muted)",
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function SchedulePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<"agendado" | "publicado" | "erro">("agendado");

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    await fetch("/api/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchPosts();
  }

  // Calendar data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days: { day: number; date: string }[] = [];

    for (let i = 0; i < firstDay; i++) days.push({ day: 0, date: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, date });
    }
    return days;
  }, [calMonth, calYear]);

  // Posts por dia
  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const p of posts) {
      const dateStr = p.agendado_para ? p.agendado_para.slice(0, 10) : p.publicado_em ? p.publicado_em.slice(0, 10) : "";
      if (!dateStr) continue;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(p);
    }
    return map;
  }, [posts]);

  const today = new Date().toISOString().slice(0, 10);

  const filteredPosts = posts.filter(p => {
    if (p.status !== tab) return false;
    if (selectedDate) {
      const dateStr = p.agendado_para?.slice(0, 10) || p.publicado_em?.slice(0, 10) || "";
      if (dateStr !== selectedDate) return false;
    }
    return true;
  });

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Agendamentos</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {posts.filter(p => p.status === "agendado").length} agendados — {posts.filter(p => p.status === "publicado").length} publicados
          </p>
        </div>
        <a href="/publish" style={{
          padding: "8px 18px", borderRadius: 10, textDecoration: "none",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Nova Publicação</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* Lista */}
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: 16, width: "fit-content" }}>
            {(["agendado", "publicado", "erro"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 16px", borderRadius: 8, border: "none",
                background: tab === t ? `${STATUS_COLORS[t].bg}` : "transparent",
                color: tab === t ? STATUS_COLORS[t].color : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>{STATUS_COLORS[t].label} ({posts.filter(p => p.status === t).length})</button>
            ))}
          </div>

          {selectedDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Filtrando: {new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR")}
              </span>
              <button onClick={() => setSelectedDate(null)} style={{
                padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)",
                background: "var(--bg-input)", color: "var(--text-muted)", fontSize: 10, cursor: "pointer",
              }}>Limpar</button>
            </div>
          )}

          {/* Posts list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredPosts.length === 0 ? (
              <div style={{
                padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13,
                borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)",
              }}>Nenhuma publicação {STATUS_COLORS[tab].label.toLowerCase()}</div>
            ) : filteredPosts.map(p => (
              <div key={p.id} style={{
                display: "flex", gap: 14, padding: 16, borderRadius: 14,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                boxShadow: "var(--card-shadow)", transition: "all 0.2s",
              }}>
                {/* Thumbnail */}
                <div style={{
                  width: 56, height: 56, borderRadius: 10, overflow: "hidden",
                  background: "var(--bg-input)", flexShrink: 0,
                }}>
                  <img src={p.imagem_url} alt="" style={{ width: 56, height: 56, objectFit: "cover" }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                      background: `${FORMATO_COLORS[p.formato]}15`, color: FORMATO_COLORS[p.formato],
                      textTransform: "uppercase", letterSpacing: 0.8,
                    }}>{p.formato}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                      background: STATUS_COLORS[p.status]?.bg, color: STATUS_COLORS[p.status]?.color,
                    }}>{STATUS_COLORS[p.status]?.label}</span>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.legenda || "Sem legenda"}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {p.agendado_para ? new Date(p.agendado_para).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      por {p.usuario_nome}
                    </span>
                  </div>

                  {p.erro_msg && (
                    <p style={{ fontSize: 10, color: "var(--danger)", margin: "4px 0 0" }}>{p.erro_msg}</p>
                  )}
                </div>

                {/* Actions */}
                {p.status === "agendado" && (
                  <button onClick={() => handleCancel(p.id)} style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg-input)", color: "var(--danger)",
                    fontSize: 10, fontWeight: 600, cursor: "pointer", alignSelf: "center",
                  }}>Cancelar</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{
          padding: 20, borderRadius: 18,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)", alignSelf: "start",
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: "var(--text-secondary)",
              fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>←</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {MONTHS[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: "var(--text-secondary)",
              fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: 9, fontWeight: 700,
                color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase",
                padding: "4px 0",
              }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {calendarDays.map((d, i) => {
              if (d.day === 0) return <div key={`empty-${i}`} />;

              const dayPosts = postsByDate[d.date] || [];
              const hasAgendado = dayPosts.some(p => p.status === "agendado");
              const hasPublicado = dayPosts.some(p => p.status === "publicado");
              const hasErro = dayPosts.some(p => p.status === "erro");
              const isToday = d.date === today;
              const isSelected = d.date === selectedDate;

              return (
                <button key={d.date} onClick={() => setSelectedDate(d.date === selectedDate ? null : d.date)}
                  style={{
                    width: "100%", aspectRatio: "1", borderRadius: 10, border: "1px solid",
                    borderColor: isSelected ? "var(--gold)" : isToday ? "rgba(59,130,246,0.3)" : "transparent",
                    background: isSelected ? "rgba(212,168,67,0.1)" : isToday ? "rgba(59,130,246,0.06)" : "transparent",
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 2, position: "relative",
                  }}
                >
                  <span style={{
                    fontSize: 12, fontWeight: isToday ? 800 : 500,
                    color: isSelected ? "var(--gold)" : isToday ? "var(--blue)" : "var(--text-secondary)",
                  }}>{d.day}</span>

                  {dayPosts.length > 0 && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {hasAgendado && <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--blue)" }} />}
                      {hasPublicado && <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--success)" }} />}
                      {hasErro && <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--danger)" }} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {[
              { color: "var(--blue)", label: "Agendado" },
              { color: "var(--success)", label: "Publicado" },
              { color: "var(--danger)", label: "Erro" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

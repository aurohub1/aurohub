"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface Plano {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  preco_anual: number | null;
  limite_lojas: number;
  limite_usuarios: number;
  limite_posts: number;
  limite_stories: number;
  inclui_transmissao: boolean;
  inclui_agendamento: boolean;
  ativo: boolean;
}

interface Pack {
  id: string;
  usuario_id: string;
  tipo: string;
  creditos_total: number;
  creditos_usados: number;
  validade: string;
  ativo: boolean;
  created_at: string;
  usuarios?: { nome: string; email: string };
}

const PACK_TYPES = [
  { value: "pack10", label: "Pack 10", price: "R$ 19" },
  { value: "pack30", label: "Pack 30", price: "R$ 49" },
  { value: "pack60", label: "Pack 60", price: "R$ 89" },
];

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal editar plano
  const [editModal, setEditModal] = useState(false);
  const [editPlano, setEditPlano] = useState<Plano | null>(null);
  const [editForm, setEditForm] = useState({ preco_mensal: 0, limite_lojas: 0, limite_usuarios: 0, limite_posts: 0, limite_stories: 0 });
  const [saving, setSaving] = useState(false);

  // Modal atribuir pack
  const [packModal, setPackModal] = useState(false);
  const [packForm, setPackForm] = useState({ usuario_id: "", tipo: "pack10" });
  const [packError, setPackError] = useState("");
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string; email: string }[]>([]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/planos");
      const data = await res.json();
      if (res.ok) { setPlanos(data.planos); setPacks(data.packs); }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function openEdit(p: Plano) {
    setEditPlano(p);
    setEditForm({
      preco_mensal: p.preco_mensal, limite_lojas: p.limite_lojas,
      limite_usuarios: p.limite_usuarios, limite_posts: p.limite_posts, limite_stories: p.limite_stories,
    });
    setEditModal(true);
  }

  async function handleSavePlano() {
    if (!editPlano) return;
    setSaving(true);
    await fetch("/api/admin/planos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editPlano.id, ...editForm }),
    });
    setSaving(false); setEditModal(false); fetchData();
  }

  async function openPackModal() {
    setPackForm({ usuario_id: "", tipo: "pack10" }); setPackError("");
    // Buscar usuários
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    if (res.ok) setUsuarios(data.users.filter((u: { ativo: boolean }) => u.ativo));
    setPackModal(true);
  }

  async function handleAtribuirPack() {
    if (!packForm.usuario_id) { setPackError("Selecione um usuário"); return; }
    setSaving(true); setPackError("");
    const res = await fetch("/api/admin/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packForm),
    });
    const data = await res.json();
    if (!res.ok) { setPackError(data.error); setSaving(false); return; }
    setSaving(false); setPackModal(false); fetchData();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--bg-input)",
    color: "var(--text)", fontSize: 13, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Planos & Packs</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {planos.length} planos — {packs.filter(p => p.ativo).length} packs ativos
          </p>
        </div>
        <button onClick={openPackModal} style={{
          padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Atribuir Pack</button>
      </div>

      {/* Cards de Planos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 32 }}>
        {planos.map(p => (
          <div key={p.id} style={{
            padding: 24, borderRadius: 18,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)", position: "relative", overflow: "hidden",
            opacity: p.ativo ? 1 : 0.5,
          }}>
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.4,
              background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>{p.nome}</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>{p.slug}</p>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 800, color: "var(--gold)",
              }}>R$ {p.preco_mensal}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Lojas", value: p.limite_lojas },
                { label: "Usuários", value: p.limite_usuarios },
                { label: "Posts", value: p.limite_posts },
                { label: "Stories", value: p.limite_stories },
              ].map(s => (
                <div key={s.label} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", margin: 0, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>{s.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: "2px 0 0", color: "var(--text)" }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {p.inclui_transmissao && (
                <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, background: "rgba(59,130,246,0.1)", color: "var(--blue)", fontWeight: 700 }}>TV</span>
              )}
              {p.inclui_agendamento && (
                <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, background: "rgba(72,187,120,0.1)", color: "var(--success)", fontWeight: 700 }}>Agendamento</span>
              )}
            </div>

            <button onClick={() => openEdit(p)} style={{
              width: "100%", padding: "8px 0", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--bg-input)",
              color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>Editar Limites</button>
          </div>
        ))}
      </div>

      {/* Tabela de Packs */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: "var(--text)" }}>Packs Atribuídos</h2>
      <div style={{
        borderRadius: 18, overflow: "hidden",
        background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Usuário", "Tipo", "Créditos", "Usado", "Validade", "Status"].map(h => (
                <th key={h} style={{
                  padding: "14px 16px", textAlign: "left", fontSize: 10,
                  fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Nenhum pack atribuído</td></tr>
            ) : packs.map(pk => {
              const expired = new Date(pk.validade) < new Date();
              return (
                <tr key={pk.id} style={{ borderBottom: "1px solid var(--border)", opacity: pk.ativo && !expired ? 1 : 0.5 }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {pk.usuarios?.nome || "—"}
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{pk.usuarios?.email}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(212,168,67,0.1)", color: "var(--gold)", textTransform: "uppercase" }}>
                      {PACK_TYPES.find(pt => pt.value === pk.tipo)?.label || pk.tipo}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{pk.creditos_total}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{pk.creditos_usados}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--border-light)", maxWidth: 80 }}>
                        <div style={{
                          height: "100%", borderRadius: 2, background: "var(--gold)", transition: "width 0.5s",
                          width: `${(pk.creditos_usados / pk.creditos_total) * 100}%`,
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: expired ? "var(--danger)" : "var(--text-muted)" }}>
                    {new Date(pk.validade).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                      background: expired ? "rgba(245,101,101,0.1)" : pk.ativo ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                      color: expired ? "var(--danger)" : pk.ativo ? "var(--success)" : "var(--danger)",
                    }}>{expired ? "Expirado" : pk.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Plano */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Editar — ${editPlano?.nome}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { key: "preco_mensal", label: "Preço Mensal (R$)" },
            { key: "limite_lojas", label: "Limite Lojas" },
            { key: "limite_usuarios", label: "Limite Usuários" },
            { key: "limite_posts", label: "Limite Posts (Feed=1pt, Reels=2pts)" },
            { key: "limite_stories", label: "Limite Stories" },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input type="number" value={editForm[f.key as keyof typeof editForm]} onChange={e => setEditForm({ ...editForm, [f.key]: parseInt(e.target.value) || 0 })} style={inputStyle} />
            </div>
          ))}
          <button onClick={handleSavePlano} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </Modal>

      {/* Modal Atribuir Pack */}
      <Modal open={packModal} onClose={() => setPackModal(false)} title="Atribuir Pack de Créditos">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Usuário</label>
            <select value={packForm.usuario_id} onChange={e => setPackForm({ ...packForm, usuario_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Selecione...</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo do Pack</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PACK_TYPES.map(pt => (
                <button key={pt.value} onClick={() => setPackForm({ ...packForm, tipo: pt.value })} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 10, border: "1px solid",
                  borderColor: packForm.tipo === pt.value ? "rgba(212,168,67,0.35)" : "var(--border)",
                  background: packForm.tipo === pt.value ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                  cursor: "pointer", textAlign: "center",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: packForm.tipo === pt.value ? "var(--gold)" : "var(--text)" }}>{pt.label}</p>
                  <p style={{ fontSize: 10, margin: "4px 0 0", color: "var(--text-muted)" }}>{pt.price} · 90 dias</p>
                </button>
              ))}
            </div>
          </div>

          {packError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(245,101,101,0.1)" }}>{packError}</p>
          )}

          <button onClick={handleAtribuirPack} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Salvando..." : "Atribuir Pack"}</button>
        </div>
      </Modal>
    </div>
  );
}

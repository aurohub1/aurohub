"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface User {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  marca_id: string | null;
  loja_id: string | null;
  ativo: boolean;
  plano: string | null;
  created_at: string;
}

interface Marca { id: string; nome: string; }
interface Loja { id: string; nome: string; cidade: string; marca_id: string; }

const TIPOS = [
  { value: "adm", label: "ADM" },
  { value: "licenciado", label: "Licenciado" },
  { value: "loja", label: "Loja" },
  { value: "cliente", label: "Funcionário" },
];

const TIPO_COLORS: Record<string, string> = {
  adm: "var(--orange)",
  licenciado: "var(--gold)",
  loja: "var(--blue)",
  cliente: "var(--text-muted)",
};

const emptyForm = { nome: "", email: "", senha: "", tipo: "cliente", marca_id: "", loja_id: "" };

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setMarcas(data.marcas);
        setLojas(data.lojas);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Erro ao carregar usuários");
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      nome: user.nome,
      email: user.email,
      senha: "",
      tipo: user.tipo,
      marca_id: user.marca_id || "",
      loja_id: user.loja_id || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");

    try {
      if (editingUser) {
        const res = await fetch("/api/admin/usuarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            nome: form.nome,
            email: form.email,
            senha: form.senha || undefined,
            tipo: form.tipo,
            marca_id: form.marca_id,
            loja_id: form.loja_id,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error); setSaving(false); return; }
      } else {
        if (!form.senha) { setFormError("Senha obrigatória para novo usuário"); setSaving(false); return; }
        const res = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error); setSaving(false); return; }
      }

      setModalOpen(false);
      fetchUsers();
    } catch {
      setFormError("Erro ao salvar");
    }
    setSaving(false);
  }

  async function handleToggleActive(user: User) {
    if (user.ativo) {
      if (!confirm(`Desativar ${user.nome}?`)) return;
      await fetch("/api/admin/usuarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
    } else {
      await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ativo: true }),
      });
    }
    fetchUsers();
  }

  const marcaMap = Object.fromEntries(marcas.map(m => [m.id, m.nome]));
  const lojaMap = Object.fromEntries(lojas.map(l => [l.id, `${l.nome} — ${l.cidade}`]));

  const filteredUsers = users.filter(u => {
    if (filtroTipo && u.tipo !== filtroTipo) return false;
    if (filtroStatus === "ativo" && !u.ativo) return false;
    if (filtroStatus === "inativo" && u.ativo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const lojasDoMarca = lojas.filter(l => !form.marca_id || l.marca_id === form.marca_id);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--bg-input)",
    color: "var(--text)", fontSize: 13, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Usuários</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {users.length} cadastrados — {users.filter(u => u.ativo).length} ativos
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Novo Usuário</button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
        padding: 16, borderRadius: 14,
        background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 130, cursor: "pointer" }}>
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--danger)" }}>{error}</div>
      ) : (
        <div style={{
          borderRadius: 18, overflow: "hidden",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nome", "E-mail", "Tipo", "Marca", "Loja", "Status", "Ações"].map(h => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: "left", fontSize: 10,
                    fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} style={{
                  borderBottom: "1px solid var(--border)",
                  opacity: u.ativo ? 1 : 0.5,
                  transition: "all 0.2s",
                }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.nome}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                      background: `${TIPO_COLORS[u.tipo]}15`,
                      color: TIPO_COLORS[u.tipo],
                      letterSpacing: 0.8, textTransform: "uppercase",
                    }}>
                      {TIPOS.find(t => t.value === u.tipo)?.label || u.tipo}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                    {u.marca_id ? marcaMap[u.marca_id] || "—" : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                    {u.loja_id ? lojaMap[u.loja_id] || "—" : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                      background: u.ativo ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                      color: u.ativo ? "var(--success)" : "var(--danger)",
                    }}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(u)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "var(--bg-input)", color: "var(--text-secondary)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>Editar</button>
                      <button onClick={() => handleToggleActive(u)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "var(--bg-input)",
                        color: u.ativo ? "var(--danger)" : "var(--success)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>{u.ativo ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? "Editar Usuário" : "Novo Usuário"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} placeholder="Nome completo" />
          </div>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="email@exemplo.com" type="email" />
          </div>
          <div>
            <label style={labelStyle}>{editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}</label>
            <input value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} style={inputStyle} placeholder="********" type="password" />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {(form.tipo === "licenciado" || form.tipo === "loja" || form.tipo === "cliente") && (
            <div>
              <label style={labelStyle}>Marca</label>
              <select value={form.marca_id} onChange={e => setForm({ ...form, marca_id: e.target.value, loja_id: "" })} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Selecione...</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          )}
          {(form.tipo === "loja" || form.tipo === "cliente") && (
            <div>
              <label style={labelStyle}>Loja</label>
              <select value={form.loja_id} onChange={e => setForm({ ...form, loja_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Selecione...</option>
                {lojasDoMarca.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
              </select>
            </div>
          )}

          {formError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(245,101,101,0.1)" }}>
              {formError}
            </p>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, marginTop: 4,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

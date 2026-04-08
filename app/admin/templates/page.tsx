"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface Template {
  id: string;
  nome: string;
  tipo_form: string;
  formato: string;
  marca_id: string | null;
  largura: number;
  altura: number;
  ativo: boolean;
  permite_postagem: boolean;
  apenas_download: boolean;
  created_at: string;
}

interface Marca { id: string; nome: string; }

interface RegraAcesso {
  id: string;
  template_id: string;
  usuario_id: string | null;
  loja_id: string | null;
  liberado: boolean;
  nome: string;
  tipo_acesso: "usuario" | "loja";
}

interface AcessoUser { id: string; nome: string; tipo: string; }
interface AcessoLoja { id: string; nome: string; cidade: string; }

const TIPOS_FORM = [
  { value: "pacote", label: "Pacote" },
  { value: "campanha", label: "Campanha" },
  { value: "cruzeiro", label: "Cruzeiro" },
  { value: "anoiteceu", label: "Anoiteceu" },
];

const FORMATOS = [
  { value: "stories", label: "Stories", w: 1080, h: 1920 },
  { value: "feed", label: "Feed", w: 1080, h: 1350 },
  { value: "reels", label: "Reels", w: 1080, h: 1920 },
  { value: "transmissao", label: "Transmissão", w: 1920, h: 1080 },
];

const FORMATO_COLORS: Record<string, string> = {
  stories: "var(--blue)", feed: "var(--gold)", reels: "var(--orange)", transmissao: "var(--text-muted)",
};

const emptyForm = { nome: "", tipo_form: "pacote", formato: "stories", marca_id: "", permite_postagem: true, apenas_download: false };

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroFormato, setFiltroFormato] = useState("");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Controle de acesso
  const [acessoOpen, setAcessoOpen] = useState(false);
  const [acessoTemplate, setAcessoTemplate] = useState<Template | null>(null);
  const [regras, setRegras] = useState<RegraAcesso[]>([]);
  const [acessoUsers, setAcessoUsers] = useState<AcessoUser[]>([]);
  const [acessoLojas, setAcessoLojas] = useState<AcessoLoja[]>([]);
  const [acessoLoading, setAcessoLoading] = useState(false);
  const [acessoTab, setAcessoTab] = useState<"usuario" | "loja">("usuario");
  const [acessoAddId, setAcessoAddId] = useState("");

  async function openAcesso(t: Template) {
    setAcessoTemplate(t);
    setAcessoOpen(true);
    setAcessoLoading(true);
    setAcessoTab("usuario");
    setAcessoAddId("");
    try {
      const res = await fetch(`/api/admin/templates/acesso?template_id=${t.id}`);
      const data = await res.json();
      if (res.ok) {
        setRegras(data.regras);
        setAcessoUsers(data.usuarios);
        setAcessoLojas(data.lojas);
      }
    } catch { /* */ }
    setAcessoLoading(false);
  }

  async function addAcesso() {
    if (!acessoTemplate || !acessoAddId) return;
    const body: Record<string, unknown> = { template_id: acessoTemplate.id, liberado: true };
    if (acessoTab === "usuario") body.usuario_id = acessoAddId;
    else body.loja_id = acessoAddId;

    await fetch("/api/admin/templates/acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAcessoAddId("");
    openAcesso(acessoTemplate);
  }

  async function toggleAcesso(regra: RegraAcesso) {
    await fetch("/api/admin/templates/acesso", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regra.id, liberado: !regra.liberado }),
    });
    setRegras(prev => prev.map(r => r.id === regra.id ? { ...r, liberado: !r.liberado } : r));
  }

  async function removeAcesso(regra: RegraAcesso) {
    if (!confirm(`Remover acesso de "${regra.nome}"?`)) return;
    await fetch("/api/admin/templates/acesso", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regra.id }),
    });
    setRegras(prev => prev.filter(r => r.id !== regra.id));
  }

  async function fetch_() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      const data = await res.json();
      if (res.ok) { setTemplates(data.templates); setMarcas(data.marcas); }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetch_(); }, []);

  function openCreate() {
    setEditing(null); setForm(emptyForm); setFormError(""); setModalOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      nome: t.nome, tipo_form: t.tipo_form, formato: t.formato,
      marca_id: t.marca_id || "", permite_postagem: t.permite_postagem, apenas_download: t.apenas_download,
    });
    setFormError(""); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError("");
    try {
      const fmtInfo = FORMATOS.find(f => f.value === form.formato);
      const body = editing
        ? { id: editing.id, ...form }
        : { ...form, largura: fmtInfo?.w || 1080, altura: fmtInfo?.h || 1920 };

      const res = await fetch("/api/admin/templates", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); setSaving(false); return; }
      setModalOpen(false); fetch_();
    } catch { setFormError("Erro ao salvar"); }
    setSaving(false);
  }

  async function handleToggle(t: Template) {
    if (t.ativo && !confirm(`Desativar "${t.nome}"?`)) return;
    await fetch("/api/admin/templates", {
      method: t.ativo ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, ativo: !t.ativo }),
    });
    fetch_();
  }

  const marcaMap = Object.fromEntries(marcas.map(m => [m.id, m.nome]));
  const filtered = templates.filter(t => {
    if (filtroTipo && t.tipo_form !== filtroTipo) return false;
    if (filtroFormato && t.formato !== filtroFormato) return false;
    if (busca && !t.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Templates</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {templates.length} templates — {templates.filter(t => t.ativo).length} ativos
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Novo Template</button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
        padding: 16, borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <input placeholder="Buscar template..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="">Todos os tipos</option>
          {TIPOS_FORM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtroFormato} onChange={e => setFiltroFormato(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="">Todos os formatos</option>
          {FORMATOS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>
      ) : (
        <div style={{
          borderRadius: 18, overflow: "hidden",
          background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nome", "Tipo", "Formato", "Tamanho", "Marca", "Postagem", "Status", "Ações"].map(h => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: "left", fontSize: 10,
                    fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Nenhum template encontrado</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: t.ativo ? 1 : 0.5 }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.nome}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(212,168,67,0.1)", color: "var(--gold)", letterSpacing: 0.8, textTransform: "uppercase" }}>
                      {TIPOS_FORM.find(tf => tf.value === t.tipo_form)?.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: `${FORMATO_COLORS[t.formato]}15`, color: FORMATO_COLORS[t.formato], letterSpacing: 0.8, textTransform: "uppercase" }}>
                      {FORMATOS.find(f => f.value === t.formato)?.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{t.largura}×{t.altura}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{t.marca_id ? marcaMap[t.marca_id] || "—" : "Global"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--text-muted)" }}>
                    {t.apenas_download ? "Download" : t.permite_postagem ? "IG + Download" : "Desabilitado"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                      background: t.ativo ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                      color: t.ativo ? "var(--success)" : "var(--danger)",
                    }}>{t.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(t)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "var(--bg-input)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>Editar</button>
                      <a href={`/editor?template_id=${t.id}`} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(212,168,67,0.2)",
                        background: "rgba(212,168,67,0.06)", color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        textDecoration: "none", display: "inline-flex", alignItems: "center",
                      }}>Editor</a>
                      <button onClick={() => openAcesso(t)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.2)",
                        background: "rgba(59,130,246,0.06)", color: "var(--blue)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>Acesso</button>
                      <button onClick={() => handleToggle(t)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "var(--bg-input)", color: t.ativo ? "var(--danger)" : "var(--success)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>{t.ativo ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Acesso */}
      <Modal open={acessoOpen} onClose={() => setAcessoOpen(false)} title={`Acesso — ${acessoTemplate?.nome || ""}`}>
        {acessoLoading ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 10, background: "var(--bg-input)" }}>
              {(["usuario", "loja"] as const).map(tab => (
                <button key={tab} onClick={() => { setAcessoTab(tab); setAcessoAddId(""); }} style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, border: "none",
                  background: acessoTab === tab ? "rgba(212,168,67,0.12)" : "transparent",
                  color: acessoTab === tab ? "var(--gold)" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                }}>{tab === "usuario" ? "Usuários" : "Lojas"}</button>
              ))}
            </div>

            {/* Adicionar */}
            <div style={{ display: "flex", gap: 8 }}>
              <select value={acessoAddId} onChange={e => setAcessoAddId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
                <option value="">Selecionar {acessoTab === "usuario" ? "usuário" : "loja"}...</option>
                {acessoTab === "usuario"
                  ? acessoUsers
                      .filter(u => !regras.some(r => r.usuario_id === u.id))
                      .map(u => <option key={u.id} value={u.id}>{u.nome} ({u.tipo})</option>)
                  : acessoLojas
                      .filter(l => !regras.some(r => r.loja_id === l.id))
                      .map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)
                }
              </select>
              <button onClick={addAcesso} disabled={!acessoAddId} style={{
                padding: "8px 16px", borderRadius: 10, border: "none", cursor: acessoAddId ? "pointer" : "default",
                background: acessoAddId ? "linear-gradient(135deg, var(--gold), var(--orange))" : "var(--border)",
                color: acessoAddId ? "#0B1120" : "var(--text-muted)", fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>Adicionar</button>
            </div>

            {/* Lista de regras */}
            <div>
              {regras.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
                  Nenhuma regra — template acessível para todos
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {regras.map(r => (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.8, textTransform: "uppercase",
                          background: r.tipo_acesso === "usuario" ? "rgba(59,130,246,0.1)" : "rgba(212,168,67,0.1)",
                          color: r.tipo_acesso === "usuario" ? "var(--blue)" : "var(--gold)",
                        }}>{r.tipo_acesso === "usuario" ? "Usuário" : "Loja"}</span>
                        <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{r.nome}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => toggleAcesso(r)} style={{
                          padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
                          background: r.liberado ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                          color: r.liberado ? "var(--success)" : "var(--danger)",
                          fontSize: 10, fontWeight: 700, cursor: "pointer",
                        }}>{r.liberado ? "Liberado" : "Bloqueado"}</button>
                        <button onClick={() => removeAcesso(r)} style={{
                          padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
                          background: "var(--bg-input)", color: "var(--danger)",
                          fontSize: 12, cursor: "pointer",
                        }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
              Sem regras = acesso livre. Com regras, apenas usuários/lojas listados como "Liberado" terão acesso.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Template" : "Novo Template"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} placeholder="Ex: Pacote Cancún V2" />
          </div>
          <div>
            <label style={labelStyle}>Tipo do Formulário</label>
            <select value={form.tipo_form} onChange={e => setForm({ ...form, tipo_form: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              {TIPOS_FORM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Formato</label>
            <select value={form.formato} onChange={e => setForm({ ...form, formato: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              {FORMATOS.map(f => <option key={f.value} value={f.value}>{f.label} ({f.w}×{f.h})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Marca</label>
            <select value={form.marca_id} onChange={e => setForm({ ...form, marca_id: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Global (todas as marcas)</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.permite_postagem} onChange={e => setForm({ ...form, permite_postagem: e.target.checked })} />
              Permite postagem IG
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.apenas_download} onChange={e => setForm({ ...form, apenas_download: e.target.checked })} />
              Apenas download
            </label>
          </div>

          {formError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(245,101,101,0.1)" }}>{formError}</p>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, marginTop: 4, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Template"}</button>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface Addon {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco_individual: number | null;
  preco_time: number | null;
  preco_rede: number | null;
  ativo: boolean;
}

interface Assinatura {
  id: string;
  addon_id: string;
  loja_id: string;
  tier: "individual" | "time" | "rede";
  ativo: boolean;
  loja_nome: string;
}

interface Loja { id: string; nome: string; cidade: string; }

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  individual: { label: "Individual", color: "var(--blue)" },
  time: { label: "Time (10 sedes)", color: "var(--gold)" },
  rede: { label: "Rede (30 sedes)", color: "var(--orange)" },
};

function formatPreco(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `R$ ${v}`;
}

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal add-on
  const [addonModal, setAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [addonForm, setAddonForm] = useState({ nome: "", slug: "", descricao: "", preco_individual: "", preco_time: "", preco_rede: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal atribuir
  const [atribuirModal, setAtribuirModal] = useState(false);
  const [atribuirAddon, setAtribuirAddon] = useState<Addon | null>(null);
  const [atribuirLoja, setAtribuirLoja] = useState("");
  const [atribuirTier, setAtribuirTier] = useState<string>("individual");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/addons");
      const data = await res.json();
      if (res.ok) {
        setAddons(data.addons);
        setAssinaturas(data.assinaturas);
        setLojas(data.lojas);
      }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function openCreateAddon() {
    setEditingAddon(null);
    setAddonForm({ nome: "", slug: "", descricao: "", preco_individual: "", preco_time: "", preco_rede: "" });
    setFormError("");
    setAddonModal(true);
  }

  function openEditAddon(a: Addon) {
    setEditingAddon(a);
    setAddonForm({
      nome: a.nome, slug: a.slug, descricao: a.descricao || "",
      preco_individual: a.preco_individual?.toString() || "",
      preco_time: a.preco_time?.toString() || "",
      preco_rede: a.preco_rede?.toString() || "",
    });
    setFormError("");
    setAddonModal(true);
  }

  async function saveAddon() {
    setSaving(true); setFormError("");
    try {
      const body = editingAddon
        ? {
            id: editingAddon.id, nome: addonForm.nome, descricao: addonForm.descricao,
            preco_individual: addonForm.preco_individual ? parseInt(addonForm.preco_individual) : null,
            preco_time: addonForm.preco_time ? parseInt(addonForm.preco_time) : null,
            preco_rede: addonForm.preco_rede ? parseInt(addonForm.preco_rede) : null,
          }
        : {
            nome: addonForm.nome, slug: addonForm.slug, descricao: addonForm.descricao,
            preco_individual: addonForm.preco_individual ? parseInt(addonForm.preco_individual) : null,
            preco_time: addonForm.preco_time ? parseInt(addonForm.preco_time) : null,
            preco_rede: addonForm.preco_rede ? parseInt(addonForm.preco_rede) : null,
          };

      const res = await fetch("/api/admin/addons", {
        method: editingAddon ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); setSaving(false); return; }
      setAddonModal(false);
      fetchData();
    } catch { setFormError("Erro ao salvar"); }
    setSaving(false);
  }

  async function toggleAddon(a: Addon) {
    await fetch("/api/admin/addons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, ativo: !a.ativo }),
    });
    fetchData();
  }

  function openAtribuir(a: Addon) {
    setAtribuirAddon(a);
    setAtribuirLoja("");
    setAtribuirTier("individual");
    setAtribuirModal(true);
  }

  async function atribuir() {
    if (!atribuirAddon || !atribuirLoja) return;
    await fetch("/api/admin/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addon_id: atribuirAddon.id, loja_id: atribuirLoja, tier: atribuirTier }),
    });
    setAtribuirModal(false);
    fetchData();
  }

  async function toggleAssinatura(a: Assinatura) {
    await fetch("/api/admin/addons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assinatura_id: a.id, ativo: !a.ativo }),
    });
    setAssinaturas(prev => prev.map(s => s.id === a.id ? { ...s, ativo: !s.ativo } : s));
  }

  async function removeAssinatura(a: Assinatura) {
    if (!confirm(`Remover ${a.loja_nome} deste add-on?`)) return;
    await fetch("/api/admin/addons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assinatura_id: a.id }),
    });
    setAssinaturas(prev => prev.filter(s => s.id !== a.id));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--bg-input)",
    color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Add-ons</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {addons.length} add-ons — {assinaturas.filter(a => a.ativo).length} assinaturas ativas
          </p>
        </div>
        <button onClick={openCreateAddon} style={{
          padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--gold), var(--orange))",
          fontSize: 12, color: "#0B1120", fontWeight: 700,
          boxShadow: "0 2px 12px rgba(212,168,67,0.25)",
        }}>+ Novo Add-on</button>
      </div>

      {/* Add-on cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {addons.map(addon => {
          const subs = assinaturas.filter(a => a.addon_id === addon.id);
          return (
            <div key={addon.id} style={{
              borderRadius: 18, overflow: "hidden",
              background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
              opacity: addon.ativo ? 1 : 0.5,
            }}>
              {/* Add-on header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "20px 24px", borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>{addon.nome}</h2>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                      background: addon.ativo ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                      color: addon.ativo ? "var(--success)" : "var(--danger)",
                    }}>{addon.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                  {addon.descricao && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{addon.descricao}</p>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openAtribuir(addon)} style={{
                    padding: "6px 14px", borderRadius: 8, border: "none",
                    background: "rgba(59,130,246,0.1)", color: "var(--blue)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>Atribuir Loja</button>
                  <button onClick={() => openEditAddon(addon)} style={{
                    padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg-input)", color: "var(--text-secondary)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>Editar</button>
                  <button onClick={() => toggleAddon(addon)} style={{
                    padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg-input)", color: addon.ativo ? "var(--danger)" : "var(--success)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>{addon.ativo ? "Desativar" : "Ativar"}</button>
                </div>
              </div>

              {/* Preços */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderBottom: "1px solid var(--border)" }}>
                {(["individual", "time", "rede"] as const).map((tier, i) => (
                  <div key={tier} style={{
                    padding: "14px 24px", textAlign: "center",
                    borderRight: i < 2 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: TIER_LABELS[tier].color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{TIER_LABELS[tier].label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                      {formatPreco(tier === "individual" ? addon.preco_individual : tier === "time" ? addon.preco_time : addon.preco_rede)}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>/mês</div>
                  </div>
                ))}
              </div>

              {/* Assinaturas */}
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                    Lojas assinantes ({subs.length})
                  </span>
                </div>
                {subs.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Nenhuma loja assinante</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {subs.map(s => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.loja_nome}</span>
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: `${TIER_LABELS[s.tier].color}15`, color: TIER_LABELS[s.tier].color,
                            letterSpacing: 0.8, textTransform: "uppercase",
                          }}>{TIER_LABELS[s.tier].label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => toggleAssinatura(s)} style={{
                            padding: "3px 8px", borderRadius: 5, border: "1px solid var(--border)",
                            background: s.ativo ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                            color: s.ativo ? "var(--success)" : "var(--danger)",
                            fontSize: 9, fontWeight: 700, cursor: "pointer",
                          }}>{s.ativo ? "Ativo" : "Inativo"}</button>
                          <button onClick={() => removeAssinatura(s)} style={{
                            padding: "3px 6px", borderRadius: 5, border: "1px solid var(--border)",
                            background: "var(--bg-input)", color: "var(--danger)",
                            fontSize: 11, cursor: "pointer",
                          }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar/Editar Add-on */}
      <Modal open={addonModal} onClose={() => setAddonModal(false)} title={editingAddon ? "Editar Add-on" : "Novo Add-on"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input value={addonForm.nome} onChange={e => setAddonForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} placeholder="Ex: Vitrine" />
          </div>
          {!editingAddon && (
            <div>
              <label style={labelStyle}>Slug</label>
              <input value={addonForm.slug} onChange={e => setAddonForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} placeholder="Ex: vitrine" />
            </div>
          )}
          <div>
            <label style={labelStyle}>Descrição</label>
            <input value={addonForm.descricao} onChange={e => setAddonForm(f => ({ ...f, descricao: e.target.value }))} style={inputStyle} placeholder="Breve descrição" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Individual (R$)</label>
              <input value={addonForm.preco_individual} onChange={e => setAddonForm(f => ({ ...f, preco_individual: e.target.value }))} style={inputStyle} placeholder="29" type="number" />
            </div>
            <div>
              <label style={labelStyle}>Time (R$)</label>
              <input value={addonForm.preco_time} onChange={e => setAddonForm(f => ({ ...f, preco_time: e.target.value }))} style={inputStyle} placeholder="199" type="number" />
            </div>
            <div>
              <label style={labelStyle}>Rede (R$)</label>
              <input value={addonForm.preco_rede} onChange={e => setAddonForm(f => ({ ...f, preco_rede: e.target.value }))} style={inputStyle} placeholder="449" type="number" />
            </div>
          </div>

          {formError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(245,101,101,0.1)" }}>{formError}</p>
          )}

          <button onClick={saveAddon} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Salvando..." : editingAddon ? "Salvar" : "Criar Add-on"}</button>
        </div>
      </Modal>

      {/* Modal Atribuir Loja */}
      <Modal open={atribuirModal} onClose={() => setAtribuirModal(false)} title={`Atribuir — ${atribuirAddon?.nome || ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Loja</label>
            <select value={atribuirLoja} onChange={e => setAtribuirLoja(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Selecionar loja...</option>
              {lojas
                .filter(l => !assinaturas.some(a => a.addon_id === atribuirAddon?.id && a.loja_id === l.id))
                .map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)
              }
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tier</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["individual", "time", "rede"] as const).map(t => (
                <button key={t} onClick={() => setAtribuirTier(t)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: "1px solid", cursor: "pointer",
                  borderColor: atribuirTier === t ? `${TIER_LABELS[t].color}40` : "var(--border)",
                  background: atribuirTier === t ? `${TIER_LABELS[t].color}12` : "var(--bg-input)",
                  color: atribuirTier === t ? TIER_LABELS[t].color : "var(--text-muted)",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {TIER_LABELS[t].label}
                  <br />
                  <span style={{ fontSize: 10, fontWeight: 500 }}>{formatPreco(
                    t === "individual" ? atribuirAddon?.preco_individual ?? null :
                    t === "time" ? atribuirAddon?.preco_time ?? null :
                    atribuirAddon?.preco_rede ?? null
                  )}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={atribuir} disabled={!atribuirLoja} style={{
            padding: "12px 0", borderRadius: 10, border: "none",
            cursor: atribuirLoja ? "pointer" : "default",
            background: atribuirLoja ? "linear-gradient(135deg, var(--gold), var(--orange))" : "var(--border)",
            color: atribuirLoja ? "#0B1120" : "var(--text-muted)",
            fontSize: 13, fontWeight: 700,
          }}>Atribuir</button>
        </div>
      </Modal>
    </div>
  );
}

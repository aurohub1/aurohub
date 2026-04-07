"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface LojaIG {
  id: string;
  nome: string;
  cidade: string;
  marca: string;
  ativa: boolean;
  ig_conectado: boolean;
  ig_user_id: string | null;
  ig_token_masked: string | null;
  ig_token_expires_at: string | null;
  ig_expira_em_dias: number | null;
}

export default function AdminInstagramPage() {
  const [lojas, setLojas] = useState<LojaIG[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal token manual
  const [tokenModal, setTokenModal] = useState(false);
  const [tokenLoja, setTokenLoja] = useState<LojaIG | null>(null);
  const [tokenForm, setTokenForm] = useState({ ig_user_id: "", ig_access_token: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchLojas() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/instagram");
      const data = await res.json();
      if (res.ok) setLojas(data.lojas);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { fetchLojas(); }, []);

  function openTokenModal(loja: LojaIG) {
    setTokenLoja(loja);
    setTokenForm({ ig_user_id: loja.ig_user_id || "", ig_access_token: "" });
    setFormError("");
    setTokenModal(true);
  }

  async function saveToken() {
    if (!tokenLoja) return;
    if (!tokenForm.ig_user_id || !tokenForm.ig_access_token) {
      setFormError("Preencha ambos os campos");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/admin/instagram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loja_id: tokenLoja.id,
          ig_user_id: tokenForm.ig_user_id,
          ig_access_token: tokenForm.ig_access_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); setSaving(false); return; }
      setTokenModal(false);
      fetchLojas();
    } catch { setFormError("Erro ao salvar"); }
    setSaving(false);
  }

  async function revogar(loja: LojaIG) {
    if (!confirm(`Revogar conexão Instagram de "${loja.nome}"? A loja não poderá publicar até reconectar.`)) return;
    await fetch("/api/admin/instagram", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loja_id: loja.id }),
    });
    fetchLojas();
  }

  function conectarOAuth(lojaId: string) {
    window.location.href = `/api/instagram/connect?loja_id=${lojaId}`;
  }

  const conectadas = lojas.filter(l => l.ig_conectado).length;
  const expirandoSoon = lojas.filter(l => l.ig_expira_em_dias !== null && l.ig_expira_em_dias <= 7).length;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--bg-input)",
    color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box",
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
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>Instagram</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {conectadas}/{lojas.length} lojas conectadas
            {expirandoSoon > 0 && <span style={{ color: "var(--orange)", fontWeight: 600 }}> — {expirandoSoon} expirando em breve</span>}
          </p>
        </div>
      </div>

      {/* Cards de status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatusCard label="Conectadas" value={conectadas} accent="var(--success)" />
        <StatusCard label="Desconectadas" value={lojas.length - conectadas} accent={lojas.length - conectadas > 0 ? "var(--danger)" : "var(--text-muted)"} />
        <StatusCard label="Expirando (7d)" value={expirandoSoon} accent={expirandoSoon > 0 ? "var(--orange)" : "var(--text-muted)"} />
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
                {["Loja", "Marca", "Status", "IG User ID", "Token", "Expira", "Ações"].map(h => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: "left", fontSize: 10,
                    fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lojas.map(l => {
                const expDias = l.ig_expira_em_dias;
                const expColor = expDias === null ? "var(--text-muted)" : expDias <= 3 ? "var(--danger)" : expDias <= 7 ? "var(--orange)" : "var(--success)";

                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--border)", opacity: l.ativa ? 1 : 0.5 }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{l.nome}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{l.cidade}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{l.marca}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                        background: l.ig_conectado ? "rgba(72,187,120,0.1)" : "rgba(245,101,101,0.1)",
                        color: l.ig_conectado ? "var(--success)" : "var(--danger)",
                      }}>{l.ig_conectado ? "Conectado" : "Desconectado"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {l.ig_user_id || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {l.ig_token_masked || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {expDias !== null ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: expColor }}>
                          {expDias <= 0 ? "Expirado" : `${expDias}d`}
                        </span>
                      ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!l.ig_conectado ? (
                          <>
                            <button onClick={() => conectarOAuth(l.id)} style={{
                              padding: "5px 12px", borderRadius: 8, border: "none",
                              background: "linear-gradient(135deg, #E1306C, #F77737)",
                              color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
                            }}>Conectar</button>
                            <button onClick={() => openTokenModal(l)} style={{
                              padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                              background: "var(--bg-input)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Token Manual</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openTokenModal(l)} style={{
                              padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                              background: "var(--bg-input)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Atualizar</button>
                            <button onClick={() => revogar(l)} style={{
                              padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                              background: "var(--bg-input)", color: "var(--danger)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Revogar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Token Manual */}
      <Modal open={tokenModal} onClose={() => setTokenModal(false)} title={`Token — ${tokenLoja?.nome || ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Cole o token de longa duração do Instagram Graph API. O token expira em 60 dias e será renovado automaticamente pelo sistema.
          </p>
          <div>
            <label style={labelStyle}>Instagram User ID</label>
            <input value={tokenForm.ig_user_id} onChange={e => setTokenForm(f => ({ ...f, ig_user_id: e.target.value }))}
              placeholder="Ex: 24935761849433430" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Access Token (longa duração)</label>
            <textarea value={tokenForm.ig_access_token} onChange={e => setTokenForm(f => ({ ...f, ig_access_token: e.target.value }))}
              placeholder="EAAx..." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontSize: 11, fontFamily: "monospace" }} />
          </div>

          {formError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(245,101,101,0.1)" }}>{formError}</p>
          )}

          <button onClick={saveToken} disabled={saving} style={{
            padding: "12px 0", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            fontSize: 13, color: "#0B1120", fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Salvando..." : "Salvar Token"}</button>
        </div>
      </Modal>
    </div>
  );
}

function StatusCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      padding: "20px 22px", borderRadius: 18,
      background: "var(--bg-card)", border: "1px solid var(--border)",
      position: "relative", overflow: "hidden", boxShadow: "var(--card-shadow)",
    }}>
      <div style={{
        position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%",
        background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.08,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.4,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
      }} />
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
      <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: "var(--text)", display: "block", marginTop: 8 }}>{value}</span>
    </div>
  );
}

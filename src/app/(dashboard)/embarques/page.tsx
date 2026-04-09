"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Embarque {
  id: string;
  licensee_id: string;
  store_id: string | null;
  cliente_nome: string;
  cliente_contato: string | null;
  destino: string;
  data_embarque: string;
  data_retorno: string | null;
  num_passageiros: number;
  tipo_pacote: string;
  observacoes: string | null;
  arte_gerada: boolean;
  created_at: string;
}

interface Licensee { id: string; name: string; }
interface Store { id: string; name: string; licensee_id: string; }

type TabKey = "hoje" | "semana" | "mes" | "todos";

/* ── Helpers ─────────────────────────────────────── */

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function diffDays(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00"); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function dateBadge(dateStr: string): { label: string; bg: string; text: string } {
  const diff = diffDays(dateStr);
  if (diff < 0) return { label: "Passado", bg: "var(--bg3)", text: "var(--txt3)" };
  if (diff === 0) return { label: "HOJE", bg: "var(--red3)", text: "var(--red)" };
  if (diff === 1) return { label: "AMANHÃ", bg: "var(--orange3)", text: "var(--orange)" };
  return { label: `em ${diff}d`, bg: "var(--green3)", text: "var(--green)" };
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Component ───────────────────────────────────── */

export default function EmbarquesPage() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("hoje");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    cliente_nome: "", cliente_contato: "", destino: "",
    data_embarque: "", data_retorno: "", num_passageiros: "1",
    licensee_id: "", store_id: "", tipo_pacote: "pacote", observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [eR, lR, sR] = await Promise.all([
        supabase.from("embarques").select("*").order("data_embarque"),
        supabase.from("licensees").select("id, name").order("name"),
        supabase.from("stores").select("id, name, licensee_id").order("name"),
      ]);
      setEmbarques((eR.data as Embarque[]) ?? []);
      setLicensees((lR.data as Licensee[]) ?? []);
      setStores((sR.data as Store[]) ?? []);
    } catch (err) { console.error("[Embarques] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const licMap = useMemo(() => {
    const m: Record<string, string> = {};
    licensees.forEach((l) => { m[l.id] = l.name; });
    return m;
  }, [licensees]);

  const storeMap = useMemo(() => {
    const m: Record<string, string> = {};
    stores.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [stores]);

  const storesForLic = useMemo(() => {
    if (!form.licensee_id) return stores;
    return stores.filter((s) => s.licensee_id === form.licensee_id);
  }, [stores, form.licensee_id]);

  const hoje = toDateStr(new Date());
  const semana = toDateStr(new Date(Date.now() + 7 * 86400000));
  const mes = toDateStr(new Date(Date.now() + 30 * 86400000));

  const filtered = useMemo(() => {
    return embarques.filter((e) => {
      if (tab === "hoje") return e.data_embarque === hoje;
      if (tab === "semana") return e.data_embarque >= hoje && e.data_embarque <= semana;
      if (tab === "mes") return e.data_embarque >= hoje && e.data_embarque <= mes;
      return true;
    });
  }, [embarques, tab, hoje, semana, mes]);

  const kpis = useMemo(() => ({
    hoje: embarques.filter((e) => e.data_embarque === hoje).length,
    semana: embarques.filter((e) => e.data_embarque >= hoje && e.data_embarque <= semana).length,
    mes: embarques.filter((e) => e.data_embarque >= hoje && e.data_embarque <= mes).length,
  }), [embarques, hoje, semana, mes]);

  /* ── Modal ─────────────────────────────────────── */

  function openNew() {
    setEditId(null);
    setForm({
      cliente_nome: "", cliente_contato: "", destino: "",
      data_embarque: "", data_retorno: "", num_passageiros: "1",
      licensee_id: licensees[0]?.id ?? "", store_id: "", tipo_pacote: "pacote", observacoes: "",
    });
    setModalError(""); setModalOpen(true);
  }

  function openEdit(e: Embarque) {
    setEditId(e.id);
    setForm({
      cliente_nome: e.cliente_nome, cliente_contato: e.cliente_contato ?? "",
      destino: e.destino, data_embarque: e.data_embarque,
      data_retorno: e.data_retorno ?? "", num_passageiros: String(e.num_passageiros),
      licensee_id: e.licensee_id, store_id: e.store_id ?? "",
      tipo_pacote: e.tipo_pacote, observacoes: e.observacoes ?? "",
    });
    setModalError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.cliente_nome.trim() || !form.destino.trim() || !form.data_embarque) {
      setModalError("Nome, destino e data de embarque são obrigatórios."); return;
    }
    if (!form.licensee_id) { setModalError("Selecione um cliente/marca."); return; }
    setSaving(true); setModalError("");
    try {
      const payload = {
        licensee_id: form.licensee_id,
        store_id: form.store_id || null,
        cliente_nome: form.cliente_nome.trim(),
        cliente_contato: form.cliente_contato.trim() || null,
        destino: form.destino.trim(),
        data_embarque: form.data_embarque,
        data_retorno: form.data_retorno || null,
        num_passageiros: parseInt(form.num_passageiros) || 1,
        tipo_pacote: form.tipo_pacote,
        observacoes: form.observacoes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("embarques").update(payload).eq("id", editId);
        if (error) { setModalError(error.message); return; }
      } else {
        const { error } = await supabase.from("embarques").insert(payload);
        if (error) { setModalError(error.message); return; }
      }
      setModalOpen(false); await loadData();
    } catch { setModalError("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  async function deleteEmbarque(id: string) {
    await supabase.from("embarques").delete().eq("id", id);
    setDeleteId(null); await loadData();
  }

  async function toggleArte(id: string, current: boolean) {
    await supabase.from("embarques").update({ arte_gerada: !current }).eq("id", id);
    await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiMini label="Embarques hoje" value={String(kpis.hoje)} color="var(--red)" />
        <KpiMini label="Próximos 7 dias" value={String(kpis.semana)} color="var(--orange)" />
        <KpiMini label="Próximos 30 dias" value={String(kpis.mes)} color="var(--blue)" />
      </div>

      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Embarques</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Controle de embarques e geração de artes</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo embarque
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5 w-fit">
        {([
          { key: "hoje" as TabKey, label: "Hoje", count: kpis.hoje },
          { key: "semana" as TabKey, label: "Esta semana", count: kpis.semana },
          { key: "mes" as TabKey, label: "Este mês", count: kpis.mes },
          { key: "todos" as TabKey, label: "Todos", count: embarques.length },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${tab === t.key ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>
            {t.label} {t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue3)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-[var(--blue)]">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-[15px] font-bold text-[var(--txt)]">Nenhum embarque encontrado</div>
            <div className="text-[13px] text-[var(--txt3)]">{tab === "todos" ? "Cadastre o primeiro embarque." : "Sem embarques neste período."}</div>
            <button onClick={openNew} className="rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">Cadastrar embarque</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  {["Cliente", "Destino", "Embarque", "Retorno", "Pax", "Loja", "Arte", "Ações"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const badge = dateBadge(e.data_embarque);
                  const storeName = e.store_id ? storeMap[e.store_id] : licMap[e.licensee_id];

                  return (
                    <tr key={e.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      {/* Cliente */}
                      <td className="whitespace-nowrap pl-5 pr-4 py-3">
                        <div className="font-medium text-[var(--txt)]">{e.cliente_nome}</div>
                        {e.cliente_contato && <div className="text-[10px] text-[var(--txt3)]">{e.cliente_contato}</div>}
                      </td>
                      {/* Destino */}
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--txt)]">{e.destino}</td>
                      {/* Embarque */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--txt2)]">{formatDate(e.data_embarque)}</span>
                          <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold" style={{ background: badge.bg, color: badge.text }}>{badge.label}</span>
                        </div>
                      </td>
                      {/* Retorno */}
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{e.data_retorno ? formatDate(e.data_retorno) : "—"}</td>
                      {/* Pax */}
                      <td className="whitespace-nowrap px-4 py-3 text-center text-[var(--txt2)]">{e.num_passageiros}</td>
                      {/* Loja */}
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{storeName ?? "—"}</td>
                      {/* Arte */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {e.arte_gerada ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green3)] px-2 py-0.5 text-[0.6rem] font-bold text-[var(--green)]">
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Gerada
                          </span>
                        ) : (
                          <button onClick={() => toggleArte(e.id, false)} className="rounded-full bg-[var(--orange3)] px-2 py-0.5 text-[0.6rem] font-bold text-[var(--orange)] hover:opacity-80">
                            Gerar arte
                          </button>
                        )}
                      </td>
                      {/* Ações */}
                      <td className="whitespace-nowrap pr-5 pl-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(e)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                          <button onClick={() => setDeleteId(e.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <Ov onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir embarque?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Esta ação não pode ser desfeita.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={() => deleteEmbarque(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Ov>
      )}

      {/* New/Edit modal */}
      {modalOpen && (
        <Ov onClose={() => setModalOpen(false)}>
          <div className="mx-4 flex w-full max-w-[540px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editId ? "Editar embarque" : "Novo embarque"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <F label="Nome do passageiro" value={form.cliente_nome} onChange={(v) => setForm({ ...form, cliente_nome: v })} placeholder="João Silva" />
                  <F label="Contato" value={form.cliente_contato} onChange={(v) => setForm({ ...form, cliente_contato: v })} placeholder="(17) 99999-0000" />
                </div>
                <F label="Destino" value={form.destino} onChange={(v) => setForm({ ...form, destino: v })} placeholder="Cancún, México" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Data embarque</label>
                    <input type="date" value={form.data_embarque} onChange={(e) => setForm({ ...form, data_embarque: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Data retorno</label>
                    <input type="date" value={form.data_retorno} onChange={(e) => setForm({ ...form, data_retorno: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Nº passageiros" value={form.num_passageiros} onChange={(v) => setForm({ ...form, num_passageiros: v })} type="number" />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Tipo de pacote</label>
                    <select value={form.tipo_pacote} onChange={(e) => setForm({ ...form, tipo_pacote: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="pacote">Pacote</option>
                      <option value="passagem">Passagem aérea</option>
                      <option value="cruzeiro">Cruzeiro</option>
                      <option value="hotel">Hotel</option>
                      <option value="transfer">Transfer</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Marca / Licenciado</label>
                    <select value={form.licensee_id} onChange={(e) => setForm({ ...form, licensee_id: e.target.value, store_id: "" })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Selecionar...</option>
                      {licensees.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Loja</label>
                    <select value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Nenhuma</option>
                      {storesForLic.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o embarque..." rows={3} className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none resize-none" />
                </div>
                {modalError && <div className="rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editId ? "Salvar" : "Cadastrar"}</button>
            </div>
          </div>
        </Ov>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Ov({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{children}</div>;
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glass flex flex-col gap-1 p-4">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">{label}</div>
      <span className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
    </div>
  );
}

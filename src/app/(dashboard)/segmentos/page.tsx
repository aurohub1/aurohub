"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Segment {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  created_at: string;
}

interface Licensee {
  id: string;
  name: string;
  segment_id: string | null;
  plan: string;
  status: string;
}

interface StoreCount { licensee_id: string; count: number; }

type StatusFilter = "" | "active" | "inactive";

/* ── Component ───────────────────────────────────── */

export default function SegmentosPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [storeCounts, setStoreCounts] = useState<StoreCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "" });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [segRes, licRes, storesRes] = await Promise.all([
        supabase.from("segments").select("*").order("name"),
        supabase.from("licensees").select("id, name, segment_id, plan, status"),
        supabase.from("stores").select("licensee_id"),
      ]);
      setSegments((segRes.data as Segment[]) ?? []);
      setLicensees((licRes.data as Licensee[]) ?? []);
      const c: Record<string, number> = {};
      ((storesRes.data ?? []) as { licensee_id: string }[]).forEach((s) => { c[s.licensee_id] = (c[s.licensee_id] || 0) + 1; });
      setStoreCounts(Object.entries(c).map(([licensee_id, count]) => ({ licensee_id, count })));
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const storeMap = useMemo(() => {
    const m: Record<string, number> = {};
    storeCounts.forEach((s) => { m[s.licensee_id] = s.count; });
    return m;
  }, [storeCounts]);

  const segLicensees = useMemo(() => {
    const m: Record<string, Licensee[]> = {};
    licensees.forEach((l) => {
      if (l.segment_id) {
        if (!m[l.segment_id]) m[l.segment_id] = [];
        m[l.segment_id].push(l);
      }
    });
    return m;
  }, [licensees]);

  const segStoreCount = useMemo(() => {
    const m: Record<string, number> = {};
    Object.entries(segLicensees).forEach(([segId, lics]) => {
      m[segId] = lics.reduce((sum, l) => sum + (storeMap[l.id] ?? 0), 0);
    });
    return m;
  }, [segLicensees, storeMap]);

  const filtered = useMemo(() => {
    return segments.filter((s) => {
      const ms = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const mst = !statusFilter ||
        (statusFilter === "active" ? s.active : !s.active);
      return ms && mst;
    });
  }, [segments, search, statusFilter]);

  const kpis = useMemo(() => ({
    total: segments.length,
    active: segments.filter((s) => s.active).length,
    withLicensees: segments.filter((s) => (segLicensees[s.id]?.length ?? 0) > 0).length,
    empty: segments.filter((s) => (segLicensees[s.id]?.length ?? 0) === 0).length,
  }), [segments, segLicensees]);

  /* ── Actions ───────────────────────────────────── */

  function openNew() {
    setEditingId(null);
    setForm({ name: "", description: "", icon: "" });
    setModalError("");
    setModalOpen(true);
  }

  function openEdit(seg: Segment) {
    setEditingId(seg.id);
    setForm({ name: seg.name, description: seg.description ?? "", icon: seg.icon ?? "" });
    setModalError("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setModalError("Nome obrigatório."); return; }
    setSaving(true); setModalError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, icon: form.icon.trim() || null };
      if (editingId) {
        const { error } = await supabase.from("segments").update(payload).eq("id", editingId);
        if (error) { setModalError(error.message); return; }
      } else {
        const { error } = await supabase.from("segments").insert(payload);
        if (error) { setModalError(error.message.includes("duplicate") ? "Segmento já existe." : error.message); return; }
      }
      setModalOpen(false); await loadData();
    } catch { setModalError("Erro ao salvar."); } finally { setSaving(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("segments").update({ active: !current }).eq("id", id);
    await loadData();
  }

  async function deleteSegment(id: string) {
    await supabase.from("segments").delete().eq("id", id);
    setDeleteId(null); await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-6">
        <KpiInline label="Total" value={String(kpis.total)} />
        <KpiInline label="Ativos" value={String(kpis.active)} accent />
        <KpiInline label="Com clientes" value={String(kpis.withLicensees)} />
        <KpiInline label="Sem clientes" value={String(kpis.empty)} />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Segmentos</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Categorias de negócio dos clientes</p>
        </div>
        <button onClick={openNew} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--txt)] px-4 text-[12px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo segmento
        </button>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar segmento..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {([
            { key: "" as StatusFilter, label: "Todos" },
            { key: "active" as StatusFilter, label: "Ativos" },
            { key: "inactive" as StatusFilter, label: "Inativos" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${statusFilter === t.key ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)] hover:text-[var(--txt2)]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum segmento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Segmento</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Descrição</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">Clientes</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">Lojas</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-[var(--txt3)]">Criado em</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[var(--txt3)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((seg) => {
                  const lics = segLicensees[seg.id] ?? [];
                  const stores = segStoreCount[seg.id] ?? 0;
                  return (
                    <tr key={seg.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[14px]">{seg.icon || "📦"}</span>
                          <span className="font-medium text-[var(--txt)]">{seg.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--txt3)]">{seg.description || "—"}</td>
                      <td className="px-4 py-3 text-center text-[var(--txt2)]">{lics.length}</td>
                      <td className="px-4 py-3 text-center text-[var(--txt2)]">{stores}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] ${seg.active ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${seg.active ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />
                          {seg.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-[var(--txt3)]">
                        {new Date(seg.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(seg)} className="text-[12px] font-medium text-[var(--txt3)] transition-colors hover:text-[var(--txt)]">Editar</button>
                          <button onClick={() => toggleActive(seg.id, seg.active)} className="text-[12px] font-medium text-[var(--txt3)] transition-colors hover:text-[var(--txt)]">
                            {seg.active ? "Desativar" : "Ativar"}
                          </button>
                          <button onClick={() => setDeleteId(seg.id)} className="text-[12px] font-medium text-[var(--txt3)] transition-colors hover:text-[var(--red)]">Excluir</button>
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

      {/* ── Delete confirm ────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)]" style={{ background: "var(--card-bg)" }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir segmento?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Clientes vinculados ficarão sem segmento.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={() => deleteSegment(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo/Editar segmento ──────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={() => setModalOpen(false)}>
          <div className="mx-4 w-full max-w-[440px] rounded-2xl border border-[var(--bdr)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]" style={{ background: "var(--card-bg)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editingId ? "Editar segmento" : "Novo segmento"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Turismo" className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Descrição</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição curta (opcional)" className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Ícone (emoji)</label>
                <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="✈️" className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
              </div>

              {/* Linked licensees (edit only) */}
              {editingId && (segLicensees[editingId]?.length ?? 0) > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-medium text-[var(--txt3)]">Clientes vinculados</div>
                  <div className="flex flex-col gap-1 rounded-lg border border-[var(--bdr)] p-3">
                    {segLicensees[editingId]!.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--txt)]">{l.name}</span>
                        <span className="text-[var(--txt3)]">{l.plan || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalError && <div className="rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function KpiInline({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] text-[var(--txt3)]">{label}</span>
      <span className={`text-[16px] font-bold ${accent ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{value}</span>
    </div>
  );
}

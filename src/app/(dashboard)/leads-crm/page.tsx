"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  segment_id: string | null;
  plan_interest: string | null;
  origin: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Interaction {
  id: string;
  lead_id: string;
  text: string;
  created_at: string;
}

interface Segment { id: string; name: string; icon: string | null; }

type ViewMode = "table" | "kanban";

/* ── Constants ───────────────────────────────────── */

const STATUSES: { key: string; label: string; bg: string; text: string }[] = [
  { key: "new",         label: "Novo",           bg: "var(--blue3)",   text: "var(--blue)" },
  { key: "contacted",   label: "Contatado",      bg: "var(--gold3)",   text: "var(--gold)" },
  { key: "negotiation", label: "Em negociação",  bg: "var(--orange3)", text: "var(--orange)" },
  { key: "converted",   label: "Convertido",     bg: "var(--green3)",  text: "var(--green)" },
  { key: "lost",        label: "Perdido",        bg: "var(--red3)",    text: "var(--red)" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

const PLAN_OPTIONS = [
  { value: "basic", label: "Essencial" },
  { value: "pro", label: "Profissional" },
  { value: "business", label: "Franquia" },
  { value: "enterprise", label: "Enterprise" },
];

const ORIGIN_OPTIONS = ["Site", "Indicação", "Instagram", "WhatsApp", "Outro"];

const PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  baixa: { bg: "var(--bg3)", text: "var(--txt3)" },
  media: { bg: "var(--gold3)", text: "var(--gold)" },
  alta:  { bg: "var(--red3)", text: "var(--red)" },
};

/* ── Component ───────────────────────────────────── */

export default function LeadsCrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Filters
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSegment, setFSegment] = useState("");
  const [fPlan, setFPlan] = useState("");
  const [fOrigin, setFOrigin] = useState("");
  const [fPriority, setFPriority] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", segment_id: "",
    plan_interest: "", origin: "Site", priority: "media", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Detail modal
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Kanban drag
  const dragRef = useRef<{ id: string; fromStatus: string } | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [leadsR, segR] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("segments").select("id, name, icon"),
      ]);
      setLeads((leadsR.data as Lead[]) ?? []);
      setSegments((segR.data as Segment[]) ?? []);
    } catch (err) { console.error("[Leads] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const segMap = useMemo(() => {
    const m: Record<string, Segment> = {};
    segments.forEach((s) => { m[s.id] = s; });
    return m;
  }, [segments]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const ms = !q || (l.name + (l.company ?? "") + (l.email ?? "")).toLowerCase().includes(q);
      const mst = !fStatus || l.status === fStatus;
      const msg = !fSegment || l.segment_id === fSegment;
      const mp = !fPlan || l.plan_interest === fPlan;
      const mo = !fOrigin || l.origin === fOrigin;
      const mpr = !fPriority || l.priority === fPriority;
      return ms && mst && msg && mp && mo && mpr;
    });
  }, [leads, search, fStatus, fSegment, fPlan, fOrigin, fPriority]);

  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const total = leads.length;
    const novosHoje = leads.filter((l) => l.created_at.startsWith(hoje)).length;
    const negociacao = leads.filter((l) => l.status === "negotiation").length;
    const convertidos = leads.filter((l) => l.status === "converted").length;
    const taxa = total > 0 ? Math.round((convertidos / total) * 100) : 0;
    return { total, novosHoje, negociacao, convertidos, taxa };
  }, [leads]);

  /* ── Modal actions ─────────────────────────────── */

  function openNew() {
    setEditId(null);
    setForm({ name: "", company: "", email: "", phone: "", segment_id: "", plan_interest: "", origin: "Site", priority: "media", notes: "" });
    setModalError(""); setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditId(lead.id);
    setForm({
      name: lead.name, company: lead.company ?? "", email: lead.email ?? "",
      phone: lead.phone ?? "", segment_id: lead.segment_id ?? "",
      plan_interest: lead.plan_interest ?? "", origin: lead.origin ?? "Site",
      priority: lead.priority ?? "media", notes: lead.notes ?? "",
    });
    setModalError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setModalError("Nome obrigatório."); return; }
    setSaving(true); setModalError("");
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        segment_id: form.segment_id || null,
        plan_interest: form.plan_interest || null,
        origin: form.origin || null,
        priority: form.priority || "media",
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editId) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editId);
        if (error) { setModalError(error.message); return; }
      } else {
        const { error } = await supabase.from("leads").insert({ ...payload, status: "new" });
        if (error) { setModalError(error.message); return; }
      }
      setModalOpen(false); await loadData();
    } catch { setModalError("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  /* ── Status change ─────────────────────────────── */

  async function changeStatus(id: string, status: string) {
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    if (detailLead?.id === id) setDetailLead((prev) => prev ? { ...prev, status } : null);
  }

  async function deleteLead(id: string) {
    await supabase.from("leads").delete().eq("id", id);
    setDeleteId(null); await loadData();
  }

  /* ── Detail + interactions ─────────────────────── */

  async function openDetail(lead: Lead) {
    setDetailLead(lead);
    setLoadingInteractions(true);
    const { data } = await supabase.from("lead_interactions").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setInteractions((data as Interaction[]) ?? []);
    setLoadingInteractions(false);
  }

  async function addInteraction() {
    if (!newNote.trim() || !detailLead) return;
    setAddingNote(true);
    await supabase.from("lead_interactions").insert({ lead_id: detailLead.id, text: newNote.trim() });
    setNewNote("");
    const { data } = await supabase.from("lead_interactions").select("*").eq("lead_id", detailLead.id).order("created_at", { ascending: false });
    setInteractions((data as Interaction[]) ?? []);
    setAddingNote(false);
  }

  /* ── Convert to client ─────────────────────────── */

  async function convertToClient(lead: Lead) {
    if (!lead.email) { alert("Lead precisa de email para converter."); return; }
    const { error } = await supabase.from("licensees").insert({
      name: lead.company || lead.name,
      email: lead.email,
      plan: lead.plan_interest || "basic",
      segment_id: lead.segment_id || null,
      status: "active",
    });
    if (error) { alert(`Erro: ${error.message}`); return; }
    await changeStatus(lead.id, "converted");
    setDetailLead(null);
  }

  /* ── Kanban drag ───────────────────────────────── */

  function onDragStart(id: string, fromStatus: string) {
    dragRef.current = { id, fromStatus };
  }

  function onDrop(toStatus: string) {
    if (!dragRef.current || dragRef.current.fromStatus === toStatus) return;
    changeStatus(dragRef.current.id, toStatus);
    dragRef.current = null;
  }

  const hasFilters = search || fStatus || fSegment || fPlan || fOrigin || fPriority;

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiMini label="Total leads" value={String(kpis.total)} color="var(--txt)" />
        <KpiMini label="Novos hoje" value={String(kpis.novosHoje)} color="var(--blue)" />
        <KpiMini label="Em negociação" value={String(kpis.negociacao)} color="var(--orange)" />
        <KpiMini label="Convertidos" value={String(kpis.convertidos)} color="var(--green)" />
        <KpiMini label="Taxa conversão" value={`${kpis.taxa}%`} color="var(--gold)" />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Leads CRM</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Pipeline de vendas e acompanhamento de leads</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
            <button onClick={() => setViewMode("table")} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${viewMode === "table" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>
              Tabela
            </button>
            <button onClick={() => setViewMode("kanban")} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${viewMode === "kanban" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>
              Kanban
            </button>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Novo lead
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar nome, empresa, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Status</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={fSegment} onChange={(e) => setFSegment(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Segmento</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <select value={fPlan} onChange={(e) => setFPlan(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Plano</option>
          {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Origem</option>
          {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Prioridade</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setFStatus(""); setFSegment(""); setFPlan(""); setFOrigin(""); setFPriority(""); }} className="text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--red)]">Limpar</button>
        )}
      </div>

      {/* ── TABLE VIEW ───────────────────────────── */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
          {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
          : filtered.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">{hasFilters ? "Nenhum lead encontrado." : "Nenhum lead cadastrado."}</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--bdr)]">
                    {["Nome / Empresa", "Contato", "Segmento", "Plano", "Origem", "Prioridade", "Status", "Criado em", "Ações"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const st = STATUS_MAP[lead.status] ?? STATUS_MAP.new;
                    const seg = lead.segment_id ? segMap[lead.segment_id] : null;
                    const plan = PLAN_OPTIONS.find((p) => p.value === lead.plan_interest);
                    const pri = PRIORITY_COLORS[lead.priority ?? "media"] ?? PRIORITY_COLORS.media;

                    return (
                      <tr key={lead.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                        <td className="whitespace-nowrap pl-5 pr-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{lead.name.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--txt)]">{lead.name}</div>
                              {lead.company && <div className="truncate text-[10px] text-[var(--txt3)]">{lead.company}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-[var(--txt2)]">{lead.email || "—"}</div>
                          {lead.phone && <div className="text-[10px] text-[var(--txt3)]">{lead.phone}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{seg ? `${seg.icon ?? ""} ${seg.name}` : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">{plan?.label ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{lead.origin ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: pri.bg, color: pri.text }}>{(lead.priority ?? "media").charAt(0).toUpperCase() + (lead.priority ?? "media").slice(1)}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</td>
                        <td className="whitespace-nowrap pr-5 pl-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openDetail(lead)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Detalhes</button>
                            <button onClick={() => openEdit(lead)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                            {lead.status !== "converted" && lead.status !== "lost" && (
                              <button onClick={() => changeStatus(lead.id, "lost")} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Perdido</button>
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
        </div>
      )}

      {/* ── KANBAN VIEW ──────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((col) => {
            const colLeads = filtered.filter((l) => l.status === col.key);
            return (
              <div
                key={col.key}
                className="flex w-[260px] shrink-0 flex-col rounded-xl border border-[var(--bdr)]"
                style={{ background: "var(--card-bg)" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col.key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-[var(--bdr)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: col.bg, color: col.text }}>{col.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--txt3)]">{colLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 p-3" style={{ minHeight: 100 }}>
                  {colLeads.map((lead) => {
                    const plan = PLAN_OPTIONS.find((p) => p.value === lead.plan_interest);
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => onDragStart(lead.id, lead.status)}
                        onClick={() => openDetail(lead)}
                        className="cursor-pointer rounded-lg border border-[var(--bdr)] p-3 transition-colors hover:border-[var(--bdr2)] hover:bg-[var(--hover-bg)]"
                      >
                        <div className="text-[13px] font-medium text-[var(--txt)]">{lead.name}</div>
                        {lead.company && <div className="mt-0.5 text-[11px] text-[var(--txt3)]">{lead.company}</div>}
                        <div className="mt-2 flex items-center justify-between">
                          {plan && <span className="text-[10px] text-[var(--txt3)]">{plan.label}</span>}
                          <span className="text-[10px] text-[var(--txt3)]">{new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirm ────────────────────────── */}
      {deleteId && (
        <Overlay onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir lead?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Esta ação não pode ser desfeita.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={() => deleteLead(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── New/Edit modal ────────────────────────── */}
      {modalOpen && (
        <Overlay onClose={() => setModalOpen(false)}>
          <div className="mx-4 flex w-full max-w-[520px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editId ? "Editar lead" : "Novo lead"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="João Silva" />
                  <Field label="Empresa" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Agência XYZ" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="joao@empresa.com" type="email" />
                  <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(17) 99999-0000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                    <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Nenhum</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Plano de interesse</label>
                    <select value={form.plan_interest} onChange={(e) => setForm({ ...form, plan_interest: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Nenhum</option>
                      {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Origem</label>
                    <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Prioridade</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Observações</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas sobre o lead..." rows={3} className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)] resize-none" />
                </div>
                {modalError && <div className="rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editId ? "Salvar" : "Criar lead"}</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Detail modal ─────────────────────────── */}
      {detailLead && (
        <Overlay onClose={() => setDetailLead(null)}>
          <div className="mx-4 flex w-full max-w-[580px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">{detailLead.name}</h2>
                {detailLead.company && <p className="mt-0.5 text-[12px] text-[var(--txt3)]">{detailLead.company}</p>}
              </div>
              <button onClick={() => setDetailLead(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Status + priority badges */}
              <div className="mb-5 flex items-center gap-2">
                {(() => { const st = STATUS_MAP[detailLead.status] ?? STATUS_MAP.new; return <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: st.bg, color: st.text }}>{st.label}</span>; })()}
                {(() => { const pri = PRIORITY_COLORS[detailLead.priority ?? "media"]; return <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: pri.bg, color: pri.text }}>Prioridade {(detailLead.priority ?? "media").charAt(0).toUpperCase() + (detailLead.priority ?? "media").slice(1)}</span>; })()}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <InfoRow label="Email" value={detailLead.email ?? "—"} />
                <InfoRow label="Telefone" value={detailLead.phone ?? "—"} />
                <InfoRow label="Segmento" value={detailLead.segment_id ? (segMap[detailLead.segment_id]?.name ?? "—") : "—"} />
                <InfoRow label="Plano" value={PLAN_OPTIONS.find((p) => p.value === detailLead.plan_interest)?.label ?? "—"} />
                <InfoRow label="Origem" value={detailLead.origin ?? "—"} />
                <InfoRow label="Criado em" value={new Date(detailLead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} />
              </div>

              {detailLead.notes && (
                <div className="mb-5">
                  <div className="text-[11px] font-medium text-[var(--txt3)]">Observações</div>
                  <div className="mt-1 rounded-lg border border-[var(--bdr)] p-3 text-[13px] text-[var(--txt)] whitespace-pre-wrap">{detailLead.notes}</div>
                </div>
              )}

              {/* Status actions */}
              <div className="mb-5 flex flex-wrap gap-2">
                {STATUSES.filter((s) => s.key !== detailLead.status).map((s) => (
                  <button key={s.key} onClick={() => changeStatus(detailLead.id, s.key)} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                    Mover → {s.label}
                  </button>
                ))}
              </div>

              {/* Convert button */}
              {detailLead.status !== "converted" && (
                <button onClick={() => convertToClient(detailLead)} className="mb-5 w-full rounded-lg bg-[var(--green)] py-2 text-[13px] font-semibold text-white hover:opacity-90">
                  Converter em cliente
                </button>
              )}

              {/* Interactions timeline */}
              <div className="border-t border-[var(--bdr)] pt-5">
                <div className="mb-3 text-[13px] font-semibold text-[var(--txt)]">Histórico de interações</div>

                {/* Add note */}
                <div className="mb-4 flex gap-2">
                  <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota..." onKeyDown={(e) => { if (e.key === "Enter") addInteraction(); }} className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                  <button onClick={addInteraction} disabled={addingNote || !newNote.trim()} className="rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-40">
                    {addingNote ? "..." : "Adicionar"}
                  </button>
                </div>

                {loadingInteractions ? (
                  <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
                ) : interactions.length === 0 ? (
                  <div className="text-[12px] text-[var(--txt3)]">Nenhuma interação registrada.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {interactions.map((i) => (
                      <div key={i.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-[var(--orange)]" />
                          <div className="flex-1 w-px bg-[var(--bdr)]" />
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="text-[13px] text-[var(--txt)]">{i.text}</div>
                          <div className="mt-0.5 text-[10px] text-[var(--txt3)]">{new Date(i.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-[var(--txt3)]">{label}</div>
      <div className="mt-0.5 text-[13px] text-[var(--txt)]">{value}</div>
    </div>
  );
}

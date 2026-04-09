"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";

/* ── Types ───────────────────────────────────────── */

interface Licensee {
  id: string; name: string; email: string; plan: string; status: string;
  segment_id: string | null; expires_at: string | null; created_at: string;
  logo_url: string | null;
}
interface Segment { id: string; name: string; icon: string | null; }
interface Plan { slug: string; name: string; price_monthly: number; }
interface Store { id: string; licensee_id: string; name: string; ig_user_id: string | null; }
interface Profile { id: string; licensee_id: string | null; store_id: string | null; name: string | null; status: string; }

type TabFilter = "" | "active" | "inactive";
type ModalTab = "dados" | "plano" | "lojas";

const PLAN_COLORS: Record<string, { color: string; label: string }> = {
  basic: { color: "#64748b", label: "Essencial" },
  pro: { color: "#3B82F6", label: "Profissional" },
  business: { color: "#FF7A1A", label: "Franquia" },
  enterprise: { color: "#D4A843", label: "Enterprise" },
};

/* ── Component ───────────────────────────────────── */

export default function ClientesPage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter>("");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("dados");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", segment_id: "", plan: "basic", price_setup: "1500", min_months: "6", logo_url: "" });
  const [formStores, setFormStores] = useState<{ name: string; ig_user_id: string }[]>([{ name: "", ig_user_id: "" }]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // View stores modal
  const [viewStoresId, setViewStoresId] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [licR, segR, planR, storeR, profR] = await Promise.all([
        supabase.from("licensees").select("id, name, email, plan, status, segment_id, expires_at, created_at, logo_url").order("created_at", { ascending: false }),
        supabase.from("segments").select("id, name, icon"),
        supabase.from("plans").select("slug, name, price_monthly"),
        supabase.from("stores").select("id, licensee_id, name, ig_user_id"),
        supabase.from("profiles").select("id, licensee_id, store_id, name, status"),
      ]);
      setLicensees((licR.data as Licensee[]) ?? []);
      setSegments((segR.data as Segment[]) ?? []);
      setPlans((planR.data as Plan[]) ?? []);
      setStores((storeR.data as Store[]) ?? []);
      setProfiles((profR.data as Profile[]) ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const segMap = useMemo(() => { const m: Record<string, Segment> = {}; segments.forEach((s) => { m[s.id] = s; }); return m; }, [segments]);
  const planMap = useMemo(() => { const m: Record<string, Plan> = {}; plans.forEach((p) => { m[p.slug] = p; }); return m; }, [plans]);
  const storesByLic = useMemo(() => { const m: Record<string, Store[]> = {}; stores.forEach((s) => { if (!m[s.licensee_id]) m[s.licensee_id] = []; m[s.licensee_id].push(s); }); return m; }, [stores]);
  const usersByLic = useMemo(() => { const m: Record<string, number> = {}; profiles.forEach((p) => { const k = p.licensee_id ?? ""; m[k] = (m[k] || 0) + 1; }); return m; }, [profiles]);

  const kpis = useMemo(() => {
    const active = licensees.filter((l) => l.status === "active").length;
    const withPlan = licensees.filter((l) => l.plan).length;
    const mrr = licensees.filter((l) => l.status === "active").reduce((s, l) => s + (planMap[l.plan]?.price_monthly ?? 0), 0);
    return { total: licensees.length, active, withPlan, noPlan: licensees.length - withPlan, mrr };
  }, [licensees, planMap]);

  const filtered = useMemo(() => {
    return licensees.filter((l) => {
      const ms = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
      const mseg = !segFilter || l.segment_id === segFilter;
      const mp = !planFilter || l.plan === planFilter;
      const mst = !statusFilter || (statusFilter === "active" ? l.status === "active" : l.status !== "active");
      return ms && mseg && mp && mst;
    });
  }, [licensees, search, segFilter, planFilter, statusFilter]);

  /* ── Actions ───────────────────────────────────── */

  function openNew() {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", segment_id: "", plan: "basic", price_setup: "1500", min_months: "6", logo_url: "" });
    setFormStores([{ name: "", ig_user_id: "" }]);
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  function openEdit(l: Licensee) {
    setEditingId(l.id);
    setForm({ name: l.name, email: l.email, phone: "", segment_id: l.segment_id ?? "", plan: l.plan || "basic", price_setup: "0", min_months: "6", logo_url: l.logo_url ?? "" });
    const existing = storesByLic[l.id] ?? [];
    setFormStores(existing.length > 0 ? existing.map((s) => ({ name: s.name, ig_user_id: s.ig_user_id ?? "" })) : [{ name: "", ig_user_id: "" }]);
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setModalError("Nome e email obrigatórios."); return; }
    setSaving(true); setModalError("");
    try {
      const payload = {
        name: form.name.trim(), email: form.email.trim().toLowerCase(),
        plan: form.plan, segment_id: form.segment_id || null, status: "active",
        logo_url: form.logo_url || null,
      };

      if (editingId) {
        const { error } = await supabase.from("licensees").update(payload).eq("id", editingId);
        if (error) { setModalError(error.message); return; }
        // Update stores
        for (const fs of formStores) {
          if (fs.name.trim()) {
            const existing = (storesByLic[editingId] ?? []).find((s) => s.name === fs.name);
            if (!existing) {
              await supabase.from("stores").insert({ licensee_id: editingId, name: fs.name.trim(), ig_user_id: fs.ig_user_id.trim() || null });
            }
          }
        }
      } else {
        const { data, error } = await supabase.from("licensees").insert(payload).select("id").single();
        if (error) { setModalError(error.message.includes("duplicate") ? "Email já cadastrado." : error.message); return; }
        if (data) {
          for (const fs of formStores) {
            if (fs.name.trim()) {
              await supabase.from("stores").insert({ licensee_id: data.id, name: fs.name.trim(), ig_user_id: fs.ig_user_id.trim() || null });
            }
          }
        }
      }
      setModalOpen(false); await loadData();
    } catch { setModalError("Erro ao salvar."); } finally { setSaving(false); }
  }

  async function toggleStatus(id: string, current: string) {
    await supabase.from("licensees").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    await loadData();
  }

  async function deleteClient(id: string) {
    await supabase.from("licensees").delete().eq("id", id);
    setDeleteId(null); await loadData();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/logos");
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      console.error("[Logo upload]", err);
      setModalError("Falha no upload — cole a URL manualmente.");
    } finally { setUploading(false); }
  }

  function addStoreRow() { setFormStores([...formStores, { name: "", ig_user_id: "" }]); }
  function removeStoreRow(i: number) { setFormStores(formStores.filter((_, idx) => idx !== i)); }
  function updateStoreRow(i: number, field: string, val: string) { setFormStores(formStores.map((s, idx) => idx === i ? { ...s, [field]: val } : s)); }

  const viewStores = viewStoresId ? storesByLic[viewStoresId] ?? [] : [];
  const viewName = viewStoresId ? licensees.find((l) => l.id === viewStoresId)?.name ?? "" : "";

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-6">
        <KI label="Total" value={String(kpis.total)} />
        <KI label="Ativos" value={String(kpis.active)} accent />
        <KI label="Com plano" value={String(kpis.withPlan)} />
        <KI label="Sem plano" value={String(kpis.noPlan)} />
        <KI label="MRR" value={`R$${kpis.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} accent />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Clientes</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie licenciados, lojas e permissões</p>
        </div>
        <button onClick={openNew} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--txt)] px-4 text-[12px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo cliente
        </button>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Segmento</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Plano</option>
          {Object.entries(PLAN_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {([{ key: "" as TabFilter, l: "Todos" }, { key: "active" as TabFilter, l: "Ativos" }, { key: "inactive" as TabFilter, l: "Inativos" }]).map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${statusFilter === t.key ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum cliente encontrado</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  {["Cliente", "Segmento", "Plano", "Lojas", "Usuários", "Status", "Criado em", "Ações"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const seg = l.segment_id ? segMap[l.segment_id] : null;
                  const pc = PLAN_COLORS[l.plan];
                  const storeCount = storesByLic[l.id]?.length ?? 0;
                  const userCount = usersByLic[l.id] ?? 0;
                  const isActive = l.status === "active";

                  return (
                    <tr key={l.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="whitespace-nowrap pl-5 pr-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {l.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={l.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{l.name.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--txt)]">{l.name}</div>
                            <div className="truncate text-[11px] text-[var(--txt3)]">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{seg ? `${seg.icon ?? ""} ${seg.name}` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{pc ? <span className="text-[12px] font-medium" style={{ color: pc.color }}>{pc.label}</span> : <span className="text-[var(--txt3)]">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">{storeCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">{userCount}</td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[12px] ${isActive ? "text-[var(--green)]" : "text-[var(--red)]"}`}><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />{isActive ? "Ativo" : "Inativo"}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</td>
                      <td className="whitespace-nowrap pr-5 pl-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(l)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                          <button onClick={() => setViewStoresId(l.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Lojas</button>
                          <button onClick={() => toggleStatus(l.id, l.status)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">{isActive ? "Desativar" : "Ativar"}</button>
                          <button onClick={() => setDeleteId(l.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Excluir</button>
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
        <Overlay onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir cliente?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Lojas e dados vinculados serão removidos.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={() => deleteClient(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── View stores modal ────────────────────── */}
      {viewStoresId && (
        <Overlay onClose={() => setViewStoresId(null)}>
          <div className="mx-4 w-full max-w-[500px] rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">Lojas</h2>
                <p className="mt-0.5 text-[12px] text-[var(--txt3)]">{viewName}</p>
              </div>
              <button onClick={() => setViewStoresId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {viewStores.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[var(--txt3)]">Nenhuma loja cadastrada</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {viewStores.map((s) => {
                    const storeUsers = profiles.filter((p) => p.store_id === s.id).length;
                    return (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3">
                        <div>
                          <div className="text-[13px] font-medium text-[var(--txt)]">{s.name}</div>
                          <div className="text-[11px] text-[var(--txt3)]">{s.ig_user_id ? `IG: ${s.ig_user_id}` : "Sem Instagram"}</div>
                        </div>
                        <div className="text-right text-[11px] text-[var(--txt3)]">
                          {storeUsers} usuário{storeUsers !== 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Create/Edit modal ────────────────────── */}
      {modalOpen && (
        <Overlay onClose={() => setModalOpen(false)}>
          <div className="mx-4 flex w-full max-w-[560px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editingId ? "Editar cliente" : "Novo cliente"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--bdr)] px-6">
              {(["dados", "plano", "lojas"] as ModalTab[]).map((t) => (
                <button key={t} onClick={() => setModalTab(t)} className={`border-b-2 px-4 py-2.5 text-[12px] font-medium transition-colors ${modalTab === t ? "border-[var(--txt)] text-[var(--txt)]" : "border-transparent text-[var(--txt3)] hover:text-[var(--txt2)]"}`}>
                  {t === "dados" ? "Dados" : t === "plano" ? "Plano" : "Lojas"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {modalTab === "dados" && (
                <div className="flex flex-col gap-4">
                  {/* Logo */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Logo da marca</label>
                    <div className="flex items-center gap-4">
                      {form.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={form.logo_url} alt="Logo" className="h-14 w-14 shrink-0 rounded-xl object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg3)] text-[18px] font-bold text-[var(--txt2)]">
                          {(form.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload logo"}
                        </button>
                        <input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="ou cole URL da imagem" className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                        {form.logo_url && <button type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="text-[11px] text-[var(--red)] hover:underline">Remover logo</button>}
                      </div>
                    </div>
                  </div>
                  <Field label="Nome da empresa" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Agência Viaje Bem" />
                  <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="contato@agencia.com.br" type="email" />
                  <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(17) 99999-0000" />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                    <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]">
                      <option value="">Nenhum</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {modalTab === "plano" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Plano</label>
                    <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]">
                      {Object.entries(PLAN_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  {form.plan && planMap[form.plan] && (
                    <div className="rounded-lg border border-[var(--bdr)] p-4 text-[12px]">
                      <div className="mb-1 font-medium text-[var(--txt)]">{PLAN_COLORS[form.plan]?.label}</div>
                      <div className="text-[var(--txt3)]">R${planMap[form.plan].price_monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</div>
                    </div>
                  )}
                  <Field label="Implantação (R$)" value={form.price_setup} onChange={(v) => setForm({ ...form, price_setup: v })} type="number" />
                  <Field label="Fidelidade (meses)" value={form.min_months} onChange={(v) => setForm({ ...form, min_months: v })} type="number" />
                </div>
              )}

              {modalTab === "lojas" && (
                <div className="flex flex-col gap-3">
                  {formStores.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={s.name} onChange={(e) => updateStoreRow(i, "name", e.target.value)} placeholder="Nome da loja" className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                      <input type="text" value={s.ig_user_id} onChange={(e) => updateStoreRow(i, "ig_user_id", e.target.value)} placeholder="Instagram ID" className="h-9 w-[140px] rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                      {formStores.length > 1 && (
                        <button onClick={() => removeStoreRow(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--txt3)] hover:text-[var(--red)]">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addStoreRow} className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                    <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Adicionar loja
                  </button>
                </div>
              )}

              {modalError && <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar" : "Criar cliente"}</button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function KI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] text-[var(--txt3)]">{label}</span>
      <span className={`text-[16px] font-bold ${accent ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{value}</span>
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

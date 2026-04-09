"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";

/* ── Types ───────────────────────────────────────── */

interface Template {
  id: string;
  group_id: string | null;
  format: string;
  width: number;
  height: number;
  image_url: string;
  active: boolean;
  created_at: string;
}

interface Field {
  id: string;
  template_id: string;
  label: string;
  field_key: string;
  field_type: string;
}

interface TemplateGroup {
  id: string;
  licensee_id: string | null;
  segment_id: string | null;
  name: string;
  description: string | null;
  active: boolean;
}

interface Segment { id: string; name: string; icon: string | null; }
interface Licensee { id: string; name: string; }

type ModalTab = "dados" | "campos" | "acesso";

/* ── Constants ───────────────────────────────────── */

const FORMAT_OPTIONS: { value: string; label: string; w: number; h: number }[] = [
  { value: "feed",    label: "Feed (1:1)",     w: 1080, h: 1080 },
  { value: "reels",   label: "Reels (9:16)",   w: 1080, h: 1920 },
  { value: "stories", label: "Stories (9:16)",  w: 1080, h: 1920 },
  { value: "tv",      label: "TV (16:9)",      w: 1920, h: 1080 },
];

const BIND_GROUPS: { group: string; fields: string[] }[] = [
  { group: "Imagens",   fields: ["imgfundo", "imgdestino", "imghotel", "imgloja", "imgperfil"] },
  { group: "Destino",   fields: ["destino", "subdestino"] },
  { group: "Datas",     fields: ["dataida", "datavolta", "noites"] },
  { group: "Hotel",     fields: ["hotel", "categoria"] },
  { group: "Serviços",  fields: ["servicos", "allinclusivo"] },
  { group: "Preço",     fields: ["preco", "parcelas", "entrada", "moeda"] },
  { group: "Loja",      fields: ["loja", "agente", "fone"] },
  { group: "Genérico",  fields: ["titulo", "subtitulo", "texto1", "texto2"] },
];

/* ── Component ───────────────────────────────────── */

export default function EditorTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [fFormat, setFFormat] = useState("");
  const [fSegment, setFSegment] = useState("");
  const [fStatus, setFStatus] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("dados");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", format: "feed", segment_id: "", description: "", image_url: "", active: true,
  });
  const [selectedBinds, setSelectedBinds] = useState<string[]>([]);
  const [accessLicensees, setAccessLicensees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [tR, fR, gR, sR, lR] = await Promise.all([
        supabase.from("templates").select("*").order("created_at", { ascending: false }),
        supabase.from("fields").select("id, template_id, label, field_key, field_type"),
        supabase.from("template_groups").select("id, licensee_id, segment_id, name, description, active"),
        supabase.from("segments").select("id, name, icon"),
        supabase.from("licensees").select("id, name").order("name"),
      ]);
      setTemplates((tR.data as Template[]) ?? []);
      setFields((fR.data as Field[]) ?? []);
      setGroups((gR.data as TemplateGroup[]) ?? []);
      setSegments((sR.data as Segment[]) ?? []);
      setLicensees((lR.data as Licensee[]) ?? []);
    } catch (err) { console.error("[Templates] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const segMap = useMemo(() => {
    const m: Record<string, Segment> = {};
    segments.forEach((s) => { m[s.id] = s; });
    return m;
  }, [segments]);

  const groupMap = useMemo(() => {
    const m: Record<string, TemplateGroup> = {};
    groups.forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const fieldsPerTemplate = useMemo(() => {
    const m: Record<string, Field[]> = {};
    fields.forEach((f) => {
      if (!m[f.template_id]) m[f.template_id] = [];
      m[f.template_id].push(f);
    });
    return m;
  }, [fields]);

  function getGroupName(t: Template): string {
    return t.group_id ? (groupMap[t.group_id]?.name ?? "—") : "—";
  }

  function getSegment(t: Template): Segment | null {
    const g = t.group_id ? groupMap[t.group_id] : null;
    return g?.segment_id ? (segMap[g.segment_id] ?? null) : null;
  }

  // Count licensees that have access (through group's licensee_id)
  function getLicenseeCount(t: Template): number {
    if (!t.group_id) return 0;
    const g = groupMap[t.group_id];
    return g?.licensee_id ? 1 : 0;
  }

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const name = getGroupName(t);
      const seg = getSegment(t);
      const q = search.toLowerCase();
      const ms = !q || name.toLowerCase().includes(q) || t.format.toLowerCase().includes(q);
      const mf = !fFormat || t.format === fFormat;
      const msg = !fSegment || seg?.id === fSegment;
      const mst = !fStatus || (fStatus === "active" ? t.active : !t.active);
      return ms && mf && msg && mst;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, search, fFormat, fSegment, fStatus, groupMap, segMap]);

  const kpis = useMemo(() => ({
    total: templates.length,
    active: templates.filter((t) => t.active).length,
    feed: templates.filter((t) => t.format === "feed").length,
    stories: templates.filter((t) => t.format === "stories").length,
    reels: templates.filter((t) => t.format === "reels").length,
    tv: templates.filter((t) => t.format === "tv").length,
  }), [templates]);

  /* ── Modal ─────────────────────────────────────── */

  function openNew() {
    setEditId(null);
    setForm({ name: "", format: "feed", segment_id: "", description: "", image_url: "", active: true });
    setSelectedBinds([]);
    setAccessLicensees([]);
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  function openEdit(t: Template) {
    setEditId(t.id);
    const g = t.group_id ? groupMap[t.group_id] : null;
    setForm({
      name: g?.name ?? "", format: t.format, segment_id: g?.segment_id ?? "",
      description: g?.description ?? "", image_url: t.image_url, active: t.active,
    });
    const tFields = fieldsPerTemplate[t.id] ?? [];
    setSelectedBinds(tFields.map((f) => f.field_key));
    setAccessLicensees(g?.licensee_id ? [g.licensee_id] : []);
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/templates");
      setForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.error("[Template upload]", err);
      setModalError("Falha no upload — cole a URL manualmente.");
    } finally { setUploading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { setModalError("Nome obrigatório."); return; }
    if (!form.image_url.trim()) { setModalError("Imagem obrigatória."); return; }
    setSaving(true); setModalError("");

    const fmt = FORMAT_OPTIONS.find((f) => f.value === form.format) ?? FORMAT_OPTIONS[0];

    try {
      if (editId) {
        // Update template
        await supabase.from("templates").update({
          format: form.format, width: fmt.w, height: fmt.h,
          image_url: form.image_url, active: form.active,
        }).eq("id", editId);

        // Update group
        const t = templates.find((x) => x.id === editId);
        if (t?.group_id) {
          await supabase.from("template_groups").update({
            name: form.name.trim(), description: form.description.trim() || null,
            segment_id: form.segment_id || null, active: form.active,
            licensee_id: accessLicensees[0] || null,
          }).eq("id", t.group_id);
        }

        // Sync fields: delete old, insert new
        await supabase.from("fields").delete().eq("template_id", editId);
        if (selectedBinds.length > 0) {
          const fieldRows = selectedBinds.map((key, i) => ({
            template_id: editId, label: key, field_key: key, field_type: key.startsWith("img") ? "image" : "text",
            x: 100, y: 100 + i * 50, sort_order: i,
          }));
          await supabase.from("fields").insert(fieldRows);
        }
      } else {
        // Create group first
        const { data: gData, error: gErr } = await supabase.from("template_groups").insert({
          name: form.name.trim(), description: form.description.trim() || null,
          segment_id: form.segment_id || null, active: form.active,
          licensee_id: accessLicensees[0] || null,
        }).select("id").single();
        if (gErr) { setModalError(gErr.message); return; }

        // Create template
        const { data: tData, error: tErr } = await supabase.from("templates").insert({
          group_id: gData.id, format: form.format, width: fmt.w, height: fmt.h,
          image_url: form.image_url, active: form.active,
        }).select("id").single();
        if (tErr) { setModalError(tErr.message); return; }

        // Create fields
        if (selectedBinds.length > 0) {
          const fieldRows = selectedBinds.map((key, i) => ({
            template_id: tData.id, label: key, field_key: key, field_type: key.startsWith("img") ? "image" : "text",
            x: 100, y: 100 + i * 50, sort_order: i,
          }));
          await supabase.from("fields").insert(fieldRows);
        }
      }
      setModalOpen(false); await loadData();
    } catch { setModalError("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("templates").update({ active: !current }).eq("id", id);
    await loadData();
  }

  async function duplicateTemplate(t: Template) {
    const g = t.group_id ? groupMap[t.group_id] : null;
    const { data: gData } = await supabase.from("template_groups").insert({
      name: (g?.name ?? "Template") + " (cópia)", description: g?.description ?? null,
      segment_id: g?.segment_id ?? null, active: false, licensee_id: g?.licensee_id ?? null,
    }).select("id").single();
    if (!gData) return;

    const { data: tData } = await supabase.from("templates").insert({
      group_id: gData.id, format: t.format, width: t.width, height: t.height,
      image_url: t.image_url, active: false,
    }).select("id").single();
    if (!tData) return;

    const tFields = fieldsPerTemplate[t.id] ?? [];
    if (tFields.length > 0) {
      await supabase.from("fields").insert(
        tFields.map((f, i) => ({ template_id: tData.id, label: f.label, field_key: f.field_key, field_type: f.field_type, x: 100, y: 100 + i * 50, sort_order: i }))
      );
    }
    await loadData();
  }

  async function deleteTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    await supabase.from("templates").delete().eq("id", id);
    if (t?.group_id) await supabase.from("template_groups").delete().eq("id", t.group_id);
    setDeleteId(null); await loadData();
  }

  function toggleBind(key: string) {
    setSelectedBinds((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  function toggleAccess(licId: string) {
    setAccessLicensees((prev) => prev.includes(licId) ? prev.filter((x) => x !== licId) : [...prev, licId]);
  }

  const hasFilters = search || fFormat || fSegment || fStatus;

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* KPIs */}
      <div className="flex flex-wrap gap-6">
        <KI label="Total" value={String(kpis.total)} />
        <KI label="Ativos" value={String(kpis.active)} accent />
        <KI label="Feed" value={String(kpis.feed)} />
        <KI label="Stories" value={String(kpis.stories)} />
        <KI label="Reels" value={String(kpis.reels)} />
        <KI label="TV" value={String(kpis.tv)} />
      </div>

      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Editor de Templates</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Crie e gerencie os templates visuais</p>
        </div>
        <a href="/editor" className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo template
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar template..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <select value={fFormat} onChange={(e) => setFFormat(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Formato</option>
          {FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={fSegment} onChange={(e) => setFSegment(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Segmento</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {[{ k: "", l: "Todos" }, { k: "active", l: "Ativos" }, { k: "draft", l: "Rascunho" }].map((t) => (
            <button key={t.k} onClick={() => setFStatus(t.k)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${fStatus === t.k ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{t.l}</button>
          ))}
        </div>
        {hasFilters && <button onClick={() => { setSearch(""); setFFormat(""); setFSegment(""); setFStatus(""); }} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Limpar</button>}
      </div>

      {/* Grid */}
      {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
      : filtered.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">{hasFilters ? "Nenhum template encontrado." : "Nenhum template cadastrado."}</div>
      : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const name = getGroupName(t);
            const seg = getSegment(t);
            const fieldCount = fieldsPerTemplate[t.id]?.length ?? 0;
            const licCount = getLicenseeCount(t);
            const fmtLabel = FORMAT_OPTIONS.find((f) => f.value === t.format)?.label ?? t.format;

            return (
              <div key={t.id} className="overflow-hidden rounded-xl border border-[var(--bdr)] transition-colors hover:border-[var(--bdr2)]" style={{ background: "var(--card-bg)" }}>
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--bg3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image_url} alt={name} className="h-full w-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold backdrop-blur-sm ${t.active ? "bg-[var(--green3)] text-[var(--green)]" : "bg-[var(--bg3)] text-[var(--txt3)]"}`}>
                      {t.active ? "Ativo" : "Rascunho"}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="rounded-md bg-black/50 px-2 py-0.5 text-[0.6rem] font-bold text-white backdrop-blur-sm">{fmtLabel}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="px-4 py-3">
                  <div className="text-[14px] font-bold text-[var(--txt)] truncate">{name}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--txt3)]">
                    {seg && <span>{seg.icon} {seg.name}</span>}
                    <span>{fieldCount} campo{fieldCount !== 1 ? "s" : ""}</span>
                    {licCount > 0 && <span>{licCount} acesso{licCount !== 1 ? "s" : ""}</span>}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--txt3)]">{new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-[var(--bdr)] divide-x divide-[var(--bdr)]">
                  <button onClick={() => openEdit(t)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)] hover:bg-[var(--hover-bg)]">Editar</button>
                  <button onClick={() => duplicateTemplate(t)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)] hover:bg-[var(--hover-bg)]">Duplicar</button>
                  <button onClick={() => toggleActive(t.id, t.active)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)] hover:bg-[var(--hover-bg)]">{t.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => setDeleteId(t.id)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--red)] hover:bg-[var(--hover-bg)]">Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Ov onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir template?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Template e campos vinculados serão removidos.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={() => deleteTemplate(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Ov>
      )}

      {/* New/Edit modal */}
      {modalOpen && (
        <Ov onClose={() => setModalOpen(false)}>
          <div className="mx-4 flex w-full max-w-[640px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editId ? "Editar template" : "Novo template"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--bdr)] px-6">
              {(["dados", "campos", "acesso"] as ModalTab[]).map((t) => (
                <button key={t} onClick={() => setModalTab(t)} className={`border-b-2 px-4 py-2.5 text-[12px] font-medium ${modalTab === t ? "border-[var(--txt)] text-[var(--txt)]" : "border-transparent text-[var(--txt3)]"}`}>
                  {t === "dados" ? "Dados" : t === "campos" ? `Campos (${selectedBinds.length})` : `Acesso (${accessLicensees.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* TAB: Dados */}
              {modalTab === "dados" && (
                <div className="flex flex-col gap-4">
                  <F label="Nome do template" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Pacote Premium Cancún" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Formato</label>
                      <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                        {FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                      <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                        <option value="">Nenhum</option>
                        {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <F label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Descrição do template (opcional)" />

                  {/* Image */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Imagem base</label>
                    <div className="flex items-start gap-4">
                      {form.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={form.image_url} alt="Preview" className="h-24 w-24 shrink-0 rounded-xl object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--bg3)] text-[var(--txt3)]">
                          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1" /><path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1" /></svg>
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1.5">
                        <input ref={imgRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                        <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload imagem"}
                        </button>
                        <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="ou cole URL Cloudinary" className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Status toggle */}
                  <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
                    <button onClick={() => setForm({ ...form, active: true })} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${form.active ? "bg-[var(--green3)] text-[var(--green)]" : "text-[var(--txt3)]"}`}>Ativo</button>
                    <button onClick={() => setForm({ ...form, active: false })} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${!form.active ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Rascunho</button>
                  </div>
                </div>
              )}

              {/* TAB: Campos bind */}
              {modalTab === "campos" && (
                <div className="flex flex-col gap-5">
                  {BIND_GROUPS.map((bg) => (
                    <div key={bg.group}>
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">{bg.group}</div>
                      <div className="flex flex-wrap gap-2">
                        {bg.fields.map((key) => {
                          const sel = selectedBinds.includes(key);
                          return (
                            <button key={key} onClick={() => toggleBind(key)} className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${sel ? "border-[var(--orange)] bg-[var(--orange3)] text-[var(--orange)]" : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"}`}>
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: Acesso */}
              {modalTab === "acesso" && (
                <div className="flex flex-col gap-2">
                  <div className="mb-2 text-[12px] text-[var(--txt3)]">Selecione os licenciados que podem usar este template</div>
                  {licensees.map((l) => {
                    const sel = accessLicensees.includes(l.id);
                    return (
                      <label key={l.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)] ${sel ? "border-[var(--green)] bg-[var(--green3)]" : "border-[var(--bdr)]"}`}>
                        <span className={`text-[13px] font-medium ${sel ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{l.name}</span>
                        <input type="checkbox" checked={sel} onChange={() => toggleAccess(l.id)} className="accent-[var(--green)]" />
                      </label>
                    );
                  })}
                  {licensees.length === 0 && <div className="text-[12px] text-[var(--txt3)]">Nenhum licenciado cadastrado.</div>}
                </div>
              )}

              {modalError && <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editId ? "Salvar" : "Criar"}</button>
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

function KI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex items-baseline gap-2"><span className="text-[12px] text-[var(--txt3)]">{label}</span><span className={`text-[16px] font-bold ${accent ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{value}</span></div>;
}

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" /></div>;
}

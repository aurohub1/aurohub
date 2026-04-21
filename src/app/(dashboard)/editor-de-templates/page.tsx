"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getProfile, type FullProfile } from "@/lib/auth";

interface CanvasTemplate {
  key: string;
  displayName: string;
  nome: string;
  format: string;
  formType: string;
  segmento: string;
  updatedAt: string | null;
  licenseeId: string | null;
  licenseeNome: string;
  lojaNome: string;
  thumbnail: string | null;
  isBase: boolean;
  baseTipo: string | null;
}

const SEGMENTOS = ["Turismo", "Eventos", "Gastronomia", "Imobiliário", "Saúde", "Educação", "Geral"];

const TURISMO_TYPES = new Set(["pacote", "campanha", "cruzeiro", "passagem", "anoiteceu", "quatro_destinos", "lamina"]);
const SEGMENTO_ICONS: Record<string, string> = {
  Turismo: "✈️",
  Eventos: "🎉",
  Gastronomia: "🍽️",
  Imobiliário: "🏠",
  Saúde: "⚕️",
  Educação: "🎓",
  Geral: "📄",
};
const AZV_LICENSEE_PREFIX = "2acbabe7";

function inferBaseSegmento(t: { segmento: string; formType: string; baseTipo: string | null }): string {
  if (t.segmento && t.segmento !== "Geral") return t.segmento;
  const tipo = t.baseTipo || t.formType;
  if (tipo && TURISMO_TYPES.has(tipo)) return "Turismo";
  return t.segmento || "Geral";
}

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

  // Canvas templates (system_config tmpl_*)
  const router = useRouter();
  const [canvasTemplates, setCanvasTemplates] = useState<CanvasTemplate[]>([]);
  const [canvasLoading, setCanvasLoading] = useState(true);
  const [thumbUploadingKey, setThumbUploadingKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [globalFilterType, setGlobalFilterType] = useState("");
  const [globalFilterFormat, setGlobalFilterFormat] = useState("");

  // Clone modal (base → licensee)
  const [cloneKey, setCloneKey] = useState<string | null>(null);
  const [cloneLicensee, setCloneLicensee] = useState<string>("");
  const [cloning, setCloning] = useState(false);

  // Novo template (abre editor com licensee pré-selecionado)
  const [newTmplLicensee, setNewTmplLicensee] = useState<string | null>(null);

  // Imagens dos tipos de publicação — system_config key publicar_thumb_{tipo}
  const PUBLICAR_TIPOS: { k: string; l: string }[] = [
    { k: "pacote", l: "Pacote" },
    { k: "campanha", l: "Campanha" },
    { k: "passagem", l: "Passagem" },
    { k: "cruzeiro", l: "Cruzeiro" },
    { k: "anoiteceu", l: "Anoiteceu" },
    { k: "quatro_destinos", l: "Cards" },
  ];
  const [publicarThumbs, setPublicarThumbs] = useState<Record<string, string>>({});
  const [publicarThumbUploading, setPublicarThumbUploading] = useState<string | null>(null);

  const loadPublicarThumbs = useCallback(async () => {
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .like("key", "publicar_thumb_%");
    const map: Record<string, string> = {};
    for (const r of (data ?? []) as { key: string; value: string }[]) {
      const tipo = r.key.replace(/^publicar_thumb_/, "");
      let url = "";
      try { const p = JSON.parse(r.value); url = p?.url ?? p ?? ""; } catch { url = r.value; }
      if (url && typeof url === "string") map[tipo] = url;
    }
    setPublicarThumbs(map);
  }, []);

  useEffect(() => { loadPublicarThumbs(); }, [loadPublicarThumbs]);

  async function handlePublicarThumbUpload(tipo: string, file: File) {
    console.log("[publicar-thumb] upload start", { tipo, fileName: file.name, size: file.size });
    setPublicarThumbUploading(tipo);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/publicar-thumbs");
      console.log("[publicar-thumb] cloudinary ok", { tipo, url });
      const { error } = await supabase.from("system_config").upsert(
        { key: `publicar_thumb_${tipo}`, value: JSON.stringify({ url }), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) { console.error("[publicar-thumb] upsert error", error); alert(`Falha ao salvar: ${error.message}`); return; }
      setPublicarThumbs((p) => ({ ...p, [tipo]: url }));
    } catch (err) {
      console.error("[publicar-thumb upload]", err);
      alert("Falha no upload.");
    } finally {
      setPublicarThumbUploading(null);
    }
  }

  async function handlePublicarThumbRemove(tipo: string) {
    if (!confirm(`Remover imagem de ${tipo}?`)) return;
    await supabase.from("system_config").delete().eq("key", `publicar_thumb_${tipo}`);
    setPublicarThumbs((p) => {
      const next = { ...p };
      delete next[tipo];
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
    })();
  }, []);

  async function persistField(key: string, field: string, value: string) {
    const { data: row } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", key)
      .single();
    const current = row?.value ? JSON.parse(row.value) : {};
    current[field] = value;
    await supabase
      .from("system_config")
      .upsert({ key, value: JSON.stringify(current), updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  async function saveNome(key: string, nome: string) {
    await persistField(key, "nome", nome);
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, nome } : t)));
  }

  async function saveSegmento(key: string, segmento: string) {
    await persistField(key, "segmento", segmento);
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, segmento } : t)));
  }

  async function persistThumb(key: string, url: string) {
    const { data: row } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", key)
      .single();
    const current = row?.value ? JSON.parse(row.value) : {};
    current.thumbnail = url;
    await supabase
      .from("system_config")
      .upsert({ key, value: JSON.stringify(current), updated_at: new Date().toISOString() }, { onConflict: "key" });
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, thumbnail: url } : t)));
  }

  async function handleThumbUpload(key: string, file: File) {
    setThumbUploadingKey(key);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/thumbs");
      await persistThumb(key, url);
    } catch (err) {
      console.error("[Thumb upload]", err);
      alert("Falha no upload do thumbnail.");
    } finally {
      setThumbUploadingKey(null);
    }
  }

  async function handleCaptureCard(key: string) {
    setThumbUploadingKey(key);
    try {
      // 1) Tenta achar stage Konva no DOM (caso preview tenha sido renderizado)
      const konvaCanvas = document.querySelector<HTMLCanvasElement>(`[data-tmpl-key="${key}"] canvas`);
      let blob: Blob | null = null;
      if (konvaCanvas) {
        blob = await new Promise<Blob | null>((resolve) => konvaCanvas.toBlob((b) => resolve(b), "image/png"));
      } else {
        // 2) Fallback: html2canvas no card inteiro
        const cardEl = document.querySelector<HTMLElement>(`[data-tmpl-key="${key}"]`);
        if (!cardEl) throw new Error("Card não encontrado");
        const { default: html2canvas } = await import("html2canvas");
        const snap = await html2canvas(cardEl, { useCORS: true, backgroundColor: null, scale: 2 });
        blob = await new Promise<Blob | null>((resolve) => snap.toBlob((b) => resolve(b), "image/png"));
      }
      if (!blob) throw new Error("Falha ao gerar PNG");
      const file = new File([blob], `${key}-capture.png`, { type: "image/png" });
      const url = await uploadToCloudinary(file, "aurohubv2/thumbs");
      await persistThumb(key, url);
    } catch (err) {
      console.error("[Thumb capture]", err);
      alert("Falha ao capturar o card.");
    } finally {
      setThumbUploadingKey(null);
    }
  }

  const loadCanvasTemplates = useCallback(async () => {
    setCanvasLoading(true);
    try {
      const { data } = await supabase
        .from("system_config")
        .select("key,value,updated_at")
        .like("key", "tmpl_%")
        .order("updated_at", { ascending: false });
      const list: CanvasTemplate[] = (data || []).map((r: { key: string; value: string; updated_at: string }) => {
        let nome = "", format = "—", formType = "—", segmento = "Geral", licenseeId: string | null = null, licenseeNome = "Sem marca", lojaNome = "Sem loja", thumbnail: string | null = null, parsedIsBase = false;
        try {
          const parsed = JSON.parse(r.value);
          nome = parsed.nome || "";
          format = parsed.format || "—";
          formType = parsed.formType || "—";
          segmento = parsed.segmento || "Geral";
          licenseeId = parsed.licenseeId ?? null;
          licenseeNome = parsed.licenseeNome || "Sem marca";
          lojaNome = parsed.lojaNome || "Sem loja";
          thumbnail = parsed.thumbnail || parsed.thumb || parsed.schema?.thumbnail || null;
          parsedIsBase = parsed.is_base === true;
        } catch {}
        const isBase = parsedIsBase || r.key.startsWith("tmpl_base_");
        // Extrai tipo do slug da key. Aceita tanto `tmpl_base_{tipo}_{formato}`
        // quanto `tmpl_{tipo}_{formato}` (ex: tmpl_cards_stories).
        const baseTipo = isBase
          ? (r.key.match(/^tmpl_(?:base_)?(.+)_(stories|reels|feed|tv)$/)?.[1] ?? null)
          : null;
        return {
          key: r.key,
          displayName: r.key.replace(/^tmpl_(base_)?/, ""),
          nome,
          format,
          formType,
          segmento,
          updatedAt: r.updated_at,
          licenseeId,
          licenseeNome,
          lojaNome,
          thumbnail,
          isBase,
          baseTipo,
        };
      });
      setCanvasTemplates(list);
    } catch (err) { console.error("[CanvasTemplates] load:", err); }
    finally { setCanvasLoading(false); }
  }, []);

  useEffect(() => { loadCanvasTemplates(); }, [loadCanvasTemplates]);

  const editCanvasTmpl = (key: string) => {
    router.push(`/editor?id=${key.replace(/^tmpl_/, "")}`);
  };

  // Filtra base templates (usa filtros globais)
  const baseTemplatesFiltered = useMemo(() => {
    return canvasTemplates.filter((t) => {
      if (!t.isBase) return false;
      if (globalFilterType && t.baseTipo !== globalFilterType && t.formType !== globalFilterType) return false;
      if (globalFilterFormat && t.format !== globalFilterFormat) return false;
      return true;
    });
  }, [canvasTemplates, globalFilterType, globalFilterFormat]);

  const hasAnyBaseTemplate = useMemo(() => canvasTemplates.some((t) => t.isBase), [canvasTemplates]);

  // Base templates agrupados: segmento → licenseeGroup → (AZV: lojas; outros: __all__)
  const baseTemplatesGrouped = useMemo(() => {
    const out: Record<string, {
      licensees: Record<string, { name: string; isAZV: boolean; lojas: Record<string, CanvasTemplate[]> }>;
    }> = {};
    for (const t of baseTemplatesFiltered) {
      const seg = inferBaseSegmento(t);
      if (!out[seg]) out[seg] = { licensees: {} };
      const isAZV = !!t.licenseeId && t.licenseeId.startsWith(AZV_LICENSEE_PREFIX);
      const licKey = !t.licenseeId ? "__base__" : (t.licenseeNome || "Sem marca");
      if (!out[seg].licensees[licKey]) {
        out[seg].licensees[licKey] = {
          name: !t.licenseeId ? "Base do sistema" : (t.licenseeNome || "Sem marca"),
          isAZV,
          lojas: {},
        };
      }
      const lojaKey = isAZV ? (t.lojaNome || "Sem loja") : "__all__";
      if (!out[seg].licensees[licKey].lojas[lojaKey]) out[seg].licensees[licKey].lojas[lojaKey] = [];
      out[seg].licensees[licKey].lojas[lojaKey].push(t);
    }
    return out;
  }, [baseTemplatesFiltered]);

  // Agrupa templates de cliente por licensee (sem sub-agrupamento por segmento)
  const userTemplatesByLicensee = useMemo(() => {
    const isAdm = profile?.role === "adm";
    const ownLic = profile?.licensee_id ?? null;
    const map: Record<string, { id: string | null; items: CanvasTemplate[] }> = {};
    for (const t of canvasTemplates) {
      if (t.isBase) continue;
      if (!isAdm && t.licenseeId !== ownLic) continue;
      if (globalFilterType && t.formType !== globalFilterType && t.baseTipo !== globalFilterType) continue;
      if (globalFilterFormat && t.format !== globalFilterFormat) continue;
      const lic = t.licenseeNome || "Sem marca";
      if (!map[lic]) map[lic] = { id: t.licenseeId, items: [] };
      map[lic].items.push(t);
    }
    return map;
  }, [canvasTemplates, profile, globalFilterType, globalFilterFormat]);

  const userTemplatesCount = useMemo(
    () => Object.values(userTemplatesByLicensee).reduce((a, v) => a + v.items.length, 0),
    [userTemplatesByLicensee]
  );

  // Helpers — iniciais e cor a partir do nome do licensee (determinístico)
  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  }
  function getLicColor(name: string): string {
    const palette = ["#FF7A1A", "#D4A843", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  // Clona template base para um licensee específico
  const runCloneToLicensee = async () => {
    if (!cloneKey || !cloneLicensee) return;
    setCloning(true);
    try {
      const lic = licensees.find((l) => l.id === cloneLicensee);
      const { data: row } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", cloneKey)
        .single();
      if (!row?.value) throw new Error("Template base não encontrado");
      const parsed = JSON.parse(row.value);
      const cloneData = {
        ...parsed,
        is_base: false,
        licenseeId: lic?.id ?? null,
        licenseeNome: lic?.name ?? "Sem marca",
        lojaId: null,
        lojaNome: "Sem loja",
      };
      // Novo key: tmpl_{tipo}_{formato}_{licensee-slug}-{timestamp}
      const slug = (lic?.name ?? "licensee")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const baseSuffix = cloneKey.replace(/^tmpl_(base_)?/, "");
      const newKey = `tmpl_${baseSuffix}_${slug}_${Date.now().toString(36)}`;
      await supabase.from("system_config").upsert({
        key: newKey,
        value: JSON.stringify(cloneData),
        updated_at: new Date().toISOString(),
      });
      setCloneKey(null);
      setCloneLicensee("");
      await loadCanvasTemplates();
    } catch (err) {
      console.error("[Clone to licensee]", err);
      alert("Falha ao clonar template.");
    } finally {
      setCloning(false);
    }
  };

  const deleteCanvasTmpl = async (key: string) => {
    if (!confirm(`Excluir template "${key.replace(/^tmpl_/, "")}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await supabase.from("system_config").delete().eq("key", key);
      await loadCanvasTemplates();
    } catch (err) { console.error("[CanvasTemplates] delete:", err); alert("Erro ao excluir."); }
  };

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
      // DEBUG: logs para auditar se RLS está excluindo templates do ADM
      console.log("[Templates][loadData] templates:", {
        count: tR.data?.length ?? 0,
        error: tR.error,
        sample: tR.data?.slice(0, 3),
      });
      console.log("[Templates][loadData] template_groups:", {
        count: gR.data?.length ?? 0,
        error: gR.error,
      });
      if (tR.error) console.error("[Templates][loadData] RLS/query error em templates:", tR.error);
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
        console.log("[Templates][handleSave] insert template_groups:", { data: gData, error: gErr });
        if (gErr) { console.error("[Templates][handleSave] erro em template_groups.insert:", gErr); setModalError(gErr.message); return; }

        // Create template
        const { data: tData, error: tErr } = await supabase.from("templates").insert({
          group_id: gData.id, format: form.format, width: fmt.w, height: fmt.h,
          image_url: form.image_url, active: form.active,
        }).select("id").single();
        console.log("[Templates][handleSave] insert templates:", { data: tData, error: tErr });
        if (tErr) { console.error("[Templates][handleSave] erro em templates.insert:", tErr); setModalError(tErr.message); return; }

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

  /* ── Card do canvas (reused em Templates Base e Por cliente) ─ */
  function renderCanvasCard(t: CanvasTemplate) {
    const isAdm = profile?.role === "adm";
    const licColor = t.isBase ? null : getLicColor(t.licenseeNome);
    return (
      <div key={t.key} data-tmpl-key={t.key} className="relative overflow-hidden rounded-xl border border-[var(--bdr)] transition-colors hover:border-[var(--bdr2)]" style={{ background: "var(--bg1)" }}>
        {t.isBase && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-[#D4A843] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1E3A6E] shadow">BASE</span>
        )}
        {!t.isBase && licColor && (
          <span
            className="absolute top-2 left-2 z-10 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider text-white shadow"
            style={{ background: licColor }}
            title={t.licenseeNome}
          >
            {getInitials(t.licenseeNome) || "·"}
          </span>
        )}
        {t.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={t.thumbnail} alt="" className="h-24 w-full object-cover" />
        ) : (
          <div className="flex h-24 items-center justify-center" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #2A4A8A 50%, #1E3A6E 100%)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t.format}</span>
          </div>
        )}
        <div className="px-4 py-3">
          <input
            type="text"
            defaultValue={t.nome || t.displayName}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.nome) saveNome(t.key, v); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-full truncate border-b border-transparent bg-transparent text-[13px] font-bold text-[var(--txt)] outline-none hover:border-[var(--bdr)] focus:border-[var(--orange)]"
            title={t.nome || t.displayName}
          />
          <select
            value={t.segmento}
            onChange={(e) => saveSegmento(t.key, e.target.value)}
            className="mt-1 w-full rounded bg-[var(--bg2)] px-1.5 py-0.5 text-[10px] text-[var(--txt2)] outline-none focus:ring-1 focus:ring-[var(--orange)]"
          >
            {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="mt-1.5 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--txt3)] hover:text-[var(--orange)]">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={thumbUploadingKey === t.key}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbUpload(t.key, f); e.currentTarget.value = ""; }}
              />
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none"><path d="M2 11l3.5-4 2.5 3 2-2 4 5M2 4h12v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              {thumbUploadingKey === t.key ? "Enviando…" : "Thumb"}
            </label>
            <button
              type="button"
              onClick={() => handleCaptureCard(t.key)}
              disabled={thumbUploadingKey === t.key}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--txt3)] hover:text-[var(--orange)] disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none"><path d="M3 5h2l1-2h4l1 2h2v8H3V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" /></svg>
              Capturar
            </button>
          </div>
          <div className="mt-2 flex gap-1.5 text-[10px]">
            <span className="rounded bg-[var(--bg3)] px-2 py-0.5 font-semibold uppercase tracking-wide text-[var(--txt2)]">{t.format}</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--txt3)]">
            {t.updatedAt ? new Date(t.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        <div className="flex border-t border-[var(--bdr)] divide-x divide-[var(--bdr)]">
          <button onClick={() => editCanvasTmpl(t.key)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)] hover:bg-[var(--hover-bg)]">Editar</button>
          {t.isBase && isAdm && (
            <button onClick={() => setCloneKey(t.key)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--orange)] hover:bg-[var(--hover-bg)]" title="Clonar para um licensee">
              Clonar p/ cliente
            </button>
          )}
          {!t.isBase && (
            <button onClick={() => duplicateCanvasTmpl(t.key)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)] hover:bg-[var(--hover-bg)]">Duplicar</button>
          )}
          <button onClick={() => deleteCanvasTmpl(t.key)} className="flex-1 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--red)] hover:bg-[var(--hover-bg)]">Excluir</button>
        </div>
      </div>
    );
  }

  // Duplica um template de cliente (mesmo licensee)
  async function duplicateCanvasTmpl(key: string) {
    try {
      const { data: row } = await supabase.from("system_config").select("value").eq("key", key).single();
      if (!row?.value) return;
      const parsed = JSON.parse(row.value);
      const cloneData = { ...parsed, nome: (parsed.nome || "Template") + " (cópia)" };
      const baseSuffix = key.replace(/^tmpl_/, "");
      const newKey = `tmpl_${baseSuffix}_copy_${Date.now().toString(36)}`;
      await supabase.from("system_config").upsert({
        key: newKey,
        value: JSON.stringify(cloneData),
        updated_at: new Date().toISOString(),
      });
      await loadCanvasTemplates();
    } catch (err) {
      console.error("[Duplicate]", err);
      alert("Falha ao duplicar template.");
    }
  }

  /* ── Render ────────────────────────────────────── */

  const isAdm = profile?.role === "adm";
  const typeOptions = [
    { k: "", l: "Todos" },
    { k: "pacote", l: "Pacote" },
    { k: "campanha", l: "Campanha" },
    { k: "cruzeiro", l: "Cruzeiro" },
    { k: "anoiteceu", l: "Anoiteceu" },
    { k: "quatro_destinos", l: "Cards" },
  ];
  const formatOptions = [
    { k: "", l: "Todos" },
    { k: "stories", l: "Stories" },
    { k: "feed", l: "Feed" },
    { k: "reels", l: "Reels" },
    { k: "tv", l: "TV" },
  ];
  const hasGlobalFilter = Boolean(globalFilterType || globalFilterFormat);

  const openNewTemplate = (licenseeId: string | null) => {
    const qs = licenseeId ? `?licensee=${licenseeId}` : "";
    router.push(`/editor${qs}`);
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Editor de Templates</h1>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Templates base (sistema) e templates por cliente</p>
        </div>
        <button
          type="button"
          onClick={() => openNewTemplate(profile?.licensee_id ?? null)}
          className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] hover:opacity-90"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo template
        </button>
      </div>

      {/* Filtros globais (afetam Base + Por cliente) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">Tipo</span>
          {typeOptions.map((f) => (
            <button
              key={f.k || "all-type"}
              onClick={() => setGlobalFilterType(f.k)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${globalFilterType === f.k ? "border-[var(--orange)] bg-[var(--orange3)] text-[var(--orange)]" : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"}`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">Formato</span>
          {formatOptions.map((f) => (
            <button
              key={f.k || "all-fmt"}
              onClick={() => setGlobalFilterFormat(f.k)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${globalFilterFormat === f.k ? "border-[var(--orange)] bg-[var(--orange3)] text-[var(--orange)]" : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"}`}
            >
              {f.l}
            </button>
          ))}
          {hasGlobalFilter && (
            <button
              onClick={() => { setGlobalFilterType(""); setGlobalFilterFormat(""); }}
              className="ml-2 text-[11px] text-[var(--txt3)] hover:text-[var(--red)]"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Imagens dos tipos de publicação (só ADM) — fundo dos cards do PublicarFlow */}
      {isAdm && (
        <section className="border-b border-[var(--bdr)] pb-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-[var(--txt)]">Imagens dos tipos de publicação</h2>
              <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Fundo dos cards do seletor de tipo. Sem imagem → ícone padrão.</p>
            </div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {PUBLICAR_TIPOS.map((t) => {
              const url = publicarThumbs[t.k];
              const uploading = publicarThumbUploading === t.k;
              return (
                <div
                  key={t.k}
                  className="relative overflow-hidden rounded-xl border border-[var(--bdr)]"
                  style={{ background: "var(--bg1)" }}
                >
                  <div
                    className="relative flex h-32 items-end justify-start"
                    style={{
                      background: url
                        ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 100%), url(${url}) center/cover`
                        : "linear-gradient(135deg, var(--bg2), var(--bg3))",
                    }}
                  >
                    <div className="px-3 py-2 text-[13px] font-bold" style={{ color: url ? "#FFFFFF" : "var(--txt2)" }}>
                      {t.l}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--bdr)] px-3 py-2">
                    <label className={`inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--txt3)] hover:text-[var(--orange)] ${uploading ? "opacity-50" : ""}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePublicarThumbUpload(t.k, f);
                          e.currentTarget.value = "";
                        }}
                      />
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none"><path d="M2 11l3.5-4 2.5 3 2-2 4 5M2 4h12v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                      {uploading ? "Enviando…" : url ? "Trocar" : "Upload"}
                    </label>
                    {url && !uploading && (
                      <button
                        type="button"
                        onClick={() => handlePublicarThumbRemove(t.k)}
                        className="text-[11px] font-medium text-[var(--txt3)] hover:text-[var(--red)]"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Templates Base (somente ADM) */}
      {isAdm && (
        <section className="border-b border-[var(--bdr)] pb-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-[var(--txt)]">Templates Base</h2>
              <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Modelos do sistema — clone para um cliente pra liberar uso</p>
            </div>
          </div>

          {canvasLoading ? (
            <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
          ) : !hasAnyBaseTemplate ? (
            <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
              Nenhum template base cadastrado.
            </div>
          ) : baseTemplatesFiltered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
              Nenhum template encontrado com esses filtros.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(baseTemplatesGrouped).map(([seg, { licensees }]) => {
                const icon = SEGMENTO_ICONS[seg] ?? "📄";
                const segCount = Object.values(licensees).reduce(
                  (a, l) => a + Object.values(l.lojas).reduce((b, arr) => b + arr.length, 0),
                  0,
                );
                return (
                  <div
                    key={seg}
                    className="overflow-hidden rounded-xl border border-[var(--bdr)]"
                    style={{ background: "var(--card-bg)" }}
                  >
                    <div className="flex items-center gap-2 border-b border-[var(--bdr)] px-4 py-3">
                      <span className="text-[16px]" aria-hidden>{icon}</span>
                      <span className="text-[14px] font-bold text-[var(--txt)]">{seg}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
                        · {segCount} template{segCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col gap-4 px-4 py-4">
                      {Object.entries(licensees).map(([licKey, lic]) => {
                        const licCount = Object.values(lic.lojas).reduce((a, arr) => a + arr.length, 0);
                        return (
                          <div key={licKey}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
                              <span className="text-[12px] font-semibold text-[var(--txt2)]">{lic.name}</span>
                              <span className="text-[10px] text-[var(--txt3)]">({licCount})</span>
                            </div>
                            {lic.isAZV ? (
                              <div className="flex flex-col gap-3 pl-4">
                                {Object.entries(lic.lojas).map(([lojaName, items]) => (
                                  <div key={lojaName}>
                                    <div className="mb-1.5 text-[11px] text-[var(--txt3)]">
                                      → {lojaName} <span className="text-[10px]">({items.length})</span>
                                    </div>
                                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                                      {items.map((t) => renderCanvasCard(t))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                                {lic.lojas["__all__"]?.map((t) => renderCanvasCard(t))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Por cliente (agrupado por licensee) */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-[var(--txt)]">Por cliente</h2>
            <p className="mt-0.5 text-[12px] text-[var(--txt3)]">
              {isAdm ? "Templates de cada marca — ADM vê tudo" : "Templates da sua marca"}
            </p>
          </div>
        </div>
        {canvasLoading ? (
          <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
        ) : userTemplatesCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
            {hasGlobalFilter
              ? "Nenhum template encontrado com esses filtros."
              : "Nenhum template por cliente ainda. Clone um template base ou crie um novo pelo editor."}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(userTemplatesByLicensee).map(([licName, group]) => {
              const color = getLicColor(licName);
              return (
                <details
                  key={licName}
                  open
                  className="overflow-hidden rounded-xl border border-[var(--bdr)]"
                  style={{ background: "var(--card-bg)" }}
                >
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)]">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[14px] font-bold text-[var(--txt)]">{licName}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
                        · {group.items.length} template{group.items.length !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openNewTemplate(group.id);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] px-3 py-1 text-[11px] font-semibold text-[var(--txt2)] hover:text-[var(--txt)] hover:border-[var(--bdr2)]"
                    >
                      + Novo template
                    </button>
                  </summary>
                  <div className="border-t border-[var(--bdr)] px-4 py-4">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                      {group.items.map((t) => renderCanvasCard(t))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* Clone modal (base → licensee) */}
      {cloneKey && (
        <Ov onClose={() => setCloneKey(null)}>
          <div className="mx-4 flex w-full max-w-[420px] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <div className="text-[15px] font-bold text-[var(--txt)]">Clonar template para cliente</div>
              <div className="mt-0.5 text-[11px] text-[var(--txt3)]">Escolha o licensee que receberá a cópia</div>
            </div>
            <div className="max-h-[50vh] flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-1.5">
                {licensees.length === 0 ? (
                  <div className="text-[12px] text-[var(--txt3)]">Nenhum licensee cadastrado.</div>
                ) : (
                  licensees.map((l) => {
                    const sel = cloneLicensee === l.id;
                    return (
                      <label
                        key={l.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-[var(--hover-bg)] ${sel ? "border-[var(--orange)] bg-[var(--orange3)]" : "border-[var(--bdr)]"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ background: getLicColor(l.name) }}
                          >
                            {getInitials(l.name) || "·"}
                          </span>
                          <span className={`text-[13px] font-medium ${sel ? "text-[var(--orange)]" : "text-[var(--txt)]"}`}>{l.name}</span>
                        </span>
                        <input
                          type="radio"
                          name="clone-lic"
                          checked={sel}
                          onChange={() => setCloneLicensee(l.id)}
                          className="accent-[var(--orange)]"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button
                type="button"
                onClick={() => { setCloneKey(null); setCloneLicensee(""); }}
                className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={runCloneToLicensee}
                disabled={!cloneLicensee || cloning}
                className="rounded-lg bg-[var(--orange)] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {cloning ? "Clonando..." : "Clonar"}
              </button>
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

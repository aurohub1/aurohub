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
const FORM_TYPE_LABELS: Record<string, string> = {
  pacote: "Pacote",
  campanha: "Campanha",
  passagem: "Passagem",
  cruzeiro: "Cruzeiro",
  anoiteceu: "Anoiteceu",
  quatro_destinos: "Cards",
  lamina: "Lâmina",
};
const FORM_TYPE_ICONS: Record<string, string> = {
  pacote: "✈️",
  campanha: "📢",
  passagem: "🎫",
  cruzeiro: "🚢",
  anoiteceu: "🌙",
  quatro_destinos: "🗺️",
  lamina: "📄",
};

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

  // Grupos colapsados em Templates Base — chaves:
  //   seg:<segmento>           ex.: "seg:Turismo"
  //   lic:<segmento>/<licKey>  ex.: "lic:Turismo/__base__"
  //   sub:<segmento>/<licKey>/<subName>  ex.: "sub:Turismo/__base__/Pacote"
  const [collapsedBaseGroups, setCollapsedBaseGroups] = useState<Set<string>>(() => new Set(["seg:Turismo"]));
  const toggleBaseGroup = (key: string) => {
    setCollapsedBaseGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    if (key.startsWith("ft_")) {
      await supabase.from("form_templates").update({ name: nome }).eq("id", key.slice(3));
    } else {
      await persistField(key, "nome", nome);
    }
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, nome } : t)));
  }

  async function saveSegmento(key: string, segmento: string) {
    // form_templates não tem coluna segmento — é inferido por form_type. Apenas atualiza UI.
    if (!key.startsWith("ft_")) {
      await persistField(key, "segmento", segmento);
    }
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, segmento } : t)));
  }

  async function persistThumb(key: string, url: string) {
    if (key.startsWith("ft_")) {
      await supabase.from("form_templates").update({ thumbnail_url: url }).eq("id", key.slice(3));
    } else {
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
    }
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
      // 1) Templates base ficam na tabela form_templates (is_base = true)
      // 2) Templates por cliente continuam em system_config (tmpl_*, não-base)
      const [ftRes, licRes, scRes] = await Promise.all([
        supabase
          .from("form_templates")
          .select("id, name, form_type, format, licensee_id, thumbnail_url, created_at, is_base, active")
          .eq("is_base", true)
          .order("form_type"),
        supabase.from("licensees").select("id, name"),
        supabase
          .from("system_config")
          .select("key,value,updated_at")
          .like("key", "tmpl_%")
          .order("updated_at", { ascending: false }),
      ]);
      console.log("[CanvasTemplates] base form_templates:", { count: ftRes.data?.length ?? 0, error: ftRes.error });
      const licMap = new Map<string, string>((licRes.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]));

      type FTRow = {
        id: string; name: string | null; form_type: string; format: string;
        licensee_id: string | null; thumbnail_url: string | null; created_at: string;
      };
      const baseList: CanvasTemplate[] = ((ftRes.data as FTRow[] | null) ?? []).map((r) => {
        const label = FORM_TYPE_LABELS[r.form_type] ?? r.form_type;
        const fmtLabel = r.format.charAt(0).toUpperCase() + r.format.slice(1);
        return {
          key: `ft_${r.id}`,
          displayName: r.name || `${label} ${fmtLabel}`,
          nome: r.name || `${label} ${fmtLabel}`,
          format: r.format || "—",
          formType: r.form_type || "—",
          segmento: TURISMO_TYPES.has(r.form_type) ? "Turismo" : "Geral",
          updatedAt: r.created_at,
          licenseeId: r.licensee_id ?? null,
          licenseeNome: r.licensee_id ? (licMap.get(r.licensee_id) || "Sem marca") : "Sem marca",
          lojaNome: "Sem loja",
          thumbnail: r.thumbnail_url,
          isBase: true,
          baseTipo: r.form_type ?? null,
        };
      });

      const scList: CanvasTemplate[] = ((scRes.data as { key: string; value: string; updated_at: string }[] | null) ?? [])
        .map((r) => {
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
          const baseTipo = isBase
            ? (r.key.match(/^tmpl_(?:base_)?(.+)_(stories|reels|feed|tv)$/)?.[1] ?? null)
            : null;
          return {
            key: r.key,
            displayName: r.key.replace(/^tmpl_(base_)?/, ""),
            nome, format, formType, segmento,
            updatedAt: r.updated_at,
            licenseeId, licenseeNome, lojaNome, thumbnail, isBase, baseTipo,
          };
        })
        // Base agora vem de form_templates — evita duplicar com eventuais tmpl_base_* legados
        .filter((t) => !t.isBase);

      setCanvasTemplates([...baseList, ...scList]);
    } catch (err) { console.error("[CanvasTemplates] load:", err); }
    finally { setCanvasLoading(false); }
  }, []);

  useEffect(() => { loadCanvasTemplates(); }, [loadCanvasTemplates]);

  const editCanvasTmpl = (key: string) => {
    // ft_<uuid> → preserva prefixo pro editor buscar em form_templates
    // tmpl_<slug> → remove prefixo pro editor buscar em system_config
    const id = key.startsWith("ft_") ? key : key.replace(/^tmpl_/, "");
    router.push(`/editor?id=${id}`);
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

  // Base templates agrupados: segmento → licensee → subgroup → cards
  // subgroup varia:
  //   Base do sistema (sem licenseeId) → por formType (Pacote, Campanha, Cruzeiro, Cards, …)
  //   AZV                              → por loja (Rio Preto, …)
  //   outros                           → flat (__all__)
  const baseTemplatesGrouped = useMemo(() => {
    const out: Record<string, {
      licensees: Record<string, {
        name: string;
        groupBy: "formType" | "loja" | "none";
        subgroups: Record<string, CanvasTemplate[]>;
      }>;
    }> = {};
    for (const t of baseTemplatesFiltered) {
      const seg = inferBaseSegmento(t);
      if (!out[seg]) out[seg] = { licensees: {} };
      const isBaseSistema = !t.licenseeId;
      const isAZV = !isBaseSistema && t.licenseeId!.startsWith(AZV_LICENSEE_PREFIX);
      const licKey = isBaseSistema ? "__base__" : (t.licenseeNome || "Sem marca");
      const groupBy: "formType" | "loja" | "none" = isBaseSistema ? "formType" : isAZV ? "loja" : "none";
      if (!out[seg].licensees[licKey]) {
        out[seg].licensees[licKey] = {
          name: isBaseSistema ? "Base do sistema" : (t.licenseeNome || "Sem marca"),
          groupBy,
          subgroups: {},
        };
      }
      const lic = out[seg].licensees[licKey];
      const subKey = lic.groupBy === "formType"
        ? (FORM_TYPE_LABELS[t.formType] || t.formType || "Outros")
        : lic.groupBy === "loja"
        ? (t.lojaNome || "Sem loja")
        : "__all__";
      if (!lic.subgroups[subKey]) lic.subgroups[subKey] = [];
      lic.subgroups[subKey].push(t);
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
      let parsed: Record<string, unknown>;
      let baseSuffix: string;
      if (cloneKey.startsWith("ft_")) {
        const { data } = await supabase
          .from("form_templates")
          .select("name, form_type, format, width, height, schema, thumbnail_url")
          .eq("id", cloneKey.slice(3))
          .single();
        if (!data) throw new Error("Template base não encontrado");
        const ft = data as { name: string | null; form_type: string; format: string; width: number; height: number; schema: Record<string, unknown> | null; thumbnail_url: string | null };
        // Achata schema (elements/background/duration/qtdDestinos) no topo do payload — formato esperado por system_config tmpl_*
        parsed = {
          ...(ft.schema ?? {}),
          nome: ft.name || `${FORM_TYPE_LABELS[ft.form_type] ?? ft.form_type} ${ft.format}`,
          format: ft.format,
          formType: ft.form_type,
          segmento: TURISMO_TYPES.has(ft.form_type) ? "Turismo" : "Geral",
          width: ft.width,
          height: ft.height,
          thumbnail: ft.thumbnail_url,
        };
        baseSuffix = `${ft.form_type}_${ft.format}`;
      } else {
        const { data: row } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", cloneKey)
          .single();
        if (!row?.value) throw new Error("Template base não encontrado");
        parsed = JSON.parse(row.value);
        baseSuffix = cloneKey.replace(/^tmpl_(base_)?/, "");
      }
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
    const label = key.startsWith("ft_") ? key.slice(3) : key.replace(/^tmpl_/, "");
    if (!confirm(`Excluir template "${label}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      if (key.startsWith("ft_")) {
        await supabase.from("form_templates").delete().eq("id", key.slice(3));
      } else {
        await supabase.from("system_config").delete().eq("key", key);
      }
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
          <div
            className="flex h-24 flex-col items-center justify-center gap-1"
            style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #2A4A8A 50%, #1E3A6E 100%)" }}
          >
            <span className="text-[28px] leading-none" aria-hidden>
              {FORM_TYPE_ICONS[t.formType] ?? FORM_TYPE_ICONS[t.baseTipo ?? ""] ?? "📄"}
            </span>
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
                  (a, l) => a + Object.values(l.subgroups).reduce((b, arr) => b + arr.length, 0),
                  0,
                );
                const segKey = `seg:${seg}`;
                const segCollapsed = collapsedBaseGroups.has(segKey);
                return (
                  <div
                    key={seg}
                    className="overflow-hidden rounded-xl border border-[var(--bdr)]"
                    style={{ background: "var(--card-bg)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleBaseGroup(segKey)}
                      aria-expanded={!segCollapsed}
                      className="flex w-full items-center gap-2 border-b border-[var(--bdr)] px-4 py-3 text-left hover:bg-[var(--hover-bg)]"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] text-[var(--txt3)]" aria-hidden>
                        {segCollapsed ? "▶" : "▼"}
                      </span>
                      <span className="text-[16px]" aria-hidden>{icon}</span>
                      <span className="text-[14px] font-bold text-[var(--txt)]">{seg}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
                        · {segCount} template{segCount !== 1 ? "s" : ""}
                      </span>
                    </button>
                    {!segCollapsed && (
                      <div className="flex flex-col gap-4 px-4 py-4">
                        {Object.entries(licensees).map(([licKey, lic]) => {
                          const licCount = Object.values(lic.subgroups).reduce((a, arr) => a + arr.length, 0);
                          const licFullKey = `lic:${seg}/${licKey}`;
                          const licCollapsed = collapsedBaseGroups.has(licFullKey);
                          return (
                            <div key={licKey}>
                              <button
                                type="button"
                                onClick={() => toggleBaseGroup(licFullKey)}
                                aria-expanded={!licCollapsed}
                                className="mb-2 flex w-full items-center gap-2 rounded-md py-0.5 text-left hover:bg-[var(--hover-bg)]"
                              >
                                <span className="inline-flex h-4 w-4 items-center justify-center text-[9px] text-[var(--txt3)]" aria-hidden>
                                  {licCollapsed ? "▶" : "▼"}
                                </span>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
                                <span className="text-[12px] font-semibold text-[var(--txt2)]">{lic.name}</span>
                                <span className="text-[10px] text-[var(--txt3)]">({licCount})</span>
                              </button>
                              {!licCollapsed && (
                                lic.groupBy === "none" ? (
                                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                                    {lic.subgroups["__all__"]?.map((t) => renderCanvasCard(t))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3 pl-4">
                                    {Object.entries(lic.subgroups).map(([subName, items]) => {
                                      const subFullKey = `sub:${seg}/${licKey}/${subName}`;
                                      const subCollapsed = collapsedBaseGroups.has(subFullKey);
                                      return (
                                        <div key={subName}>
                                          <button
                                            type="button"
                                            onClick={() => toggleBaseGroup(subFullKey)}
                                            aria-expanded={!subCollapsed}
                                            className="mb-1.5 flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-[11px] text-[var(--txt3)] hover:bg-[var(--hover-bg)]"
                                          >
                                            <span className="inline-flex h-4 w-4 items-center justify-center text-[9px]" aria-hidden>
                                              {subCollapsed ? "▶" : "▼"}
                                            </span>
                                            <span>→ {subName}</span>
                                            <span className="text-[10px]">({items.length})</span>
                                          </button>
                                          {!subCollapsed && (
                                            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                                              {items.map((t) => renderCanvasCard(t))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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

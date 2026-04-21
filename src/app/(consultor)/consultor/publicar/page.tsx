"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import { useBadges } from "@/hooks/useBadges";
import { usePublishQueue } from "@/hooks/usePublishQueue";
import type { EditorSchema } from "@/components/editor/types";
import { useFormAdapter } from "@/components/publish/useFormAdapter";
import { CampanhaForm, CruzeiroForm, AnoiteceuForm, QuatroDestinosForm } from "@/components/publish/FormSections";
import PublicarFlow, { type PublicarFlowType } from "@/components/publish/PublicarFlow";

import {
  Sparkles, Download, Send, Check, X, Loader2, Trash2,
  Image as ImageIcon, Search as SearchIcon, ChevronDown,
} from "lucide-react";

const PreviewStage = dynamic(() => import("./PreviewStage"), { ssr: false });

/* ── Tipos ───────────────────────────────────────── */

type FormType = "pacote" | "campanha" | "passagem" | "cruzeiro" | "anoiteceu" | "quatro_destinos";
type Format = "stories" | "feed" | "reels" | "tv";
type PublishStatus = "idle" | "generating" | "uploading" | "publishing" | "success" | "error";

interface TemplateRow {
  key: string;
  id: string;
  nome: string;
  format: Format;
  formType: FormType | string;
  width: number;
  height: number;
  schema: EditorSchema;
}

interface StoreOption { id: string; name: string; }

interface PlanLimits {
  slug: string;
  max_posts_day: number;
  max_feed_reels_day: number | null;
  max_stories_day: number | null;
  max_downloads_day: number | null;
  can_schedule: boolean;
  can_ia_legenda: boolean;
  is_enterprise: boolean;
}

/** Derivado do PlanLimits — limite por formato ou null=escondido. */
interface FormatLimits {
  stories: number | null; // null = ilimitado (mas visível)
  feed: number | null;
  reels: number | null;
  tv: number | null;
}
interface PostsByFormat { stories: number; feed: number; reels: number; tv: number; }

/* ── Constantes ──────────────────────────────────── */

const FORMAT_DIMS: Record<Format, [number, number]> = {
  stories: [1080, 1920],
  reels:   [1080, 1920],
  feed:    [1080, 1350],
  tv:      [1920, 1080],
};

const FORMAT_LABELS: Record<Format, string> = {
  stories: "Stories", reels: "Reels", feed: "Feed", tv: "TV",
};

const FORM_LABELS: Record<FormType, string> = {
  pacote: "Pacote", campanha: "Campanha", passagem: "Passagem",
  cruzeiro: "Cruzeiro", anoiteceu: "Anoiteceu", quatro_destinos: "Card WhatsApp",
};

const FORM_ORDER: FormType[] = ["pacote", "campanha", "passagem", "cruzeiro", "anoiteceu", "quatro_destinos"];

const FORMA_PGTO_OPTS = ["Cartão de Crédito", "Boleto"];
const PARCELAS_OPTS = Array.from({ length: 25 }, (_, i) => `${i + 2}x`);
const DESCONTO_OPTS = ["", "5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

/** Normaliza string para matching: lowercase + remove acentos */
function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/* ── Helpers ─────────────────────────────────────── */

/** Fila rotativa persistida em localStorage — retorna próxima URL de um pool. */
function proximaImagem(chave: string, urls: string[]): string | null {
  if (!urls || urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  const storageKey = `aurohub_imgfila_${chave}`;
  try {
    const idx = parseInt(localStorage.getItem(storageKey) || "0", 10) % urls.length;
    localStorage.setItem(storageKey, String((idx + 1) % urls.length));
    return urls[idx];
  } catch {
    return urls[0];
  }
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "_");
}

/** YYYY-MM-DD de hoje (horário local) */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formata string de dígitos como moeda pt-BR (salva só números, exibe "1.234,56"). */
function formatMoeda(raw: string): string {
  const nums = raw.replace(/\D/g, "");
  if (!nums) return "";
  const cents = parseInt(nums, 10);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return reais.toLocaleString("pt-BR") + "," + String(centavos).padStart(2, "0");
}

/** Dicionário de substituição completa de frases de serviço (v1 Dict.servicos). */
const DICT_SERVICOS: [RegExp, string][] = [
  [/^traslado(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^translado(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^transfer(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^café\s+da\s+manhã\s+e\s+(almoço|jantar)$/i, "Meia Pensão"],
  [/^meia\s+pensão$/i, "Meia Pensão"],
  [/^(café\s+da\s+manhã,?\s+almoço\s+e\s+jantar|pensão\s+completa)$/i, "Pensão Completa"],
  [/^café\s+da\s+manhã$/i, "Café da Manhã"],
  [/^all\s+inclusive$/i, "All Inclusive"],
  [/^tudo\s+incluído$/i, "All Inclusive"],
];

/** Correções ortográficas inline (v1 Dict.ortho). */
const DICT_ORTHO: [RegExp, string][] = [
  [/\bcafe\b/gi, "Café"],
  [/\bmanha\b/gi, "Manhã"],
  [/\balmoco\b/gi, "Almoço"],
  [/\bpensao\b/gi, "Pensão"],
  [/\binclusao\b/gi, "Inclusão"],
  [/\bexcursao\b/gi, "Excursão"],
  [/\bnavegacao\b/gi, "Navegação"],
  [/\baeroporo\b/gi, "Aeroporto"],
  [/\bpassagen\b/gi, "Passagem"],
  [/\bbagagen\b/gi, "Bagagem"],
  [/\bconexao\b/gi, "Conexão"],
  [/\bSao\b/g, "São"],
  [/\bSAO\b/g, "SÃO"],
];

/** Preposições que devem permanecer minúsculas na capitalização (v1 Fmt.PREPS). */
const PREPS = new Set([
  "da","de","di","do","dos","das","em","a","e","o","os","as",
  "na","no","nas","nos","ao","à","às","aos","por","para","com",
  "sem","sob","sobre","entre","até","num","numa","du",
]);

/** Abreviações automáticas de destino (v1 Fmt._abrevDest). */
const ABREV: [RegExp, string][] = [
  [/\bSanto\b/g, "Sto."],
  [/\bSanta\b/g, "Sta."],
  [/\bSão\b/g, "S."],
  [/\bNossa\s+Senhora\b/g, "N. Sra."],
  [/\bDoutor\b/g, "Dr."],
  [/\bDoutora\b/g, "Dra."],
  [/\bGovernador\b/g, "Gov."],
  [/\bPresidente\b/g, "Pres."],
  [/\bMarechal\b/g, "Mal."],
];

function applyServico(v: string): string {
  const s = v.trim();
  if (!s) return s;
  // Primeiro tenta match exato de frase completa
  for (const [re, rep] of DICT_SERVICOS) {
    if (re.test(s)) return rep;
  }
  // Senão aplica só correções ortográficas inline
  let r = s;
  for (const [re, rep] of DICT_ORTHO) r = r.replace(re, rep);
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function isAllInclusive(v: string): boolean {
  return /all\s*inclusive|tudo\s*inclu[ií]do/i.test(v);
}

/** Capitaliza cada palavra, mantendo preposições minúsculas (v1 Fmt.capitalize). */
function capitalizeBR(s: string): string {
  if (!s) return "";
  return s.trim().split(/\s+/).map((w, i) =>
    i > 0 && PREPS.has(w.toLowerCase())
      ? w.toLowerCase()
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(" ");
}

/** Destino TUDO MAIÚSCULO + abreviações + preposições minúsculas (v1 Fmt.destino). */
function destinoUpper(s: string): string {
  if (!s) return "";
  let d = s;
  for (const [re, rep] of ABREV) d = d.replace(re, rep);
  return d.split(/\s+/).map(w =>
    PREPS.has(w.toLowerCase()) ? w.toLowerCase() : w.toUpperCase()
  ).join(" ");
}

/** Calcula noites entre 2 datas YYYY-MM-DD (Volta - Ida). */
function calcNoites(ida: string, volta: string): number {
  if (!ida || !volta) return 0;
  const a = new Date(ida + "T00:00:00");
  const b = new Date(volta + "T00:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

/** Coleta o conjunto de bindParams presentes no schema de um template. */
function getSchemaBinds(schema: EditorSchema | undefined | null): Set<string> {
  const s = new Set<string>();
  const elements = (schema?.elements ?? []) as Array<{ bindParam?: string }>;
  for (const el of elements) {
    if (el.bindParam) s.add(el.bindParam);
  }
  return s;
}

/** Deriva o tipo de formulário a partir dos binds do schema. Fallback = form_type do template. */
function deriveTabFromBinds(binds: Set<string>, fallback: FormType): FormType {
  if (binds.has("navio") || binds.has("itinerario")) return "cruzeiro";
  if (binds.has("desconto_anoit") || (binds.has("inicio") && binds.has("fim"))) return "anoiteceu";
  if (binds.has("destino1") || binds.has("destino2")) return "quatro_destinos";
  return fallback;
}

/* ── Component principal ─────────────────────────── */

export default function PublicarPage() {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");


  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Feriados dinâmicos via tabela `feriados` (Supabase), ordem alfabética pt-BR
  const { feriados: feriadosData, ready: feriadosReady, error: feriadosError } = useBadges();
  const feriadoOpts = useMemo(() => {
    if (feriadosError) return [""];
    const nomes = Object.keys(feriadosData).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return ["", ...nomes];
  }, [feriadosData, feriadosError]);

  // Estado por aba
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");

  // Seletor de tipo (tela inicial). Ativo até escolher; "← Trocar tipo" volta.
  const [showTypePicker, setShowTypePicker] = useState(true);

  // Tipos com template em system_config (complementa form_templates). "lamina" → "quatro_destinos".
  const [canvasFormTypes, setCanvasFormTypes] = useState<Set<string>>(new Set());

  // Cache de dados por aba (preserva ao trocar)
  const [formCache, setFormCache] = useState<Record<FormType, Record<string, string>>>(() => {
    const defaults = { formapagamento: "Cartão de Crédito", tipovoo: "( Voo Direto )" };
    return {
      pacote: { ...defaults },
      campanha: { ...defaults },
      passagem: { ...defaults },
      cruzeiro: { ...defaults },
      anoiteceu: { ...defaults },
      quatro_destinos: { ...defaults },
    };
  });
  const [badgeCache, setBadgeCache] = useState<Record<FormType, Record<string, boolean>>>({
    pacote: {}, campanha: {}, passagem: {}, cruzeiro: {}, anoiteceu: {}, quatro_destinos: {},
  });

  const values = formCache[tab];
  const badges = badgeCache[tab];

  // Template atual — match por formType + format; quando a tab foi derivada dos
  // binds (ex.: formType=pacote mas binds viram cruzeiro), cai no template da URL.
  const currentTemplate = useMemo(() => {
    const exact = templates.find((t) => t.formType === tab && t.format === format);
    if (exact) return exact;
    if (templateParam) {
      return templates.find((t) => t.key.includes(templateParam) || t.id === templateParam) ?? null;
    }
    return null;
  }, [templates, tab, format, templateParam]);

  // Binds do template atual — usados para filtrar campos visíveis no formulário.
  const templateBinds = useMemo(
    () => (currentTemplate ? getSchemaBinds(currentTemplate.schema) : new Set<string>()),
    [currentTemplate]
  );

  // Legenda
  const [caption, setCaption] = useState<string>("");

  const publishQueue = usePublishQueue();
  const [showPreviewMobile, setShowPreviewMobile] = useState(false); // toggle do preview em <768px

  // Música (stories/reels)
  const [musicasDisponiveis, setMusicasDisponiveis] = useState<{ id: string; nome: string; artista: string; cloudinary_url: string; inicio_segundos: number; duracao_segundos: number | null }[]>([]);
  const [musicaSearch, setMusicaSearch] = useState("");
  const [musicaOpen, setMusicaOpen] = useState(false);
  const [selectedMusicaId, setSelectedMusicaId] = useState<string>("");
  const [musicaPlaying, setMusicaPlaying] = useState(false);
  const musicaAudioRef = useRef<HTMLAudioElement | null>(null);
  const [generatingCaption, setGeneratingCaption] = useState(false);

  // Stores / publish targets
  const [publishTargets, setPublishTargets] = useState<StoreOption[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  // Daily counter
  const [postsByFormat, setPostsByFormat] = useState<PostsByFormat>({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [downloadsToday, setDownloadsToday] = useState(0);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());

  // Limites e visibilidade por formato derivados do plano
  const formatLimits = useMemo<FormatLimits>(() => {
    if (!planLimits) return { stories: null, feed: null, reels: null, tv: null };
    const fr = planLimits.max_feed_reels_day ?? 0;
    const st = planLimits.max_stories_day ?? 0;
    return {
      // stories: 99 = ilimitado (convenção herdada do schema); null aqui = sem barra de limite
      stories: st >= 99 ? null : st,
      feed:  fr > 0 ? fr : 0,
      reels: fr > 0 ? fr : 0,
      tv:    planLimits.is_enterprise ? (planLimits.max_posts_day || 999) : 0,
    };
  }, [planLimits]);

  // Visibilidade de formatos: derivada dos templates disponíveis para este licensee.
  const visibleFormats = useMemo<Format[]>(() => {
    const set = new Set<Format>();
    for (const t of templates) set.add(t.format);
    return (Object.keys(FORMAT_LABELS) as Format[]).filter((f) => set.has(f));
  }, [templates]);

  // Auto-switch: se o formato atual não tem templates, troca pro primeiro disponível
  useEffect(() => {
    if (!visibleFormats.includes(format) && visibleFormats.length > 0) {
      setFormat(visibleFormats[0]);
    }
  }, [visibleFormats, format]);

  // Tipos com template (form_templates + system_config). "lamina" → "quatro_destinos".
  const availableTypes = useMemo<Set<PublicarFlowType>>(() => {
    const set = new Set<PublicarFlowType>();
    const supported: PublicarFlowType[] = ["pacote", "campanha", "passagem", "cruzeiro", "anoiteceu", "quatro_destinos"];
    const add = (ft: string) => {
      if (ft === "lamina") set.add("quatro_destinos");
      else if ((supported as string[]).includes(ft)) set.add(ft as PublicarFlowType);
    };
    for (const t of templates) add(String(t.formType));
    for (const ft of canvasFormTypes) add(ft);
    return set;
  }, [templates, canvasFormTypes]);

  const formatsForCurrentType = useMemo<Format[]>(() => {
    const set = new Set<Format>();
    for (const t of templates) {
      const ft = t.formType === "lamina" ? "quatro_destinos" : t.formType;
      if (ft === tab && visibleFormats.includes(t.format)) set.add(t.format);
    }
    return (Object.keys(FORMAT_LABELS) as Format[]).filter((f) => set.has(f));
  }, [templates, tab, visibleFormats]);

  const canPublishFeature = features.has("publicar");
  const canIaLegenda = features.has("ia_legenda") || profile?.role === "adm";
  // "drive" ainda não é feature liberada — mantemos hardcode false
  const canDriveFeature = features.has("drive");

  // Publish status
  const [status, setStatus] = useState<PublishStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  // Datasets completos (nome + url) — usados por autocomplete E pela busca de imagem
  const destinoDataRef = useRef<{ nome: string; url: string }[] | null>(null);
  const hotelDataRef = useRef<{ nome: string; url: string }[] | null>(null);
  const navioDataRef = useRef<{ nome: string; url: string }[] | null>(null);

  const stageRef = useRef<Konva.Stage | null>(null);

  /* ── Load inicial ──────────────────────────────── */

  const loadDailyCount = useCallback(async (storeId: string) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("activity_logs")
      .select("metadata, created_at")
      .gte("created_at", start.toISOString())
      .eq("event_type", "post_instagram")
      .limit(500);
    const counts: PostsByFormat = { stories: 0, feed: 0, reels: 0, tv: 0 };
    for (const row of (data ?? []) as { metadata: Record<string, unknown> | null }[]) {
      const m = row.metadata ?? {};
      if (m.store_id !== storeId) continue;
      // Prioriza `format` explícito (salvo pelo publicar do vendedor);
      // fallback pro `media_type` (STORIES/REELS/IMAGE) da API do IG.
      let f = (m.format as string) || "";
      if (!f) {
        const mt = (m.media_type as string) || "";
        if (mt === "STORIES") f = "stories";
        else if (mt === "REELS") f = "reels";
        else f = "feed"; // IMAGE vira feed por padrão
      }
      if (f === "stories" || f === "feed" || f === "reels" || f === "tv") counts[f]++;
    }
    setPostsByFormat(counts);
  }, []);

  const loadDailyDownloads = useCallback(async (licenseeId: string) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString())
      .eq("event_type", "download_arte")
      .like("metadata->>licensee_id", licenseeId);
    setDownloadsToday(count ?? 0);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      // Templates — base (is_base=true) + do licensee do usuário (licensee_id=?)
      const { data: tplData } = await supabase
        .from("form_templates")
        .select("id, name, form_type, format, width, height, schema, is_base, licensee_id")
        .or(`is_base.eq.true,licensee_id.eq.${p.licensee_id}`)
        .eq("active", true)
        .order("form_type")
        .order("format")
        .order("name");

      type FormTemplateRow = {
        id: string; name: string; form_type: string; format: string;
        width: number; height: number;
        schema: { elements?: unknown[]; background?: string; duration?: number; qtdDestinos?: number; formType?: string } | null;
      };
      const rows: TemplateRow[] = (tplData ?? []).map((r) => {
        const row = r as FormTemplateRow;
        const fmt = (row.format || "stories") as Format;
        const sch = row.schema ?? {};
        return {
          key: row.id,
          id: row.id,
          nome: row.name,
          format: fmt,
          formType: row.form_type || "pacote",
          width: row.width || 1080,
          height: row.height || 1920,
          schema: {
            elements: (sch.elements ?? []) as EditorSchema["elements"],
            background: sch.background || "#0E1520",
            duration: sch.duration || 5,
            qtdDestinos: sch.qtdDestinos,
          },
        };
      });
      setTemplates(rows);

      // system_config.tmpl_* — agrega formTypes (licensee do user ou base)
      try {
        const { data: sc } = await supabase
          .from("system_config")
          .select("key, value")
          .like("key", "tmpl_%");
        const types = new Set<string>();
        for (const r of (sc ?? []) as { key: string; value: string }[]) {
          try {
            const parsed = JSON.parse(r.value);
            const lid = parsed.licenseeId ?? parsed.licensee_id ?? null;
            if (lid && lid.trim && lid.trim() !== p.licensee_id.trim()) continue;
            const ft = parsed.formType || parsed.schema?.formType;
            if (ft) types.add(String(ft));
          } catch { /* skip */ }
        }
        setCanvasFormTypes(types);
      } catch { /* silent */ }

      // Auto-select via URL param (deep link). Sem param → mostra picker.
      if (templateParam) {
        const match = rows.find(t => t.key.includes(templateParam) || t.id === templateParam);
        if (match) {
          const derived = deriveTabFromBinds(getSchemaBinds(match.schema), (match.formType as FormType) || "pacote");
          setTab(derived);
          setFormat(match.format);
          setShowTypePicker(false);
        }
      }

      // Stores / publish targets
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name")
        .eq("licensee_id", p.licensee_id)
        .order("name");
      const allStores = (storesData ?? []) as StoreOption[];

      const ORDER = ["rio preto", "barretos", "damha"];
      allStores.sort((a, b) => {
        const ai = ORDER.findIndex(o => a.name.toLowerCase().includes(o));
        const bi = ORDER.findIndex(o => b.name.toLowerCase().includes(o));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      setPublishTargets(allStores);
      setSelectedTargetIds(allStores.length > 0 ? [allStores[0].id] : []);

      // Auto-load imgloja
      if (p?.store_id) {
        try {
          const { data: storeData } = await supabase
            .from("stores")
            .select("logo_url")
            .eq("id", p.store_id)
            .single();
          const logoUrl = (storeData as { logo_url?: string } | null)?.logo_url;
          if (logoUrl) {
            setFormCache(c => ({
              ...c,
              pacote: { ...c.pacote, imgloja: logoUrl },
              campanha: { ...c.campanha, imgloja: logoUrl },
              passagem: { ...c.passagem, imgloja: logoUrl },
              cruzeiro: { ...c.cruzeiro, imgloja: logoUrl },
              anoiteceu: { ...c.anoiteceu, imgloja: logoUrl },
            }));
          }
        } catch { /* silent */ }
      }

      // Plano completo (limites por formato)
      const slug = p.plan?.slug || p.licensee?.plan_slug || p.licensee?.plan;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("slug, max_posts_day, max_feed_reels_day, max_stories_day, max_downloads_day, can_schedule, can_ia_legenda, is_enterprise")
          .eq("slug", slug)
          .single();
        if (plan) setPlanLimits(plan as PlanLimits);
      }

      // Features ativas para o licensee (override do ADM)
      try {
        const feats = await getFeatures(supabase, p);
        setFeatures(feats);
      } catch { /* noop */ }

      // Músicas disponíveis (públicas + exclusivas do licensee)
      if (p.licensee_id) {
        const { data: mData } = await supabase
          .from("musicas")
          .select("id, nome, artista, cloudinary_url, inicio_segundos, duracao_segundos")
          .eq("ativa", true)
          .or(`licensee_id.is.null,licensee_id.eq.${p.licensee_id}`)
          .order("nome");
        setMusicasDisponiveis(mData ?? []);
      }

      // Daily counters
      if (allStores[0]) await loadDailyCount(allStores[0].id);
      if (p.licensee_id) await loadDailyDownloads(p.licensee_id);

      // Avião inicial pra passagem
      if (!formCache.passagem.imgaviao) {
        const { data: aviao } = await supabase.from("imgaviao").select("url").limit(50);
        const urls = ((aviao ?? []) as { url: string }[]).map((r) => r.url);
        if (urls.length > 0) {
          const pick = urls[Math.floor(Math.random() * urls.length)];
          setFormCache((c) => ({ ...c, passagem: { ...c.passagem, imgaviao: pick } }));
        }
      }
    } catch (err) {
      console.error("[Publicar] load:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDailyCount]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Dataset loaders (completos nome+url, cacheados) ── */

  async function loadDestinoData(): Promise<{ nome: string; url: string }[]> {
    if (destinoDataRef.current) return destinoDataRef.current;
    const { data } = await supabase.from("imgfundo").select("nome, url").limit(1000);
    const rows = ((data ?? []) as { nome: string; url: string }[]);
    destinoDataRef.current = rows;
    return rows;
  }
  async function loadHotelData(): Promise<{ nome: string; url: string }[]> {
    if (hotelDataRef.current) return hotelDataRef.current;
    const { data } = await supabase.from("imghotel").select("nome, url").limit(1000);
    const rows = ((data ?? []) as { nome: string; url: string }[]);
    hotelDataRef.current = rows;
    return rows;
  }
  async function loadNavioData(): Promise<{ nome: string; url: string }[]> {
    if (navioDataRef.current) return navioDataRef.current;
    const { data } = await supabase.from("imgcruise").select("nome, url").limit(1000);
    const rows = ((data ?? []) as { nome: string; url: string }[]);
    navioDataRef.current = rows;
    return rows;
  }

  // Autocomplete apenas com nomes únicos, derivado do dataset completo
  async function loadDestinos(): Promise<string[]> {
    const rows = await loadDestinoData();
    const seen = new Set<string>();
    return rows.map((r) => r.nome).filter((n) => { const k = normalizar(n); if (seen.has(k)) return false; seen.add(k); return true; }).sort();
  }
  async function loadHoteis(): Promise<string[]> {
    const rows = await loadHotelData();
    const seen = new Set<string>();
    return rows.map((r) => r.nome).filter((n) => { const k = normalizar(n); if (seen.has(k)) return false; seen.add(k); return true; }).sort();
  }
  async function loadNavios(): Promise<string[]> {
    const rows = await loadNavioData();
    const seen = new Set<string>();
    return rows.map((r) => r.nome).filter((n) => { const k = normalizar(n); if (seen.has(k)) return false; seen.add(k); return true; }).sort();
  }

  /* ── Busca de imagem automática (client-side filter) ── */

  async function fetchImgFundo(destino: string): Promise<string | null> {
    const rows = await loadDestinoData();
    const target = normalizar(destino);
    const matches = rows.filter((r) => normalizar(r.nome) === target);
    if (matches.length === 0) return null;
    return proximaImagem("dest_" + slugify(destino), matches.map((r) => r.url));
  }
  async function fetchImgHotel(hotel: string): Promise<string | null> {
    const rows = await loadHotelData();
    const target = normalizar(hotel);
    const matches = rows.filter((r) => normalizar(r.nome) === target);
    if (matches.length === 0) return null;
    return proximaImagem("hotel_" + slugify(hotel), matches.map((r) => r.url));
  }
  async function fetchImgCruise(navio: string): Promise<string | null> {
    const rows = await loadNavioData();
    const target = normalizar(navio);
    const matches = rows.filter((r) => normalizar(r.nome) === target);
    if (matches.length === 0) return null;
    return proximaImagem("navio_" + slugify(navio), matches.map((r) => r.url));
  }

  /* ── Handlers de campo ─────────────────────────── */

  function setField(name: string, v: string) {
    setFormCache((c) => ({ ...c, [tab]: { ...c[tab], [name]: v } }));
  }
  function setBadge(name: string, v: boolean) {
    setBadgeCache((c) => ({ ...c, [tab]: { ...c[tab], [name]: v } }));
  }

  /** V1: ao mudar ida, volta = max(volta, ida); ao mudar volta, se < ida, força = ida. */
  function setDateIda(v: string) {
    setFormCache((c) => {
      const cur: Record<string, string> = c[tab];
      const next: Record<string, string> = { ...cur, dataida: v };
      if (cur.datavolta && cur.datavolta < v) next.datavolta = v;
      return { ...c, [tab]: next };
    });
  }
  /** Data Volta: só salva raw — validação acontece no onBlur. */
  function setDateVolta(v: string) {
    setFormCache((c) => ({ ...c, [tab]: { ...c[tab], datavolta: v } }));
  }
  /** onBlur da Volta: se for data válida e menor que ida, força = ida. */
  function blurDateVolta() {
    setFormCache((c) => {
      const cur: Record<string, string> = c[tab];
      const volta = cur.datavolta || "";
      const ida = cur.dataida || "";
      if (!volta || !ida) return c;
      // Aceita apenas strings YYYY-MM-DD completas (evita correção durante digitação parcial)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(volta)) return c;
      if (volta < ida) {
        return { ...c, [tab]: { ...cur, datavolta: ida } };
      }
      return c;
    });
  }

  function setDateInicio(v: string) {
    setFormCache((c) => ({ ...c, [tab]: { ...c[tab], inicio: v } }));
  }
  /** Data Fim (Anoiteceu): só salva raw — validação no onBlur. */
  function setDateFim(v: string) {
    setFormCache((c) => ({ ...c, [tab]: { ...c[tab], fim: v } }));
  }
  function blurDateFim() {
    setFormCache((c) => {
      const cur: Record<string, string> = c[tab];
      const fim = cur.fim || "";
      const ini = cur.inicio || "";
      if (!fim || !ini) return c;
      // datetime-local vem como YYYY-MM-DDTHH:MM
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fim)) return c;
      if (fim < ini) {
        return { ...c, [tab]: { ...cur, fim: ini } };
      }
      return c;
    });
  }

  // Noites calculado (readonly) — sincroniza no cache sempre que ida/volta mudam
  useEffect(() => {
    const n = calcNoites(values.dataida || "", values.datavolta || "");
    const key = String(n || "");
    if (values.noites !== key) {
      setFormCache((c) => ({ ...c, [tab]: { ...c[tab], noites: key } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.dataida, values.datavolta, tab]);

  const hoje = todayISO();

  /**
   * Recebe `override` quando o usuário seleciona da lista do Combobox —
   * evita o stale-closure onde `values` ainda é o state antigo no momento do setTimeout.
   */
  async function onDestinoBlur(override?: string) {
    const destino = (override ?? values.destino)?.trim();
    if (!destino) return;
    // Não sobrescreve se já tem imagem (ex.: usuário subiu manual ou hotel já resolveu)
    if (values.imgfundo) return;
    const url = await fetchImgFundo(destino);
    if (url) setField("imgfundo", url);
  }
  async function onHotelBlur(override?: string) {
    const hotel = (override ?? values.hotel)?.trim();
    if (!hotel) return;
    // Capitaliza antes de salvar (com preposições minúsculas)
    const hotelCap = capitalizeBR(hotel);
    if (hotelCap !== values.hotel) setField("hotel", hotelCap);
    // Hotel SEMPRE sobrescreve quando acha imagem própria
    const hUrl = await fetchImgHotel(hotel);
    if (hUrl) { setField("imgfundo", hUrl); return; }
    // Fallback pro destino só se ainda não há imagem
    if (values.imgfundo) return;
    const destino = values.destino?.trim();
    if (destino) {
      const dUrl = await fetchImgFundo(destino);
      if (dUrl) setField("imgfundo", dUrl);
    }
  }
  async function onNavioBlur(override?: string) {
    const navio = (override ?? values.navio)?.trim();
    if (!navio) return;
    const url = await fetchImgCruise(navio);
    if (url) setField("imgfundo", url);
  }

  /* ── Legenda IA ─────────────────────────────────── */

  async function generateCaption() {
    if (!canIaLegenda) {
      alert("Seu plano não inclui geração de legenda por IA.");
      return;
    }
    setGeneratingCaption(true);
    try {
      const payload: Record<string, unknown> = {
        destino: values.destino || currentTemplate?.nome || "seu destino",
        hotel: values.hotel,
        servicos: [values.servico1, values.servico2, values.servico3].filter(Boolean).join(", "),
        preco: values.preco || values.valorparcela,
        parcelas: values.parcelas,
        datas: values.dataida && values.datavolta ? `${values.dataida} a ${values.datavolta}` : undefined,
        noites: values.noites,
        tipo: tab,
      };
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.legenda) setCaption(d.legenda);
      }
    } catch (err) {
      console.error("[Legenda]", err);
    } finally {
      setGeneratingCaption(false);
    }
  }

  /* ── Publish flow ──────────────────────────────── */

  function getPNGDataURL(): string | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const scale = stage.scaleX() || 1;
    return stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/jpeg", quality: 0.92 });
  }

  async function recordCanvasWithAudio(durationSec: number): Promise<Blob | null> {
    const stage = stageRef.current;
    if (!stage) return null;

    const [W, H] = FORMAT_DIMS[format];
    const recCanvas = document.createElement("canvas");
    recCanvas.width = W;
    recCanvas.height = H;
    const recCtx = recCanvas.getContext("2d");
    if (!recCtx) return null;

    // Render loop: copia frame do Konva no canvas de gravação
    const scale = stage.scaleX() || 1;
    let rafId = 0;
    const drawFrame = () => {
      const srcCanvas = stage.toCanvas({ pixelRatio: 1 / scale });
      recCtx.drawImage(srcCanvas, 0, 0, W, H);
      rafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    // Stream de vídeo
    const fps = 30;
    const videoStream = (recCanvas as HTMLCanvasElement).captureStream(fps);

    // Áudio opcional (música selecionada)
    let finalStream: MediaStream = videoStream;
    let audioContext: AudioContext | null = null;
    let audioEl: HTMLAudioElement | null = null;
    const sel = selectedMusicaId ? musicasDisponiveis.find(m => m.id === selectedMusicaId) : null;
    if (sel) {
      try {
        audioContext = new AudioContext();
        audioEl = new Audio();
        audioEl.crossOrigin = "anonymous";
        audioEl.src = sel.cloudinary_url;
        audioEl.currentTime = sel.inicio_segundos;
        await new Promise<void>((resolve, reject) => {
          audioEl!.oncanplay = () => resolve();
          audioEl!.onerror = () => reject(new Error("Falha ao carregar áudio"));
          setTimeout(() => reject(new Error("Timeout áudio")), 10000);
        });
        const source = audioContext.createMediaElementSource(audioEl);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);
        finalStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch (err) {
        console.warn("[Audio] Sem áudio no vídeo:", err);
      }
    }

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const recorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start(100);
    if (audioEl) await audioEl.play().catch(() => {});

    await new Promise(r => setTimeout(r, durationSec * 1000));

    recorder.stop();
    cancelAnimationFrame(rafId);
    audioEl?.pause();
    if (audioContext) await audioContext.close();

    return done;
  }

  async function handleDownload() {
    // Verifica limite diário de downloads
    const maxDl = planLimits?.max_downloads_day;
    if (maxDl !== null && maxDl !== undefined && maxDl > 0 && downloadsToday >= maxDl) {
      setStatus("error");
      setStatusMsg(`Limite diário de downloads atingido (${downloadsToday}/${maxDl})`);
      return;
    }

    const isVideo = format === "stories" || format === "reels";
    let fileUrl: string;
    let publicId: string | null = null;

    if (isVideo) {
      // Calcula duração: maior animDelay+animDuration dos elementos, ou 15s
      const els = (currentTemplate?.schema?.elements ?? []) as Array<{ animDelay?: number; animDuration?: number }>;
      const maxAnim = els.reduce((m, el) => Math.max(m, (el.animDelay || 0) + (el.animDuration || 0.6)), 0);
      const durationSec = Math.min(15, Math.max(5, Math.ceil(maxAnim + 2)));

      setStatus("generating"); setStatusMsg(`Gravando vídeo ${durationSec}s...`);
      const blob = await recordCanvasWithAudio(durationSec);
      if (!blob) { setStatus("error"); setStatusMsg("Falha ao gravar vídeo"); return; }

      // Download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentTemplate?.nome || "arte"}_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      // Upload para Cloudinary como vídeo
      setStatus("uploading"); setStatusMsg("Enviando vídeo...");
      try {
        const signRes = await fetch("/api/cloudinary/sign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: `aurohubv2/videos/${profile?.licensee_id || "anon"}` }),
        });
        const signData = await signRes.json();
        const fd = new FormData();
        fd.append("file", blob, "video.webm");
        fd.append("api_key", signData.api_key);
        fd.append("timestamp", String(signData.timestamp));
        fd.append("folder", signData.folder);
        fd.append("signature", signData.signature);
        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`, { method: "POST", body: fd });
        const upData = await upRes.json();
        if (upData.secure_url) {
          publicId = upData.public_id;
          // Cloudinary entrega MP4 via transformation f_mp4 — compatível com Instagram
          fileUrl = `https://res.cloudinary.com/${signData.cloud_name}/video/upload/f_mp4,vc_h264,ac_aac/${publicId}.mp4`;
        }
        else throw new Error(upData.error?.message || "Upload falhou");
      } catch (err) {
        console.warn("[Cloudinary video]", err);
        fileUrl = "local://blob";
      }
    } else {
      setStatus("generating"); setStatusMsg("Gerando imagem...");
      const dataUrl = getPNGDataURL();
      if (!dataUrl) { setStatus("error"); setStatusMsg("Falha ao gerar imagem"); return; }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${currentTemplate?.nome || "arte"}_${Date.now()}.jpg`;
      a.click();
      fileUrl = "local://jpeg";
    }

    // Registra download na activity_logs
    if (profile?.licensee_id) {
      await supabase.from("activity_logs").insert({
        event_type: "download_arte",
        metadata: {
          licensee_id: profile.licensee_id,
          store_id: profile.store_id,
          template: currentTemplate?.nome || "manual",
          format,
          file_type: isVideo ? "video" : "image",
          cloudinary_url: fileUrl,
          cloudinary_public_id: publicId,
        },
      });
      setDownloadsToday(d => d + 1);

      // Registra em publication_history (silencioso)
      try {
        if (currentTemplate) {
          await supabase.from("publication_history").insert({
            licensee_id: profile.licensee_id,
            loja_id: profile.store_id,
            user_id: profile.id,
            user_role: profile.role,
            template_id: currentTemplate.id,
            template_nome: currentTemplate.nome,
            formato: format,
            tipo: "download" as const,
            destino: values.destino || null,
          });
        }
      } catch (histErr) {
        console.warn("[download] publication_history insert falhou (silencioso):", histErr);
      }
    }

    setStatus("success"); setStatusMsg(isVideo ? "Vídeo baixado" : "Imagem baixada");
    setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2500);
  }

  function limparFormulario() {
    setFormCache((c) => ({ ...c, [tab]: {} }));
    setBadgeCache((c) => ({ ...c, [tab]: {} }));
    setCaption("");
  }

  async function handlePublish() {
    if (!profile?.licensee_id) { setStatus("error"); setStatusMsg("Sem licensee"); return; }
    if (selectedTargetIds.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }
    const limiteFormat = formatLimits[format];
    const usado = postsByFormat[format] || 0;
    if (limiteFormat !== null && limiteFormat > 0 && usado >= limiteFormat) {
      setStatus("error");
      setStatusMsg(`Limite diário de ${format} atingido (${usado}/${limiteFormat})`);
      return;
    }

    const targets = publishTargets.filter((t) => selectedTargetIds.includes(t.id));
    if (targets.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }

    try {
      const isVideo = format === "stories" || format === "reels";
      let mediaBlob: Blob | undefined;
      let mediaDataUrl: string | undefined;

      if (isVideo) {
        setStatus("generating"); setStatusMsg("Gravando vídeo...");
        const els = (currentTemplate?.schema?.elements ?? []) as Array<{ animDelay?: number; animDuration?: number }>;
        const maxAnim = els.reduce((m, el) => Math.max(m, (el.animDelay || 0) + (el.animDuration || 0.6)), 0);
        const durationSec = Math.min(15, Math.max(5, Math.ceil(maxAnim + 2)));
        const blob = await recordCanvasWithAudio(durationSec);
        if (!blob) throw new Error("Falha ao gravar vídeo");
        mediaBlob = blob;
      } else {
        setStatus("generating"); setStatusMsg("Gerando imagem...");
        const dataUrl = getPNGDataURL();
        if (!dataUrl) throw new Error("Falha ao gerar imagem");
        mediaDataUrl = dataUrl;
      }

      const destinoValue = values.destino || null;
      const licenseeId = profile.licensee_id;
      const userId = profile.id;
      const userRole = profile.role;
      const templateId = currentTemplate?.id;
      const templateName = currentTemplate?.nome;
      const currentFormat = format;
      const currentCaption = caption;

      for (const target of targets) {
        publishQueue.enqueue({
          storeId: target.id,
          storeName: target.name,
          destino: destinoValue,
          format: currentFormat,
          isVideo,
          mediaBlob,
          mediaDataUrl,
          caption: currentCaption,
          licenseeId,
          userId,
          userRole,
          templateId,
          templateName,
          onDone: () => {
            loadDailyCount(target.id).catch(() => null);
            try {
              const newUsado = (postsByFormat[currentFormat] || 0) + 1;
              const lim = formatLimits[currentFormat];
              if (lim && lim > 0 && newUsado / lim >= 0.8 && userId && typeof window !== "undefined") {
                const dedup = `ah_push_80_${userId}_${currentFormat}_${new Date().toDateString()}`;
                if (!localStorage.getItem(dedup)) {
                  localStorage.setItem(dedup, "1");
                  fetch("/api/push/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId,
                      title: "⚠️ Limite diário próximo",
                      body: `${newUsado}/${lim} ${currentFormat} publicados hoje.`,
                      tag: "limit-warning",
                    }),
                  }).catch(() => null);
                }
              }
            } catch { /* silent */ }
          },
        });
      }

      limparFormulario();
      setStatus("idle");
      setStatusMsg("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[Publicar]", err);
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  function toggleTarget(id: string) {
    setSelectedTargetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  /* ── Render ────────────────────────────────────── */

  const busy = status === "generating" || status === "uploading" || status === "publishing";
  const [defW, defH] = FORMAT_DIMS[format];
  const width = currentTemplate?.width ?? defW;
  const height = currentTemplate?.height ?? defH;
  const schema: EditorSchema = currentTemplate?.schema ?? { elements: [], background: "#0E1520", duration: 5 };

  // Mescla badges como strings no values para o PreviewStage
  const previewValues = useMemo(() => {
    const merged: Record<string, string> = { ...values };
    for (const [k, v] of Object.entries(badges)) {
      merged[k] = v ? "true" : "";
    }
    return merged;
  }, [values, badges]);

  // Adapter bidirecional: traduz values/badges legados ↔ contrato fields/set dos novos forms.
  const formAdapter = useFormAdapter({ tab, values, badges, setField, setBadge });

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  if (showTypePicker) {
    return (
      <PublicarFlow
        agencyName={profile?.store?.name || profile?.licensee?.name || undefined}
        availableTypes={availableTypes}
        onSelectType={(type) => {
          setTab(type as FormType);
          const first = templates.find((t) => {
            const ft = t.formType === "lamina" ? "quatro_destinos" : t.formType;
            return ft === type && visibleFormats.includes(t.format);
          });
          if (first) setFormat(first.format);
          setShowTypePicker(false);
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr] page-fade publicar-mobile">
      <style>{`
        /* Mobile-only (<768px): anti-zoom iOS em inputs + alvo touch 44px */
        @media (max-width: 767px) {
          .publicar-mobile input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
          .publicar-mobile select,
          .publicar-mobile textarea {
            font-size: 16px !important;
            min-height: 44px;
          }
        }
      `}</style>
      {/* ═══ COLUNA ESQUERDA — FORM ═══ */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] shadow-xl lg:max-h-[calc(100dvh-96px)]"
        style={{ background: "var(--bg1)" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--bdr)] px-5 pt-5 pb-4">
          <h1 className="truncate font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-tight text-[var(--txt)]">
            {profile?.store?.name || profile?.licensee?.name || "Minha unidade"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ background: "rgba(255,122,26,0.14)", color: "var(--orange)" }}
            >
              {FORMAT_LABELS[format]}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ background: "var(--bg2)", color: "var(--txt2)" }}
            >
              {FORM_LABELS[tab]}
            </span>
            <button
              type="button"
              onClick={() => setShowPreviewMobile((v) => !v)}
              className="ml-auto rounded-full border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt2)] lg:hidden"
            >
              {showPreviewMobile ? "Ocultar preview" : "Ver preview"}
            </button>
          </div>
        </div>

        {/* Barra "Trocar tipo" — tipo é escolhido no seletor inicial */}
        <div className="shrink-0 border-b border-[var(--bdr)] px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTypePicker(true)}
            className="rounded-full border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt2)] hover:text-[var(--txt)]"
          >
            ← Trocar tipo
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
            {FORM_LABELS[tab]}
          </span>
        </div>

        {/* Scroll dos campos */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "quatro_destinos" && (
            <QuatroDestinosForm
              fields={formAdapter.fields}
              set={formAdapter.set}
              today={hoje}
              loadDestinos={loadDestinos}
              loadHoteis={loadHoteis}
            />
          )}
          {tab !== "quatro_destinos" && !currentTemplate && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ImageIcon size={24} className="text-[var(--txt3)]" />
              <div className="text-[12px] text-[var(--txt3)]">
                Nenhum template de <strong>{FORM_LABELS[tab]}</strong> para <strong>{FORMAT_LABELS[format]}</strong>.
              </div>
            </div>
          )}

          {currentTemplate && (
            <div className="flex flex-col gap-4">
              {tab === "campanha" && (
                <CampanhaForm
                  fields={formAdapter.fields}
                  set={formAdapter.set}
                  servicos={formAdapter.servicos}
                  setServicos={formAdapter.setServicos}
                  today={hoje}
                  feriadoOpts={feriadoOpts}
                  binds={templateBinds}
                />
              )}

              {tab === "pacote" && (
                <>
                  {(templateBinds.has("destino") || templateBinds.has("saida") || templateBinds.has("tipovoo")) && (
                    <Section title="Destino & Saída">
                      {templateBinds.has("destino") && (
                        <Combobox label="Destino *" value={values.destino || ""} onChange={(v) => setField("destino", destinoUpper(v))} onBlur={onDestinoBlur} loader={loadDestinos} placeholder="Ex.: CANCÚN" />
                      )}
                      {(templateBinds.has("saida") || templateBinds.has("tipovoo")) && (
                        <Row2>
                          {templateBinds.has("saida") && (
                            <Field label="Saída">
                              <TextInput value={values.saida || ""} onChange={(v) => setField("saida", v)} onBlur={() => setField("saida", capitalizeBR(values.saida || ""))} placeholder="Guarulhos" />
                            </Field>
                          )}
                          {templateBinds.has("tipovoo") && (
                            <Field label="Tipo de voo">
                              <Select value={values.tipovoo || "( Voo Direto )"} onChange={(v) => setField("tipovoo", v)} options={["( Voo Direto )", "( Voo Conexão )"]} />
                            </Field>
                          )}
                        </Row2>
                      )}
                    </Section>
                  )}

                  {(templateBinds.has("dataida") || templateBinds.has("datavolta") || templateBinds.has("feriado")) && (
                    <Section title="Datas">
                      {(templateBinds.has("dataida") || templateBinds.has("datavolta")) && (
                        <Row2>
                          {templateBinds.has("dataida") && (
                            <Field label="Data ida">
                              <DateInput value={values.dataida || ""} min={hoje} onChange={setDateIda} />
                            </Field>
                          )}
                          {templateBinds.has("datavolta") && (
                            <Field label="Data volta">
                              <DateInput value={values.datavolta || ""} min={values.dataida || hoje} onChange={setDateVolta} onBlur={blurDateVolta} />
                            </Field>
                          )}
                        </Row2>
                      )}
                      {values.noites && parseInt(values.noites) > 0 && (
                        <div className="text-[10px] text-[var(--txt3)]">
                          Duração: <span className="font-bold text-[var(--txt2)]">{values.noites} noite{parseInt(values.noites) === 1 ? "" : "s"}</span>
                        </div>
                      )}
                      {templateBinds.has("feriado") && (
                        <Field label="Feriado">
                          <Select value={values.feriado || ""} onChange={(v) => setField("feriado", v)} options={feriadoOpts} disabled={!feriadosReady} />
                        </Field>
                      )}
                    </Section>
                  )}

                  {(templateBinds.has("hotel") || templateBinds.has("imghotel")) && (
                    <Section title="Hotel">
                      <Combobox label="Nome do hotel" value={values.hotel || ""} onChange={(v) => setField("hotel", v)} onBlur={onHotelBlur} loader={loadHoteis} placeholder="Nome do hotel" />
                    </Section>
                  )}

                  {Array.from({ length: 6 }, (_, i) => `servico${i + 1}`).some((k) => templateBinds.has(k)) && (
                    <Section title="Serviços inclusos" defaultOpen={true}>
                      <ServicosBlock values={values} setField={setField} setBadge={setBadge} count={6} />
                    </Section>
                  )}

                  {(templateBinds.has("ultima_chamada_badge") || templateBinds.has("ultimos_lugares_badge") || templateBinds.has("ofertas_azul_badge") || templateBinds.has("ultimachamada") || templateBinds.has("ultimoslugares") || templateBinds.has("ofertas")) && (
                    <Section title="Selos" defaultOpen={false}>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(templateBinds.has("ultima_chamada_badge") || templateBinds.has("ultimachamada")) && (
                          <BadgeBtn label="Última chamada" on={!!badges.ultima_chamada_badge} onClick={() => setBadge("ultima_chamada_badge", !badges.ultima_chamada_badge)} />
                        )}
                        {(templateBinds.has("ultimos_lugares_badge") || templateBinds.has("ultimoslugares")) && (
                          <BadgeBtn label="Últimos lugares" on={!!badges.ultimos_lugares_badge} onClick={() => setBadge("ultimos_lugares_badge", !badges.ultimos_lugares_badge)} />
                        )}
                        {(templateBinds.has("ofertas_azul_badge") || templateBinds.has("ofertas")) && (
                          <BadgeBtn label="Ofertas" on={!!badges.ofertas_azul_badge} onClick={() => setBadge("ofertas_azul_badge", !badges.ofertas_azul_badge)} />
                        )}
                      </div>
                    </Section>
                  )}

                  {(templateBinds.has("formapagamento") || templateBinds.has("parcelas") || templateBinds.has("valorparcela") || templateBinds.has("desconto") || templateBinds.has("totalduplo") || templateBinds.has("entrada")) && (
                    <Section title="Pagamento">
                      {templateBinds.has("formapagamento") && (
                        <Field label="Forma de pagamento">
                          <Select
                            value={values.formapagamento || FORMA_PGTO_OPTS[0]}
                            onChange={(v) => setField("formapagamento", v)}
                            options={FORMA_PGTO_OPTS}
                          />
                        </Field>
                      )}
                      {values.formapagamento === "Boleto" && templateBinds.has("entrada") && (
                        <Field label="Valor de entrada">
                          <TextInput
                            value={formatMoeda(values.entrada || "")}
                            inputMode="decimal"
                            onChange={(v) => setField("entrada", v.replace(/\D/g, ""))}
                            placeholder="R$ 0,00"
                          />
                        </Field>
                      )}
                      {(templateBinds.has("parcelas") || templateBinds.has("valorparcela")) && (
                        <Row2>
                          {templateBinds.has("parcelas") && (
                            <Field label="Parcelas">
                              <Select value={values.parcelas || ""} onChange={(v) => setField("parcelas", v)} options={["", ...PARCELAS_OPTS]} />
                            </Field>
                          )}
                          {templateBinds.has("valorparcela") && (
                            <Field label="Valor parcela">
                              <TextInput value={formatMoeda(values.valorparcela || "")} inputMode="decimal" onChange={(v) => setField("valorparcela", v.replace(/\D/g, ""))} placeholder="R$ 0,00" />
                            </Field>
                          )}
                        </Row2>
                      )}
                      {(templateBinds.has("desconto") || templateBinds.has("totalduplo")) && (
                        <Row2>
                          {templateBinds.has("desconto") && (
                            <Field label="% Desconto">
                              <Select value={values.desconto || ""} onChange={(v) => setField("desconto", v)} options={DESCONTO_OPTS} />
                            </Field>
                          )}
                          {templateBinds.has("totalduplo") && (
                            <Field label="Total">
                              <TextInput value={formatMoeda(values.totalduplo || "")} inputMode="decimal" onChange={(v) => setField("totalduplo", v.replace(/\D/g, ""))} placeholder="R$ 0,00" />
                            </Field>
                          )}
                        </Row2>
                      )}
                    </Section>
                  )}
                </>
              )}

              {tab === "passagem" && (
                <>
                  {(templateBinds.has("destino") || templateBinds.has("saida") || templateBinds.has("tipovoo")) && (
                    <Section title="Destino & Saída">
                      {templateBinds.has("destino") && (
                        <Combobox label="Destino *" value={values.destino || ""} onChange={(v) => setField("destino", destinoUpper(v))} onBlur={onDestinoBlur} loader={loadDestinos} placeholder="Ex.: LISBOA" />
                      )}
                      {(templateBinds.has("saida") || templateBinds.has("tipovoo")) && (
                        <Row2>
                          {templateBinds.has("saida") && (
                            <Field label="Saída"><TextInput value={values.saida || ""} onChange={(v) => setField("saida", v)} onBlur={() => setField("saida", capitalizeBR(values.saida || ""))} placeholder="Guarulhos" /></Field>
                          )}
                          {templateBinds.has("tipovoo") && (
                            <Field label="Tipo de voo">
                              <Select value={values.tipovoo || "( Voo Direto )"} onChange={(v) => setField("tipovoo", v)} options={["( Voo Direto )", "( Voo Conexão )"]} />
                            </Field>
                          )}
                        </Row2>
                      )}
                    </Section>
                  )}
                  {(templateBinds.has("dataida") || templateBinds.has("datavolta")) && (
                    <Section title="Datas">
                      <Row2>
                        {templateBinds.has("dataida") && (
                          <Field label="Data ida">
                            <DateInput value={values.dataida || ""} min={hoje} onChange={setDateIda} />
                          </Field>
                        )}
                        {templateBinds.has("datavolta") && (
                          <Field label="Data volta">
                            <DateInput value={values.datavolta || ""} min={values.dataida || hoje} onChange={setDateVolta} onBlur={blurDateVolta} />
                          </Field>
                        )}
                      </Row2>
                    </Section>
                  )}
                  {Array.from({ length: 3 }, (_, i) => `servico${i + 1}`).some((k) => templateBinds.has(k)) && (
                    <Section title="Serviços inclusos" defaultOpen={true}>
                      <ServicosBlock values={values} setField={setField} setBadge={setBadge} count={3} />
                    </Section>
                  )}
                  {(templateBinds.has("parcelas") || templateBinds.has("valorparcela")) && (
                    <Section title="Pagamento">
                      <Row2>
                        {templateBinds.has("parcelas") && (
                          <Field label="Parcelas">
                            <Select value={values.parcelas || ""} onChange={(v) => setField("parcelas", v)} options={["", ...PARCELAS_OPTS]} />
                          </Field>
                        )}
                        {templateBinds.has("valorparcela") && (
                          <Field label="Valor parcela">
                            <TextInput value={formatMoeda(values.valorparcela || "")} inputMode="decimal" onChange={(v) => setField("valorparcela", v.replace(/\D/g, ""))} placeholder="R$ 0,00" />
                          </Field>
                        )}
                      </Row2>
                    </Section>
                  )}
                </>
              )}

              {tab === "cruzeiro" && (
                <CruzeiroForm
                  fields={formAdapter.fields}
                  set={formAdapter.set}
                  today={hoje}
                  binds={templateBinds}
                />
              )}

              {tab === "anoiteceu" && (
                <AnoiteceuForm fields={formAdapter.fields} set={formAdapter.set} binds={templateBinds} />
              )}

              {/* Música — Stories e Reels (add-on, gated por feature) */}
              {features.has("musica") && (format === "stories" || format === "reels") && (
                <div className="border-t border-[var(--bdr)] pt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                    Música
                  </label>
                  {musicasDisponiveis.length === 0 ? (
                    <p className="text-[11px] text-[var(--txt3)]">Nenhuma música disponível.</p>
                  ) : (() => {
                    const sel = musicasDisponiveis.find(m => m.id === selectedMusicaId);
                    const fmtDur = (s: number | null) => s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : "";
                    const q = musicaSearch.trim().toLowerCase();
                    const filtered = q
                      ? musicasDisponiveis.filter(m =>
                          m.nome.toLowerCase().includes(q) || m.artista.toLowerCase().includes(q))
                      : musicasDisponiveis;
                    return (
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={sel && !musicaOpen ? `${sel.nome} — ${sel.artista}` : musicaSearch}
                              onChange={e => { setMusicaSearch(e.target.value); setMusicaOpen(true); }}
                              onFocus={() => { setMusicaOpen(true); setMusicaSearch(""); }}
                              onBlur={() => setTimeout(() => setMusicaOpen(false), 150)}
                              placeholder="Buscar música..."
                              className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 pr-8 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
                            />
                            {selectedMusicaId && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedMusicaId("");
                                  setMusicaSearch("");
                                  if (musicaAudioRef.current) { musicaAudioRef.current.pause(); setMusicaPlaying(false); }
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--txt3)] hover:text-[var(--red)]"
                              >
                                ✕
                              </button>
                            )}
                            {musicaOpen && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] shadow-lg">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSelectedMusicaId("");
                                    setMusicaSearch("");
                                    setMusicaOpen(false);
                                    if (musicaAudioRef.current) { musicaAudioRef.current.pause(); setMusicaPlaying(false); }
                                  }}
                                  className="block w-full border-b border-[var(--bdr)] px-3 py-2 text-left text-[11px] italic text-[var(--txt3)] hover:bg-[var(--hover-bg)]"
                                >
                                  Sem música
                                </button>
                                {filtered.length === 0 ? (
                                  <p className="px-3 py-2 text-[11px] text-[var(--txt3)]">Nada encontrado.</p>
                                ) : filtered.map(m => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedMusicaId(m.id);
                                      setMusicaSearch("");
                                      setMusicaOpen(false);
                                      if (musicaAudioRef.current) { musicaAudioRef.current.pause(); setMusicaPlaying(false); }
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--hover-bg)] ${m.id === selectedMusicaId ? "bg-[var(--orange3)]" : ""}`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[12px] font-semibold text-[var(--txt)]">{m.nome}</div>
                                      <div className="truncate text-[10px] text-[var(--txt3)]">{m.artista}</div>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-mono text-[var(--txt3)]">{fmtDur(m.duracao_segundos)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {sel && (
                            <button
                              type="button"
                              onClick={() => {
                                if (musicaPlaying) {
                                  musicaAudioRef.current?.pause();
                                  setMusicaPlaying(false);
                                } else {
                                  if (musicaAudioRef.current) musicaAudioRef.current.pause();
                                  const audio = new Audio(sel.cloudinary_url);
                                  audio.currentTime = sel.inicio_segundos;
                                  audio.play();
                                  audio.onended = () => setMusicaPlaying(false);
                                  musicaAudioRef.current = audio;
                                  setMusicaPlaying(true);
                                }
                              }}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--orange3)] hover:text-[var(--orange)]"
                            >
                              {musicaPlaying ? (
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
                              ) : (
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
                              )}
                            </button>
                          )}
                        </div>
                        {sel && (
                          <p className="mt-1 text-[10px] text-[var(--txt3)]">
                            Início em {sel.inicio_segundos}s{sel.duracao_segundos ? ` · duração ${fmtDur(sel.duracao_segundos)}` : ""}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Legenda — só em Reels e Feed */}
              {(format === "reels" || format === "feed") && (
                <div className="border-t border-[var(--bdr)] pt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                      Legenda Instagram
                    </label>
                    {canIaLegenda && (
                      <button
                        onClick={generateCaption}
                        disabled={generatingCaption}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline disabled:opacity-50"
                      >
                        {generatingCaption ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Gerar IA
                      </button>
                    )}
                  </div>
                  <TextArea value={caption} onChange={setCaption} rows={4} placeholder="Legenda do post..." />
                  <div className="mt-1 text-right text-[9px] text-[var(--txt3)] tabular-nums">
                    {caption.length} / 2200
                  </div>
                </div>
              )}

              {/* Lojas */}
              {publishTargets.length > 0 && (
                <div className="border-t border-[var(--bdr)] pt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                    Publicar em
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {publishTargets.map((t) => {
                      const active = selectedTargetIds.includes(t.id);
                      const single = publishTargets.length === 1;
                      return (
                        <button
                          key={t.id} type="button"
                          onClick={() => !single && toggleTarget(t.id)}
                          disabled={single}
                          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors"
                          style={
                            active
                              ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.12)", color: "var(--orange)" }
                              : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                          }
                        >
                          <span
                            className="flex h-3 w-3 items-center justify-center rounded border"
                            style={active ? { borderColor: "var(--orange)", background: "var(--orange)" } : { borderColor: "var(--bdr2)" }}
                          >
                            {active && <Check size={8} />}
                          </span>
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contador diário */}
              <DailyCounter
                posts={postsByFormat}
                limits={formatLimits}
                visibleFormats={visibleFormats}
                current={format}
                downloads={downloadsToday}
                maxDownloads={planLimits?.max_downloads_day}
              />
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="shrink-0 border-t border-[var(--bdr)] bg-[var(--bg1)] p-3">
          {(() => {
            const limiteAtual = formatLimits[format];
            const usadoAtual = postsByFormat[format] || 0;
            const limiteAtingido = limiteAtual !== null && limiteAtual > 0 && usadoAtual >= limiteAtual;
            const canShowPublish = canPublishFeature && format !== "tv";
            const cols = 2 + (canDriveFeature ? 1 : 0); // Limpar + Download [+ Drive]

            return (
              <>
                <div
                  className="mb-2 grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  <button
                    onClick={limparFormulario}
                    className="flex items-center justify-center gap-1 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-3 py-2 text-[11px] font-semibold text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.12)]"
                  >
                    <Trash2 size={11} /> Limpar
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={busy || !currentTemplate}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Download size={11} /> Download
                  </button>
                  {canDriveFeature && (
                    <button
                      disabled
                      title="Em breve"
                      className="flex items-center justify-center gap-1 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.06)] px-3 py-2 text-[11px] font-semibold text-[#60A5FA] opacity-60"
                    >
                      📁 Drive
                    </button>
                  )}
                </div>
                {canShowPublish && (
                  <button
                    onClick={handlePublish}
                    disabled={busy || !currentTemplate || limiteAtingido}
                    title={limiteAtingido ? `Limite diário atingido (${usadoAtual}/${limiteAtual})` : undefined}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {status === "uploading"
                      ? "Enviando..."
                      : status === "publishing"
                        ? "Publicando..."
                        : limiteAtingido
                          ? "Limite atingido"
                          : "Publicar no Instagram"}
                  </button>
                )}
                {!canPublishFeature && (
                  <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-center text-[10px] text-[var(--txt3)]">
                    Publicação no Instagram não está ativa no seu plano.
                  </div>
                )}
                {canPublishFeature && format === "tv" && (
                  <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-center text-[10px] text-[var(--txt3)]">
                    Formato TV é apenas para exibição local — não publica no Instagram.
                  </div>
                )}
              </>
            );
          })()}
          {status !== "idle" && (
            <div
              className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium"
              style={
                status === "success"
                  ? { background: "var(--green3)", color: "var(--green)" }
                  : status === "error"
                    ? { background: "var(--red3)", color: "var(--red)" }
                    : { background: "var(--blue3)", color: "var(--blue)" }
              }
            >
              {status === "success" ? <Check size={11} /> : status === "error" ? <X size={11} /> : <Loader2 size={11} className="animate-spin" />}
              <span className="truncate">{statusMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ COLUNA DIREITA — PREVIEW ═══ */}
      <div className={`card-glass relative flex-col overflow-hidden lg:flex ${showPreviewMobile ? "flex" : "hidden"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <h3 className="text-[14px] font-bold text-[var(--txt)]">Preview ao vivo</h3>
          <div className="text-[10px] text-[var(--txt3)] tabular-nums">
            {width}×{height}
          </div>
        </div>
        <div className="h-full flex flex-1 items-center justify-center p-5 overflow-hidden">
          {currentTemplate ? (
            <div style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))" }}>
            <PreviewStage
              key={`${tab}-${format}-${currentTemplate.key}`}
              schema={schema}
              width={width}
              height={height}
              values={previewValues}
              maxDisplay={Math.round((typeof window !== "undefined" ? window.innerHeight : 900) * 0.82)}
              onReady={(s) => { stageRef.current = s; }}
            />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <ImageIcon size={32} className="text-[var(--txt3)]" />
              <div className="text-[12px] text-[var(--txt3)]">
                Sem template {FORM_LABELS[tab]} / {FORMAT_LABELS[format]}
              </div>
            </div>
          )}
        </div>
        {/* Format pills — abaixo do preview, só formatos liberados pelo plano + com template pro tipo escolhido */}
        {formatsForCurrentType.length > 1 && (
          <div className="shrink-0 border-t border-[var(--bdr)] px-4 py-3 flex items-center justify-center gap-1">
            {formatsForCurrentType.map((f) => {
              const active = format === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={
                    active
                      ? { background: "#D4A843", color: "#060B16" }
                      : { background: "transparent", color: "var(--txt3)", border: "1px solid var(--bdr)" }
                  }
                >
                  {FORMAT_LABELS[f]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--bdr)] bg-[var(--bg2)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover-bg)]"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--txt2)]">
          {title}
        </span>
        <ChevronDown
          size={13}
          className="text-[var(--txt3)] transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--bdr)] p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, inputMode, onBlur,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: "text" | "numeric" | "decimal"; onBlur?: () => void;
}) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
    />
  );
}

function TextArea({
  value, onChange, rows = 3, placeholder,
}: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
    />
  );
}

function DateInput({
  value, onChange, min, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
    />
  );
}

function Select({
  value, onChange, options, disabled,
}: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2 text-[11.5px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => <option key={o} value={o}>{o || "— nenhum —"}</option>)}
    </select>
  );
}

function BadgeBtn({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="rounded-md border px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors"
      style={
        on
          ? { borderColor: "#D4A843", background: "rgba(212,168,67,0.12)", color: "#D4A843" }
          : { borderColor: "var(--bdr)", color: "var(--txt3)" }
      }
    >
      {label}
    </button>
  );
}

function ServicosBlock({
  values, setField, setBadge, count,
}: {
  values: Record<string, string>;
  setField: (k: string, v: string) => void;
  setBadge: (k: string, v: boolean) => void;
  count: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        Serviços inclusos
      </label>
      <div className="flex flex-col gap-1">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
          const key = `servico${n}`;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-4 text-[9px] font-bold tabular-nums text-[var(--txt3)]">{n}.</span>
              <input
                type="text"
                value={values[key] || ""}
                onChange={(e) => setField(key, e.target.value)}
                onBlur={(e) => {
                  const v = applyServico(e.target.value);
                  setField(key, v);
                  if (isAllInclusive(v)) setBadge("all_inclusive_badge", true);
                }}
                placeholder={`Serviço ${n}`}
                className="h-7 flex-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyCounter({
  posts, limits, visibleFormats, current, downloads, maxDownloads,
}: {
  posts: PostsByFormat;
  limits: FormatLimits;
  visibleFormats: Format[];
  current: Format;
  downloads: number;
  maxDownloads: number | null | undefined;
}) {
  // Combina feed+reels em uma única barra
  type Row = { label: string; count: number; max: number | null; keys: Format[] };
  const rows: Row[] = [];
  const showFormat = (f: Format) => visibleFormats.includes(f);

  if (showFormat("stories")) rows.push({ label: "Stories", count: posts.stories || 0, max: limits.stories, keys: ["stories"] });
  if (showFormat("feed") || showFormat("reels")) {
    const feedReelsCount = (posts.feed || 0) + (posts.reels || 0);
    const feedMax = limits.feed;
    const reelsMax = limits.reels;
    const combinedMax = feedMax !== null && reelsMax !== null ? feedMax + reelsMax : feedMax ?? reelsMax;
    rows.push({ label: "Feed/Reels", count: feedReelsCount, max: combinedMax, keys: ["feed", "reels"] });
  }
  if (showFormat("tv")) rows.push({ label: "TV", count: posts.tv || 0, max: limits.tv, keys: ["tv"] });

  // Downloads
  const dlMax = maxDownloads ?? null;
  rows.push({ label: "Downloads", count: downloads, max: dlMax, keys: [] });

  if (rows.length === 0) return null;

  return (
    <div className="border-t border-[var(--bdr)] pt-4">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        Posts de hoje
      </label>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ label, count, max, keys }) => {
          const unlimited = max === null || max <= 0;
          const pct = !unlimited && max && max > 0 ? Math.min(100, (count / max) * 100) : 0;
          const danger = !unlimited && max !== null && count >= max;
          const warn = !unlimited && max !== null && max > 0 && count >= max * 0.8;
          const isActive = keys.includes(current);
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="w-16 text-[9px] font-bold uppercase text-[var(--txt3)]">{label}</span>
              <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[var(--bg2)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: unlimited ? "0%" : `${pct}%`,
                    background: danger ? "var(--red)" : warn ? "#F59E0B" : "var(--gold)",
                  }}
                />
              </div>
              <span
                className="w-14 text-right text-[9px] font-bold tabular-nums"
                style={{ color: danger ? "var(--red)" : "var(--txt3)" }}
              >
                {unlimited ? `${count} ∞` : `${count}/${max}`}
              </span>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Combobox (autocomplete) ─────────────────────── */

function Combobox({
  label, value, onChange, onBlur, loader, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Recebe `freshValue` quando vem de um select da lista (evita stale closure). */
  onBlur?: (freshValue?: string) => void;
  loader: () => Promise<string[]>;
  placeholder?: string;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [ddPos, setDdPos] = useState<{ top: number; left: number; width: number; openAbove: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadOnce() {
    if (items.length > 0) return;
    const list = await loader();
    setItems(list);
  }

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return items.slice(0, 60);
    return items.filter((i) => {
      const il = i.toLowerCase();
      return il.startsWith(q) || il.split(" ").some((w) => w.startsWith(q));
    }).slice(0, 60);
  }, [items, value]);

  const updatePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const openAbove = spaceBelow < 200 && r.top > 220;
    setDdPos({
      top: openAbove ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
      openAbove,
    });
  }, []);

  // Atualiza posição ao abrir + em scroll/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  // Click fora fecha
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const el = inputRef.current;
      if (!el) return;
      const target = e.target as Node;
      if (el.contains(target)) return;
      // Checa se clicou dentro do dropdown (que está em body via position fixed)
      const dd = document.getElementById("ah-combobox-dd");
      if (dd && dd.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setFocused(-1);
    // Passa o valor fresco — não depende do closure de `values` do caller
    setTimeout(() => onBlur?.(v), 0);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    else if (e.key === "Enter" && focused >= 0) { e.preventDefault(); select(filtered[focused]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        {label}
      </label>
      <div className="relative">
        <SearchIcon size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt3)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); loadOnce(); }}
          onFocus={() => { loadOnce(); setOpen(true); }}
          onBlur={() => { setTimeout(() => { setOpen(false); onBlur?.(); }, 180); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] pl-7 pr-3 text-[11.5px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
        />
      </div>
      {open && filtered.length > 0 && ddPos && (
        <div
          id="ah-combobox-dd"
          className="overflow-y-auto rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] shadow-2xl"
          style={{
            position: "fixed",
            top: ddPos.openAbove ? "auto" : ddPos.top,
            bottom: ddPos.openAbove ? window.innerHeight - ddPos.top : "auto",
            left: ddPos.left,
            width: ddPos.width,
            maxHeight: 280,
            zIndex: 9999,
          }}
        >
          {filtered.map((it, i) => (
            <div
              key={it}
              onMouseDown={(e) => { e.preventDefault(); select(it); }}
              className="cursor-pointer truncate px-3 py-1.5 text-[12px] transition-colors"
              style={
                focused === i
                  ? { background: "rgba(255,122,26,0.12)", color: "var(--orange)" }
                  : { color: "var(--txt2)" }
              }
            >
              {it}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { getFeatures } from "@/lib/features";
import type { EditorSchema } from "@/components/editor/types";
import {
  Sparkles, Download, Send, Check, X, Loader2, Trash2,
  Image as ImageIcon, Search as SearchIcon, ChevronDown,
} from "lucide-react";

const PreviewStage = dynamic(() => import("./PreviewStage"), { ssr: false });

/* ── Tipos ───────────────────────────────────────── */

type FormType = "pacote" | "campanha" | "passagem" | "cruzeiro" | "anoiteceu";
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
/** Null pra "escondido" (plano não libera). */
type FormatVisibility = Record<Format, boolean>;

interface PostsByFormat { stories: number; feed: number; reels: number; tv: number; }

/* ── Constantes ──────────────────────────────────── */

const RIO_PRETO_STORE_ID = "efab2a24-3c34-4d2b-82ee-5fef8018c589";
const RIO_PRETO_MATCHERS = ["rio preto", "barretos", "damha"];

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
  cruzeiro: "Cruzeiro", anoiteceu: "Anoiteceu",
};

const FORM_ORDER: FormType[] = ["pacote", "campanha", "passagem", "cruzeiro", "anoiteceu"];

const FERIADOS_FIXOS = [
  "Carnaval", "Páscoa", "Tiradentes", "Trabalho", "Corpus Christi",
  "Independência", "Nossa Senhora", "Finados", "República", "Natal", "Réveillon",
];

const FORMA_PGTO_OPTS = [
  "No Cartão de Crédito Sem Juros",
  "Boleto com Entrada",
  "No Débito",
];
const PARCELAS_OPTS = Array.from({ length: 36 }, (_, i) => `${i + 1}x`);
const DESCONTO_OPTS = ["", "5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

/** Normaliza string para matching: lowercase + remove acentos */
function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/* ── Helpers ─────────────────────────────────────── */

function canPublishToAllAZV(storeId: string | null | undefined): boolean {
  return storeId === RIO_PRETO_STORE_ID;
}
function filterAZVGroup(stores: StoreOption[]): StoreOption[] {
  return stores.filter((s) => {
    const n = s.name.toLowerCase();
    return RIO_PRETO_MATCHERS.some((m) => n.includes(m));
  });
}

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

/** Calcula noites entre 2 datas YYYY-MM-DD (Volta - Ida). */
function calcNoites(ida: string, volta: string): number {
  if (!ida || !volta) return 0;
  const a = new Date(ida + "T00:00:00");
  const b = new Date(volta + "T00:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

/* ── Component principal ─────────────────────────── */

export default function PublicarPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado por aba
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");

  // Cache de dados por aba (preserva ao trocar)
  const [formCache, setFormCache] = useState<Record<FormType, Record<string, string>>>({
    pacote: {}, campanha: {}, passagem: {}, cruzeiro: {}, anoiteceu: {},
  });
  const [badgeCache, setBadgeCache] = useState<Record<FormType, Record<string, boolean>>>({
    pacote: {}, campanha: {}, passagem: {}, cruzeiro: {}, anoiteceu: {},
  });

  const values = formCache[tab];
  const badges = badgeCache[tab];

  // Template atual — match estrito por formType + format (sem fallback)
  // Se não existir template pra (tab, format), o preview mostra placeholder
  const currentTemplate = useMemo(() => {
    const t = templates.find((t) => t.formType === tab && t.format === format) ?? null;
    console.log("[DEBUG] currentTemplate match", {
      tab,
      format,
      templatesCount: templates.length,
      allFormTypes: [...new Set(templates.map((x) => x.formType))],
      allFormats: [...new Set(templates.map((x) => x.format))],
      matched: t ? { key: t.key, nome: t.nome, formType: t.formType, format: t.format, elementCount: t.schema.elements.length, elementsWithBind: t.schema.elements.filter((e) => !!e.bindParam).map((e) => ({ id: e.id, type: e.type, bindParam: e.bindParam })) } : null,
    });
    return t;
  }, [templates, tab, format]);

  // Legenda
  const [caption, setCaption] = useState<string>("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  // Stores / publish targets
  const [publishTargets, setPublishTargets] = useState<StoreOption[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  // Daily counter
  const [postsByFormat, setPostsByFormat] = useState<PostsByFormat>({ stories: 0, feed: 0, reels: 0, tv: 0 });
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

  const formatVisible = useMemo<FormatVisibility>(() => {
    if (!planLimits) return { stories: true, feed: true, reels: true, tv: false };
    return {
      stories: (planLimits.max_stories_day ?? 0) !== 0,
      feed:    (planLimits.max_feed_reels_day ?? 0) > 0,
      reels:   (planLimits.max_feed_reels_day ?? 0) > 0,
      tv:      !!planLimits.is_enterprise,
    };
  }, [planLimits]);

  // Feature "publicar" — se ausente, esconde botão de publicar IG
  const canPublishFeature = features.has("publicar");
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

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      // Templates do licensee
      const { data: tplData } = await supabase
        .from("system_config")
        .select("key, value")
        .like("key", "tmpl_%")
        .like("value", `%"licenseeId":"${p.licensee_id}"%`);

      const rows: TemplateRow[] = [];
      for (const r of (tplData ?? []) as { key: string; value: string }[]) {
        try {
          const parsed = JSON.parse(r.value);
          const schemaElements = parsed.elements ?? parsed.schema?.elements;
          if (!schemaElements) continue;
          const fmt = (parsed.format || parsed.schema?.format || "stories") as Format;
          const [defW, defH] = FORMAT_DIMS[fmt] || [1080, 1920];
          rows.push({
            key: r.key,
            id: r.key.replace(/^tmpl_/, ""),
            nome: parsed.nome || r.key.replace(/^tmpl_/, ""),
            format: fmt,
            formType: parsed.formType || parsed.schema?.formType || "pacote",
            width: parsed.width || parsed.schema?.width || defW,
            height: parsed.height || parsed.schema?.height || defH,
            schema: {
              elements: schemaElements,
              background: parsed.bgColor || parsed.background || parsed.schema?.background || "#FFFFFF",
              duration: parsed.duration || 5,
              qtdDestinos: parsed.qtdDestinos,
            },
          });
        } catch { /* skip */ }
      }
      setTemplates(rows);

      // Stores / publish targets
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name")
        .eq("licensee_id", p.licensee_id)
        .order("name");
      const allStores = (storesData ?? []) as StoreOption[];

      let targets: StoreOption[] = [];
      if (canPublishToAllAZV(p.store_id)) {
        targets = filterAZVGroup(allStores);
        if (targets.length === 0) targets = allStores;
      } else if (p.store_id) {
        const own = allStores.find((s) => s.id === p.store_id);
        targets = own ? [own] : [];
      }
      setPublishTargets(targets);
      setSelectedTargetIds(targets.length > 0 ? [targets[0].id] : []);

      // Plano completo (limites por formato)
      const slug = p.plan?.slug || p.licensee?.plan_slug || p.licensee?.plan;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("slug, max_posts_day, max_feed_reels_day, max_stories_day, can_schedule, can_ia_legenda, is_enterprise")
          .eq("slug", slug)
          .single();
        if (plan) setPlanLimits(plan as PlanLimits);
      }

      // Features ativas para o licensee (override do ADM)
      try {
        const feats = await getFeatures(supabase, p);
        setFeatures(feats);
      } catch { /* noop */ }

      // Daily counter (via primeira store selecionada)
      if (targets[0]) await loadDailyCount(targets[0].id);

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

  async function onDestinoBlur() {
    const destino = values.destino?.trim();
    console.log("[DEBUG] onDestinoBlur", { destino, hotel: values.hotel });
    if (!destino) return;
    // Hotel tem prioridade — se já existe, usar hotel
    const hotel = values.hotel?.trim();
    if (hotel) {
      const hUrl = await fetchImgHotel(hotel);
      console.log("[DEBUG] fetchImgHotel →", { hotel, hUrl });
      if (hUrl) { setField("imgfundo", hUrl); return; }
    }
    const url = await fetchImgFundo(destino);
    console.log("[DEBUG] fetchImgFundo →", { destino, url });
    if (url) {
      console.log("[DEBUG] setField imgfundo =", url);
      setField("imgfundo", url);
    } else {
      console.warn("[DEBUG] fetchImgFundo retornou null pra", destino);
    }
  }
  async function onHotelBlur() {
    const hotel = values.hotel?.trim();
    if (!hotel) return;
    const hUrl = await fetchImgHotel(hotel);
    if (hUrl) { setField("imgfundo", hUrl); return; }
    // Fallback: buscar pelo destino se hotel não tem imagem
    const destino = values.destino?.trim();
    if (destino) {
      const dUrl = await fetchImgFundo(destino);
      if (dUrl) setField("imgfundo", dUrl);
    }
  }
  async function onNavioBlur() {
    const navio = values.navio?.trim();
    if (!navio) return;
    const url = await fetchImgCruise(navio);
    if (url) setField("imgfundo", url);
  }

  /* ── Legenda IA ─────────────────────────────────── */

  async function generateCaption() {
    if (!planLimits?.can_ia_legenda && profile?.role !== "adm") {
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
    return stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/png" });
  }

  async function handleDownload() {
    setStatus("generating");
    const dataUrl = getPNGDataURL();
    if (!dataUrl) { setStatus("error"); setStatusMsg("Falha ao gerar imagem"); return; }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${currentTemplate?.nome || "arte"}_${Date.now()}.png`;
    a.click();
    setStatus("success"); setStatusMsg("Imagem baixada");
    setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2000);
  }

  function limparFormulario() {
    setFormCache((c) => ({ ...c, [tab]: {} }));
    setBadgeCache((c) => ({ ...c, [tab]: {} }));
    setCaption("");
  }

  async function handlePublish() {
    if (!profile?.licensee_id) { setStatus("error"); setStatusMsg("Sem licensee"); return; }
    if (selectedTargetIds.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }
    // Checa limite diário do formato atual (derivado do plano)
    const limiteFormat = formatLimits[format];
    const usado = postsByFormat[format] || 0;
    if (limiteFormat !== null && limiteFormat > 0 && usado >= limiteFormat) {
      setStatus("error");
      setStatusMsg(`Limite diário de ${format} atingido (${usado}/${limiteFormat})`);
      return;
    }

    try {
      setStatus("generating"); setStatusMsg("Gerando imagem...");
      const dataUrl = getPNGDataURL();
      if (!dataUrl) throw new Error("Falha ao gerar imagem");

      setStatus("uploading"); setStatusMsg("Enviando para Cloudinary...");
      const upRes = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, folder: `aurohubv2/publicacoes/${profile.licensee_id}` }),
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.secure_url) throw new Error(upData.error || "Upload falhou");

      setStatus("publishing");
      const targets = publishTargets.filter((t) => selectedTargetIds.includes(t.id));
      const resultados: { store: StoreOption; ok: boolean; error?: string }[] = [];
      for (const target of targets) {
        setStatusMsg(`Publicando em ${target.name}...`);
        try {
          const pubRes = await fetch("/api/instagram/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              licensee_id: profile.licensee_id,
              store_id: target.id,
              image_url: upData.secure_url,
              caption,
              media_type: format === "stories" ? "STORIES" : "IMAGE",
              format, // stories | feed | reels | tv — lido pelo contador diário
            }),
          });
          const pubData = await pubRes.json();
          if (!pubRes.ok || !pubData.success) {
            resultados.push({ store: target, ok: false, error: pubData.error || "Falhou" });
          } else {
            resultados.push({ store: target, ok: true });
          }
        } catch (err) {
          resultados.push({ store: target, ok: false, error: err instanceof Error ? err.message : "Erro" });
        }
      }

      const okCount = resultados.filter((r) => r.ok).length;
      const falhas = resultados.filter((r) => !r.ok);
      if (okCount === 0) throw new Error(`Nenhuma publicação concluída. ${falhas[0]?.error ?? ""}`);

      setStatus("success");
      setStatusMsg(falhas.length === 0
        ? `Publicado em ${okCount} loja${okCount === 1 ? "" : "s"}!`
        : `${okCount} ok · ${falhas.length} falha${falhas.length === 1 ? "" : "s"}`);
      // Recarrega contador
      if (targets[0]) await loadDailyCount(targets[0].id);
      setTimeout(() => { limparFormulario(); setStatus("idle"); setStatusMsg(""); }, 4000);
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

  // Debug: o que o PreviewStage está recebendo
  console.log("[DEBUG] render/PreviewStage props", {
    hasTemplate: !!currentTemplate,
    tab, format, width, height,
    schemaElements: schema.elements.length,
    values, // todos os campos incluindo imgfundo
    imgfundoPresent: !!values.imgfundo,
    imgfundoUrl: values.imgfundo?.slice(0, 80),
    // Elementos do schema que têm bindParam
    bindElements: schema.elements.filter((e) => e.bindParam).map((e) => ({
      type: e.type,
      bindParam: e.bindParam,
      hasValueInForm: e.bindParam ? !!values[e.bindParam] : false,
    })),
  });

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
      {/* ═══ COLUNA ESQUERDA — FORM ═══ */}
      <div
        className="flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] shadow-xl"
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
              style={{ background: "rgba(255,122,26,0.14)", color: "#FF7A1A" }}
            >
              {FORMAT_LABELS[format]}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ background: "var(--bg2)", color: "var(--txt2)" }}
            >
              {FORM_LABELS[tab]}
            </span>
          </div>
        </div>

        {/* Tabs — linha única, sem quebra */}
        <div className="shrink-0 border-b border-[var(--bdr)] px-2 py-2">
          <div className="flex flex-nowrap items-center gap-0.5" style={{ whiteSpace: "nowrap" }}>
            {FORM_ORDER.map((f) => {
              const active = tab === f;
              return (
                <button
                  key={f}
                  onClick={() => setTab(f)}
                  className="flex h-7 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2 text-[10px] font-semibold transition-all"
                  style={
                    active
                      ? { background: "#FF7A1A", color: "#FFFFFF", boxShadow: "0 2px 6px rgba(255,122,26,0.35)" }
                      : { background: "transparent", color: "var(--txt2)" }
                  }
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--txt)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--txt2)";
                  }}
                >
                  {FORM_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll dos campos */}
        <div className="flex-1 overflow-y-auto p-4">
          {!currentTemplate && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ImageIcon size={24} className="text-[var(--txt3)]" />
              <div className="text-[12px] text-[var(--txt3)]">
                Nenhum template de <strong>{FORM_LABELS[tab]}</strong> para <strong>{FORMAT_LABELS[format]}</strong>.
              </div>
            </div>
          )}

          {currentTemplate && (
            <div className="flex flex-col gap-4">
              {(tab === "pacote" || tab === "campanha") && (
                <>
                  <Section title="Destino & Saída">
                    <Combobox label="Destino *" value={values.destino || ""} onChange={(v) => setField("destino", v.toUpperCase())} onBlur={onDestinoBlur} loader={loadDestinos} placeholder="Ex.: CANCÚN" />
                    <Row2>
                      <Field label="Saída">
                        <TextInput value={values.saida || ""} onChange={(v) => setField("saida", v)} placeholder="Guarulhos" />
                      </Field>
                      <Field label="Tipo de voo">
                        <Select value={values.tipovoo || "Voo Direto"} onChange={(v) => setField("tipovoo", v)} options={["Voo Direto", "Conexão"]} />
                      </Field>
                    </Row2>
                  </Section>

                  <Section title="Datas">
                    <Row2>
                      <Field label="Data ida">
                        <DateInput value={values.dataida || ""} min={hoje} onChange={setDateIda} />
                      </Field>
                      <Field label="Data volta">
                        <DateInput value={values.datavolta || ""} min={hoje} onChange={setDateVolta} onBlur={blurDateVolta} />
                      </Field>
                    </Row2>
                    {values.noites && parseInt(values.noites) > 0 && (
                      <div className="text-[10px] text-[var(--txt3)]">
                        Duração: <span className="font-bold text-[var(--txt2)]">{values.noites} noite{parseInt(values.noites) === 1 ? "" : "s"}</span>
                      </div>
                    )}
                    <Field label="Feriado">
                      <Select value={values.feriado || ""} onChange={(v) => setField("feriado", v)} options={["", ...FERIADOS_FIXOS]} />
                    </Field>
                  </Section>

                  <Section title="Hotel">
                    <Combobox label="Nome do hotel" value={values.hotel || ""} onChange={(v) => setField("hotel", v)} onBlur={onHotelBlur} loader={loadHoteis} placeholder="Nome do hotel" />
                  </Section>

                  <Section title="Serviços inclusos" defaultOpen={false}>
                    <ServicosBlock values={values} setField={setField} count={6} />
                  </Section>

                  <Section title="Selos" defaultOpen={false}>
                    <div className="grid grid-cols-3 gap-1.5">
                      <BadgeBtn label="Última chamada" on={!!badges.ultima_chamada_badge} onClick={() => setBadge("ultima_chamada_badge", !badges.ultima_chamada_badge)} />
                      <BadgeBtn label="Últimos lugares" on={!!badges.ultimos_lugares_badge} onClick={() => setBadge("ultimos_lugares_badge", !badges.ultimos_lugares_badge)} />
                      <BadgeBtn label="Ofertas" on={!!badges.ofertas_azul_badge} onClick={() => setBadge("ofertas_azul_badge", !badges.ofertas_azul_badge)} />
                    </div>
                  </Section>

                  <Section title="Pagamento">
                    <Field label="Forma de pagamento">
                      <Select
                        value={values.formapagamento || FORMA_PGTO_OPTS[0]}
                        onChange={(v) => setField("formapagamento", v)}
                        options={FORMA_PGTO_OPTS}
                      />
                    </Field>
                    <Row2>
                      <Field label="Parcelas">
                        <Select value={values.parcelas || ""} onChange={(v) => setField("parcelas", v)} options={["", ...PARCELAS_OPTS]} />
                      </Field>
                      <Field label="Valor parcela">
                        <TextInput value={values.valorparcela || ""} inputMode="decimal" onChange={(v) => setField("valorparcela", v)} placeholder="R$ 0,00" />
                      </Field>
                    </Row2>
                    <Row2>
                      <Field label="% Desconto">
                        <Select value={values.desconto || ""} onChange={(v) => setField("desconto", v)} options={DESCONTO_OPTS} />
                      </Field>
                      <Field label="Total">
                        <TextInput value={values.totalduplo || ""} inputMode="decimal" onChange={(v) => setField("totalduplo", v)} placeholder="R$ 0,00" />
                      </Field>
                    </Row2>
                  </Section>
                </>
              )}

              {tab === "passagem" && (
                <>
                  <Section title="Destino & Saída">
                    <Combobox label="Destino *" value={values.destino || ""} onChange={(v) => setField("destino", v.toUpperCase())} onBlur={onDestinoBlur} loader={loadDestinos} placeholder="Ex.: LISBOA" />
                    <Row2>
                      <Field label="Saída"><TextInput value={values.saida || ""} onChange={(v) => setField("saida", v)} placeholder="Guarulhos" /></Field>
                      <Field label="Tipo de voo">
                        <Select value={values.tipovoo || "Voo Direto"} onChange={(v) => setField("tipovoo", v)} options={["Voo Direto", "Conexão"]} />
                      </Field>
                    </Row2>
                  </Section>
                  <Section title="Datas">
                    <Row2>
                      <Field label="Data ida">
                        <DateInput value={values.dataida || ""} min={hoje} onChange={setDateIda} />
                      </Field>
                      <Field label="Data volta">
                        <DateInput value={values.datavolta || ""} min={hoje} onChange={setDateVolta} onBlur={blurDateVolta} />
                      </Field>
                    </Row2>
                  </Section>
                  <Section title="Serviços inclusos" defaultOpen={false}>
                    <ServicosBlock values={values} setField={setField} count={3} />
                  </Section>
                  <Section title="Pagamento">
                    <Row2>
                      <Field label="Parcelas">
                        <Select value={values.parcelas || ""} onChange={(v) => setField("parcelas", v)} options={["", ...PARCELAS_OPTS]} />
                      </Field>
                      <Field label="Valor parcela">
                        <TextInput value={values.valorparcela || ""} inputMode="decimal" onChange={(v) => setField("valorparcela", v)} placeholder="R$ 0,00" />
                      </Field>
                    </Row2>
                  </Section>
                </>
              )}

              {tab === "cruzeiro" && (
                <>
                  <Section title="Navio">
                    <Combobox label="Nome do navio *" value={values.navio || ""} onChange={(v) => setField("navio", v)} onBlur={onNavioBlur} loader={loadNavios} placeholder="Ex.: COSTA DELICIOZA" />
                  </Section>
                  <Section title="Datas">
                    <Row2>
                      <Field label="Embarque">
                        <DateInput value={values.dataida || ""} min={hoje} onChange={setDateIda} />
                      </Field>
                      <Field label="Desembarque">
                        <DateInput value={values.datavolta || ""} min={hoje} onChange={setDateVolta} onBlur={blurDateVolta} />
                      </Field>
                    </Row2>
                    {values.noites && parseInt(values.noites) > 0 && (
                      <div className="text-[10px] text-[var(--txt3)]">
                        Duração: <span className="font-bold text-[var(--txt2)]">{values.noites} noite{parseInt(values.noites) === 1 ? "" : "s"}</span>
                      </div>
                    )}
                  </Section>
                  <Section title="Itinerário">
                    <Field label="Roteiro">
                      <TextArea value={values.itinerario || ""} onChange={(v) => setField("itinerario", v)} rows={3} placeholder="Porto de Santos → Rio → Ilhabela..." />
                    </Field>
                    <Field label="Incluso (opcional)">
                      <TextArea value={values.incluso || ""} onChange={(v) => setField("incluso", v)} rows={2} />
                    </Field>
                  </Section>
                  <Section title="Pagamento">
                    <Field label="Forma de pagamento">
                      <Select
                        value={values.formapagamento || FORMA_PGTO_OPTS[0]}
                        onChange={(v) => setField("formapagamento", v)}
                        options={FORMA_PGTO_OPTS}
                      />
                    </Field>
                    <Row2>
                      <Field label="Parcelas">
                        <Select value={values.parcelas || ""} onChange={(v) => setField("parcelas", v)} options={["", ...PARCELAS_OPTS]} />
                      </Field>
                      <Field label="Valor parcela">
                        <TextInput value={values.valorparcela || ""} inputMode="decimal" onChange={(v) => setField("valorparcela", v)} placeholder="R$ 0,00" />
                      </Field>
                    </Row2>
                    <Row2>
                      <Field label="% Desconto">
                        <Select value={values.desconto || ""} onChange={(v) => setField("desconto", v)} options={DESCONTO_OPTS} />
                      </Field>
                      <Field label="Total cruzeiro">
                        <TextInput value={values.totalcruzeiro || ""} inputMode="decimal" onChange={(v) => setField("totalcruzeiro", v)} placeholder="R$ 0,00" />
                      </Field>
                    </Row2>
                  </Section>
                </>
              )}

              {tab === "anoiteceu" && (
                <>
                  <Section title="Promoção">
                    <Field label="% Desconto">
                      <Select value={values.desconto || ""} onChange={(v) => setField("desconto", v)} options={DESCONTO_OPTS.slice(1)} />
                    </Field>
                  </Section>
                  <Section title="Período da campanha">
                    <Row2>
                      <Field label="Início">
                        <input
                          type="datetime-local" value={values.inicio || ""}
                          onChange={(e) => setDateInicio(e.target.value)}
                          className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none"
                        />
                      </Field>
                      <Field label="Fim">
                        <input
                          type="datetime-local" value={values.fim || ""}
                          onChange={(e) => setDateFim(e.target.value)}
                          onBlur={blurDateFim}
                          className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none"
                        />
                      </Field>
                    </Row2>
                    <Field label="Para viagens até">
                      <DateInput value={values.paraviagens || ""} min={hoje} onChange={(v) => setField("paraviagens", v)} />
                    </Field>
                  </Section>
                </>
              )}

              {/* Legenda — só em Reels e Feed */}
              {(format === "reels" || format === "feed") && (
                <div className="border-t border-[var(--bdr)] pt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                      Legenda Instagram
                    </label>
                    <button
                      onClick={generateCaption}
                      disabled={generatingCaption}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#FF7A1A] hover:underline disabled:opacity-50"
                    >
                      {generatingCaption ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      Gerar IA
                    </button>
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
                              ? { borderColor: "#FF7A1A", background: "rgba(255,122,26,0.12)", color: "#FF7A1A" }
                              : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                          }
                        >
                          <span
                            className="flex h-3 w-3 items-center justify-center rounded border"
                            style={active ? { borderColor: "#FF7A1A", background: "#FF7A1A" } : { borderColor: "var(--bdr2)" }}
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
                visible={formatVisible}
                current={format}
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
                    className="flex items-center justify-center gap-1 rounded-lg border border-[rgba(34,211,153,0.2)] bg-[rgba(34,211,153,0.06)] px-3 py-2 text-[11px] font-semibold text-[#22D399] transition-colors hover:bg-[rgba(34,211,153,0.12)] disabled:opacity-50"
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
                    style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
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
      <div className="card-glass relative flex flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <h3 className="text-[14px] font-bold text-[var(--txt)]">Preview ao vivo</h3>
          <div className="text-[10px] text-[var(--txt3)] tabular-nums">
            {width}×{height}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-5">
          {currentTemplate ? (
            <PreviewStage
              key={`${tab}-${format}-${currentTemplate.key}`}
              schema={schema}
              width={width}
              height={height}
              values={values}
              maxDisplay={560}
              onReady={(s) => { stageRef.current = s; }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <ImageIcon size={32} className="text-[var(--txt3)]" />
              <div className="text-[12px] text-[var(--txt3)]">
                Sem template {FORM_LABELS[tab]} / {FORMAT_LABELS[format]}
              </div>
            </div>
          )}
        </div>
        {/* Format pills flutuantes */}
        <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--bdr)] bg-[var(--bg1)] p-1 shadow-xl">
            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => {
              const active = format === f;
              return (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={
                    active
                      ? { background: "#D4A843", color: "#060B16" }
                      : { color: "var(--txt3)" }
                  }
                >
                  {FORMAT_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>
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
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[#FF7A1A] focus:outline-none"
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
      className="w-full resize-none rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[#FF7A1A] focus:outline-none"
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
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11.5px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none"
    />
  );
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2 text-[11.5px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none"
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
  values, setField, count,
}: { values: Record<string, string>; setField: (k: string, v: string) => void; count: number }) {
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
                placeholder={`Serviço ${n}`}
                className="h-7 flex-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[11px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[#FF7A1A] focus:outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyCounter({
  posts, limits, visible, current,
}: {
  posts: PostsByFormat;
  limits: FormatLimits;
  visible: FormatVisibility;
  current: Format;
}) {
  const FORMATS: { key: Format; label: string }[] = [
    { key: "stories", label: "Stories" },
    { key: "feed", label: "Feed" },
    { key: "reels", label: "Reels" },
    { key: "tv", label: "TV" },
  ];
  const visibleFormats = FORMATS.filter((f) => visible[f.key]);
  if (visibleFormats.length === 0) return null;

  return (
    <div className="border-t border-[var(--bdr)] pt-4">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        Posts de hoje
      </label>
      <div className="flex flex-col gap-1.5">
        {visibleFormats.map(({ key, label }) => {
          const count = posts[key] || 0;
          const max = limits[key]; // null = ilimitado, 0 = escondido (já filtrado acima)
          const unlimited = max === null;
          const pct = !unlimited && max && max > 0 ? Math.min(100, (count / max) * 100) : 0;
          const danger = !unlimited && max !== null && count >= max;
          const warn = !unlimited && max !== null && max > 0 && count >= max * 0.8;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-10 text-[9px] font-bold uppercase text-[var(--txt3)]">{label}</span>
              <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[var(--bg2)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: unlimited ? "0%" : `${pct}%`,
                    background: danger ? "#EF4444" : warn ? "#F59E0B" : "#D4A843",
                  }}
                />
              </div>
              <span
                className="w-14 text-right text-[9px] font-bold tabular-nums"
                style={{ color: danger ? "#EF4444" : "var(--txt3)" }}
              >
                {unlimited ? `${count} ∞` : `${count}/${max}`}
              </span>
              {key === current && <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A1A]" />}
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
  onBlur?: () => void;
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
    setTimeout(() => onBlur?.(), 0);
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
          className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] pl-7 pr-3 text-[11.5px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[#FF7A1A] focus:outline-none"
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
                  ? { background: "rgba(255,122,26,0.12)", color: "#FF7A1A" }
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

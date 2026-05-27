"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { useFormAdapter } from "@/components/publish/useFormAdapter";
import {
  PacoteForm,
  CardWhatsAppForm,
  AnoiteceuForm,
  PassagemForm,
  CruzeiroForm,
  LaminaForm,
} from "@/components/publish/FormSections";
import { getFeatures, type Feature } from "@/lib/features";
import {
  Plane,
  Target,
  Ticket,
  Ship,
  Moon,
  MessageSquare,
  ArrowLeft,
  Smartphone,
  Play,
  Square,
  Tv,
  LayoutGrid,
} from "lucide-react";
import { useStoreTargets } from "./useStoreTargets";
import { usePublishLogic } from "./usePublishLogic";
import { PublishFooter } from "./PublishFooter";

const PreviewStage = dynamic(
  () => import("@/components/publish/SharedPreviewStage"),
  { ssr: false }
);

type FormType =
  | "pacote"
  | "campanha"
  | "passagem"
  | "cruzeiro"
  | "anoiteceu"
  | "card_whatsapp"
  | "lamina"
  | "tv";
type Format = "stories" | "feed" | "reels" | "tv";

const TIPOS = [
  {
    id: "pacote" as FormType,
    Icon: Plane,
    nome: "Pacote",
    desc: "Roteiro com hotel e serviços",
    color: "var(--brand-primary)",
  },
  {
    id: "campanha" as FormType,
    Icon: Target,
    nome: "Campanha",
    desc: "Promoções e ofertas especiais",
    color: "#e05c1a",
  },
  {
    id: "passagem" as FormType,
    Icon: Ticket,
    nome: "Passagem",
    desc: "Só a passagem aérea",
    color: "#7c3aed",
  },
  {
    id: "cruzeiro" as FormType,
    Icon: Ship,
    nome: "Cruzeiro",
    desc: "Roteiro marítimo completo",
    color: "#0891b2",
  },
  {
    id: "anoiteceu" as FormType,
    Icon: Moon,
    nome: "Anoiteceu",
    desc: "Última chamada do dia",
    color: "#4f46e5",
  },
  {
    id: "card_whatsapp" as FormType,
    Icon: MessageSquare,
    nome: "Card WhatsApp",
    desc: "Arte para grupos e listas",
    color: "#16a34a",
  },
  {
    id: "lamina" as FormType,
    Icon: LayoutGrid,
    nome: "Lâmina 4 Dest.",
    desc: "Arte com 4 destinos",
    color: "#d97706",
    feature: "lamina",
  },
  {
    id: "tv" as FormType,
    Icon: Tv,
    nome: "TV",
    desc: "Arte para televisão 16:9",
    color: "#0891b2",
    feature: "tv",
  },
];

const FORMAT_DIMS: Record<Format, [number, number]> = {
  stories: [1080, 1920],
  feed: [1080, 1350],
  reels: [1080, 1920],
  tv: [1920, 1080],
};
const FORMAT_LABELS: Record<Format, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};
const DEFAULTS = {
  formapagamento: "cartao",
  tipovoo: "( Voo Direto )",
  tipohospedagem: "Hotel",
};

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
function slugify(s: string) {
  return normalizar(s)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
function proximaImagem(key: string, urls: string[]): string {
  if (!urls.length) return "";
  try {
    const i = localStorage.getItem("img_idx_" + key);
    const idx = i ? (parseInt(i) + 1) % urls.length : 0;
    localStorage.setItem("img_idx_" + key, String(idx));
    return urls[idx];
  } catch {
    return urls[0];
  }
}
function capitalizeBR(s: string) {
  const skip = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "a",
    "o",
    "as",
    "os",
  ]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || !skip.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface TemplateRow {
  id: string;
  name: string;
  formType: FormType;
  format: Format;
  schema: any;
  width: number;
  height: number;
  thumbnail_url: string | null;
}

interface PublicarPageBaseProps {
  role: "cliente" | "gerente" | "consultor";
  enablePublishing: boolean;
  getNomeLoja: (
    profile: FullProfile,
    selectedTargetIds: string[],
    publishTargets: { id: string; name: string }[]
  ) => string | undefined;
}

interface UserPerms {
  allowed_forms: string[];
  store_ids: string[];
  can_publish: boolean;
  can_download: boolean;
}

export default function PublicarPageBase({
  role,
  enablePublishing,
  getNomeLoja,
}: PublicarPageBaseProps) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [userPerms, setUserPerms] = useState<UserPerms | null>(null);
  const [permsLoaded, setPermsLoaded] = useState(false);
  const [previewBgUrl, setPreviewBgUrl] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [postCounts, setPostCounts] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [postLimits, setPostLimits] = useState({ stories: 0, feed: 0, reels: 0, tv: 0 });
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");
  const [phase, setPhase] = useState<"selector" | "form">("selector");
  const [animOut, setAnimOut] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [formCache, setFormCache] = useState<
    Record<FormType, Record<string, string>>
  >({
    pacote: { ...DEFAULTS },
    campanha: { ...DEFAULTS },
    passagem: { ...DEFAULTS },
    cruzeiro: { ...DEFAULTS },
    anoiteceu: { ...DEFAULTS },
    card_whatsapp: { ...DEFAULTS },
    lamina: { ...DEFAULTS },
    tv: { ...DEFAULTS },
  });
  const [badgeCache, setBadgeCache] = useState<
    Record<FormType, Record<string, boolean>>
  >({
    pacote: {},
    campanha: {},
    passagem: {},
    cruzeiro: {},
    anoiteceu: {},
    card_whatsapp: {},
    lamina: {},
    tv: {},
  });
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [reelsFile, setReelsFile] = useState<File | null>(null);
  const [reelsVideoUrl, setReelsVideoUrl] = useState<string | null>(null);
  const [reelsUploadProgress, setReelsUploadProgress] = useState<number | null>(null);
  const [reelsUploading, setReelsUploading] = useState(false);
  const [reelsError, setReelsError] = useState<string | null>(null);
  const destinoDataRef = useRef<{ nome: string; url: string }[] | null>(null);
  const hotelDataRef = useRef<{ nome: string; url: string }[] | null>(null);
  // Cache: destino slug → URL já sorteada. Evita re-sorteio em re-renders.
  const resolvedDestinoImgRef = useRef<Record<string, string>>({});
  const lastDestinoRef = useRef<string>("");
  const lastHotelRef = useRef<string>("");
  const destinoImgRef = useRef<string>("");  // URL resolvida para o destino atual
  const hotelImgRef = useRef<string>("");    // URL resolvida para o hotel atual (prioridade)
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  // Função para limpar formulário
  const handleClear = useCallback(() => {
    setFormCache((c) => ({ ...c, [tab]: { ...DEFAULTS } }));
    setBadgeCache((c) => ({ ...c, [tab]: {} }));
  }, [tab]);

  // Hooks customizados
  const { publishTargets, selectedTargetIds, toggleTarget } =
    useStoreTargets(profile);
  const {
    busy,
    status,
    statusMsg,
    stageRef,
    handleDownload,
    handlePublishDrive,
    handlePublish,
  } = usePublishLogic(enablePublishing, handleClear);

  function movePill(btn: HTMLButtonElement) {
    const wrap = tabsWrapRef.current;
    const pill = pillRef.current;
    if (!wrap || !pill) return;
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    pill.style.left = br.left - wr.left + wrap.scrollLeft + "px";
    pill.style.width = br.width + "px";
  }


  useEffect(() => {
    const wrap = tabsWrapRef.current;
    if (!wrap) return;
    setTimeout(() => {
      const activeBtn = wrap.querySelector(
        `button[data-active="true"]`
      ) as HTMLButtonElement;
      if (activeBtn) movePill(activeBtn);
    }, 300);
  }, [tab, phase]);

  useEffect(() => {
    getProfile(supabase).then(async (p) => {
      setProfile(p);
      // await antes do render: garante que features (incluindo TV) estejam prontas
      try {
        const feats = await getFeatures(supabase, p);
        setFeatures(new Set(feats));
      } catch {}
      if (p?.licensee_id) {
        loadTemplates(p.licensee_id, p.store_id ?? null);
        supabase.from("system_config").select("value").eq("key", `preview_bg_${p.licensee_id}`).single().then(({ data }) => {
          if (data?.value) setPreviewBgUrl(data.value);
        });
      }

      // Buscar permissões do usuário
      try {
        if (p?.id) {
          const { data: perms } = await supabase
            .from("user_permissions")
            .select("allowed_forms,store_ids,can_publish,can_download")
            .eq("user_id", p.id)
            .maybeSingle();
          if (perms) {
            setUserPerms({
              allowed_forms: perms.allowed_forms ?? [],
              store_ids: perms.store_ids ?? [],
              can_publish: perms.can_publish ?? true,
              can_download: perms.can_download ?? true,
            });
          }
        }
      } finally {
        // Sempre marcar como carregado, mesmo se der erro ou não houver permissões
        setPermsLoaded(true);
      }

      // Buscar contadores de posts do mês atual
      if (p?.id) {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        try {
          const { data: logs } = await supabase
            .from("activity_logs")
            .select("metadata")
            .gte("created_at", inicioMes.toISOString())
            .in("event_type", ["post_instagram", "post_scheduled"]);

          const counts = { stories: 0, feed: 0, reels: 0, tv: 0 };
          (logs ?? []).forEach((log: any) => {
            if (log.metadata?.licensee_id === p.licensee_id) {
              const fmt = log.metadata?.format as Format;
              if (fmt && fmt in counts) counts[fmt]++;
            }
          });
          setPostCounts(counts);
        } catch (err) {
          console.error("[Post counts]", err);
        }

        // Buscar limites do plano
        try {
          const { data: limits } = await supabase
            .from("profiles")
            .select("stories_limit, feed_limit, reels_limit, tv_limit")
            .eq("id", p.id)
            .single();

          if (limits) {
            setPostLimits({
              stories: limits.stories_limit ?? 0,
              feed: limits.feed_limit ?? 0,
              reels: limits.reels_limit ?? 0,
              tv: limits.tv_limit ?? 0,
            });
          }
        } catch (err) {
          console.error("[Post limits]", err);
        }
      }
    });
    Promise.all([
      supabase.from("feriados").select("nome").order("nome"),
      supabase.from("badges").select("nome").eq("categoria", "feriado").order("nome"),
    ]).then(([feriadosRes, badgesRes]) => {
      const nomes = new Set<string>();
      (feriadosRes.data ?? []).forEach((r: any) => nomes.add(r.nome));
      (badgesRes.data ?? []).forEach((r: any) => nomes.add(r.nome));
      setFeriados([...nomes].sort());
    });
  }, []);

  async function loadTemplates(lid: string, storeId: string | null) {
    setTemplatesLoading(true);
    // Busca template_keys permitidos para este licensee/store
    let accessQuery = supabase
      .from("template_access")
      .select("template_key")
      .eq("licensee_id", lid);
    if (storeId) {
      accessQuery = accessQuery.or(`store_id.eq.${storeId},store_id.is.null`);
    }
    const { data: accessData } = await accessQuery;
    const keys = ((accessData ?? []) as { template_key: string }[])
      .map(r => r.template_key)
      .filter(Boolean);

    if (!keys.length) { setTemplates([]); setTemplatesLoading(false); return; }

    const { data } = await supabase
      .from("form_templates")
      .select("id, config_key, name, form_type, format, schema, width, height, is_base, active, licensee_id, thumbnail_url, deleted_at")
      .in("config_key", keys)
      .eq("active", true)
      .is("deleted_at", null)
      .order("form_type")
      .order("format")
      .order("name");
    if (data) {
      // [DEBUG] ETAPA 1 — raw do banco (form_templates.schema, campo JSONB)
      data.forEach((r: any) => {
        if (r.name === "Pacote Base") {
          const el = r.schema?.elements?.find((e: any) => e.bindParam === "valorint");
          console.log('[ETAPA-1 DB raw]', r.name, el ? { fontStyle: el.fontStyle, fontWeight: el.fontWeight } : 'valorint not found');
        }
      });
      const mapped = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        formType: r.form_type || "pacote",
        format: r.format || "stories",
        schema: r.schema || {
          elements: [],
          background: "#0E1520",
          duration: 5,
        },
        width: r.width || FORMAT_DIMS[r.format as Format]?.[0] || 1080,
        height: r.height || FORMAT_DIMS[r.format as Format]?.[1] || 1920,
        thumbnail_url: r.thumbnail_url || null,
      }));
      // [DEBUG] ETAPA 2 — após mapeamento (TemplateRow[])
      mapped.forEach((t: any) => {
        if (t.name === "Pacote Base") {
          const el = t.schema?.elements?.find((e: any) => e.bindParam === "valorint");
          console.log('[ETAPA-2 mapped]', t.name, el ? { fontStyle: el.fontStyle, fontWeight: el.fontWeight } : 'valorint not found');
        }
      });
      setTemplates(mapped);
      setTemplatesLoading(false);
    }
  }

  async function loadDestinoData() {
    if (destinoDataRef.current) return destinoDataRef.current;
    const { data } = await supabase
      .from("imgfundo")
      .select("nome,url")
      .neq("tipo", "card")
      .order("nome")
      .limit(1000);
    destinoDataRef.current = (data ?? []) as { nome: string; url: string }[];
    return destinoDataRef.current;
  }

  async function loadHotelData() {
    if (hotelDataRef.current) return hotelDataRef.current;
    const { data } = await supabase
      .from("imghotel")
      .select("nome,url")
      .limit(1000);
    hotelDataRef.current = (data ?? []) as { nome: string; url: string }[];
    return hotelDataRef.current;
  }

  async function fetchImgFundo(destino: string) {
    console.log("[fetchImgFundo] destino recebido:", destino);
    const rows = await loadDestinoData();
    const t = normalizar(destino);
    const m = rows.filter((r) => normalizar(r.nome) === t);
    if (!m.length) {
      console.log("[fetchImgFundo] nenhuma linha encontrada para:", t);
      return null;
    }
    const result = proximaImagem(
      "dest_" + slugify(destino),
      m.map((r) => r.url)
    );
    console.log("[fetchImgFundo] resultado:", result);
    return result;
  }

  async function fetchImgHotel(hotel: string) {
    console.log("[fetchImgHotel] hotel recebido:", hotel);
    const rows = await loadHotelData();
    console.log("[fetchImgHotel] total rows carregadas:", rows.length);
    const t = normalizar(hotel);
    const m = rows.filter((r) => normalizar(r.nome) === t);
    if (!m.length) {
      console.log("[fetchImgHotel] nenhum match para:", t, "— primeiros nomes:", rows.slice(0, 5).map(r => normalizar(r.nome)));
      return null;
    }
    console.log("[fetchImgHotel] match encontrado:", m.length, "registro(s)");
    const result = proximaImagem(
      "hotel_" + slugify(hotel),
      m.map((r) => r.url)
    );
    console.log("[fetchImgHotel] resultado:", result);
    return result;
  }

  async function loadDestinos(q: string = "") {
    const rows = await loadDestinoData();
    let nomes = [...new Set(rows.map((r) => r.nome))];

    // Ordenar por frequência de uso em publication_history
    if (profile?.licensee_id) {
      try {
        const { data: stats } = await supabase
          .from("publication_history")
          .select("template_nome")
          .eq("licensee_id", profile.licensee_id)
          .not("template_nome", "is", null);

        if (stats && stats.length > 0) {
          // Extrair destinos dos nomes de templates (formato: "DESTINO - ...")
          const destFreq: Record<string, number> = {};
          stats.forEach((s) => {
            const match = s.template_nome?.match(/^([^-]+)/);
            if (match) {
              const dest = match[1].trim().toUpperCase();
              destFreq[dest] = (destFreq[dest] || 0) + 1;
            }
          });

          // Ordenar: mais frequentes primeiro, depois alfabético
          nomes.sort((a, b) => {
            const freqA = destFreq[a.toUpperCase()] || 0;
            const freqB = destFreq[b.toUpperCase()] || 0;
            if (freqA !== freqB) return freqB - freqA;
            return a.localeCompare(b, "pt-BR");
          });
        }
      } catch (err) {
        console.error("Erro ao carregar estatísticas de destinos:", err);
      }
    }

    return nomes.filter((n) => normalizar(n).includes(normalizar(q)));
  }

  async function loadHoteis(q: string = "") {
    const rows = await loadHotelData();
    const seen = new Set<string>();
    return rows
      .map((r) => r.nome)
      .filter((n) => {
        const k = normalizar(n);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .filter((n) => normalizar(n).includes(normalizar(q)));
  }

  const setField = useCallback(
    (k: string, v: string) => {
      setFormCache((c) => ({ ...c, [tab]: { ...c[tab], [k]: v } }));
    },
    [tab]
  );

  const setBadge = useCallback(
    (k: string, v: boolean) => {
      setBadgeCache((c) => ({ ...c, [tab]: { ...c[tab], [k]: v } }));
    },
    [tab]
  );

  const values = formCache[tab] ?? DEFAULTS;
  const badges = badgeCache[tab] ?? {};

  const onImgFundo = useCallback(async (nome: string) => {
    if (!nome?.trim()) return;
    const elems = currentTemplateRef.current?.schema?.elements ?? [];
    const shouldFetch = elems.find((el: any) => el.bindParam === "destino")?.autoFetchImage !== false;
    if (!shouldFetch) return;
    if (lastDestinoRef.current === nome.trim()) return;
    lastDestinoRef.current = nome.trim();
    const url = await fetchImgFundo(nome);
    destinoImgRef.current = url ?? "";
    // Só aplica se hotel não tem imagem própria (hotel tem prioridade)
    if (!hotelImgRef.current) {
      if (url) setField("imgfundo", url);
    }
  }, [tab]);

  async function onHotelBlur(hotel?: string) {
    const h = (hotel ?? values.hotel)?.trim();
    if (!h) return;
    const hCap = capitalizeBR(h);
    if (hCap !== values.hotel) setField("hotel", hCap);
    const elems = currentTemplateRef.current?.schema?.elements ?? [];
    const shouldFetch = elems.find((el: any) => el.bindParam === "hotel")?.autoFetchImage !== false;
    if (!shouldFetch) return;
    if (lastHotelRef.current === h) return;
    lastHotelRef.current = h;
    const hUrl = await fetchImgHotel(h);
    if (hUrl) {
      hotelImgRef.current = hUrl;
      setField("imgfundo", hUrl);
    } else {
      hotelImgRef.current = "";
      if (destinoImgRef.current) setField("imgfundo", destinoImgRef.current);
    }
  }

  async function uploadReelsFileDirect(file: File) {
    setReelsUploading(true);
    setReelsUploadProgress(0);
    setReelsError(null);
    // Eager transform: Cloudinary pré-transcodifica durante o upload.
    // Instagram recebe uma URL de arquivo já pronto (não on-the-fly),
    // evitando timeout de download para vídeos grandes.
    const EAGER = "f_mp4,vc_h264:baseline,ac_aac,br_4000k";
    try {
      const signRes = await fetch("/api/cloudinary/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: `aurohubv2/reels/${profile?.licensee_id || "anon"}`,
          resource_type: "video",
          eager: EAGER,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.signature) throw new Error(signData.error || "Falha ao assinar upload");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", signData.api_key);
      fd.append("timestamp", String(signData.timestamp));
      fd.append("folder", signData.folder);
      fd.append("signature", signData.signature);
      fd.append("eager", EAGER);

      const cloudUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setReelsUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            // Prefer eager URL (pre-transcoded). Fallback to on-the-fly if eager not ready yet.
            const eagerUrl = data.eager?.[0]?.secure_url as string | undefined;
            const fallbackUrl = `https://res.cloudinary.com/${signData.cloud_name}/video/upload/f_mp4,vc_h264,ac_aac/${data.public_id}.mp4`;
            resolve(eagerUrl || fallbackUrl);
          } else {
            const err = (() => { try { return JSON.parse(xhr.responseText)?.error?.message; } catch { return null; } })();
            reject(new Error(err || "Upload falhou"));
          }
        };
        xhr.onerror = () => reject(new Error("Erro de rede no upload"));
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`);
        xhr.send(fd);
      });

      setReelsVideoUrl(cloudUrl);
      setReelsUploadProgress(100);
    } catch (err) {
      setReelsError(err instanceof Error ? err.message : "Erro no upload");
      setReelsVideoUrl(null);
    } finally {
      setReelsUploading(false);
    }
  }

  async function handleReelsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setReelsFile(file);
    setReelsVideoUrl(null);
    setReelsUploadProgress(null);
    setReelsError(null);
    if (!file) return;
    // Instagram limita 100MB para Reels via URL
    if (file.size > 100 * 1024 * 1024) {
      setReelsError("Vídeo muito grande. O Instagram aceita no máximo 100 MB.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      await uploadReelsFileDirect(file);
    }
    // ≤4MB: passed as-is (blob) to the queue on publish
  }

  const { fields, set, servicos, setServicos } = useFormAdapter({
    tab,
    values,
    badges,
    setField,
    setBadge,
  });

  // Derived from user_permissions — fall back to full lists when no restriction
  const visibleTipos = useMemo(() => {
    let tipos = TIPOS.filter(t => !(t as any).feature || features.has((t as any).feature));
    if (userPerms?.allowed_forms?.length) {
      tipos = tipos.filter(t => userPerms.allowed_forms.includes(t.id));
    }
    return tipos;
  }, [userPerms, features]);

  const effectivePublishTargets = useMemo(() => {
    if (!userPerms?.store_ids?.length) return publishTargets;
    return publishTargets.filter(t => userPerms!.store_ids.includes(t.id));
  }, [publishTargets, userPerms]);

  const effectiveSelectedTargetIds = useMemo(() => {
    if (!userPerms?.store_ids?.length) return selectedTargetIds;
    const filtered = selectedTargetIds.filter(id => userPerms!.store_ids.includes(id));
    if (filtered.length === 0 && effectivePublishTargets.length > 0) {
      return [effectivePublishTargets[0].id];
    }
    return filtered;
  }, [selectedTargetIds, userPerms, effectivePublishTargets]);

  // Auto-switch tab when perms restrict current tab
  useEffect(() => {
    if (userPerms?.allowed_forms?.length && !userPerms.allowed_forms.includes(tab)) {
      const first = visibleTipos[0];
      if (first) setTab(first.id);
    }
  }, [userPerms, visibleTipos, tab]);

  const previewValues = useMemo(() => {
    const m: Record<string, string> = { ...(values ?? {}) };
    for (const [k, v] of Object.entries(badges ?? {}))
      m[k] = v ? "true" : "";
    return m;
  }, [values, badges]);

  const availableTemplates = useMemo(() => {
    return templates.filter((t) => t.formType === tab && t.format === format);
  }, [templates, tab, format]);

  const needsTemplateSelection = useMemo(
    () => templatesLoading || (!selectedTemplateId && availableTemplates.length > 1),
    [templatesLoading, selectedTemplateId, availableTemplates]
  );

  const currentTemplate = useMemo(() => {
    if (selectedTemplateId)
      return templates.find((t) => t.id === selectedTemplateId);
    if (availableTemplates.length === 1) return availableTemplates[0];
    return templates.find((t) => t.formType === tab);
  }, [templates, tab, format, selectedTemplateId, availableTemplates]);

  const currentTemplateRef = useRef(currentTemplate);
  currentTemplateRef.current = currentTemplate;

  const templateBinds = useMemo(() => {
    const b = new Set<string>();
    if (!currentTemplate?.schema?.elements) return b;
    for (const el of currentTemplate.schema.elements) {
      if (el.bindParam) b.add(el.bindParam);
      if (el.imageBind) b.add(el.imageBind);
    }
    return b;
  }, [currentTemplate]);

  // Formatos que o usuário tem acesso pela feature (ADM vê todos; stories sempre disponível)
  const allowedFormats = useMemo((): Format[] => {
    const all: Format[] = ["stories", "reels", "feed", "tv"];
    if (profile?.role === "adm") return all;
    return all.filter(f => f === "stories" || features.has(f as Feature));
  }, [features, profile]);

  // Formatos com templates disponíveis, intersectados com os permitidos pela feature
  const visibleFormats = useMemo(() => {
    const s = new Set(
      templates.filter((t) => t.formType === tab).map((t) => t.format)
    );
    return allowedFormats.filter((f) => s.has(f));
  }, [templates, tab, allowedFormats]);

  // Auto-switch format when feature is revoked
  useEffect(() => {
    if (!allowedFormats.includes(format)) {
      setFormat(allowedFormats[0] ?? "stories");
    }
  }, [allowedFormats, format]);

  // Reset reels upload state when leaving reels format
  useEffect(() => {
    if (format !== "reels") {
      setReelsFile(null);
      setReelsVideoUrl(null);
      setReelsUploadProgress(null);
      setReelsUploading(false);
      setReelsError(null);
    }
  }, [format]);

  const schema = currentTemplate?.schema ?? {
    elements: [],
    background: "#0E1520",
    duration: 5,
  };
  // [DEBUG] ETAPA 3 — schema passado para <PreviewStage schema={schema}>
  if (currentTemplate?.name === "Pacote Base") {
    const el = schema?.elements?.find((e: any) => e.bindParam === "valorint");
    console.log('[ETAPA-3 schema prop]', currentTemplate.name, el ? { fontStyle: el.fontStyle, fontWeight: el.fontWeight } : 'valorint not found');
  }
  const [pw, ph] = FORMAT_DIMS[format];

  function goToForm(tipo: FormType) {
    // Auto-seleciona o formato disponível para o tipo (mesmo comportamento do switchTab)
    const fmts = templates.filter((x) => x.formType === tipo).map((x) => x.format);
    if (fmts.length && !fmts.includes(format)) setFormat(fmts[0] as Format);
    setAnimOut(true);
    setTimeout(() => {
      setTab(tipo);
      setSelectedTemplateId(null);
      setPhase("form");
      setAnimOut(false);
    }, 260);
  }

  function goBack() {
    setAnimOut(true);
    setTimeout(() => {
      setPhase("selector");
      setSelectedTemplateId(null);
      setAnimOut(false);
    }, 260);
  }

  function switchTab(t: FormType) {
    setTab(t);
    setSelectedTemplateId(null);
    const fmts = templates.filter((x) => x.formType === t).map((x) => x.format);
    if (fmts.length && !fmts.includes(format)) setFormat(fmts[0]);
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId(id);
  }

  function backToTemplateSelector() {
    setAnimOut(true);
    setTimeout(() => {
      setPhase("selector");
      setSelectedTemplateId(null);
      setAnimOut(false);
    }, 260);
  }

  // Carrega fontes necessárias pelo peso+tamanho exatos de cada elemento de texto,
  // depois força redesenho do canvas Konva.
  const loadRequiredFonts = useCallback(async (elements: any[]) => {
    // [DEBUG] ETAPA 4 — loadRequiredFonts (elemento valorint antes do batchDraw)
    const valorintEl = elements.find((e: any) => e.bindParam === "valorint");
    if (valorintEl) {
      console.log('[ETAPA-4 loadRequiredFonts]', { fontStyle: valorintEl.fontStyle, fontWeight: valorintEl.fontWeight });
    }
    const seen = new Set<string>();
    const fontPromises = elements
      .filter(el => el.type === "text" || el.type === "textbox")
      .flatMap(el => {
        const rawStyle = String(el.fontStyle || "");
        const wMatch = rawStyle.match(/\b(\d+)\b/);
        const weight = wMatch ? parseInt(wMatch[1], 10)
                              : rawStyle.includes("bold") ? 700 : 400;
        const family: string = el.fontFamily || "Helvetica Neue";
        const size: number = el.fontSize || 24;
        const key = `${weight}/${size}/${family}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [document.fonts.load(`${weight} ${size}px "${family}"`).catch(() => [])];
      });
    await Promise.all(fontPromises);
  }, []);

  useEffect(() => {
    if (!schema?.elements?.length) return;
    loadRequiredFonts(schema.elements).then(() => {
      stageRef.current?.batchDraw();
    });
  }, [schema, loadRequiredFonts]);

  // nomeLoja para PacoteForm
  const nomeLoja = getNomeLoja(profile!, effectiveSelectedTargetIds, effectivePublishTargets);

  // Guard: aguardar profile e permissões antes de qualquer render
  if (!profile || !permsLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--txt3)',
        fontSize: 13,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid var(--bdr)',
            borderTopColor: 'var(--accent, #D4A843)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          Carregando...
        </div>
      </div>
    );
  }

  // ===== SELEÇÃO DE TIPO =====
  if (phase === "selector")
    return (
      <div
        style={{
          padding: "24px",
          width: "100%",
          transition: "opacity .26s,transform .26s",
          opacity: animOut ? 0 : 1,
          transform: animOut ? "translateX(-24px)" : "translateX(0)",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--txt1)",
            marginBottom: "4px",
          }}
        >
          Publicar
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "var(--txt3)",
            marginBottom: "20px",
          }}
        >
          Escolha o tipo de arte para criar
        </p>
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--bdr)",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--brand-primary)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              {profile?.plan?.name || profile?.licensee?.plan || "—"}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--txt3)",
                marginTop: "1px",
              }}
            >
              Posts de hoje
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "24px" }}>
            {[
              { l: "Stories", k: "stories" as Format, c: "#3B9EFF" },
              { l: "Feed", k: "feed" as Format, c: "#F59E0B" },
              { l: "Reels", k: "reels" as Format, c: "#10B981" },
              { l: "TV", k: "tv" as Format, c: "#8B5CF6" },
            ].map((x) => {
              const limite = postLimits[x.k];
              const ilimitado = limite === 0;
              return (
                <div key={x.l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "21px",
                      fontWeight: 800,
                      color: x.c,
                      lineHeight: 1,
                    }}
                  >
                    {ilimitado ? "∞" : String(limite)}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "var(--txt3)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginTop: "2px",
                    }}
                  >
                    {x.l}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          {visibleTipos.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goToForm(t.id)}
              style={{
                background: "var(--bg2)",
                border: "1.5px solid var(--bdr)",
                borderRadius: "14px",
                padding: "18px 14px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "all .2s",
                animation: `fadeUp .3s ease ${i * 0.05}s both`,
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.color;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: t.color,
                }}
              />
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `color-mix(in srgb, ${t.color} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: t.color,
                }}
              >
                <t.Icon size={17} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--txt1)",
                  }}
                >
                  {t.nome}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--txt3)",
                    marginTop: "2px",
                    lineHeight: 1.4,
                  }}
                >
                  {t.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );

  // ===== SELEÇÃO DE TEMPLATE =====
  if (phase === "form" && needsTemplateSelection)
    return (
      <div
        style={{
          padding: "24px",
          width: "100%",
          transition: "opacity .26s",
          opacity: animOut ? 0 : 1,
        }}
      >
        <button
          onClick={backToTemplateSelector}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "var(--txt3)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 0",
            marginBottom: "16px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--txt1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--txt3)")}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--txt1)",
            marginBottom: "4px",
          }}
        >
          Escolher Template
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "var(--txt3)",
            marginBottom: "20px",
          }}
        >
          Selecione o template para {TIPOS.find((t) => t.id === tab)?.nome}{" "}
          {FORMAT_LABELS[format]}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {availableTemplates.map((tmpl, i) => {
            const isActive = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => selectTemplate(tmpl.id)}
                style={{
                  background: isActive ? "color-mix(in srgb, var(--brand-primary) 10%, var(--bg2))" : "var(--bg2)",
                  border: isActive ? "2px solid var(--brand-primary)" : "1.5px solid var(--bdr)",
                  borderRadius: "14px",
                  padding: "0",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "all .2s",
                  animation: `fadeUp .3s ease ${i * 0.05}s both`,
                  boxShadow: isActive ? "0 0 0 3px color-mix(in srgb, var(--brand-primary) 20%, transparent)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "var(--brand-primary)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "var(--bdr)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
              <div
                style={{
                  width: "100%",
                  height: "160px",
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {tmpl.schema?.thumbnail || (tmpl as any).thumbnail_url ? (
                  <img
                    src={
                      tmpl.schema?.thumbnail || (tmpl as any).thumbnail_url
                    }
                    alt={tmpl.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "32px", opacity: 0.2 }}>📄</span>
                )}
              </div>
              <div style={{ padding: "12px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--txt1)",
                    lineHeight: 1.3,
                  }}
                >
                  {tmpl.name}
                </div>
              </div>
            </button>
          );
          })}
        </div>
      </div>
    );

  // ===== FORMULÁRIO =====
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        transition: "opacity .26s",
        opacity: animOut ? 0 : 1,
      }}
    >
      {/* TOPNAV */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "56px",
          background: "var(--bg1)",
          borderBottom: "1px solid var(--bdr)",
          flexShrink: 0,
          padding: "0 12px",
          gap: "4px",
          overflowX: "auto",
        }}
      >
        <button
          onClick={goBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "var(--txt3)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 14px",
            borderRadius: "8px",
            flexShrink: 0,
            whiteSpace: "nowrap",
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--txt1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--txt3)")}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <div
          style={{
            width: "1px",
            height: "22px",
            background: "var(--bdr)",
            margin: "0 6px",
            flexShrink: 0,
          }}
        />
        <div
          ref={tabsWrapRef}
          data-tour="template-tabs"
          style={{
            position: "relative",
            background: "color-mix(in srgb, var(--brand-primary) 8%, var(--bg2))",
            borderRadius: "12px",
            padding: "3px",
            display: "flex",
            gap: "0",
            overflowX: "auto",
            scrollbarWidth: "none",
            flex: 1,
          }}
        >
          <div
            ref={pillRef}
            style={{
              position: "absolute",
              top: "3px",
              height: "calc(100% - 6px)",
              background:
                "linear-gradient(180deg,rgba(0,0,0,0.0) 0%,var(--bg1) 100%)",
              borderRadius: "9px",
              boxShadow:
                "0 0 0 0.5px var(--bdr),inset 0 1px 0 rgba(255,255,255,0.9),inset 0 -1px 0 rgba(0,0,0,0.04),0 1px 3px rgba(0,0,0,0.1)",
              transition:
                "left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
              zIndex: 0,
              overflow: "hidden",
            }}
          >
            <div
              id="pill-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2.5px",
                borderRadius: "2px 2px 0 0",
                background:
                  TIPOS.find((t) => t.id === tab)?.color ||
                  "var(--brand-primary)",
                transition: "background .28s",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "55%",
                background:
                  "linear-gradient(180deg,rgba(0,0,0,0.03) 0%,rgba(255,255,255,0) 100%)",
                borderRadius: "9px 9px 0 0",
                pointerEvents: "none",
              }}
            />
          </div>
          {visibleTipos.map((t) => (
            <button
              key={t.id}
              data-active={tab === t.id ? "true" : "false"}
              onClick={(e) => {
                switchTab(t.id);
                movePill(e.currentTarget);
                const bar = pillRef.current?.querySelector(
                  "#pill-bar"
                ) as HTMLElement | null;
                if (bar) bar.style.background = t.color;
              }}
              style={{
                position: "relative",
                zIndex: 1,
                padding: "5px 13px",
                borderRadius: "9px",
                border: "none",
                background: "transparent",
                fontSize: "11px",
                fontWeight: tab === t.id ? 600 : 500,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: tab === t.id ? "var(--brand-primary)" : "var(--txt3)",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
                transition: "color .2s, font-weight .2s",
                borderBottom:
                  tab === t.id ? "2px solid var(--brand-primary)" : "none",
              }}
            >
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* FORMULÁRIO - coluna esquerda */}
        <div
          style={{
            width: "300px",
            height: "100%",
            flexShrink: 0,
            background: "var(--bg1)",
            borderRight: "1px solid var(--bdr)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Scroll container - apenas formulários */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* Pills de formato */}
            {visibleFormats.length > 1 && (
            <div
              style={{
                padding: "14px 14px 0",
                borderBottom: "1px solid var(--bdr)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderRadius: "12px",
                  background: "var(--bg1)",
                  border: "1px solid var(--bdr)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  padding: "4px",
                }}
              >
                {visibleFormats.map((f) => {
                  const active = format === f;
                  const Icon =
                    f === "stories"
                      ? Smartphone
                      : f === "reels"
                      ? Play
                      : f === "feed"
                      ? Square
                      : Tv;
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        borderRadius: "8px",
                        padding: "8px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        border: "none",
                        cursor: "pointer",
                        transition: "all .15s",
                        background: active
                          ? "var(--brand-primary)"
                          : "transparent",
                        color: active ? "#fff" : "var(--txt3)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {active && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <Icon
                        size={13}
                        strokeWidth={2.5}
                        style={{ position: "relative", zIndex: 1 }}
                      />
                      <span style={{ position: "relative", zIndex: 1 }}>
                        {FORMAT_LABELS[f]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload de vídeo — apenas Reels */}
          {format === "reels" && (
            <div style={{ padding: "14px 14px 0" }}>
              <label
                style={{ fontSize: "11px", fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}
              >
                Vídeo do Reels
              </label>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                  background: "var(--bg2)", border: "1px dashed var(--bdr)", borderRadius: "8px",
                  padding: "10px 12px", fontSize: "12px", color: "var(--txt2)", transition: "border-color .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bdr)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {reelsFile ? reelsFile.name : "Selecionar vídeo (máx. 200 MB)"}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={handleReelsFileChange}
                />
              </label>
              {reelsUploading && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ height: "4px", background: "var(--bdr)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%", background: "var(--brand-primary)", borderRadius: "2px",
                        width: `${reelsUploadProgress ?? 0}%`, transition: "width .2s",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--txt3)", marginTop: "4px" }}>
                    Enviando... {reelsUploadProgress ?? 0}%
                  </div>
                </div>
              )}
              {!reelsUploading && reelsVideoUrl && (
                <div style={{ fontSize: "10px", color: "#10B981", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Vídeo pronto para publicar
                </div>
              )}
              {!reelsUploading && reelsFile && !reelsVideoUrl && !reelsError && (
                <div style={{ fontSize: "10px", color: "var(--txt3)", marginTop: "6px" }}>
                  Arquivo pequeno — será enviado ao publicar
                </div>
              )}
              {reelsError && (
                <div style={{ fontSize: "10px", color: "#EF4444", marginTop: "6px" }}>
                  {reelsError}
                </div>
              )}
            </div>
          )}

          {/* Formulários */}
          <div data-tour="formulario" style={{ padding: "14px" }}>
            {!currentTemplate ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--txt3)",
                  fontSize: "12px",
                }}
              >
                Nenhum template disponível para {tab}.
              </div>
            ) : tab === "pacote" ? (
              <PacoteForm
                fields={fields}
                set={set}
                servicos={servicos}
                setServicos={setServicos}
                today={new Date().toISOString().slice(0, 10)}
                feriadoOpts={feriados}
                loadDestinos={loadDestinos}
                loadHoteis={loadHoteis}
                onImgFundo={onImgFundo}
                onHotelBlur={onHotelBlur}
                binds={templateBinds}
                formato={format}
                nomeLoja={nomeLoja}
              />
            ) : tab === "card_whatsapp" ? (
              <CardWhatsAppForm
                fields={fields}
                set={set}
                today={new Date().toISOString().slice(0, 10)}
                binds={templateBinds}
              />
            ) : tab === "passagem" ? (
              <PassagemForm
                fields={fields}
                set={set}
                today={new Date().toISOString().slice(0, 10)}
                binds={templateBinds}
                formato={format}
                nomeLoja={nomeLoja}
                loadDestinos={loadDestinos}
                onImgFundo={onImgFundo}
              />
            ) : tab === "cruzeiro" ? (
              <CruzeiroForm
                fields={fields}
                set={set}
                today={new Date().toISOString().slice(0, 10)}
                binds={templateBinds}
                formato={format}
                nomeLoja={nomeLoja}
                onImgFundo={onImgFundo}
              />
            ) : tab === "anoiteceu" ? (
              <AnoiteceuForm
                fields={fields}
                set={set}
                binds={templateBinds}
              />
            ) : tab === "lamina" ? (
              <LaminaForm
                fields={fields}
                set={set}
                today={new Date().toISOString().slice(0, 10)}
                binds={templateBinds}
                formato={format}
                nomeLoja={nomeLoja}
                loadDestinos={loadDestinos}
                loadHoteis={loadHoteis}
              />
            ) : tab === "tv" ? (
              <PacoteForm
                fields={fields}
                set={set}
                servicos={servicos}
                setServicos={setServicos}
                today={new Date().toISOString().slice(0, 10)}
                feriadoOpts={feriados}
                loadDestinos={loadDestinos}
                loadHoteis={loadHoteis}
                onImgFundo={onImgFundo}
                onHotelBlur={onHotelBlur}
                binds={templateBinds}
                formato={format}
                nomeLoja={nomeLoja}
              />
            ) : (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--txt3)",
                  fontSize: "12px",
                }}
              >
                Formulário de {tab} em breve.
              </div>
            )}
          </div>
          </div>

          {/* Footer - fixo no fundo da coluna */}
          <PublishFooter
            role={role}
            enablePublishing={enablePublishing}
            format={format}
            publishTargets={effectivePublishTargets}
            selectedTargetIds={effectiveSelectedTargetIds}
            toggleTarget={toggleTarget}
            busy={busy}
            status={status}
            statusMsg={statusMsg}
            currentTemplate={currentTemplate}
            canPublish={userPerms ? userPerms.can_publish : true}
            canDownload={userPerms ? userPerms.can_download : true}
            onPublish={() =>
              handlePublish({
                profile,
                selectedTargetIds: effectiveSelectedTargetIds,
                publishTargets: effectivePublishTargets,
                currentTemplate,
                values,
                format,
                reelsVideoUrl: format === "reels" ? reelsVideoUrl : null,
                reelsFileBlob: format === "reels" && reelsFile && !reelsVideoUrl ? reelsFile : null,
              })
            }
            onPublishDrive={() =>
              handlePublishDrive({
                profile,
                selectedTargetIds: effectiveSelectedTargetIds,
                publishTargets: effectivePublishTargets,
                currentTemplate,
                values,
                format,
                formType: tab,
              })
            }
            onClear={handleClear}
            onDownload={() => handleDownload(currentTemplate)}
          />
        </div>

        {/* PREVIEW */}
        <div
          data-tour="preview"
          style={{
            flex: 1,
            background: previewBgUrl ? `url(${previewBgUrl}) center/cover` : "var(--bg0)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid var(--bdr)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--txt3)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              Preview ao vivo
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "var(--txt3)",
                background: "var(--bg2)",
                padding: "3px 8px",
                borderRadius: "6px",
                border: "1px solid var(--bdr)",
              }}
            >
              {pw} × {ph}
            </span>
          </div>
          {/* Área do preview */}
          <div
            ref={previewAreaRef}
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              paddingTop: "16px",
              paddingBottom: "16px",
            }}
          >
            <div
              style={{
                aspectRatio: `${pw} / ${ph}`,
                width: ph > pw ? "auto" : "100%",
                height: ph > pw ? "100%" : "auto",
                maxWidth: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <PreviewStage
                schema={schema}
                width={pw}
                height={ph}
                values={previewValues}
                onReady={
                  enablePublishing
                    ? (s: any) => {
                        stageRef.current = s;
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

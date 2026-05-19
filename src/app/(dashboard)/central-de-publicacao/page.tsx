"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Send, Sparkles, Upload, X, Check, Loader2, Image as ImageIcon,
  AtSign, AlertCircle,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Licensee {
  id: string;
  name: string;
  status: string;
}

interface Store {
  id: string;
  name: string;
  licensee_id: string;
  ig_user_id: string | null;
}

type FormatType = "stories" | "feed" | "reels" | "tv";
type StoreSelectMode = "loja" | "lojas" | "cliente";

type PublishStatus =
  | "idle"
  | "uploading"
  | "publishing"
  | "success"
  | "error";

/* ── Constantes ──────────────────────────────────── */

const FORMAT_META: Record<FormatType, { label: string; aspect: string; color: string }> = {
  stories: { label: "Stories", aspect: "9:16", color: "#A78BFA" },
  feed:    { label: "Feed",    aspect: "4:5",  color: "var(--orange)" },
  reels:   { label: "Reels",   aspect: "9:16", color: "#EC4899" },
  tv:      { label: "TV",      aspect: "16:9", color: "#3B82F6" },
};

/* ── Helpers ─────────────────────────────────────── */

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function detectFormat(width: number, height: number, isVideo: boolean): FormatType {
  if (!width || !height) return isVideo ? "reels" : "feed";
  const ratio = width / height;
  // Landscape (16:9)
  if (ratio >= 1.4) return "tv";
  // Quadrado ou retrato curto (4:5)
  if (ratio >= 0.75 && ratio <= 1.1) return "feed";
  // Retrato vertical (9:16)
  return isVideo ? "reels" : "stories";
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

function getVideoDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = dataUrl;
  });
}

/* ── Component ───────────────────────────────────── */

export default function CentralPublicacaoPage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLicenseeId, setSelectedLicenseeId] = useState<string>("");
  const [storeSelectMode, setStoreSelectMode] = useState<StoreSelectMode>("loja");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Upload state
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [mediaFormat, setMediaFormat] = useState<FormatType>("feed");
  const [mediaCloudinaryUrl, setMediaCloudinaryUrl] = useState<string | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pubType, setPubType] = useState<"stories" | "feed" | "reels" | "carrossel">("stories");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [caption, setCaption] = useState<string>("");
  const [tema, setTema] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [status, setStatus] = useState<PublishStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [postToIG, setPostToIG] = useState(true);
  const [postToFB, setPostToFB] = useState(false);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [licR, storeR] = await Promise.all([
        supabase.from("licensees").select("id, name, status").eq("status", "active").order("name"),
        supabase.from("stores").select("id, name, licensee_id, ig_user_id").order("name"),
      ]);
      setLicensees((licR.data ?? []) as Licensee[]);
      setStores((storeR.data ?? []) as Store[]);
    } catch (err) {
      console.error("[Central] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const licMap = useMemo(() => {
    const m: Record<string, Licensee> = {};
    for (const l of licensees) m[l.id] = l;
    return m;
  }, [licensees]);

  const storeMap = useMemo(() => {
    const m: Record<string, Store> = {};
    for (const s of stores) m[s.id] = s;
    return m;
  }, [stores]);

  const storesForLic = useMemo(() => {
    if (!selectedLicenseeId) return [];
    return stores.filter((s) => s.licensee_id === selectedLicenseeId);
  }, [stores, selectedLicenseeId]);

  const storesToPublish = useMemo(() => {
    if (!selectedLicenseeId) return [];
    if (storeSelectMode === "loja") return selectedStoreId ? [selectedStoreId] : [];
    if (storeSelectMode === "lojas") return selectedStoreIds;
    return storesForLic.map(s => s.id);
  }, [storeSelectMode, selectedStoreId, selectedStoreIds, storesForLic, selectedLicenseeId]);

  const canPublish =
    !!selectedLicenseeId &&
    !!mediaDataUrl &&
    !mediaUploading &&
    (!mediaIsVideo || !!mediaCloudinaryUrl) &&
    storesToPublish.length > 0 &&
    (postToIG || postToFB) &&
    status !== "uploading" &&
    status !== "publishing";

  /* ── Handlers ─────────────────────────────────── */

  function resetSelection() {
    if (mediaIsVideo && mediaDataUrl?.startsWith("blob:")) URL.revokeObjectURL(mediaDataUrl);
    setSelectedStoreId("");
    setSelectedStoreIds([]);
    setMediaDataUrl(null);
    setMediaFile(null);
    setMediaIsVideo(false);
    setMediaCloudinaryUrl(null);
    setMediaUploadProgress(null);
    setCaption("");
    setStatus("idle");
    setStatusMsg("");
  }

  function onLicenseeChange(id: string) {
    setSelectedLicenseeId(id);
    resetSelection();
  }

  function onStoreChange(id: string) {
    setSelectedStoreId(id);
    setStatus("idle");
    setStatusMsg("");
  }

  async function handleFile(file: File) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      setStatus("error");
      setStatusMsg("Formato não suportado. Envie imagem ou vídeo.");
      return;
    }
    try {
      if (isVideo) {
        // Object URL para preview — sem base64, sem dados no servidor
        const objectUrl = URL.createObjectURL(file);
        const dims = await getVideoDimensions(objectUrl);
        const detected = detectFormat(dims.width, dims.height, true);
        setMediaDataUrl(objectUrl);
        setMediaFile(file);
        setMediaIsVideo(true);
        setMediaFormat(detected);
        setMediaCloudinaryUrl(null);
        setStatus("idle");
        setStatusMsg("");
        // Upload imediato browser → Cloudinary (padrão uploadReelsFileDirect)
        await uploadVideoDirectly(file);
      } else {
        const dataUrl = await fileToDataURL(file);
        const dims = await getImageDimensions(dataUrl);
        const detected = detectFormat(dims.width, dims.height, false);
        setMediaDataUrl(dataUrl);
        setMediaFile(null);
        setMediaIsVideo(false);
        setMediaFormat(detected);
        setMediaCloudinaryUrl(null);
        setStatus("idle");
        setStatusMsg("");
      }
    } catch (err) {
      console.error("[Central] handleFile:", err);
      setStatus("error");
      setStatusMsg("Falha ao ler arquivo.");
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clearMedia() {
    if (mediaIsVideo && mediaDataUrl?.startsWith("blob:")) URL.revokeObjectURL(mediaDataUrl);
    setMediaDataUrl(null);
    setMediaFile(null);
    setMediaIsVideo(false);
    setMediaCloudinaryUrl(null);
    setMediaUploadProgress(null);
    setStatus("idle");
    setStatusMsg("");
  }

  // Padrão idêntico ao uploadReelsFileDirect em PublicarPageBase.tsx.
  // Upload vai browser → Cloudinary via XHR — nunca passa pelo servidor Vercel.
  async function uploadVideoDirectly(file: File) {
    setMediaUploading(true);
    setMediaUploadProgress(0);
    setMediaCloudinaryUrl(null);
    const EAGER = "f_mp4,vc_h264:baseline,ac_aac,br_4000k";
    try {
      const signRes = await fetch("/api/cloudinary/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: `aurohubv2/central/${selectedLicenseeId || "anon"}`,
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
          if (e.lengthComputable) setMediaUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            const eagerUrl = data.eager?.[0]?.secure_url as string | undefined;
            const fallback = `https://res.cloudinary.com/${signData.cloud_name}/video/upload/f_mp4,vc_h264,ac_aac/${data.public_id}.mp4`;
            resolve(eagerUrl || fallback);
          } else {
            const errMsg = (() => { try { return JSON.parse(xhr.responseText)?.error?.message; } catch { return null; } })();
            reject(new Error(errMsg || "Upload falhou"));
          }
        };
        xhr.onerror = () => reject(new Error("Erro de rede no upload"));
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`);
        xhr.send(fd);
      });

      setMediaCloudinaryUrl(cloudUrl);
      setMediaUploadProgress(100);
    } catch (err) {
      setMediaCloudinaryUrl(null);
      setMediaUploadProgress(null);
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro no upload do vídeo");
    } finally {
      setMediaUploading(false);
    }
  }

  async function generateCaption() {
    setGeneratingCaption(true);
    try {
      const lic = licMap[selectedLicenseeId];
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destino: tema.trim() || "viagem",
          tipo: pubType === "reels" ? "Instagram Reels (vídeo curto, vertical)" : pubType,
          formato: pubType,
          briefing: caption.trim() || undefined,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.legenda) setCaption(d.legenda);
      }
    } catch (err) {
      console.error("[Central] generateCaption:", err);
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function handlePublish() {
    if (!selectedLicenseeId || !mediaDataUrl) return;
    if (storesToPublish.length === 0) return;

    const mediaType =
      pubType === "reels" ? "REELS"
      : pubType === "stories" ? "STORIES"
      : "IMAGE";

    try {
      setStatus("uploading");
      setStatusMsg("Enviando mídia para Cloudinary...");

      let cloudinaryUrl: string;

      if (mediaIsVideo) {
        // Vídeo já foi enviado ao Cloudinary via uploadVideoDirectly no momento da seleção
        if (!mediaCloudinaryUrl) throw new Error("Vídeo ainda sendo processado — aguarde.");
        cloudinaryUrl = mediaCloudinaryUrl;
      } else {
        // Imagem: envia via servidor (base64 pequeno, sem risco de 413)
        const upRes = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: mediaDataUrl,
            folder: `aurohubv2/central/${selectedLicenseeId}`,
            resourceType: "image",
          }),
        });
        if (!upRes.ok) {
          const rawText = await upRes.text();
          throw new Error(`Upload falhou (HTTP ${upRes.status}): ${rawText.slice(0, 200)}`);
        }
        const upData = await upRes.json();
        if (!upData.secure_url) throw new Error(upData.error || "Upload falhou");
        cloudinaryUrl = upData.secure_url;
      }

      const errors: string[] = [];
      let successCount = 0;

      for (const storeId of storesToPublish) {
        const store = storeMap[storeId];
        if (!store) continue;
        setStatus("publishing");
        setStatusMsg(`Publicando em @${store.ig_user_id || store.name}...`);

        const body: Record<string, unknown> = {
          licensee_id: selectedLicenseeId,
          store_id: storeId,
          caption,
          media_type: mediaType,
          ...(scheduleMode === "schedule" && scheduledAt
            ? { scheduled_publish_time: new Date(scheduledAt).toISOString() }
            : {}),
        };
        if (mediaIsVideo) body.video_url = cloudinaryUrl;
        else body.image_url = cloudinaryUrl;

        if (postToIG) {
          const pubRes = await fetch("/api/instagram/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const pubData = await pubRes.json();
          if (!pubRes.ok || !pubData.success) {
            errors.push(`${store.name} (IG): ${pubData.error || pubData.detail || "falhou"}`);
          } else {
            successCount++;
          }
        }

        if (postToFB) {
          const fbRes = await fetch("/api/facebook/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              licensee_id: selectedLicenseeId,
              store_id: storeId,
              image_url: !mediaIsVideo ? cloudinaryUrl : undefined,
              caption,
              media_type: mediaType,
            }),
          });
          const fbData = await fbRes.json();
          if (!fbRes.ok || fbData.error) {
            errors.push(`${store.name} (FB): ${fbData.error || "falhou"}`);
          } else {
            successCount++;
          }
        }
      }

      if (errors.length === 0) {
        setStatus("success");
        setStatusMsg(`Publicado em ${successCount} unidade${successCount !== 1 ? "s" : ""}!`);
        setTimeout(() => { clearMedia(); setCaption(""); }, 2500);
        await loadData();
      } else {
        setStatus("error");
        setStatusMsg(errors.join(" | "));
        if (successCount > 0) await loadData();
      }
    } catch (err) {
      console.error("[Central] publish:", err);
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro ao publicar");
    }
  }

  /* ── Render ───────────────────────────────────── */

  const busy = status === "uploading" || status === "publishing";

  const previewAspect: Record<typeof pubType, string> = {
    stories: "9/16", feed: "4/5", reels: "9/16", carrossel: "4/5",
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ═══ HEADER ═══ */}
      <div className="card-glass relative shrink-0 overflow-hidden px-7 py-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">Central ADM</p>
          <h1 className="mt-1 font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-tight text-[var(--txt)]">
            Central de Publicação
          </h1>
        </div>
      </div>

      {/* ═══ GRID 3 COLUNAS ═══ */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "300px 1fr 300px" }}
      >

        {/* ── COL 1: CONFIGURAÇÕES ── */}
        <div className="card-glass flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
          <div className="shrink-0 border-b border-[var(--bdr)] px-4 py-3">
            <h3 className="text-[13px] font-bold text-[var(--txt)]">Configurações</h3>
          </div>
          <div className="flex flex-1 flex-col">

            {/* Destino */}
            <div className="flex flex-col gap-3 px-4 py-3">
              <ColLabel>Cliente</ColLabel>
              <select
                value={selectedLicenseeId}
                onChange={(e) => onLicenseeChange(e.target.value)}
                disabled={loading}
                className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
              >
                <option value="">— Selecione —</option>
                {licensees.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              {selectedLicenseeId && (
                <>
                  {/* Toggle de modo */}
                  <div className="flex overflow-hidden rounded-lg border border-[var(--bdr)]">
                    {(["loja", "lojas", "cliente"] as StoreSelectMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { setStoreSelectMode(mode); setSelectedStoreId(""); setSelectedStoreIds([]); }}
                        className="flex-1 py-1.5 text-[11px] font-semibold capitalize transition-colors"
                        style={storeSelectMode === mode
                          ? { background: "var(--orange)", color: "#fff" }
                          : { color: "var(--txt3)" }
                        }
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Modo Loja: dropdown único */}
                  {storeSelectMode === "loja" && (
                    <select
                      value={selectedStoreId}
                      onChange={(e) => onStoreChange(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
                    >
                      <option value="">— Selecione uma unidade —</option>
                      {storesForLic.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Modo Lojas: chips multi-select */}
                  {storeSelectMode === "lojas" && (
                    <div className="flex flex-wrap gap-1.5">
                      <StoreChip
                        active={selectedStoreIds.length === storesForLic.length && storesForLic.length > 0}
                        onClick={() => setSelectedStoreIds(
                          selectedStoreIds.length === storesForLic.length ? [] : storesForLic.map(s => s.id)
                        )}
                      >
                        🏢 Todas
                      </StoreChip>
                      {storesForLic.map((s) => (
                        <StoreChip
                          key={s.id}
                          active={selectedStoreIds.includes(s.id)}
                          onClick={() => setSelectedStoreIds(prev =>
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          )}
                        >
                          {s.name}
                        </StoreChip>
                      ))}
                    </div>
                  )}

                  {/* Modo Cliente: badge de cobertura */}
                  {storeSelectMode === "cliente" && (
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2">
                      <span className="text-[12px] font-semibold text-[var(--txt)]">
                        Todas as unidades
                      </span>
                      <span
                        className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: "rgba(255,122,26,0.12)", color: "var(--orange)" }}
                      >
                        {storesForLic.length} {storesForLic.length === 1 ? "loja" : "lojas"}
                      </span>
                    </div>
                  )}

                  {/* Handle(s) Instagram */}
                  {storeSelectMode === "loja" && (
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2">
                      <AtSign size={12} className="shrink-0 text-[var(--orange)]" />
                      <span className="truncate text-[11px] font-semibold text-[var(--txt)]">
                        {selectedStoreId && storeMap[selectedStoreId]?.ig_user_id
                          ? `@${storeMap[selectedStoreId].ig_user_id}`
                          : <span className="text-[var(--txt3)]">Sem conta vinculada</span>}
                      </span>
                    </div>
                  )}
                  {storeSelectMode === "lojas" && selectedStoreIds.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {selectedStoreIds.map(id => {
                        const handle = storeMap[id]?.ig_user_id;
                        return handle ? (
                          <div key={id} className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-1.5">
                            <AtSign size={11} className="shrink-0 text-[var(--orange)]" />
                            <span className="truncate text-[11px] font-semibold text-[var(--txt)]">@{handle}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  {storeSelectMode === "cliente" && (
                    <div className="flex flex-col gap-1">
                      {storesForLic.filter(s => s.ig_user_id).map(s => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-1.5">
                          <AtSign size={11} className="shrink-0 text-[var(--orange)]" />
                          <span className="truncate text-[11px] font-semibold text-[var(--txt)]">@{s.ig_user_id}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Destinos de publicação */}
                  <div className="flex flex-col gap-1.5">
                    <ColLabel>Publicar em</ColLabel>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        checked={postToIG}
                        onChange={e => setPostToIG(e.target.checked)}
                        className="accent-[var(--orange)]"
                      />
                      <span className="text-[12px] text-[var(--txt)]">Instagram</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        checked={postToFB}
                        onChange={e => setPostToFB(e.target.checked)}
                        className="accent-[var(--orange)]"
                      />
                      <span className="text-[12px] text-[var(--txt)]">Facebook</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            <ColDivider />

            {/* Tipo de publicação */}
            <div className="flex flex-col gap-2 px-4 py-3">
              <ColLabel>Tipo</ColLabel>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "stories"   as const, label: "Stories",   desc: "9:16" },
                  { key: "feed"      as const, label: "Feed",       desc: "4:5" },
                  { key: "reels"     as const, label: "Reels",      desc: "Vídeo 9:16" },
                  { key: "carrossel" as const, label: "Carrossel",  desc: "Múltiplas" },
                ]).map(t => {
                  const active = pubType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => { setPubType(t.key); if (t.key !== "reels") setMediaIsVideo(false); }}
                      className="flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-colors"
                      style={active
                        ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
                        : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                      }
                    >
                      <span className="text-[12px] font-bold">{t.label}</span>
                      <span className="text-[9px]">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ColDivider />

            {/* Agendamento */}
            <div className="flex flex-col gap-2 px-4 py-3">
              <ColLabel>Agendamento</ColLabel>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode("now")}
                  className="flex-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors"
                  style={scheduleMode === "now"
                    ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
                    : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                  }
                >
                  Publicar agora
                </button>
                <button
                  onClick={() => setScheduleMode("schedule")}
                  className="flex-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors"
                  style={scheduleMode === "schedule"
                    ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
                    : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                  }
                >
                  Agendar
                </button>
              </div>
              {scheduleMode === "schedule" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
                />
              )}

              {/* Botão publicar */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handlePublish}
                  disabled={!canPublish || (scheduleMode === "schedule" && !scheduledAt)}
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {status === "uploading" ? "Enviando..." : status === "publishing" ? "Publicando..." : scheduleMode === "schedule" ? "✦ Agendar publicação" : "✦ Publicar agora"}
                </button>
                {status !== "idle" && (
                  <div className="flex flex-col gap-1.5">
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold"
                      style={
                        status === "success"
                          ? { background: "var(--green3)", color: "var(--green)" }
                          : status === "error"
                            ? { background: "var(--red3)", color: "var(--red)" }
                            : { background: "var(--blue3)", color: "var(--blue)" }
                      }
                    >
                      {status === "success" ? <Check size={12} /> : status === "error" ? <AlertCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
                      <span>{statusMsg}</span>
                    </div>
                    {status === "error" && (
                      <button
                        onClick={() => { setStatus("idle"); setStatusMsg(""); }}
                        className="rounded-lg border border-[var(--bdr)] py-1.5 text-[11px] font-semibold text-[var(--txt3)] transition-colors hover:text-[var(--txt)]"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── COL 2: CONTEÚDO ── */}
        <div className="card-glass flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 170px)" }}>

          {/* Header mídia */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-4 py-3">
            <h3 className="text-[13px] font-bold text-[var(--txt)]">Mídia</h3>
            {mediaDataUrl && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `${FORMAT_META[mediaFormat].color}22`, color: FORMAT_META[mediaFormat].color }}
              >
                {FORMAT_META[mediaFormat].label} · {FORMAT_META[mediaFormat].aspect}
              </span>
            )}
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex flex-1 flex-col overflow-y-auto">

            {/* Upload / preview mídia */}
            <div className="p-4">
              {!mediaDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    dragOver
                      ? "border-[var(--orange)] bg-[rgba(255,122,26,0.06)]"
                      : "border-[var(--bdr2)] hover:border-[var(--orange)]"
                  }`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--orange)]"
                    style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))", border: "1px solid var(--bdr2)" }}
                  >
                    <Upload size={20} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[var(--txt)]">Arraste ou clique para selecionar</div>
                    <div className="mt-1 text-[10px] text-[var(--txt3)]">Imagem ou vídeo · máx 100MB</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={pubType === "reels" ? "video/*" : "image/*"}
                    multiple={pubType === "carrossel"}
                    onChange={onFileInput}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative overflow-hidden rounded-xl border border-[var(--bdr)] bg-black">
                    {mediaIsVideo ? (
                      <video src={mediaDataUrl} controls className="mx-auto max-h-[280px] w-auto" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={mediaDataUrl} alt="Preview" className="mx-auto max-h-[280px] w-auto object-contain" />
                    )}
                    <button
                      onClick={clearMedia}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Formato:</span>
                    {(Object.keys(FORMAT_META) as FormatType[]).map((f) => {
                      const meta = FORMAT_META[f];
                      const active = mediaFormat === f;
                      const allowed = mediaIsVideo ? f === "reels" || f === "stories" : true;
                      if (!allowed) return null;
                      return (
                        <button
                          key={f}
                          onClick={() => setMediaFormat(f)}
                          className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                          style={active
                            ? { borderColor: meta.color, background: `${meta.color}22`, color: meta.color }
                            : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                          }
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <ColDivider />

            {/* Legenda */}
            <div className="flex flex-1 flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <ColLabel>Legenda</ColLabel>
                <button
                  onClick={generateCaption}
                  disabled={generatingCaption || !selectedLicenseeId}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline disabled:opacity-50"
                >
                  {generatingCaption ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Gerar com IA
                </button>
              </div>
              <input
                type="text"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: Cancun All Inclusive, Cruzeiro Natal..."
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--bg2)", border: "0.5px solid var(--bdr)", color: "var(--txt)" }}
              />
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                placeholder="Digite a legenda ou gere com IA..."
                className="w-full resize-none rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
              />
              <div className="text-right text-[10px] text-[var(--txt3)] tabular-nums">{caption.length} caracteres</div>
            </div>

          </div>
        </div>

        {/* ── COL 3: PREVIEW ── */}
        <div className="card-glass flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 170px)" }}>
          <div className="shrink-0 border-b border-[var(--bdr)] px-4 py-3">
            <h3 className="text-[13px] font-bold text-[var(--txt)]">Preview</h3>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="p-4">
              <div
                className="relative w-full overflow-hidden rounded-xl border border-[var(--bdr)] bg-[var(--bg2)]"
                style={{ aspectRatio: previewAspect[pubType] }}
              >
                {mediaDataUrl ? (
                  mediaIsVideo ? (
                    <video src={mediaDataUrl} className="absolute inset-0 h-full w-full object-cover" muted />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={mediaDataUrl} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--txt3)]">
                    <ImageIcon size={28} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{previewAspect[pubType]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
      {children}
    </span>
  );
}

function ColDivider() {
  return <div className="shrink-0 border-t border-[var(--bdr)]" />;
}

function StoreChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
      style={active
        ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.10)", color: "var(--orange)" }
        : { borderColor: "var(--bdr)", color: "var(--txt3)" }
      }
    >
      {children}
    </button>
  );
}

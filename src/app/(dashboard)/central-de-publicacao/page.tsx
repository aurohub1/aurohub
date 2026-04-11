"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Send, Sparkles, Upload, X, Check, Loader2, Image as ImageIcon,
  Film, AtSign, Store as StoreIcon, Clock, AlertCircle,
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

type PublishStatus =
  | "idle"
  | "uploading"
  | "publishing"
  | "success"
  | "error";

interface HistoryLog {
  id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

/* ── Constantes ──────────────────────────────────── */

const FORMAT_META: Record<FormatType, { label: string; aspect: string; color: string }> = {
  stories: { label: "Stories", aspect: "9:16", color: "#A78BFA" },
  feed:    { label: "Feed",    aspect: "4:5",  color: "#FF7A1A" },
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  // Upload state
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [mediaFormat, setMediaFormat] = useState<FormatType>("feed");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState<string>("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [status, setStatus] = useState<PublishStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  // Histórico
  const [history, setHistory] = useState<HistoryLog[]>([]);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [licR, storeR, logsR] = await Promise.all([
        supabase
          .from("licensees")
          .select("id, name, status")
          .eq("status", "active")
          .order("name"),
        supabase
          .from("stores")
          .select("id, name, licensee_id, ig_user_id")
          .order("name"),
        supabase
          .from("activity_logs")
          .select("id, created_at, metadata")
          .eq("event_type", "post_instagram")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setLicensees((licR.data ?? []) as Licensee[]);
      setStores((storeR.data ?? []) as Store[]);
      // Filtra os logs da central
      const logs = ((logsR.data ?? []) as HistoryLog[]).filter((l) => {
        const m = l.metadata as Record<string, unknown> | null;
        return m?.source === "central";
      }).slice(0, 10);
      setHistory(logs);
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

  const selectedStore = selectedStoreId ? storeMap[selectedStoreId] : null;
  const igHandle = selectedStore?.ig_user_id ?? null;

  const canPublish =
    !!selectedLicenseeId &&
    !!selectedStoreId &&
    !!mediaDataUrl &&
    status !== "uploading" &&
    status !== "publishing";

  /* ── Handlers ─────────────────────────────────── */

  function resetSelection() {
    setSelectedStoreId("");
    setMediaDataUrl(null);
    setMediaIsVideo(false);
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
      const dataUrl = await fileToDataURL(file);
      const dims = isVideo ? await getVideoDimensions(dataUrl) : await getImageDimensions(dataUrl);
      const detected = detectFormat(dims.width, dims.height, isVideo);
      setMediaDataUrl(dataUrl);
      setMediaIsVideo(isVideo);
      setMediaFormat(detected);
      setStatus("idle");
      setStatusMsg("");
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
    setMediaDataUrl(null);
    setMediaIsVideo(false);
    setStatus("idle");
    setStatusMsg("");
  }

  async function generateCaption() {
    setGeneratingCaption(true);
    try {
      const lic = licMap[selectedLicenseeId];
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destino: lic?.name || "agência de viagens",
          tipo: "pacote",
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
    if (!selectedLicenseeId || !selectedStoreId || !mediaDataUrl) return;
    const lic = licMap[selectedLicenseeId];
    const store = storeMap[selectedStoreId];
    if (!store) return;

    try {
      setStatus("uploading");
      setStatusMsg("Enviando mídia para Cloudinary...");
      const upRes = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl: mediaDataUrl,
          folder: `aurohubv2/central/${selectedLicenseeId}`,
          resourceType: mediaIsVideo ? "video" : "image",
        }),
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.secure_url) {
        throw new Error(upData.error || "Upload falhou");
      }

      setStatus("publishing");
      setStatusMsg(`Publicando em @${store.ig_user_id || store.name}...`);
      const mediaType =
        mediaFormat === "reels" || (mediaIsVideo && mediaFormat !== "stories")
          ? "REELS"
          : mediaFormat === "stories"
            ? "STORIES"
            : "IMAGE";
      const body: Record<string, unknown> = {
        licensee_id: selectedLicenseeId,
        store_id: selectedStoreId,
        caption,
        media_type: mediaType,
      };
      if (mediaIsVideo) body.video_url = upData.secure_url;
      else body.image_url = upData.secure_url;

      const pubRes = await fetch("/api/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok || !pubData.success) {
        throw new Error(pubData.error || pubData.detail || "Falhou");
      }

      setStatus("success");
      setStatusMsg(`Publicado em @${store.ig_user_id || store.name}!`);
      setTimeout(async () => {
        clearMedia();
        setCaption("");
        await loadData();
      }, 2500);
    } catch (err) {
      console.error("[Central] publish:", err);
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro ao publicar");
    }
  }

  /* ── Render ───────────────────────────────────── */

  const busy = status === "uploading" || status === "publishing";

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="card-glass relative overflow-hidden px-7 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">
            Central ADM
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
            Central de Publicação
          </h1>
          <p className="mt-1 text-[12px] text-[var(--txt3)]">
            Publique diretamente em qualquer unidade dos seus clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        {/* ─── COLUNA PRINCIPAL ─── */}
        <div className="flex flex-col gap-5">
          {/* ═══ SELETOR DE DESTINO ═══ */}
          <div className="card-glass flex flex-col">
            <div className="border-b border-[var(--bdr)] px-5 py-4">
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Destino da publicação</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <Field label="Cliente">
                <select
                  value={selectedLicenseeId}
                  onChange={(e) => onLicenseeChange(e.target.value)}
                  disabled={loading}
                  className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none"
                >
                  <option value="">— Selecione —</option>
                  {licensees.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Unidade">
                <select
                  value={selectedStoreId}
                  onChange={(e) => onStoreChange(e.target.value)}
                  disabled={!selectedLicenseeId}
                  className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:border-[#FF7A1A] focus:outline-none disabled:opacity-50"
                >
                  <option value="">— Selecione —</option>
                  {storesForLic.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Instagram">
                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3">
                  <AtSign size={13} className="shrink-0 text-[#FF7A1A]" />
                  <span className="truncate text-[12px] font-semibold text-[var(--txt)]">
                    {igHandle ? `@${igHandle}` : <span className="text-[var(--txt3)]">— Sem conta vinculada —</span>}
                  </span>
                </div>
              </Field>
            </div>
          </div>

          {/* ═══ UPLOAD DE MÍDIA ═══ */}
          <div className="card-glass flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Mídia</h3>
              {mediaDataUrl && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: `${FORMAT_META[mediaFormat].color}22`,
                    color: FORMAT_META[mediaFormat].color,
                  }}
                >
                  {FORMAT_META[mediaFormat].label} · {FORMAT_META[mediaFormat].aspect}
                </span>
              )}
            </div>

            <div className="p-5">
              {!mediaDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
                    dragOver
                      ? "border-[#FF7A1A] bg-[rgba(255,122,26,0.06)]"
                      : "border-[var(--bdr2)] hover:border-[#FF7A1A]"
                  }`}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#FF7A1A]"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[var(--txt)]">
                      Arraste uma mídia ou clique para selecionar
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--txt3)]">
                      Imagem (Stories/Feed/TV) ou vídeo (Reels) · máx 100MB
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={onFileInput}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="relative overflow-hidden rounded-xl border border-[var(--bdr)] bg-black">
                    {mediaIsVideo ? (
                      <video
                        src={mediaDataUrl}
                        controls
                        className="mx-auto max-h-[420px] w-auto"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={mediaDataUrl}
                        alt="Preview"
                        className="mx-auto max-h-[420px] w-auto object-contain"
                      />
                    )}
                    <button
                      onClick={clearMedia}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                      title="Remover mídia"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Override manual do formato */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
                      Formato detectado:
                    </span>
                    <div className="flex gap-1">
                      {(Object.keys(FORMAT_META) as FormatType[]).map((f) => {
                        const meta = FORMAT_META[f];
                        const active = mediaFormat === f;
                        // Vídeos só podem ser Reels/Stories; imagens todos os outros
                        const allowed = mediaIsVideo ? f === "reels" || f === "stories" : true;
                        if (!allowed) return null;
                        return (
                          <button
                            key={f}
                            onClick={() => setMediaFormat(f)}
                            className="rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                            style={
                              active
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
                </div>
              )}
            </div>
          </div>

          {/* ═══ LEGENDA ═══ */}
          <div className="card-glass flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Legenda</h3>
              <button
                onClick={generateCaption}
                disabled={generatingCaption || !selectedLicenseeId}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF7A1A] hover:underline disabled:opacity-50"
              >
                {generatingCaption ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                Gerar com IA
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                placeholder="Digite a legenda ou gere com IA..."
                className="w-full resize-none rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[#FF7A1A] focus:outline-none"
              />
              <div className="mt-1 text-right text-[10px] text-[var(--txt3)] tabular-nums">
                {caption.length} caracteres
              </div>
            </div>
          </div>

          {/* ═══ PUBLICAR ═══ */}
          <div className="card-glass flex flex-col gap-3 p-5">
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {status === "uploading" ? "Enviando..." : status === "publishing" ? "Publicando..." : "Publicar agora"}
            </button>

            {status !== "idle" && (
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
                {status === "success" ? <Check size={13} /> : status === "error" ? <AlertCircle size={13} /> : <Loader2 size={13} className="animate-spin" />}
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUNA LATERAL: HISTÓRICO ─── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--txt)]">
              <Clock size={14} className="text-[#FF7A1A]" />
              Histórico
            </h3>
            <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--txt3)]">
              Últimos 10
            </span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {loading ? (
              <div className="py-8 text-center text-[12px] text-[var(--txt3)]">Carregando...</div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Clock size={24} className="text-[var(--txt3)]" />
                <div className="text-[12px] text-[var(--txt3)]">Nenhuma publicação ainda</div>
              </div>
            ) : (
              history.map((log) => {
                const m = (log.metadata ?? {}) as Record<string, unknown>;
                const licId = m.licensee_id as string | undefined;
                const storeId = m.store_id as string | undefined;
                const mediaType = m.media_type as string | undefined;
                const imageUrl = m.image_url as string | undefined;
                const videoUrl = m.video_url as string | undefined;
                const lic = licId ? licMap[licId] : null;
                const store = storeId ? storeMap[storeId] : null;
                const thumb = imageUrl ?? null;
                const isVideo = !!videoUrl;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--bdr)] bg-[var(--bg2)]">
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : isVideo ? (
                        <Film size={18} className="text-[var(--txt3)]" />
                      ) : (
                        <ImageIcon size={18} className="text-[var(--txt3)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-bold text-[var(--txt)]">
                          {lic?.name || "Cliente removido"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--txt3)]">
                        <StoreIcon size={9} />
                        <span className="truncate">{store?.name || "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                          {mediaType || "IMAGE"}
                        </span>
                        <span className="text-[9px] text-[var(--txt3)] tabular-nums">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
        {label}
      </label>
      {children}
    </div>
  );
}

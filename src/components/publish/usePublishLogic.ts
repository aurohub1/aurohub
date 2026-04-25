import { useState, useRef } from "react";
import type Konva from "konva";
import type { FullProfile } from "@/lib/auth";
import { usePublishQueue } from "@/hooks/usePublishQueue";
import type { StoreOption } from "./useStoreTargets";

type Format = "stories" | "feed" | "reels" | "tv";

const FORMAT_DIMS: Record<Format, [number, number]> = {
  stories: [1080, 1920],
  feed: [1080, 1350],
  reels: [1080, 1920],
  tv: [1920, 1080],
};

/**
 * Hook para gerenciar a lógica de publicação (geração de imagem/vídeo, upload, enfileiramento).
 *
 * Usado apenas por Cliente e Gerente (enablePublishing=true).
 */
export function usePublishLogic(enabled: boolean) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "generating" | "uploading" | "publishing" | "success" | "error"
  >("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const stageRef = useRef<Konva.Stage | null>(null);
  const publishQueue = usePublishQueue();

  function getPNGDataURL(): string | null {
    if (!enabled) return null;
    const stage = stageRef.current;
    if (!stage) return null;
    const scale = stage.scaleX() || 1;
    return stage.toDataURL({
      pixelRatio: 1 / scale,
      mimeType: "image/jpeg",
      quality: 0.92,
    });
  }

  async function recordCanvasWithAudio(
    format: Format,
    durationSec: number
  ): Promise<Blob | null> {
    if (!enabled) return null;
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

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const recorder = new MediaRecorder(videoStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start(100);

    await new Promise((r) => setTimeout(r, durationSec * 1000));

    recorder.stop();
    cancelAnimationFrame(rafId);

    return done;
  }

  async function handleDownload(
    currentTemplate: { name?: string } | undefined
  ) {
    if (!enabled) return;

    setStatus("generating");
    setStatusMsg("Gerando imagem...");

    const dataUrl = getPNGDataURL();
    if (!dataUrl) {
      setStatus("error");
      setStatusMsg("Falha ao gerar imagem");
      setTimeout(() => {
        setStatus("idle");
        setStatusMsg("");
      }, 2000);
      return;
    }

    // Download local
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${currentTemplate?.name || "arte"}_${Date.now()}.jpg`;
    a.click();

    setStatus("success");
    setStatusMsg("Download iniciado");
    setTimeout(() => {
      setStatus("idle");
      setStatusMsg("");
    }, 2000);
  }

  function handlePublishDrive() {
    if (!enabled) return;
    setStatus("success");
    setStatusMsg("Em breve");
    setTimeout(() => {
      setStatus("idle");
      setStatusMsg("");
    }, 2000);
  }

  async function handlePublish({
    profile,
    selectedTargetIds,
    publishTargets,
    currentTemplate,
    values,
    format,
  }: {
    profile: FullProfile | null;
    selectedTargetIds: string[];
    publishTargets: StoreOption[];
    currentTemplate: { id?: string; name?: string; schema?: any } | undefined;
    values: Record<string, string>;
    format: Format;
  }) {
    if (!enabled) return;
    if (!profile?.licensee_id) {
      setStatus("error");
      setStatusMsg("Sem licensee");
      return;
    }
    if (selectedTargetIds.length === 0) {
      setStatus("error");
      setStatusMsg("Selecione pelo menos uma loja");
      return;
    }

    const targets = publishTargets.filter((t) =>
      selectedTargetIds.includes(t.id)
    );
    if (targets.length === 0) {
      setStatus("error");
      setStatusMsg("Selecione pelo menos uma loja");
      return;
    }

    try {
      setBusy(true);
      const hasAnimation = (currentTemplate?.schema?.elements ?? []).some(
        (el: any) =>
          (el.animDelay && el.animDelay > 0) ||
          (el.animDuration && el.animDuration > 0)
      );
      const isVideo = hasAnimation;
      let mediaBlob: Blob | undefined;
      let mediaDataUrl: string | undefined;

      if (isVideo) {
        setStatus("generating");
        setStatusMsg("Gravando vídeo...");
        const els = (currentTemplate?.schema?.elements ?? []) as Array<{
          animDelay?: number;
          animDuration?: number;
        }>;
        const maxAnim = els.reduce(
          (m, el) => Math.max(m, (el.animDelay || 0) + (el.animDuration || 0.6)),
          0
        );
        const durationSec = Math.min(15, Math.max(5, Math.ceil(maxAnim + 2)));
        const blob = await recordCanvasWithAudio(format, durationSec);
        if (!blob) throw new Error("Falha ao gravar vídeo");
        mediaBlob = blob;
      } else {
        setStatus("generating");
        setStatusMsg("Gerando imagem...");
        const dataUrl = getPNGDataURL();
        if (!dataUrl) throw new Error("Falha ao gerar imagem");
        mediaDataUrl = dataUrl;
      }

      setStatus("publishing");
      setStatusMsg(`Publicando em ${targets.length} loja(s)...`);

      for (const target of targets) {
        publishQueue.enqueue({
          storeId: target.id,
          storeName: target.name,
          destino: values.destino || null,
          format,
          isVideo,
          mediaBlob,
          mediaDataUrl,
          caption: "",
          licenseeId: profile.licensee_id,
          userId: profile.id,
          userRole: profile.role,
          templateId: currentTemplate?.id,
          templateName: currentTemplate?.name,
          onDone: () => {
            console.log(`Publicado em ${target.name}`);
          },
        });
      }

      setStatus("success");
      setStatusMsg(`Publicado em ${targets.length} loja(s)`);
      setTimeout(() => {
        setStatus("idle");
        setStatusMsg("");
        setBusy(false);
      }, 3000);
    } catch (error) {
      setStatus("error");
      setStatusMsg("Erro ao publicar");
      setBusy(false);
      setTimeout(() => {
        setStatus("idle");
        setStatusMsg("");
      }, 3000);
    }
  }

  return {
    busy,
    status,
    statusMsg,
    stageRef: enabled ? stageRef : { current: null },
    handleDownload,
    handlePublishDrive,
    handlePublish,
  };
}

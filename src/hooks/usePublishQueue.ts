"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export type JobFormat = "stories" | "feed" | "reels" | "tv";

export type JobStatus =
  | "queued"
  | "uploading"
  | "publishing"
  | "processing"
  | "done"
  | "error";

export interface PublishJobInput {
  storeId: string;
  storeName: string;
  destino?: string | null;
  format: JobFormat;
  isVideo: boolean;
  mediaBlob?: Blob;
  mediaDataUrl?: string;
  caption: string;
  licenseeId: string;
  userId?: string | null;
  userRole?: string | null;
  templateId?: string;
  templateName?: string;
  onDone?: (jobId: string) => void;
  onError?: (jobId: string, msg: string) => void;
}

export interface PublishJob extends PublishJobInput {
  id: string;
  status: JobStatus;
  statusMsg: string;
  createdAt: number;
}

interface PublishQueueCtx {
  jobs: PublishJob[];
  enqueue: (input: PublishJobInput) => string;
  dismissJob: (id: string) => void;
  clearFinished: () => void;
  hasActive: boolean;
}

const Ctx = createContext<PublishQueueCtx | null>(null);

export function usePublishQueue(): PublishQueueCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePublishQueue deve ser usado dentro de PublishQueueProvider");
  return c;
}

export function usePublishQueueOptional(): PublishQueueCtx | null {
  return useContext(Ctx);
}

export function PublishQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const jobsRef = useRef<PublishJob[]>([]);
  jobsRef.current = jobs;
  const processingRef = useRef(false);

  const patchJob = useCallback((id: string, updates: Partial<PublishJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  }, []);

  const runJob = useCallback(
    async (job: PublishJob) => {
      const mediaType: "IMAGE" | "STORIES" | "REELS" =
        job.format === "stories" ? "STORIES" : job.format === "reels" ? "REELS" : "IMAGE";

      patchJob(job.id, { status: "uploading", statusMsg: "Enviando mídia..." });

      const folder = `aurohubv2/publicacoes/${job.licenseeId}`;
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.signature) {
        throw new Error(signData.error || "Falha ao assinar upload");
      }

      const fd = new FormData();
      if (job.isVideo) {
        if (!job.mediaBlob) throw new Error("Vídeo não disponível");
        fd.append("file", job.mediaBlob, "video.webm");
      } else {
        if (!job.mediaDataUrl) throw new Error("Imagem não disponível");
        fd.append("file", job.mediaDataUrl);
      }
      fd.append("api_key", signData.api_key);
      fd.append("timestamp", String(signData.timestamp));
      fd.append("folder", signData.folder);
      fd.append("signature", signData.signature);

      const resource = job.isVideo ? "video" : "image";
      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloud_name}/${resource}/upload`,
        { method: "POST", body: fd },
      );
      const upData = await upRes.json();
      if (!upRes.ok || !upData.secure_url) {
        throw new Error(upData.error?.message || "Upload falhou");
      }

      const mediaUrl = job.isVideo
        ? `https://res.cloudinary.com/${signData.cloud_name}/video/upload/f_mp4,vc_h264,ac_aac/${upData.public_id}.mp4`
        : (upData.secure_url as string);

      patchJob(job.id, { status: "publishing", statusMsg: `Publicando em ${job.storeName}...` });

      const pubRes = await fetch("/api/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licensee_id: job.licenseeId,
          store_id: job.storeId,
          image_url: job.isVideo ? undefined : mediaUrl,
          video_url: job.isVideo ? mediaUrl : undefined,
          caption: job.caption,
          media_type: mediaType,
          format: job.format,
          user_id: job.userId,
        }),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok || !pubData.success) {
        const rawErr: string = pubData.detail || pubData.error || "Falhou";
        const isFormatErr = /unsupported|format|aspect|ratio|codec|duration|invalid.*video|resolution/i.test(rawErr);
        throw new Error(isFormatErr && job.isVideo ? "Formato não suportado pelo Instagram." : rawErr);
      }

      if (pubData.queued) {
        patchJob(job.id, { status: "processing", statusMsg: "Processando vídeo no Instagram..." });
        await pollAndPublishVideo({
          creation_id: pubData.creation_id,
          ig_user_id: pubData.ig_user_id,
          access_token: pubData.access_token,
          licensee_id: job.licenseeId,
          store_id: job.storeId,
          video_url: mediaUrl,
          media_type: mediaType === "IMAGE" ? "REELS" : mediaType,
          format: job.format,
          caption: job.caption,
          user_id: job.userId,
          onStatus: (msg) => patchJob(job.id, { statusMsg: msg }),
        });
      }

      if (job.templateId) {
        try {
          await supabase.from("publication_history").insert({
            licensee_id: job.licenseeId,
            loja_id: job.storeId,
            user_id: job.userId,
            user_role: job.userRole,
            template_id: job.templateId,
            template_nome: job.templateName,
            formato: job.format,
            tipo: "publicado",
            destino: job.destino || null,
          });
        } catch (err) {
          console.warn("[publishQueue] history insert falhou:", err);
        }
      }
    },
    [patchJob],
  );

  const runNext = useCallback(async () => {
    if (processingRef.current) return;
    const next = jobsRef.current.find((j) => j.status === "queued");
    if (!next) return;
    processingRef.current = true;

    try {
      await runJob(next);
      patchJob(next.id, { status: "done", statusMsg: "Publicado!" });
      next.onDone?.(next.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      patchJob(next.id, { status: "error", statusMsg: msg });
      next.onError?.(next.id, msg);
    } finally {
      processingRef.current = false;
      setTimeout(() => void runNext(), 0);
    }
  }, [runJob, patchJob]);

  useEffect(() => {
    if (!processingRef.current && jobs.some((j) => j.status === "queued")) {
      void runNext();
    }
  }, [jobs, runNext]);

  const enqueue = useCallback((input: PublishJobInput): string => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const job: PublishJob = {
      ...input,
      id,
      status: "queued",
      statusMsg: "Aguardando...",
      createdAt: Date.now(),
    };
    setJobs((prev) => [...prev, job]);
    return id;
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== "done" && j.status !== "error"));
  }, []);

  const hasActive = jobs.some((j) => j.status !== "done" && j.status !== "error");

  return createElement(Ctx.Provider, { value: { jobs, enqueue, dismissJob, clearFinished, hasActive } }, children);
}

async function pollAndPublishVideo(payload: {
  creation_id: string;
  ig_user_id: string;
  access_token: string;
  licensee_id: string;
  store_id: string;
  video_url: string;
  media_type: "REELS" | "STORIES";
  format: JobFormat;
  caption: string;
  user_id?: string | null;
  onStatus: (msg: string) => void;
}): Promise<void> {
  const maxPolls = 36; // 36 × 5s = 180s
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const url = `/api/instagram/status?creation_id=${payload.creation_id}&access_token=${encodeURIComponent(payload.access_token)}`;
    const sRes = await fetch(url);
    const sData = await sRes.json();
    const code = sData.status_code as string;

    if (code === "FINISHED") {
      payload.onStatus("Publicando vídeo...");
      const pubRes = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const pubData = await pubRes.json();
      if (pubData.success) return;
      throw new Error(pubData.error || "Falha ao publicar vídeo");
    }
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram rejeitou o vídeo (${code})`);
    }
    payload.onStatus(`Processando no Instagram (${i + 1}/${maxPolls})...`);
  }
  throw new Error("Timeout ao processar vídeo (3 min)");
}

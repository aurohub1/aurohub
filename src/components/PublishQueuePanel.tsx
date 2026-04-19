"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { usePublishQueueOptional, type PublishJob } from "@/hooks/usePublishQueue";

const FORMAT_LABEL: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};

function statusPillColor(status: PublishJob["status"]): { bg: string; fg: string } {
  switch (status) {
    case "done":
      return { bg: "rgba(34,197,94,0.16)", fg: "var(--green)" };
    case "error":
      return { bg: "rgba(239,68,68,0.16)", fg: "var(--red)" };
    case "queued":
      return { bg: "var(--bg2)", fg: "var(--txt3)" };
    default:
      return { bg: "rgba(59,130,246,0.16)", fg: "var(--blue, #3B82F6)" };
  }
}

function statusIcon(status: PublishJob["status"]) {
  if (status === "done") return <CheckCircle2 size={14} />;
  if (status === "error") return <XCircle size={14} />;
  if (status === "queued") return <Loader2 size={14} className="opacity-50" />;
  return <Loader2 size={14} className="animate-spin" />;
}

export default function PublishQueuePanel() {
  const ctx = usePublishQueueOptional();
  const [collapsed, setCollapsed] = useState(false);

  if (!ctx) return null;
  const { jobs, dismissJob, clearFinished, hasActive } = ctx;
  if (jobs.length === 0) return null;

  const activeCount = jobs.filter((j) => j.status !== "done" && j.status !== "error").length;
  const okCount = jobs.filter((j) => j.status === "done").length;
  const errCount = jobs.filter((j) => j.status === "error").length;

  return (
    <div
      className="fixed bottom-16 left-4 z-[9996] w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        background: "var(--bg1)",
        borderColor: "var(--bdr)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: "var(--bdr)", background: "var(--bg2)" }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            background: hasActive ? "rgba(59,130,246,0.18)" : "rgba(34,197,94,0.18)",
            color: hasActive ? "var(--blue, #3B82F6)" : "var(--green)",
          }}
        >
          {hasActive ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--txt)]">
            Fila de publicações
          </div>
          <div className="text-[10px] text-[var(--txt3)] truncate">
            {activeCount > 0
              ? `${activeCount} em andamento · ${okCount} ok · ${errCount} erro`
              : `Concluído · ${okCount} ok${errCount > 0 ? ` · ${errCount} erro` : ""}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir" : "Recolher"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--txt2)] hover:bg-[var(--bg3)]"
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {!hasActive && (
          <button
            type="button"
            onClick={clearFinished}
            aria-label="Limpar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--txt2)] hover:bg-[var(--bg3)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <ul className="max-h-[280px] overflow-y-auto">
            {jobs.map((job) => {
              const pill = statusPillColor(job.status);
              const finished = job.status === "done" || job.status === "error";
              return (
                <li
                  key={job.id}
                  className="flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--bdr)" }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: pill.bg, color: pill.fg }}
                  >
                    {statusIcon(job.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-[var(--txt)]">
                        {job.storeName}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                        style={{ background: "var(--bg2)", color: "var(--txt3)" }}
                      >
                        {FORMAT_LABEL[job.format] || job.format}
                      </span>
                    </div>
                    <div className="truncate text-[10.5px] text-[var(--txt3)]">
                      {job.destino ? `${job.destino} · ` : ""}
                      <span style={{ color: pill.fg }}>{job.statusMsg}</span>
                    </div>
                  </div>
                  {finished && (
                    <button
                      type="button"
                      onClick={() => dismissJob(job.id)}
                      aria-label="Remover"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--txt3)] hover:bg-[var(--bg3)]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {hasActive && (
            <div
              className="flex items-center gap-2 border-t px-3 py-2 text-[10.5px] font-medium"
              style={{ borderColor: "var(--bdr)", background: "var(--bg2)", color: "var(--orange)" }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--orange)" }} />
              Não feche esta janela enquanto publica
            </div>
          )}
        </>
      )}
    </div>
  );
}

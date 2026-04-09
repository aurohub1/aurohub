"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LogEntry {
  id: string;
  description: string;
  event_type: string;
  created_at: string;
  user_name?: string;
}

const TYPE_ICONS: Record<string, string> = {
  download: "\u2B07\uFE0F",
  post_instagram: "\uD83D\uDCF8",
  post_scheduled: "\uD83D\uDCC5",
  template_created: "\u2728",
  template_edited: "\u270F\uFE0F",
  user_created: "\uD83D\uDC64",
  login: "\uD83D\uDD11",
};

const TYPE_COLORS: Record<string, string> = {
  download: "var(--blue)",
  post_instagram: "var(--orange)",
  post_scheduled: "var(--gold)",
  template_created: "var(--green)",
  template_edited: "var(--purple)",
  user_created: "var(--green)",
  login: "var(--txt3)",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, description, event_type, created_at, user_name")
        .order("created_at", { ascending: false })
        .limit(8);

      setLogs((data as LogEntry[]) ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-glass flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[var(--txt)]">
          Atividade recente
        </h3>
        <a
          href="/logs"
          className="text-[11px] font-semibold text-[var(--orange)] hover:opacity-75"
        >
          Ver todos &rarr;
        </a>
      </div>

      {loading ? (
        <div className="py-6 text-center text-[12px] text-[var(--txt3)]">
          Carregando...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-[var(--txt3)]">
          Nenhuma atividade registrada
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--hover-bg)]"
            >
              {/* Dot */}
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: TYPE_COLORS[log.event_type] ?? "var(--txt3)",
                }}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-[var(--txt)]">
                  {TYPE_ICONS[log.event_type] ?? "\uD83D\uDCCB"}{" "}
                  {log.description || log.event_type}
                </div>
                <div className="text-[11px] text-[var(--txt3)]">
                  {log.user_name ?? "\u2014"} &middot;{" "}
                  {timeAgo(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

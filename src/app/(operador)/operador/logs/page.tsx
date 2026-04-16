"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText } from "lucide-react";

interface LogEntry { id: string; event_type: string; created_at: string; metadata: Record<string, unknown> | null; }

export default function OperadorLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("activity_logs").select("id, event_type, created_at, metadata").order("created_at", { ascending: false }).limit(100);
    setLogs((data ?? []) as LogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="border-b border-[var(--bdr)] pb-4">
        <h2 className="text-[20px] font-bold text-[var(--txt)]">Logs de Atividade</h2>
        <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Últimos 100 eventos — somente leitura</p>
      </div>
      {loading ? (
        <div className="animate-pulse bg-[var(--bg2)] rounded-lg h-20 w-full" />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum log encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bdr)] bg-[var(--bg2)] text-[11px] uppercase tracking-wider text-[var(--txt3)]">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-[var(--bdr)] last:border-0 hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3 text-[var(--txt2)] tabular-nums whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3"><span className="rounded bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-bold text-[var(--txt2)]">{l.event_type}</span></td>
                  <td className="px-4 py-3 max-w-[400px] truncate text-[12px] text-[var(--txt3)]">{l.metadata ? JSON.stringify(l.metadata).slice(0, 120) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

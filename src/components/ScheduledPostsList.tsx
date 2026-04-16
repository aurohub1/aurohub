"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Calendar, Trash2, Image as ImageIcon, RefreshCw } from "lucide-react";

interface ScheduledPost {
  id: string;
  format: string;
  status: string;
  scheduled_at: string;
  image_url: string | null;
  field_values: Record<string, string> | null;
  user_id: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Agendado",  bg: "var(--gold3)",  text: "var(--gold)" },
  published: { label: "Publicado", bg: "var(--green3)", text: "var(--green)" },
  failed:    { label: "Falhou",    bg: "var(--red3)",   text: "var(--red)" },
  cancelled: { label: "Cancelado", bg: "var(--bg3)",    text: "var(--txt3)" },
};

interface Props {
  /** "own" = só do próprio user, "store" = todos da unidade */
  scope: "own" | "store";
}

export default function ScheduledPostsList({ scope }: Props) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = await getProfile(supabase);
    setProfile(p);
    if (!p) { setLoading(false); return; }

    let query = supabase
      .from("scheduled_posts")
      .select("id, format, status, scheduled_at, image_url, field_values, user_id")
      .order("scheduled_at", { ascending: false })
      .limit(50);

    if (scope === "own") {
      query = query.eq("user_id", p.id);
    } else if (p.store_id) {
      // Store scope: get all user_ids from this store
      const { data: storeUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("store_id", p.store_id);
      const ids = (storeUsers ?? []).map((u: { id: string }) => u.id);
      if (ids.length > 0) {
        query = query.in("user_id", ids);
      } else {
        query = query.eq("user_id", p.id);
      }
    }

    const { data } = await query;
    setPosts((data ?? []) as ScheduledPost[]);
    setLoading(false);
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  async function cancelPost(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    await supabase.from("scheduled_posts").update({ status: "cancelled" }).eq("id", id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "cancelled" } : p));
  }

  const st = (s: string) => STATUS_MAP[s] ?? STATUS_MAP.pending;

  return (
    <>
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--txt)]">Agendamentos</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">
            {scope === "own" ? "Seus posts agendados" : "Posts agendados da unidade"}
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-1.5 rounded-lg border border-[var(--bdr)] px-3 py-2 text-[12px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)]">
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-lg bg-[var(--bg2)] h-20 w-full" />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bdr)] bg-[var(--bg2)] text-[10px] uppercase tracking-wider text-[var(--txt3)]">
                <th className="px-4 py-2.5">Mídia</th>
                <th className="px-4 py-2.5">Formato</th>
                <th className="px-4 py-2.5">Data agendada</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => {
                const s = st(p.status);
                const destino = p.field_values?.destino || "—";
                return (
                  <tr key={p.id} className="border-b border-[var(--bdr)] last:border-0 hover:bg-[var(--hover-bg)]">
                    <td className="px-4 py-2.5">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg2)]">
                          <ImageIcon size={14} className="text-[var(--txt3)]" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--txt2)]">
                        {p.format || "feed"}
                      </span>
                      <div className="mt-0.5 text-[10px] text-[var(--txt3)]">{destino}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--txt2)]">
                      {p.scheduled_at
                        ? new Date(p.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: s.bg, color: s.text }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {p.status === "pending" && (
                        <button
                          onClick={() => cancelPost(p.id)}
                          className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] px-2 py-1 text-[10px] font-medium text-[var(--txt3)] hover:border-[var(--red)] hover:text-[var(--red)]"
                        >
                          <Trash2 size={10} /> Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

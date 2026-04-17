"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { MessageCircle, Send, RefreshCw, X } from "lucide-react";

/* ── Types ──────────────────────────────────────── */

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  client_email: string;
  user_id: string | null;
  licensee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender: string;
  message: string;
  user_id: string | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: "Aberto",        bg: "var(--red3)",   text: "var(--red)" },
  in_progress: { label: "Em atendimento", bg: "var(--gold3)",  text: "var(--gold)" },
  resolved:    { label: "Resolvido",     bg: "var(--green3)", text: "var(--green)" },
  closed:      { label: "Fechado",       bg: "var(--bg3)",    text: "var(--txt3)" },
};

const PRIORITY: Record<string, { label: string; bg: string; text: string }> = {
  baixa:   { label: "Baixa",   bg: "var(--bg3)",    text: "var(--txt3)" },
  media:   { label: "Média",   bg: "var(--gold3)",  text: "var(--gold)" },
  alta:    { label: "Alta",    bg: "var(--orange3)", text: "var(--orange)" },
  urgente: { label: "Urgente", bg: "var(--red3)",    text: "var(--red)" },
};

/* ── Component ──────────────────────────────────── */

export default function SupportPageStaff() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [detail, setDetail] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const p = await getProfile(supabase);
    setProfile(p);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openDetail(t: Ticket) {
    setDetail(t);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages((data ?? []) as Message[]);
    // Auto mark as in_progress if open
    if (t.status === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", t.id);
      setDetail({ ...t, status: "in_progress" });
      setTickets(prev => prev.map(x => x.id === t.id ? { ...x, status: "in_progress" } : x));
    }
  }

  async function sendReply() {
    if (!reply.trim() || !detail || !profile) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: detail.id,
      sender: profile.name || "Suporte",
      message: reply.trim(),
      user_id: profile.id,
    });
    setReply("");
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", detail.id).order("created_at");
    setMessages((data ?? []) as Message[]);
    setSending(false);
  }

  async function changeStatus(id: string, status: string) {
    await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (detail?.id === id) setDetail(d => d ? { ...d, status } : null);
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const counts = { open: tickets.filter(t => t.status === "open").length, in_progress: tickets.filter(t => t.status === "in_progress").length, resolved: tickets.filter(t => t.status === "resolved").length };
  const st = (s: string) => STATUS[s] ?? STATUS.open;
  const pr = (p: string) => PRIORITY[p] ?? PRIORITY.media;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--txt)]">Fila de Suporte</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie tickets de clientes</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 rounded-lg border border-[var(--bdr)] px-3 py-2 text-[12px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)]">
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="flex gap-3">
        {[
          { label: "Abertos", count: counts.open, bg: "var(--red3)", text: "var(--red)" },
          { label: "Em atendimento", count: counts.in_progress, bg: "var(--gold3)", text: "var(--gold)" },
          { label: "Resolvidos", count: counts.resolved, bg: "var(--green3)", text: "var(--green)" },
        ].map(k => (
          <div key={k.label} className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2">
            <span className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold tabular-nums" style={{ color: k.text }}>{k.count}</span>
            <span className="text-[11px] text-[var(--txt3)]">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {[{ k: "all", l: "Todos" }, ...Object.entries(STATUS).map(([k, v]) => ({ k, l: v.label }))].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${filter === f.k ? "bg-[var(--blue)] text-white" : "bg-[var(--bg2)] text-[var(--txt3)] hover:text-[var(--txt)]"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse rounded-lg bg-[var(--bg2)] h-20 w-full" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum ticket encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bdr)] bg-[var(--bg2)] text-[10px] uppercase tracking-wider text-[var(--txt3)]">
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Assunto</th>
                <th className="px-4 py-2.5">Categoria</th>
                <th className="px-4 py-2.5">Prioridade</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => openDetail(t)} className="cursor-pointer border-b border-[var(--bdr)] last:border-0 hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-2.5 text-[var(--txt)]">{t.client_email || "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-[var(--txt)]">{t.subject}</td>
                  <td className="px-4 py-2.5 text-[var(--txt3)]">{t.category}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: pr(t.priority).bg, color: pr(t.priority).text }}>{pr(t.priority).label}</span></td>
                  <td className="px-4 py-2.5"><span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: st(t.status).bg, color: st(t.status).text }}>{st(t.status).label}</span></td>
                  <td className="px-4 py-2.5 text-[var(--txt3)] tabular-nums">{new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-[var(--txt)]">{detail.subject}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--txt3)]">
                  <span>{detail.client_email}</span>
                  <span>&middot;</span>
                  <span>{detail.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Status change buttons */}
                {detail.status !== "resolved" && (
                  <button onClick={() => changeStatus(detail.id, "resolved")} className="rounded-lg bg-[var(--green3)] px-2 py-1 text-[10px] font-bold text-[var(--green)]">Resolver</button>
                )}
                {detail.status !== "closed" && (
                  <button onClick={() => changeStatus(detail.id, "closed")} className="rounded-lg bg-[var(--bg3)] px-2 py-1 text-[10px] font-bold text-[var(--txt3)]">Fechar</button>
                )}
                <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                {messages.map(m => {
                  const isStaff = m.user_id !== detail.user_id;
                  return (
                  <div key={m.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] rounded-xl px-3 py-2"
                      style={isStaff
                        ? { background: "var(--orange3)", borderBottomRightRadius: 4 }
                        : { background: "var(--blue3)", borderBottomLeftRadius: 4 }
                      }
                    >
                      <div className="mb-0.5 text-[9px] font-bold uppercase text-[var(--txt3)]">
                        {isStaff ? (m.sender || "Suporte") : m.sender}
                      </div>
                      <div className="whitespace-pre-wrap text-[12px] text-[var(--txt)]">{m.message}</div>
                      <div className="mt-1 text-right text-[9px] text-[var(--txt3)]">
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {detail.status !== "closed" && (
              <div className="flex items-center gap-2 border-t border-[var(--bdr)] p-3">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendReply()}
                  placeholder="Responder..."
                  className="flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg text-white disabled:opacity-50" style={{ background: "var(--brand-gradient)" }}>
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

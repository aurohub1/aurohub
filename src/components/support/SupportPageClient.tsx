"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { MessageCircle, Plus, Send, RefreshCw, X } from "lucide-react";

/* ── Types ──────────────────────────────────────── */

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
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

const CATEGORIES = ["Primeiros Passos", "Publicação", "Templates", "Planos & Pagamento", "Técnico"];
const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

/* ── Component ──────────────────────────────────── */

export default function SupportPageClient() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // New ticket
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPriority, setNewPriority] = useState("media");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTickets = useCallback(async (p?: FullProfile | null) => {
    const user = p || profile;
    if (!user?.id) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      if (p?.id) {
        // Also load tickets by email for legacy tickets without user_id
        const { data } = await supabase
          .from("support_tickets")
          .select("*")
          .or(`user_id.eq.${p.id},client_email.eq.${p.email}`)
          .order("created_at", { ascending: false });
        setTickets((data ?? []) as Ticket[]);
      }
      setLoading(false);
    })();
  }, []);

  async function openDetail(t: Ticket) {
    setDetail(t);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at");
    setMessages((data ?? []) as Message[]);
  }

  async function sendReply() {
    if (!reply.trim() || !detail || !profile) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: detail.id,
      sender: profile.name || profile.email || "Cliente",
      message: reply.trim(),
      user_id: profile.id,
    });
    setReply("");
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", detail.id).order("created_at");
    setMessages((data ?? []) as Message[]);
    setSending(false);
  }

  async function createTicket() {
    if (!newSubject.trim() || !newMessage.trim() || !profile) return;
    setCreating(true);
    const { data: ticket } = await supabase
      .from("support_tickets")
      .insert({
        user_id: profile.id,
        licensee_id: profile.licensee_id,
        client_email: profile.email || "—",
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        status: "open",
      })
      .select()
      .single();
    if (ticket) {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender: profile.name || "Cliente",
        message: newMessage.trim(),
        user_id: profile.id,
      });
    }
    setShowNew(false);
    setNewSubject("");
    setNewMessage("");
    setNewPriority("media");
    setCreating(false);
    loadTickets(profile);
  }

  const st = (s: string) => STATUS[s] ?? STATUS.open;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--txt)]">Suporte</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Abra um chamado ou acompanhe seus tickets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadTickets()} className="flex items-center gap-1.5 rounded-lg border border-[var(--bdr)] px-3 py-2 text-[12px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)]">
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white" style={{ background: "var(--brand-gradient)" }}>
            <Plus size={14} /> Novo ticket
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="animate-pulse rounded-lg bg-[var(--bg2)] h-20 w-full" />
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum ticket ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => openDetail(t)}
              className="flex items-center justify-between rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] px-4 py-3 text-left transition-colors hover:border-[var(--bdr2)]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-[var(--txt)]">{t.subject}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--txt3)]">
                  <span>{t.category}</span>
                  <span>&middot;</span>
                  <span>{new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st(t.status).bg, color: st(t.status).text }}>
                {st(t.status).label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-[var(--txt)]">{detail.subject}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--txt3)]">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st(detail.status).bg, color: st(detail.status).text }}>
                    {st(detail.status).label}
                  </span>
                  <span>{detail.category}</span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"><X size={18} /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                {messages.map(m => {
                  const isStaff = profile ? m.user_id !== profile.id : false;
                  return (
                  <div key={m.id} className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
                    <div
                      className="max-w-[80%] rounded-xl px-3 py-2"
                      style={isStaff
                        ? { background: "var(--blue3)", borderBottomLeftRadius: 4 }
                        : { background: "var(--orange3)", borderBottomRightRadius: 4 }
                      }
                    >
                      <div className="mb-0.5 text-[9px] font-bold uppercase text-[var(--txt3)]">
                        {isStaff ? "Suporte" : m.sender}
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

            {/* Reply */}
            {detail.status !== "closed" && (
              <div className="flex items-center gap-2 border-t border-[var(--bdr)] p-3">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendReply()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--blue)]"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg text-white disabled:opacity-50" style={{ background: "var(--brand-gradient)" }}>
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--txt)]">Novo Ticket</h3>
              <button onClick={() => setShowNew(false)} className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Assunto</label>
                <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Descreva brevemente..." className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--blue)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Categoria</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[13px] text-[var(--txt)] outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Prioridade</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[13px] text-[var(--txt)] outline-none">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Mensagem</label>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} placeholder="Descreva o problema..." className="w-full resize-none rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--blue)]" />
              </div>
              <button
                onClick={createTicket}
                disabled={creating || !newSubject.trim() || !newMessage.trim()}
                className="mt-1 w-full rounded-lg py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--brand-gradient)" }}
              >
                {creating ? "Enviando..." : "Abrir Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

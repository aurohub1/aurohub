"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  X, ChevronDown, ChevronUp, ArrowLeft, Send, Check,
  Bot, User, Headphones, MessageCircle,
} from "lucide-react";

interface Ticket {
  id: string;
  user_id: string | null;
  licensee_id: string | null;
  status: "bot" | "human" | "resolved";
  unread_adm: boolean;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  licensee_name: string | null;
}

interface Message {
  id: string;
  sender: "user" | "bot" | "human";
  message: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  minimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

const STATUS_META = {
  bot:      { label: "Bot",        cls: "bg-blue-100 text-blue-700"   },
  human:    { label: "Aguardando", cls: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolvido",  cls: "bg-green-100 text-green-700" },
} as const;

function initials(name: string | null): string {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AdmSupportDrawer({ isOpen, minimized, onClose, onMinimize, onRestore }: Props) {
  const [profile, setProfile]           = useState<FullProfile | null>(null);
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [reply, setReply]               = useState("");
  const [sending, setSending]           = useState(false);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  useEffect(() => {
    getProfile(supabase).then(p => setProfile(p));
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("id, user_id, licensee_id, status, unread_adm, created_at, updated_at")
      .in("status", ["bot", "human"])
      .order("updated_at", { ascending: false })
      .limit(200);

    const rows      = (data ?? []) as Omit<Ticket, "user_name" | "licensee_name">[];
    const userIds   = [...new Set(rows.map(r => r.user_id).filter(Boolean))]     as string[];
    const licIds    = [...new Set(rows.map(r => r.licensee_id).filter(Boolean))] as string[];

    const [uRes, lRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, name").in("id", userIds)
                     : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      licIds.length  ? supabase.from("licensees").select("id, name").in("id", licIds)
                     : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    ]);

    const uMap = new Map((uRes.data ?? []).map(u => [u.id, u.name]));
    const lMap = new Map((lRes.data ?? []).map(l => [l.id, l.name]));

    setTickets(rows.map(r => ({
      ...r,
      user_name:     r.user_id     ? (uMap.get(r.user_id)     ?? null) : null,
      licensee_name: r.licensee_id ? (lMap.get(r.licensee_id) ?? null) : null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    const ch = supabase
      .channel("adm-widget-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, loadTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadTickets]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let alive = true;

    (async () => {
      await supabase.from("support_tickets").update({ unread_adm: false }).eq("id", activeId);
      const { data } = await supabase
        .from("ticket_messages")
        .select("id, sender, message, created_at")
        .eq("ticket_id", activeId)
        .order("created_at", { ascending: true });
      if (alive) setMessages((data ?? []) as Message[]);
    })();

    const ch = supabase
      .channel(`adm-widget-msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as Message;
            return prev.some(x => x.id === m.id) ? prev : [...prev, m];
          });
        },
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [activeId]);

  const sendReply = useCallback(async () => {
    const text = reply.trim();
    if (!text || !activeId || !profile || sending) return;
    setSending(true);
    setReply("");
    try {
      await supabase.from("ticket_messages").insert({
        ticket_id: activeId, sender: "human", user_id: profile.id, message: text,
      });
      await supabase.from("support_tickets")
        .update({ status: "human", unread_adm: false, updated_at: new Date().toISOString() })
        .eq("id", activeId);

      const ticket = tickets.find(t => t.id === activeId);
      if (ticket?.user_id) {
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: ticket.user_id,
            title: "💬 Suporte Aurohub respondeu",
            body: text.length > 80 ? text.slice(0, 77) + "..." : text,
            url: "/",
            tag: `support-${activeId}`,
          }),
        }).catch(() => null);
      }
    } finally {
      setSending(false);
    }
  }, [reply, activeId, profile, sending, tickets]);

  const resolve = useCallback(async () => {
    if (!activeId) return;
    await supabase.from("support_tickets")
      .update({ status: "resolved", unread_adm: false, updated_at: new Date().toISOString() })
      .eq("id", activeId);
    setActiveId(null);
  }, [activeId]);

  const active = tickets.find(t => t.id === activeId) ?? null;

  return (
    <div
      role="dialog"
      aria-label="Suporte ADM"
      style={{ display: isOpen ? "flex" : "none", width: 360, height: minimized ? 48 : 560, background: "var(--bg1)" }}
      className="fixed bottom-4 right-[50px] z-[9999] flex-col rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* ── Header ── */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-[var(--bdr)] px-3 ${minimized ? "h-12 cursor-pointer" : "py-2.5"}`}
        onClick={minimized ? onRestore : undefined}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
          <Headphones size={14} className="text-amber-600" />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--txt)] truncate">
            {activeId && !minimized ? (active?.user_name || "(sem nome)") : "Suporte"}
          </span>
          {!activeId && !minimized && tickets.length > 0 && (
            <span className="flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {tickets.length > 9 ? "9+" : tickets.length}
            </span>
          )}
          {activeId && !minimized && active && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_META[active.status].cls}`}>
              {STATUS_META[active.status].label}
            </span>
          )}
        </div>

        {activeId && !minimized && (
          <button
            onClick={(e) => { e.stopPropagation(); setActiveId(null); }}
            aria-label="Voltar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); minimized ? onRestore() : onMinimize(); }}
          aria-label={minimized ? "Expandir" : "Minimizar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
        >
          {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Fechar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
        >
          <X size={14} />
        </button>
      </div>

      {!minimized && (
        <>
          {/* ── VIEW 1: Lista de tickets ── */}
          {!activeId && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--bdr)] border-t-amber-500" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <MessageCircle size={28} className="text-[var(--txt3)]" />
                  <span className="text-sm text-[var(--txt2)]">Nenhum ticket aberto</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  <div className="flex flex-col gap-1.5">
                    {tickets.map(t => {
                      const meta = STATUS_META[t.status] ?? STATUS_META.bot;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveId(t.id)}
                          className="flex items-center gap-2.5 rounded-xl border border-[var(--bdr)] bg-[var(--bg2)] p-2.5 text-left transition-colors hover:bg-[var(--hover-bg)]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {initials(t.user_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-[var(--txt)]">
                                {t.user_name || "(sem nome)"}
                              </span>
                              {t.unread_adm && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Não lido" />
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>
                                {meta.label}
                              </span>
                              <span className="truncate text-[11px] text-[var(--txt2)]">
                                {t.licensee_name || "—"}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] text-[var(--txt2)]">{relTime(t.updated_at)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VIEW 2: Conversa ── */}
          {activeId && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="flex flex-col gap-3">
                  {messages.map(m => {
                    const isHuman = m.sender === "human";
                    const isBot   = m.sender === "bot";
                    return (
                      <div key={m.id} className={`flex gap-2 ${isHuman ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isHuman ? "bg-amber-100 text-amber-700"
                          : isBot  ? "bg-[var(--bg3)] text-[var(--txt2)]"
                          : "bg-blue-600 text-white"
                        }`}>
                          {isHuman ? <Headphones size={13} /> : isBot ? <Bot size={13} /> : <User size={13} />}
                        </div>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          isHuman ? "bg-amber-100 text-amber-900" : "bg-[var(--bg3)] text-[var(--txt)]"
                        }`}>
                          <div className="whitespace-pre-wrap break-words">{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              {active?.status !== "resolved" && (
                <>
                  <div className="shrink-0 border-t border-[var(--bdr)] px-3 py-1.5">
                    <button
                      onClick={resolve}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-100 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                    >
                      <Check size={12} /> Resolver ticket
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 border-t border-[var(--bdr)] p-3">
                    <input
                      type="text"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !sending && sendReply()}
                      placeholder="Responder..."
                      className="flex-1 rounded-lg border border-[var(--bdr)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-blue-400"
                      style={{ background: "var(--input-bg)" }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      aria-label="Enviar"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

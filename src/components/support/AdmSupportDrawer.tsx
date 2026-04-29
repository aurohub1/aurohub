"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Send, Check, MessageCircle, RefreshCw, User, Bot, Headphones, X } from "lucide-react";

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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  bot:      { label: "Bot",               cls: "bg-blue-100 text-blue-700" },
  human:    { label: "Aguardando equipe", cls: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolvido",         cls: "bg-green-100 text-green-700" },
};

export default function AdmSupportDrawer({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("id, user_id, licensee_id, status, unread_adm, created_at, updated_at")
      .in("status", ["bot", "human"])
      .order("updated_at", { ascending: false })
      .limit(200);

    const rows = (data ?? []) as Omit<Ticket, "user_name" | "licensee_name">[];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    const licenseeIds = [...new Set(rows.map(r => r.licensee_id).filter(Boolean))] as string[];

    const [usersRes, licenseesRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, name").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      licenseeIds.length > 0
        ? supabase.from("licensees").select("id, name").in("id", licenseeIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    ]);
    const userMap = new Map((usersRes.data ?? []).map(u => [u.id, u.name]));
    const licMap  = new Map((licenseesRes.data ?? []).map(l => [l.id, l.name]));

    setTickets(rows.map(r => ({
      ...r,
      user_name:     r.user_id     ? (userMap.get(r.user_id)     ?? null) : null,
      licensee_name: r.licensee_id ? (licMap.get(r.licensee_id)  ?? null) : null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      await loadTickets();
    })();
  }, [loadTickets]);

  useEffect(() => {
    const ch = supabase
      .channel("adm-drawer-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => loadTickets())
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
      .channel(`adm-drawer-msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as Message;
            if (prev.some(x => x.id === m.id)) return prev;
            return [...prev, m];
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
  }, [activeId]);

  const active = tickets.find(t => t.id === activeId) ?? null;
  const counts = {
    bot:   tickets.filter(t => t.status === "bot").length,
    human: tickets.filter(t => t.status === "human").length,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9990] bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Painel de suporte ADM"
        className="fixed right-0 top-0 bottom-0 z-[9991] flex flex-col bg-white shadow-2xl"
        style={{ width: "min(960px, calc(100vw - 220px))" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Suporte</h3>
            <p className="text-xs text-slate-500">{counts.human} aguardando · {counts.bot} no bot</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTickets}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={13} /> Atualizar
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="w-full animate-pulse rounded-lg bg-slate-200 h-20" />
          ) : tickets.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">Nenhum ticket aberto.</p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] overflow-hidden">
              {/* Lista */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {tickets.map(t => {
                  const meta = STATUS_META[t.status] ?? STATUS_META.bot;
                  const isActive = activeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                        isActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">
                          {t.user_name || "(sem nome)"}
                        </span>
                        {t.unread_adm && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Não lido" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
                          {meta.label}
                        </span>
                        <span className="truncate">{t.licensee_name || "—"}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(t.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Chat */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                {!active ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                    Selecione um ticket
                  </div>
                ) : (
                  <>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{active.user_name || "(sem nome)"}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[active.status].cls}`}>
                            {STATUS_META[active.status].label}
                          </span>
                          <span>{active.licensee_name || "—"}</span>
                        </div>
                      </div>
                      {active.status !== "resolved" && (
                        <button
                          onClick={resolve}
                          className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          <Check size={13} /> Resolver
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                      <div className="flex flex-col gap-3">
                        {messages.map(m => {
                          const isHuman = m.sender === "human";
                          const isBot   = m.sender === "bot";
                          return (
                            <div key={m.id} className={`flex gap-2 ${isHuman ? "flex-row-reverse" : "flex-row"}`}>
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                isHuman ? "bg-amber-100 text-amber-700"
                                : isBot  ? "bg-slate-100 text-slate-500"
                                : "bg-blue-600 text-white"
                              }`}>
                                {isHuman ? <Headphones size={13} /> : isBot ? <Bot size={13} /> : <User size={13} />}
                              </div>
                              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                                isHuman ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                              }`}>
                                <div className="whitespace-pre-wrap break-words">{m.message}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    </div>

                    {active.status !== "resolved" && (
                      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 p-3">
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !sending && sendReply()}
                          placeholder="Responder..."
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
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
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { X, Send, User, Bot, Headphones } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot" | "human";
  content: string;
  created_at: string;
}

type Status = "bot" | "human" | "resolved";

interface SupabaseRealtimePayload {
  new: { id: string; sender: "user" | "bot" | "human"; content: string; created_at: string };
}

export default function SupportChat({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("bot");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll automático
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  // Bootstrap: carrega profile e ticket ativo, se existir.
  // Ticket novo só é criado no servidor quando o usuário envia a primeira mensagem
  // (via POST /api/support/tickets — que também dispara notify WhatsApp).
  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await getProfile(supabase);
      if (!alive || !p) return;
      setProfile(p);

      const { data: existing } = await supabase
        .from("support_tickets")
        .select("id, status")
        .eq("user_id", p.id)
        .in("status", ["bot", "human"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const tid = existing[0].id;
        const s: Status = (existing[0].status as Status) ?? "bot";
        setTicketId(tid);
        setStatus(s);
        const { data: msgs } = await supabase
          .from("support_messages")
          .select("id, sender, content, created_at")
          .eq("ticket_id", tid)
          .order("created_at", { ascending: true });
        if (alive) setMessages((msgs ?? []) as Message[]);
      } else {
        // Nenhum ticket aberto — mostra greeting local (não persistido) até a primeira mensagem
        const greet = `Olá ${p.name ?? "por aí"}! Como posso ajudar? 👋`;
        if (alive) setMessages([{ id: "local-greet", sender: "bot", content: greet, created_at: new Date().toISOString() }]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Realtime: nova mensagem no ticket atual
  useEffect(() => {
    if (!ticketId) return;
    const ch = supabase
      .channel(`support-msgs-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload: SupabaseRealtimePayload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !profile || sending) return;
    setSending(true);
    setInput("");

    // Otimista: adiciona a mensagem do user já
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, sender: "user", content: text, created_at: new Date().toISOString() }]);

    try {
      let tid = ticketId;

      // Primeira mensagem em ticket novo: cria ticket via API (que dispara notify WhatsApp)
      if (!tid) {
        const tRes = await fetch("/api/support/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile.id,
            licenseeId: profile.licensee_id ?? null,
            firstMessage: text,
            userName: profile.name,
            userRole: profile.role,
            licenseeNome: profile.licensee?.name ?? null,
          }),
        });
        if (!tRes.ok) {
          const detail = await tRes.text().catch(() => "");
          console.error("[SupportChat] tickets API falhou:", tRes.status, detail);
          return;
        }
        const tData = await tRes.json();
        tid = tData.ticketId as string;
        setTicketId(tid);
      }

      if (status === "human") {
        await supabase.from("support_messages").insert({
          ticket_id: tid, sender: "user", sender_id: profile.id, content: text,
        });
        await supabase.from("support_tickets")
          .update({ updated_at: new Date().toISOString(), unread_adm: true })
          .eq("id", tid);
      } else {
        const res = await fetch("/api/support/bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: tid,
            userMessage: text,
            userName: profile.name,
            userRole: profile.role,
            userPlan: profile.plan?.name ?? null,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("[SupportChat] bot API falhou:", res.status, detail);
        }
      }
    } finally {
      setSending(false);
    }
  }, [input, ticketId, profile, sending, status]);

  const escalate = useCallback(async () => {
    if (!ticketId || !profile || status === "human") return;
    setStatus("human");
    const lastMessage = [...messages].reverse().find(m => m.sender === "user")?.content ?? null;
    await fetch("/api/support/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "escalate",
        ticketId,
        userName: profile.name,
        userRole: profile.role,
        licenseeNome: profile.licensee?.name ?? null,
        lastMessage,
      }),
    }).catch((err) => console.warn("[SupportChat] escalate API falhou:", err));
  }, [ticketId, profile, status, messages]);

  const statusMeta = {
    bot:      { label: "Bot",                 cls: "bg-blue-100 text-blue-700" },
    human:    { label: "Aguardando equipe",    cls: "bg-amber-100 text-amber-700" },
    resolved: { label: "Resolvido",            cls: "bg-green-100 text-green-700" },
  }[status];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/40"
      />
      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Suporte Aurohub"
        className="fixed right-0 top-0 bottom-0 z-[9999] flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
            <Headphones size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">Suporte Aurohub</div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
              {!profile ? (
                <>
                  <div className="flex flex-col gap-2 w-full max-w-[260px]">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-10 w-3/4 animate-pulse rounded-xl bg-slate-100 self-end" />
                    <div className="h-10 w-5/6 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                  <span className="text-xs text-slate-400">Conectando...</span>
                </>
              ) : (
                <span>Carregando mensagens...</span>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              const isBot = m.sender === "bot";
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isUser ? "bg-blue-600 text-white"
                    : isBot ? "bg-slate-100 text-slate-500"
                    : "bg-amber-100 text-amber-700"
                  }`}>
                    {isUser ? <User size={13} /> : isBot ? <Bot size={13} /> : <Headphones size={13} />}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    isUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Escalate button */}
        {status !== "human" && status !== "resolved" && (
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              onClick={escalate}
              disabled={!profile}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Falar com humano
            </button>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-slate-200 p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !sending && profile && send()}
            placeholder={profile ? "Digite sua mensagem..." : "Conectando..."}
            disabled={!profile}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim() || !profile}
            aria-label="Enviar"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

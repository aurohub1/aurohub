"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { MessageCircle, Send, X, Minimize2 } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  message: string;
  user_id: string | null;
  created_at: string;
}

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p) return;
      // Busca ticket aberto do user
      const { data } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", p.id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setTicketId(data[0].id);
      }
    })();
  }, []);

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at");
    setMessages((data ?? []) as Message[]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) loadMessages();
  }, [open, ticketId, loadMessages]);

  async function sendMessage() {
    if (!input.trim() || !profile) return;
    setSending(true);
    const msg = input.trim();
    setInput("");

    let tid = ticketId;

    // Cria ticket se não existir
    if (!tid) {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: profile.id,
          licensee_id: profile.licensee_id,
          client_email: profile.email || "—",
          subject: msg.slice(0, 80),
          category: "Chat",
          priority: "media",
          status: "open",
        })
        .select()
        .single();
      if (ticket) {
        tid = ticket.id;
        setTicketId(ticket.id);
      }
    }

    if (!tid) { setSending(false); return; }

    // Salva mensagem
    await supabase.from("ticket_messages").insert({
      ticket_id: tid,
      sender: profile.name || "Cliente",
      message: msg,
      user_id: profile.id,
    });

    // Notifica via WhatsApp
    try {
      await fetch("/api/support-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: tid,
          message: msg,
          userName: profile.name || profile.email || "Cliente",
          storeName: profile.store?.name || profile.licensee?.name || "—",
        }),
      });
    } catch { /* silent */ }

    await loadMessages();
    setSending(false);
  }

  if (!profile) return null;

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[8000] flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-110"
          style={{ background: "var(--brand-gradient)" }}
          title="Suporte"
        >
          <MessageCircle size={22} className="text-white" />
        </button>
      )}

      {/* Chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[8000] flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--brand-gradient)" }}>
            <div>
              <div className="text-[13px] font-bold text-white">Suporte Aurohub</div>
              <div className="text-[10px] text-white/70">Responderemos em breve</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/70 hover:text-white">
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3">
            {messages.length === 0 && !ticketId && (
              <div className="flex h-full items-center justify-center text-center text-[12px] text-[var(--txt3)]">
                Envie uma mensagem para iniciar o atendimento.
              </div>
            )}
            {messages.length === 0 && ticketId && (
              <div className="flex h-full items-center justify-center text-center text-[12px] text-[var(--txt3)]">
                Carregando...
              </div>
            )}
            <div className="flex flex-col gap-2">
              {messages.map(m => {
                const isStaff = m.user_id !== profile.id;
                return (
                <div key={m.id} className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
                  <div
                    className="max-w-[80%] rounded-xl px-3 py-2"
                    style={isStaff
                      ? { background: "var(--bg2)", borderBottomLeftRadius: 4 }
                      : { background: "rgba(59,130,246,0.12)", borderBottomRightRadius: 4 }
                    }
                  >
                    <div className="mb-0.5 text-[8px] font-bold uppercase text-[var(--txt3)]">
                      {isStaff ? "Suporte" : "Você"}
                    </div>
                    <div className="whitespace-pre-wrap text-[12px] text-[var(--txt)]">{m.message}</div>
                    <div className="mt-0.5 text-right text-[8px] text-[var(--txt3)]">
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-[var(--bdr)] p-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !sending && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--blue)]"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

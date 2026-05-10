"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Send, MessageCircle } from "lucide-react";

interface Room {
  id: string;
  name: string;
  type: "loja" | "franquia";
  created_at: string;
  last_msg: { message: string; sender_name: string; created_at: string } | null;
  unread: boolean;
}

interface ChatMsg {
  id: string;
  user_id: string;
  sender_name: string | null;
  message: string;
  created_at: string;
}

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

export default function UnidadeChatPage() {
  const [profile, setProfile]           = useState<FullProfile | null>(null);
  const [rooms, setRooms]               = useState<Room[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [senderNames, setSenderNames]   = useState<Map<string, string>>(new Map());
  const [filterError, setFilterError]   = useState<string | null>(null);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  useEffect(() => {
    getProfile(supabase).then(p => setProfile(p));
  }, []);

  const loadRooms = useCallback(async (licenseeId: string, userId: string) => {
    setLoading(true);
    const { data: rawRooms } = await supabase
      .from("chat_rooms")
      .select("id, name, type, created_at")
      .eq("licensee_id", licenseeId)
      .order("created_at", { ascending: true });

    if (!rawRooms?.length) { setRooms([]); setLoading(false); return; }

    const roomIds = (rawRooms as { id: string }[]).map(r => r.id);

    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("room_id, message, sender_name, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, { message: string; sender_name: string; created_at: string }>();
    for (const m of (msgs ?? []) as { room_id: string; message: string; sender_name: string; created_at: string }[]) {
      if (!lastMsgMap.has(m.room_id)) lastMsgMap.set(m.room_id, m);
    }

    const { data: receipts } = await supabase
      .from("chat_read_receipts")
      .select("room_id, last_read_at")
      .eq("user_id", userId)
      .eq("is_adm", false)
      .in("room_id", roomIds);

    const receiptMap = new Map(
      ((receipts ?? []) as { room_id: string; last_read_at: string }[]).map(r => [r.room_id, r.last_read_at]),
    );

    const enriched: Room[] = (rawRooms as { id: string; name: string; type: string; created_at: string }[]).map(r => {
      const lastMsg = lastMsgMap.get(r.id) ?? null;
      const lastRead = receiptMap.get(r.id);
      const unread = lastMsg ? (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead)) : false;
      return { id: r.id, name: r.name, type: r.type as "loja" | "franquia", created_at: r.created_at, last_msg: lastMsg, unread };
    });

    enriched.sort((a, b) => {
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      const aT = a.last_msg?.created_at ?? a.created_at;
      const bT = b.last_msg?.created_at ?? b.created_at;
      return new Date(bT).getTime() - new Date(aT).getTime();
    });

    setRooms(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.licensee_id && profile.id) loadRooms(profile.licensee_id, profile.id);
    else if (profile) setLoading(false);
  }, [profile, loadRooms]);

  useEffect(() => {
    if (!profile?.licensee_id || !profile.id) return;
    const licenseeId = profile.licensee_id;
    const userId = profile.id;
    const ch = supabase
      .channel("unidade-chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadRooms(licenseeId, userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, () => loadRooms(licenseeId, userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.licensee_id, profile?.id, loadRooms]);

  useEffect(() => {
    if (!activeRoomId || !profile) { setMessages([]); return; }
    let alive = true;

    (async () => {
      await supabase.from("chat_read_receipts").upsert(
        { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: false },
        { onConflict: "room_id,user_id" },
      );
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, unread: false } : r));

      const { data } = await supabase
        .from("chat_messages")
        .select("id, user_id, sender_name, message, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true });
      const msgs = (data ?? []) as ChatMsg[];
      if (alive) setMessages(msgs);
      const unknownIds = [...new Set(msgs.filter(m => !m.sender_name && m.user_id !== profile.id).map(m => m.user_id))];
      if (unknownIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name").in("id", unknownIds);
        if (alive) setSenderNames(new Map(((profs ?? []) as { id: string; name: string }[]).map(p => [p.id, p.name])));
      }
    })();

    const ch = supabase
      .channel(`unidade-chat-room-${activeRoomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as ChatMsg;
            return prev.some(x => x.id === m.id) ? prev : [...prev, m];
          });
          supabase.from("chat_read_receipts").upsert(
            { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: false },
            { onConflict: "room_id,user_id" },
          );
        },
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [activeRoomId, profile]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeRoomId || !profile || sending) return;
    setFilterError(null);
    if (profile.licensee_id) {
      const res = await fetch("/api/chat/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, licensee_id: profile.licensee_id }),
      });
      const data = await res.json() as { allowed: boolean; reason?: string };
      if (!data.allowed) { setFilterError(data.reason ?? "Mensagem bloqueada pelo filtro de conteúdo."); return; }
    }
    setSending(true);
    setInput("");
    try {
      await supabase.from("chat_messages").insert({
        room_id: activeRoomId,
        user_id: profile.id,
        sender_name: profile.name ?? "Unidade",
        message: text,
      });
    } finally {
      setSending(false);
    }
  }, [input, activeRoomId, profile, sending]);

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null;

  function displayName(m: ChatMsg): string {
    if (m.sender_name) return m.sender_name;
    if (m.user_id === profile?.id) return "Você";
    return senderNames.get(m.user_id) ?? "Usuário";
  }

  return (
    <div
      className="-mx-6 -my-5 flex flex-1 overflow-hidden border-t border-[rgba(255,255,255,0.08)]"
      style={{ height: "calc(100dvh - 90px)", background: "#0c0c12" }}
    >
      {/* ── Left: room list ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[rgba(255,255,255,0.08)]">
        <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(255,255,255,0.08)] px-4 py-3.5">
          <MessageCircle size={15} className="shrink-0 text-[#94A3B8]" />
          <h1 className="text-sm font-semibold text-[#EEF2FF]">Chat com a equipe Aurovista</h1>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F59E0B]" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <MessageCircle size={28} className="text-[rgba(255,255,255,0.2)]" />
            <p className="text-sm text-[#94A3B8]">Nenhuma sala configurada</p>
            <p className="text-xs text-[#94A3B8]">Entre em contato com o suporte</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`mb-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  activeRoomId === room.id
                    ? "border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.1)]"
                    : "border border-transparent hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(99,102,241,0.2)] text-sm font-bold text-[#EEF2FF]">
                  {initials(room.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-[#EEF2FF]">{room.name}</span>
                    {room.unread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]" aria-label="Não lido" />
                    )}
                  </div>
                  {room.last_msg && (
                    <div className="mt-0.5 truncate text-[11px] text-[#94A3B8]">
                      {room.last_msg.sender_name}: {room.last_msg.message}
                    </div>
                  )}
                </div>
                {room.last_msg && (
                  <span className="shrink-0 text-[10px] text-[#94A3B8]">{relTime(room.last_msg.created_at)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: conversation ── */}
      {!activeRoomId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <MessageCircle size={36} className="text-[rgba(255,255,255,0.15)]" />
          <p className="text-sm text-[#94A3B8]">Selecione uma sala para conversar</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2.5 border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(99,102,241,0.2)] text-sm font-bold text-[#EEF2FF]">
              {initials(activeRoom?.name ?? null)}
            </div>
            <span className="text-sm font-semibold text-[#EEF2FF]">{activeRoom?.name ?? "Chat"}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {messages.map(m => {
                const isMe = m.user_id === profile?.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      isMe ? "bg-[#6366F1] text-white" : "bg-[rgba(255,255,255,0.1)] text-[#94A3B8]"
                    }`}>
                      {initials(displayName(m))}
                    </div>
                    <div
                      className="max-w-[75%] rounded-xl px-3 py-2 text-sm text-[#EEF2FF]"
                      style={{ background: isMe ? "#1e3a5f" : "rgba(255,255,255,0.07)" }}
                    >
                      {!isMe && (
                        <div className="mb-0.5 text-[10px] font-semibold opacity-60">{displayName(m)}</div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.message}</div>
                      <div className={`mt-0.5 text-[9px] text-[#94A3B8] ${isMe ? "text-right" : ""}`}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {filterError && (
            <p className="shrink-0 px-4 pb-1 text-[11px] text-red-400">{filterError}</p>
          )}
          <div className="flex shrink-0 items-center gap-2 border-t border-[rgba(255,255,255,0.08)] p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); if (filterError) setFilterError(null); }}
              onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
              placeholder="Mensagem..."
              className="flex-1 rounded-lg px-3 py-2 text-sm text-[#EEF2FF] outline-none placeholder:text-[#94A3B8]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

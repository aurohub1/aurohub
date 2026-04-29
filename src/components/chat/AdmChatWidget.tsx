"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  X, ChevronDown, ChevronUp, ArrowLeft, Send, MessageCircle,
} from "lucide-react";

interface Room {
  id: string;
  licensee_id: string;
  store_id: string | null;
  type: "loja" | "franquia";
  name: string;
  created_at: string;
  licensee_name: string | null;
  store_name: string | null;
  last_msg: { content: string; sender_name: string; created_at: string } | null;
  unread: boolean;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

type RoomRow = {
  id: string;
  licensee_id: string;
  store_id: string | null;
  type: string;
  name: string;
  created_at: string;
  licensees: { name: string } | null;
  stores: { name: string } | null;
};

interface Props {
  isOpen: boolean;
  minimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onUnreadChange?: (count: number) => void;
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

export default function AdmChatWidget({ isOpen, minimized, onClose, onMinimize, onRestore, onUnreadChange }: Props) {
  const [profile, setProfile]         = useState<FullProfile | null>(null);
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages]       = useState<ChatMsg[]>([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  useEffect(() => {
    getProfile(supabase).then(p => setProfile(p));
  }, []);

  const loadRooms = useCallback(async (admId: string) => {
    setLoading(true);

    const { data: rawRooms } = await supabase
      .from("chat_rooms")
      .select("id, licensee_id, store_id, type, name, created_at, licensees(name), stores(name)")
      .order("created_at", { ascending: true });

    if (!rawRooms || rawRooms.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomsData = rawRooms as unknown as RoomRow[];
    const roomIds   = roomsData.map(r => r.id);

    // Last message per room
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("room_id, content, sender_name, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, { content: string; sender_name: string; created_at: string }>();
    for (const m of (msgs ?? []) as { room_id: string; content: string; sender_name: string; created_at: string }[]) {
      if (!lastMsgMap.has(m.room_id)) lastMsgMap.set(m.room_id, m);
    }

    // ADM read receipts
    const { data: receipts } = await supabase
      .from("chat_read_receipts")
      .select("room_id, last_read_at")
      .eq("user_id", admId)
      .eq("is_adm", true);

    const receiptMap = new Map(
      ((receipts ?? []) as { room_id: string; last_read_at: string }[]).map(r => [r.room_id, r.last_read_at]),
    );

    const enriched: Room[] = roomsData.map(r => {
      const lastMsg  = lastMsgMap.get(r.id) ?? null;
      const lastRead = receiptMap.get(r.id);
      const unread   = lastMsg ? (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead)) : false;
      return {
        id: r.id,
        licensee_id: r.licensee_id,
        store_id: r.store_id ?? null,
        type: r.type as "loja" | "franquia",
        name: r.name,
        created_at: r.created_at,
        licensee_name: r.licensees?.name ?? null,
        store_name: r.stores?.name ?? null,
        last_msg: lastMsg,
        unread,
      };
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
    if (profile) loadRooms(profile.id);
  }, [profile, loadRooms]);

  // Notify parent of unread count
  useEffect(() => {
    onUnreadChange?.(rooms.filter(r => r.unread).length);
  }, [rooms, onUnreadChange]);

  // Realtime: reload rooms on any message/room change
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("adm-chat-global-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadRooms(profile.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" },    () => loadRooms(profile.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, loadRooms]);

  // Load messages + upsert read receipt when entering a room
  useEffect(() => {
    if (!activeRoomId || !profile) { setMessages([]); return; }
    let alive = true;

    (async () => {
      // Mark as read (ADM — is_adm: true so users don't see "seen")
      await supabase.from("chat_read_receipts").upsert(
        { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: true },
        { onConflict: "room_id,user_id" },
      );
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, unread: false } : r));

      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_id, sender_name, content, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true });
      if (alive) setMessages((data ?? []) as ChatMsg[]);
    })();

    const ch = supabase
      .channel(`adm-chat-room-${activeRoomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as ChatMsg;
            return prev.some(x => x.id === m.id) ? prev : [...prev, m];
          });
          // Keep receipt updated while ADM is viewing
          supabase.from("chat_read_receipts").upsert(
            { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: true },
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
    setSending(true);
    setInput("");
    try {
      await supabase.from("chat_messages").insert({
        room_id: activeRoomId,
        sender_id: profile.id,
        sender_name: profile.name ?? "ADM",
        content: text,
      });
    } finally {
      setSending(false);
    }
  }, [input, activeRoomId, profile, sending]);

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null;
  const unreadCount = rooms.filter(r => r.unread).length;

  return (
    <div
      role="dialog"
      aria-label="Chat Interno ADM"
      style={{ display: isOpen ? "flex" : "none", width: 360, height: minimized ? 48 : 560 }}
      className="fixed bottom-4 right-[380px] z-[9998] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
    >
      {/* ── Header ── */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 ${minimized ? "h-12 cursor-pointer" : "py-2.5"}`}
        onClick={minimized ? onRestore : undefined}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
          <MessageCircle size={14} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {activeRoomId && !minimized ? (activeRoom?.name ?? "Chat") : "Chat Interno"}
          </span>
          {!activeRoomId && !minimized && unreadCount > 0 && (
            <span className="flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        {activeRoomId && !minimized && (
          <button
            onClick={(e) => { e.stopPropagation(); setActiveRoomId(null); }}
            aria-label="Voltar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); minimized ? onRestore() : onMinimize(); }}
          aria-label={minimized ? "Expandir" : "Minimizar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Fechar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>

      {!minimized && (
        <>
          {/* ── VIEW 1: Lista de salas ── */}
          {!activeRoomId && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <MessageCircle size={28} className="text-slate-300" />
                  <span className="text-sm text-slate-400">Nenhuma sala criada</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  <div className="flex flex-col gap-1.5">
                    {rooms.map(room => (
                      <button
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {initials(room.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-800">{room.name}</span>
                            {room.unread && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Não lido" />
                            )}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {room.licensee_name ?? "—"}
                            {room.store_name ? ` · ${room.store_name}` : ""}
                          </div>
                          {room.last_msg && (
                            <div className="truncate text-[10px] text-slate-400 mt-0.5">
                              {room.last_msg.sender_name}: {room.last_msg.content}
                            </div>
                          )}
                        </div>
                        {room.last_msg && (
                          <span className="shrink-0 text-[10px] text-slate-400">{relTime(room.last_msg.created_at)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VIEW 2: Conversa ── */}
          {activeRoomId && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="flex flex-col gap-3">
                  {messages.map(m => {
                    const isMe = m.sender_id === profile?.id;
                    return (
                      <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isMe ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {initials(m.sender_name)}
                        </div>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          isMe ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"
                        }`}>
                          {!isMe && (
                            <div className="mb-0.5 text-[10px] font-semibold opacity-60">{m.sender_name}</div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 p-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                  placeholder="Mensagem..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  aria-label="Enviar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

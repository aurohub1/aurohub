"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Send, MessageCircle, Plus, Search, Archive, X, User,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────── */

interface Room {
  id: string;
  licensee_id: string;
  store_id: string | null;
  type: "loja" | "franquia";
  name: string;
  created_at: string;
  licensee_name: string | null;
  store_name: string | null;
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

type RoomRow = {
  id: string;
  licensee_id: string;
  store_id: string | null;
  name: string;
  created_at: string;
};

interface Licensee { id: string; name: string | null }
interface Store    { id: string; name: string | null; licensee_id: string }

/* ── Helpers ───────────────────────────────────────── */

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

/* ── Page ──────────────────────────────────────────── */

export default function ChatPage() {
  const [profile, setProfile]           = useState<FullProfile | null>(null);
  const [rooms, setRooms]               = useState<Room[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [reply, setReply]               = useState("");
  const [sending, setSending]           = useState(false);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  // Chat enabled toggle
  const [chatEnabled, setChatEnabled]   = useState<boolean>(true);
  const [togglingChat, setTogglingChat] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [newName, setNewName]           = useState("");
  const [newLicenseeId, setNewLicenseeId] = useState("");
  const [newStoreId, setNewStoreId]     = useState("");
  const [licensees, setLicensees]       = useState<Licensee[]>([]);
  const [stores, setStores]             = useState<Store[]>([]);
  const [creating, setCreating]         = useState(false);

  /* ── Scroll automático ── */
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  /* ── Profile ── */
  useEffect(() => { getProfile(supabase).then(p => setProfile(p)); }, []);

  /* ── Chat enabled ── */
  useEffect(() => {
    fetch("/api/chat-status")
      .then(r => r.json())
      .then(d => setChatEnabled(d.enabled !== false));
  }, []);

  const toggleChat = useCallback(async () => {
    setTogglingChat(true);
    const next = !chatEnabled;
    const res = await fetch("/api/chat-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (res.ok) {
      setChatEnabled(next);
    } else {
      const body = await res.json().catch(() => ({}));
      console.error("[toggleChat]", body);
      alert("Erro ao salvar: " + (body.error ?? res.status));
    }
    setTogglingChat(false);
  }, [chatEnabled]);

  /* ── Load rooms ── */
  const loadRooms = useCallback(async (admId: string) => {
    setLoading(true);

    const { data: rawRooms, error: roomsErr } = await supabase
      .from("chat_rooms")
      .select("id, licensee_id, store_id, name, created_at")
      .order("created_at", { ascending: true });

    if (roomsErr || !rawRooms || rawRooms.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomsData = rawRooms as unknown as RoomRow[];
    const roomIds   = roomsData.map(r => r.id);

    // Busca nomes de licensees e stores distintos em paralelo
    const licenseeIds = [...new Set(roomsData.map(r => r.licensee_id))];
    const storeIds    = [...new Set(roomsData.map(r => r.store_id).filter((id): id is string => !!id))];

    const [msgsRes, receiptsRes, licenseesRes, storesRes] = await Promise.all([
      supabase.from("chat_messages").select("room_id, message, sender_name, created_at").in("room_id", roomIds).order("created_at", { ascending: false }),
      supabase.from("chat_read_receipts").select("room_id, last_read_at").eq("user_id", admId).eq("is_adm", true),
      supabase.from("licensees").select("id, name").in("id", licenseeIds),
      storeIds.length > 0 ? supabase.from("stores").select("id, name").in("id", storeIds) : Promise.resolve({ data: [] }),
    ]);

    const lastMsgMap = new Map<string, { message: string; sender_name: string; created_at: string }>();
    for (const m of (msgsRes.data ?? []) as { room_id: string; message: string; sender_name: string; created_at: string }[]) {
      if (!lastMsgMap.has(m.room_id)) lastMsgMap.set(m.room_id, m);
    }

    const receiptMap = new Map(
      ((receiptsRes.data ?? []) as { room_id: string; last_read_at: string }[]).map(r => [r.room_id, r.last_read_at]),
    );

    const licenseeNameMap = new Map(
      ((licenseesRes.data ?? []) as { id: string; name: string }[]).map(l => [l.id, l.name]),
    );
    const storeNameMap = new Map(
      ((storesRes.data ?? []) as { id: string; name: string }[]).map(s => [s.id, s.name]),
    );

    const enriched: Room[] = roomsData.map(r => {
      const lastMsg  = lastMsgMap.get(r.id) ?? null;
      const lastRead = receiptMap.get(r.id);
      const unread   = lastMsg ? (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead)) : false;
      return {
        id: r.id,
        licensee_id: r.licensee_id,
        store_id: r.store_id ?? null,
        type: r.store_id ? "loja" : "franquia",
        name: r.name,
        created_at: r.created_at,
        licensee_name: licenseeNameMap.get(r.licensee_id) ?? null,
        store_name: r.store_id ? (storeNameMap.get(r.store_id) ?? null) : null,
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

  useEffect(() => { if (profile) loadRooms(profile.id); }, [profile, loadRooms]);

  /* ── Realtime: rooms + messages ── */
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("chat-page-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadRooms(profile.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms"    }, () => loadRooms(profile.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, loadRooms]);

  /* ── Load messages + read receipt when room changes ── */
  useEffect(() => {
    if (!activeRoomId || !profile) { setMessages([]); return; }
    let alive = true;

    (async () => {
      await supabase.from("chat_read_receipts").upsert(
        { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: true },
        { onConflict: "room_id,user_id" },
      );
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, unread: false } : r));

      const { data } = await supabase
        .from("chat_messages")
        .select("id, user_id, sender_name, message, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true });
      if (alive) setMessages((data ?? []) as ChatMsg[]);
    })();

    const ch = supabase
      .channel(`chat-page-room-${activeRoomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as ChatMsg;
            return prev.some(x => x.id === m.id) ? prev : [...prev, m];
          });
          supabase.from("chat_read_receipts").upsert(
            { room_id: activeRoomId, user_id: profile.id, last_read_at: new Date().toISOString(), is_adm: true },
            { onConflict: "room_id,user_id" },
          );
        },
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [activeRoomId, profile]);

  /* ── Send message ── */
  const sendMessage = useCallback(async () => {
    const text = reply.trim();
    if (!text || !activeRoomId || !profile || sending) return;
    setSending(true);
    setReply("");
    try {
      await supabase.from("chat_messages").insert({
        room_id: activeRoomId,
        user_id: profile.id,
        sender_name: "Equipe Aurovista",
        message: text,
      });
    } finally {
      setSending(false);
    }
  }, [reply, activeRoomId, profile, sending]);

  /* ── Archive room (delete com confirmação) ── */
  const archiveRoom = useCallback(async () => {
    if (!activeRoomId) return;
    const room = rooms.find(r => r.id === activeRoomId);
    if (!window.confirm(`Arquivar a sala "${room?.name ?? ""}"? Todas as mensagens serão removidas.`)) return;
    await supabase.from("chat_rooms").delete().eq("id", activeRoomId);
    setRooms(prev => prev.filter(r => r.id !== activeRoomId));
    setActiveRoomId(null);
  }, [activeRoomId, rooms]);

  /* ── Open modal: fetch licensees + stores ── */
  const openModal = useCallback(async () => {
    setNewName(""); setNewLicenseeId(""); setNewStoreId("");
    const [licRes, storeRes] = await Promise.all([
      supabase.from("licensees").select("id, name").order("name"),
      supabase.from("stores").select("id, name, licensee_id").order("name"),
    ]);
    setLicensees((licRes.data ?? []) as Licensee[]);
    setStores((storeRes.data ?? []) as Store[]);
    setModalOpen(true);
  }, []);

  /* ── Create room ── */
  const createRoom = useCallback(async () => {
    if (!newName.trim() || !newLicenseeId) return;
    setCreating(true);
    try {
      await supabase.from("chat_rooms").insert({
        name: newName.trim(),
        licensee_id: newLicenseeId,
        store_id: newStoreId || null,
        type: newStoreId ? "loja" : "franquia",
      });
      setModalOpen(false);
      if (profile) loadRooms(profile.id);
    } finally {
      setCreating(false);
    }
  }, [newName, newLicenseeId, newStoreId, profile, loadRooms]);

  /* ── Derived ── */
  const activeRoom      = rooms.find(r => r.id === activeRoomId) ?? null;
  const filteredRooms   = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.licensee_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredStores  = stores.filter(s => s.licensee_id === newLicenseeId);

  /* ── Render ── */
  return (
    <>
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#EEF2FF]">Chat Interno</h2>
          <p className="mt-0.5 text-sm text-[#94A3B8]">
            {rooms.length} {rooms.length === 1 ? "sala" : "salas"} ·{" "}
            {rooms.filter(r => r.unread).length} não {rooms.filter(r => r.unread).length === 1 ? "lida" : "lidas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleChat}
            disabled={togglingChat}
            title={chatEnabled ? "Chat ativo — clique para desativar" : "Chat desativado — clique para ativar"}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              chatEnabled
                ? "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] text-emerald-400 hover:bg-[rgba(16,185,129,0.15)]"
                : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] text-[#94A3B8] hover:bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            <div className={`relative h-4 w-7 rounded-full transition-colors ${chatEnabled ? "bg-emerald-500" : "bg-[rgba(255,255,255,0.15)]"}`}>
              <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${chatEnabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </div>
            Chat ativo
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D97706]"
          >
            <Plus size={14} /> Nova sala
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] -mx-6 mt-0">

        {/* ── Col esquerda: lista de salas ──────────── */}
        <div className="flex w-80 shrink-0 flex-col border-r border-[rgba(255,255,255,0.08)]" style={{ background: "#111827" }}>
          {/* Busca */}
          <div className="border-b border-[rgba(255,255,255,0.05)] px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <Search size={13} className="shrink-0 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar sala..."
                className="flex-1 bg-transparent text-[13px] text-[#EEF2FF] outline-none placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-emerald-400" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <MessageCircle size={24} className="text-[rgba(255,255,255,0.2)]" />
                <span className="text-sm text-[#94A3B8]">
                  {search ? "Nenhuma sala encontrada" : "Nenhuma sala criada"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.05)]">
                {filteredRooms.map(room => {
                  const isActive = activeRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoomId(room.id)}
                      className={`flex items-start gap-2.5 px-3 py-3 text-left transition-colors ${
                        isActive ? "bg-[rgba(99,102,241,0.1)]" : "hover:bg-[rgba(255,255,255,0.04)]"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive ? "bg-[#6366F1] text-white" : "bg-[rgba(99,102,241,0.2)] text-[#EEF2FF]"
                      }`}>
                        {initials(room.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-[#EEF2FF]">
                            {room.name}
                          </span>
                          {room.unread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-label="Não lida" />
                          )}
                        </div>
                        <div className="truncate text-[11px] text-[#94A3B8]">
                          {room.licensee_name ?? "—"}
                          {room.store_name ? ` · ${room.store_name}` : ""}
                        </div>
                        {room.last_msg && (
                          <div className="mt-0.5 truncate text-[11px] text-[#94A3B8]">
                            <span className="font-medium">{room.last_msg.sender_name}:</span>{" "}
                            {room.last_msg.message}
                          </div>
                        )}
                      </div>
                      {room.last_msg && (
                        <span className="shrink-0 text-[10px] text-[#94A3B8] pt-0.5">
                          {relTime(room.last_msg.created_at)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Col direita: conversa ─────────────────── */}
        <div className="flex flex-1 flex-col min-w-0" style={{ background: "#0c0c12" }}>
          {!activeRoom ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#94A3B8]">
              <MessageCircle size={36} className="text-[rgba(255,255,255,0.15)]" />
              <span className="text-sm">Selecione uma sala para conversar</span>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#EEF2FF]">{activeRoom.name}</div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {activeRoom.licensee_name ?? "—"}
                    {activeRoom.store_name ? ` · ${activeRoom.store_name}` : ""}
                    {" · "}
                    <span className={`font-medium ${activeRoom.type === "loja" ? "text-blue-400" : "text-purple-400"}`}>
                      {activeRoom.type === "loja" ? "Loja" : "Franquia"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={archiveRoom}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Archive size={13} /> Arquivar
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[#94A3B8]">
                    <MessageCircle size={24} className="text-[rgba(255,255,255,0.15)]" />
                    <span className="text-sm">Nenhuma mensagem ainda</span>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {messages.map(m => {
                    const isMe = m.user_id === profile?.id;
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isMe ? "bg-[#6366F1] text-white" : "bg-[rgba(255,255,255,0.1)] text-[#94A3B8]"
                        }`}>
                          {isMe ? <User size={14} /> : initials(m.sender_name)}
                        </div>
                        <div
                          className="flex max-w-[65%] flex-col gap-0.5"
                        >
                          {!isMe && (
                            <span className="pl-1 text-[11px] font-medium text-[#94A3B8]">{m.sender_name}</span>
                          )}
                          <div
                            className="rounded-2xl px-4 py-2.5 text-sm text-[#EEF2FF]"
                            style={{ background: isMe ? "#1e3a5f" : "rgba(255,255,255,0.07)" }}
                          >
                            <div className="whitespace-pre-wrap break-words">{m.message}</div>
                          </div>
                          <span className={`text-[10px] text-[#94A3B8] ${isMe ? "text-right pr-1" : "pl-1"}`}>
                            {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input */}
              <div className="flex shrink-0 items-center gap-2 border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                  placeholder="Mensagem..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-[#EEF2FF] outline-none placeholder:text-[#94A3B8]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !reply.trim()}
                  aria-label="Enviar"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal: Nova Sala ─────────────────────────── */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-[9990] bg-black/50" onClick={() => setModalOpen(false)} />
          <div
            className="fixed left-1/2 top-1/2 z-[9991] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
            style={{ background: "#111827" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#EEF2FF]">Nova sala de chat</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Nome */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">Nome da sala</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Suporte Loja Centro"
                  className="w-full rounded-lg px-3 py-2 text-sm text-[#EEF2FF] outline-none placeholder:text-[#94A3B8]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Licensee */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">Cliente (licensee)</label>
                <select
                  value={newLicenseeId}
                  onChange={(e) => { setNewLicenseeId(e.target.value); setNewStoreId(""); }}
                  className="w-full rounded-lg px-3 py-2 text-sm text-[#EEF2FF] outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <option value="">Selecionar cliente...</option>
                  {licensees.map(l => (
                    <option key={l.id} value={l.id}>{l.name ?? l.id}</option>
                  ))}
                </select>
              </div>

              {/* Store (opcional) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">
                  Loja / Unidade <span className="font-normal text-[#94A3B8] opacity-60">(opcional — deixar vazio para sala da franquia)</span>
                </label>
                <select
                  value={newStoreId}
                  onChange={(e) => setNewStoreId(e.target.value)}
                  disabled={!newLicenseeId}
                  className="w-full rounded-lg px-3 py-2 text-sm text-[#EEF2FF] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <option value="">Sala da franquia (todas as lojas)</option>
                  {filteredStores.map(s => (
                    <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)]"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancelar
              </button>
              <button
                onClick={createRoom}
                disabled={creating || !newName.trim() || !newLicenseeId}
                className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D97706] disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar sala"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

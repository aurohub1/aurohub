"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Send, Check, MessageCircle, RefreshCw, User, Bot, Headphones,
  Sparkles, RotateCcw, BookPlus, X, ChevronRight, ChevronLeft,
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

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  score: number;
}

interface AiData {
  summary: string;
  articles: KBArticle[];
  suggested_reply: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  bot:      { label: "Bot",               cls: "bg-blue-100 text-blue-700" },
  human:    { label: "Aguardando equipe", cls: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolvido",         cls: "bg-green-100 text-green-700" },
};

export default function AdmSuportePage() {
  const [profile, setProfile]         = useState<FullProfile | null>(null);
  const [tickets, setTickets]         = useState<Ticket[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [reply, setReply]             = useState("");
  const [sending, setSending]         = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  // AI copilot state
  const [aiOpen, setAiOpen]           = useState(false);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiData, setAiData]           = useState<AiData | null>(null);
  const [editedReply, setEditedReply] = useState("");

  // Save to KB modal
  const [kbModal, setKbModal]         = useState(false);
  const [kbForm, setKbForm]           = useState({ title: "", content: "", category: "geral" });
  const [kbSaving, setKbSaving]       = useState(false);

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
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    const licenseeIds = [...new Set(rows.map((r) => r.licensee_id).filter(Boolean))] as string[];

    const [usersRes, licenseesRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, name").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      licenseeIds.length > 0
        ? supabase.from("licensees").select("id, name").in("id", licenseeIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    ]);
    const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.name]));
    const licMap  = new Map((licenseesRes.data ?? []).map((l) => [l.id, l.name]));

    setTickets(
      rows.map((r) => ({
        ...r,
        user_name:     r.user_id     ? (userMap.get(r.user_id)     ?? null) : null,
        licensee_name: r.licensee_id ? (licMap.get(r.licensee_id)  ?? null) : null,
      })),
    );
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
      .channel("adm-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, loadTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadTickets]);

  useEffect(() => {
    if (!activeId) { setMessages([]); setAiData(null); return; }
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
      .channel(`adm-msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            return prev.some((x) => x.id === m.id) ? prev : [...prev, m];
          });
        },
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [activeId]);

  // Auto-fetch AI analysis when AI panel opens or ticket changes
  const fetchAi = useCallback(async (ticketId: string, msgs: Message[], licensee_id: string | null) => {
    if (!ticketId) return;
    setAiLoading(true);
    setAiData(null);
    try {
      const apiMessages = msgs.map((m) => ({
        role: m.sender === "human" ? "assistant" as const : "user" as const,
        content: m.message,
      }));
      const res = await fetch("/api/kb/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, licensee_id }),
      });
      const data = await res.json() as AiData;
      setAiData(data);
      setEditedReply(data.suggested_reply ?? "");
    } catch { /* silent */ } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aiOpen && activeId && messages.length > 0) {
      const ticket = tickets.find((t) => t.id === activeId) ?? null;
      void fetchAi(activeId, messages, ticket?.licensee_id ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOpen, activeId]);

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

      const ticket = tickets.find((t) => t.id === activeId);
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
    } finally { setSending(false); }
  }, [reply, activeId, profile, sending, tickets]);

  const resolve = useCallback(async () => {
    if (!activeId) return;
    await supabase.from("support_tickets")
      .update({ status: "resolved", unread_adm: false, updated_at: new Date().toISOString() })
      .eq("id", activeId);
  }, [activeId]);

  async function saveToKb() {
    if (!kbForm.title.trim() || !kbForm.content.trim()) return;
    setKbSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("knowledge_base").insert({
      title: kbForm.title.trim(),
      content: kbForm.content.trim(),
      category: kbForm.category,
      tags: [],
      is_active: true,
      created_by: user?.id ?? null,
    });
    setKbSaving(false);
    setKbModal(false);
  }

  const active = tickets.find((t) => t.id === activeId) ?? null;
  const counts = {
    bot:      tickets.filter((t) => t.status === "bot").length,
    human:    tickets.filter((t) => t.status === "human").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <>
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Suporte</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {counts.human} aguardando · {counts.bot} no bot · {counts.resolved} resolvidos
          </p>
        </div>
        <button
          onClick={loadTickets}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="mt-4 h-20 w-full animate-pulse rounded-lg bg-slate-200" />
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum ticket ainda.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          {/* ── Lista ── */}
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
            {tickets.map((t) => {
              const meta    = STATUS_META[t.status] ?? STATUS_META.bot;
              const isActive = activeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveId(t.id); setAiData(null); }}
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
                    {new Date(t.updated_at).toLocaleString("pt-BR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Chat + AI panel ── */}
          <div className="flex max-h-[70vh] overflow-hidden rounded-xl border border-slate-200">
            {/* Chat */}
            <div className={`flex flex-col overflow-hidden bg-white ${aiOpen ? "flex-1 border-r border-slate-200" : "w-full"}`}>
              {!active ? (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                  Selecione um ticket
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {active.user_name || "(sem nome)"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[active.status].cls}`}>
                          {STATUS_META[active.status].label}
                        </span>
                        <span>{active.licensee_name || "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* AI toggle */}
                      <button
                        onClick={() => setAiOpen((v) => !v)}
                        title="IA Assistente"
                        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          color: "#6FA3F7",
                          background: aiOpen ? "rgba(26,86,196,0.3)" : "rgba(26,86,196,0.15)",
                          border: aiOpen ? "1px solid rgba(26,86,196,0.65)" : "1px solid rgba(26,86,196,0.4)",
                        }}
                        onMouseEnter={(e) => {
                          if (!aiOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,86,196,0.25)";
                        }}
                        onMouseLeave={(e) => {
                          if (!aiOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,86,196,0.15)";
                        }}
                      >
                        <Sparkles size={13} />
                        <span>IA</span>
                      </button>
                      {active.status !== "resolved" && (
                        <button
                          onClick={resolve}
                          className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          <Check size={13} /> Resolver
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="flex flex-col gap-3">
                      {messages.map((m) => {
                        const isHuman = m.sender === "human";
                        const isBot   = m.sender === "bot";
                        return (
                          <div key={m.id} className={`flex gap-2 ${isHuman ? "flex-row-reverse" : "flex-row"}`}>
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                              style={
                                isHuman ? { background: "#FEF3C7", color: "#92400E" }
                                : isBot  ? { background: "linear-gradient(135deg, #C084FC, #F472B6)" }
                                : { background: "#2563EB", color: "#fff" }
                              }
                            >
                              {isHuman ? <Headphones size={13} /> : isBot ? <span className="text-[9px] font-bold text-white">LU</span> : <User size={13} />}
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
                        onKeyDown={(e) => e.key === "Enter" && !sending && void sendReply()}
                        placeholder="Responder..."
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={() => void sendReply()}
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

            {/* ── AI Panel ── */}
            {aiOpen && active && (
              <div className="flex w-72 shrink-0 flex-col overflow-hidden bg-slate-50">
                {/* AI header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-violet-600" />
                    <span className="text-[13px] font-semibold text-slate-700">IA Assistente</span>
                  </div>
                  <button
                    onClick={() => {
                      const ticket = tickets.find((t) => t.id === activeId) ?? null;
                      void fetchAi(activeId!, messages, ticket?.licensee_id ?? null);
                    }}
                    title="Atualizar análise"
                    disabled={aiLoading}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40"
                  >
                    <RotateCcw size={13} className={aiLoading ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {aiLoading ? (
                    <div className="flex flex-col gap-3 pt-4">
                      {[72, 48, 96].map((w) => (
                        <div
                          key={w}
                          className={`h-3 w-${w} animate-pulse rounded-full bg-slate-200`}
                        />
                      ))}
                    </div>
                  ) : !aiData ? (
                    <div className="pt-6 text-center text-xs text-slate-400">
                      Clique em ↺ para analisar a conversa
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Summary */}
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Resumo do problema
                        </p>
                        <p className="text-[12px] leading-relaxed text-slate-700">{aiData.summary}</p>
                      </div>

                      {/* KB articles */}
                      {aiData.articles.length > 0 && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Artigos relacionados
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {aiData.articles.map((art) => (
                              <div
                                key={art.id}
                                className="rounded-lg border border-slate-200 bg-white p-2.5"
                              >
                                <div className="text-[11px] font-semibold text-slate-700">{art.title}</div>
                                <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                                  {art.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested reply */}
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Sugestão de resposta
                        </p>
                        <textarea
                          value={editedReply}
                          onChange={(e) => setEditedReply(e.target.value)}
                          rows={5}
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] leading-relaxed text-slate-700 outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={() => setReply(editedReply)}
                          className="mt-1.5 w-full rounded-lg bg-blue-600 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          Usar como resposta
                        </button>
                      </div>

                      {/* Save to KB */}
                      <button
                        onClick={() => {
                          setKbForm({
                            title: aiData.summary.slice(0, 80),
                            content: editedReply,
                            category: "geral",
                          });
                          setKbModal(true);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[11px] font-medium text-slate-500 hover:border-violet-400 hover:text-violet-600"
                      >
                        <BookPlus size={13} /> Salvar solução na KB
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save to KB modal ── */}
      {kbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-800">Salvar na Base de Conhecimento</h3>
              <button onClick={() => setKbModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Título</label>
              <input
                value={kbForm.title}
                onChange={(e) => setKbForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Categoria</label>
              <select
                value={kbForm.category}
                onChange={(e) => setKbForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
              >
                {["instagram","publicacao","templates","usuarios","planos","limites","editor","geral"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Conteúdo</label>
              <textarea
                value={kbForm.content}
                onChange={(e) => setKbForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setKbModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => void saveToKb()}
                disabled={kbSaving}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {kbSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

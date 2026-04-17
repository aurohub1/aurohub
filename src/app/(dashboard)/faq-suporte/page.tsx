"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Article {
  id: string; title: string; category: string; content: string;
  tags: string | null; status: string; views: number;
  created_at: string; updated_at: string;
}

interface Ticket {
  id: string; client_name: string; client_email: string | null;
  subject: string; category: string; priority: string; status: string;
  assigned_to: string | null; created_at: string; updated_at: string;
}

interface Message {
  id: string; ticket_id: string; sender: string;
  is_staff: boolean; message: string; created_at: string;
}

type ViewMode = "faq" | "tickets";

/* ── Constants ───────────────────────────────────── */

const CATEGORIES = ["Primeiros Passos", "Publicação", "Templates", "Planos & Pagamento", "Técnico"];

const TICKET_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: "Aberto",       bg: "var(--red3)",    text: "var(--red)" },
  in_progress: { label: "Em andamento", bg: "var(--gold3)",   text: "var(--gold)" },
  resolved:    { label: "Resolvido",    bg: "var(--green3)",  text: "var(--green)" },
  closed:      { label: "Fechado",      bg: "var(--bg3)",     text: "var(--txt3)" },
};

const PRIORITY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  baixa:   { label: "Baixa",   bg: "var(--bg3)",     text: "var(--txt3)" },
  media:   { label: "Média",   bg: "var(--gold3)",   text: "var(--gold)" },
  alta:    { label: "Alta",    bg: "var(--orange3)",  text: "var(--orange)" },
  urgente: { label: "Urgente", bg: "var(--red3)",     text: "var(--red)" },
};

/* ── Component ───────────────────────────────────── */

export default function FaqSuportePage() {
  const [view, setView] = useState<ViewMode>("faq");
  const [articles, setArticles] = useState<Article[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // FAQ filters
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCat, setFaqCat] = useState("");
  const [faqStatus, setFaqStatus] = useState("");

  // FAQ modal
  const [artModal, setArtModal] = useState(false);
  const [artEditId, setArtEditId] = useState<string | null>(null);
  const [artForm, setArtForm] = useState({ title: "", category: CATEGORIES[0], content: "", tags: "", status: "draft" });
  const [artSaving, setArtSaving] = useState(false);
  const [artError, setArtError] = useState("");

  // Ticket filters
  const [tickSearch, setTickSearch] = useState("");
  const [tickStatus, setTickStatus] = useState("");
  const [tickPriority, setTickPriority] = useState("");

  // Ticket detail
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // Delete
  const [deleteArt, setDeleteArt] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [aR, tR] = await Promise.all([
        supabase.from("faq_articles").select("*").order("updated_at", { ascending: false }),
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      ]);
      setArticles((aR.data as Article[]) ?? []);
      setTickets((tR.data as Ticket[]) ?? []);
    } catch (err) { console.error("[FAQ] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── KPIs ──────────────────────────────────────── */

  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return {
      totalArt: articles.length,
      ticketsOpen: tickets.filter((t) => t.status === "open").length,
      resolvedToday: tickets.filter((t) => t.status === "resolved" && t.updated_at.startsWith(hoje)).length,
      avgResponse: "—",
    };
  }, [articles, tickets]);

  /* ── FAQ filtered ──────────────────────────────── */

  const filteredArt = useMemo(() => {
    return articles.filter((a) => {
      const q = faqSearch.toLowerCase();
      const ms = !q || a.title.toLowerCase().includes(q) || (a.tags ?? "").toLowerCase().includes(q);
      const mc = !faqCat || a.category === faqCat;
      const mst = !faqStatus || a.status === faqStatus;
      return ms && mc && mst;
    });
  }, [articles, faqSearch, faqCat, faqStatus]);

  /* ── Ticket filtered ───────────────────────────── */

  const filteredTick = useMemo(() => {
    return tickets.filter((t) => {
      const q = tickSearch.toLowerCase();
      const ms = !q || t.client_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
      const mst = !tickStatus || t.status === tickStatus;
      const mp = !tickPriority || t.priority === tickPriority;
      return ms && mst && mp;
    });
  }, [tickets, tickSearch, tickStatus, tickPriority]);

  /* ── FAQ actions ───────────────────────────────── */

  function openNewArt() {
    setArtEditId(null);
    setArtForm({ title: "", category: CATEGORIES[0], content: "", tags: "", status: "draft" });
    setArtError(""); setArtModal(true);
  }

  function openEditArt(a: Article) {
    setArtEditId(a.id);
    setArtForm({ title: a.title, category: a.category, content: a.content, tags: a.tags ?? "", status: a.status });
    setArtError(""); setArtModal(true);
  }

  async function saveArticle() {
    if (!artForm.title.trim()) { setArtError("Título obrigatório."); return; }
    setArtSaving(true); setArtError("");
    try {
      const payload = {
        title: artForm.title.trim(), category: artForm.category,
        content: artForm.content, tags: artForm.tags.trim() || null,
        status: artForm.status, updated_at: new Date().toISOString(),
      };
      if (artEditId) {
        const { error } = await supabase.from("faq_articles").update(payload).eq("id", artEditId);
        if (error) { setArtError(error.message); return; }
      } else {
        const { error } = await supabase.from("faq_articles").insert(payload);
        if (error) { setArtError(error.message); return; }
      }
      setArtModal(false); await loadData();
    } catch { setArtError("Erro ao salvar."); }
    finally { setArtSaving(false); }
  }

  async function deleteArticle(id: string) {
    await supabase.from("faq_articles").delete().eq("id", id);
    setDeleteArt(null); await loadData();
  }

  async function toggleArtStatus(a: Article) {
    const next = a.status === "published" ? "draft" : "published";
    await supabase.from("faq_articles").update({ status: next }).eq("id", a.id);
    await loadData();
  }

  /* ── Ticket actions ────────────────────────────── */

  async function openTicketDetail(t: Ticket) {
    setDetailTicket(t);
    setLoadingMsgs(true);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages((data as Message[]) ?? []);
    setLoadingMsgs(false);
  }

  async function sendReply() {
    if (!reply.trim() || !detailTicket) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({ ticket_id: detailTicket.id, sender: "ADM", is_staff: true, message: reply.trim() });
    if (detailTicket.status === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", detailTicket.id);
      setDetailTicket((prev) => prev ? { ...prev, status: "in_progress" } : null);
    }
    setReply("");
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", detailTicket.id).order("created_at");
    setMessages((data as Message[]) ?? []);
    setSending(false);
    await loadData();
  }

  async function changeTicketStatus(id: string, status: string) {
    await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (detailTicket?.id === id) setDetailTicket((prev) => prev ? { ...prev, status } : null);
    await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiMini label="Total artigos" value={String(kpis.totalArt)} color="var(--blue)" />
        <KpiMini label="Tickets abertos" value={String(kpis.ticketsOpen)} color="var(--red)" />
        <KpiMini label="Resolvidos hoje" value={String(kpis.resolvedToday)} color="var(--green)" />
        <KpiMini label="Tempo médio" value={kpis.avgResponse} color="var(--gold)" />
      </div>

      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">FAQ & Suporte</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Base de conhecimento e tickets de suporte</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
            <button onClick={() => setView("faq")} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${view === "faq" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>FAQ</button>
            <button onClick={() => setView("tickets")} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${view === "tickets" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Tickets</button>
          </div>
          {view === "faq" && (
            <button onClick={openNewArt} className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Novo artigo
            </button>
          )}
        </div>
      </div>

      {/* ── FAQ VIEW ─────────────────────────────── */}
      {view === "faq" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <input type="text" placeholder="Buscar artigo..." value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
            </div>
            <select value={faqCat} onChange={(e) => setFaqCat(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
              <option value="">Categoria</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
              {[{ k: "", l: "Todos" }, { k: "published", l: "Publicados" }, { k: "draft", l: "Rascunho" }].map((t) => (
                <button key={t.k} onClick={() => setFaqStatus(t.k)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${faqStatus === t.k ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{t.l}</button>
              ))}
            </div>
          </div>

          {/* Articles list */}
          {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
          : filteredArt.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum artigo encontrado.</div>
          : (
            <div className="flex flex-col gap-3">
              {filteredArt.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-[var(--bdr)] px-5 py-4 hover:bg-[var(--hover-bg)]" style={{ background: "var(--card-bg)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[var(--txt)]">{a.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${a.status === "published" ? "bg-[var(--green3)] text-[var(--green)]" : "bg-[var(--bg3)] text-[var(--txt3)]"}`}>
                        {a.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--txt3)]">
                      <span className="rounded-md bg-[var(--bg3)] px-1.5 py-0.5 text-[10px] font-semibold">{a.category}</span>
                      <span>{a.views} visualizações</span>
                      <span>{new Date(a.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                      {a.tags && <span className="text-[var(--txt3)] italic">{a.tags}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button onClick={() => openEditArt(a)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                    <button onClick={() => toggleArtStatus(a)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">{a.status === "published" ? "Despublicar" : "Publicar"}</button>
                    <button onClick={() => setDeleteArt(a.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TICKETS VIEW ─────────────────────────── */}
      {view === "tickets" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <input type="text" placeholder="Buscar cliente, assunto..." value={tickSearch} onChange={(e) => setTickSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
            </div>
            <select value={tickStatus} onChange={(e) => setTickStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
              <option value="">Status</option>
              {Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={tickPriority} onChange={(e) => setTickPriority(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
              <option value="">Prioridade</option>
              {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
            : filteredTick.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum ticket encontrado.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--bdr)]">
                      {["Cliente", "Assunto", "Categoria", "Prioridade", "Status", "Criado em", "Ações"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTick.map((t) => {
                      const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
                      const pri = PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.media;
                      return (
                        <tr key={t.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                          <td className="whitespace-nowrap pl-5 pr-4 py-3">
                            <div className="font-medium text-[var(--txt)]">{t.client_name}</div>
                            {t.client_email && <div className="text-[10px] text-[var(--txt3)]">{t.client_email}</div>}
                          </td>
                          <td className="px-4 py-3 text-[var(--txt)] max-w-[200px] truncate">{t.subject}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{t.category}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: pri.bg, color: pri.text }}>{pri.label}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</td>
                          <td className="whitespace-nowrap pr-5 pl-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => openTicketDetail(t)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Responder</button>
                              {t.status !== "closed" && (
                                <button onClick={() => changeTicketStatus(t.id, "closed")} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Fechar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Delete article confirm ───────────────── */}
      {deleteArt && (
        <Ov onClose={() => setDeleteArt(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir artigo?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Esta ação não pode ser desfeita.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteArt(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={() => deleteArticle(deleteArt)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Ov>
      )}

      {/* ── Article modal ────────────────────────── */}
      {artModal && (
        <Ov onClose={() => setArtModal(false)}>
          <div className="mx-4 flex w-full max-w-[580px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{artEditId ? "Editar artigo" : "Novo artigo"}</h2>
              <button onClick={() => setArtModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4">
                <Fld label="Título" value={artForm.title} onChange={(v) => setArtForm({ ...artForm, title: v })} placeholder="Como publicar no Instagram" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Categoria</label>
                    <select value={artForm.category} onChange={(e) => setArtForm({ ...artForm, category: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Status</label>
                    <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
                      <button onClick={() => setArtForm({ ...artForm, status: "published" })} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${artForm.status === "published" ? "bg-[var(--green3)] text-[var(--green)]" : "text-[var(--txt3)]"}`}>Publicado</button>
                      <button onClick={() => setArtForm({ ...artForm, status: "draft" })} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${artForm.status === "draft" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Rascunho</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Conteúdo</label>
                  <textarea value={artForm.content} onChange={(e) => setArtForm({ ...artForm, content: e.target.value })} placeholder="Escreva o conteúdo do artigo..." rows={10} className="w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-2 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)] resize-none" />
                </div>
                <Fld label="Tags (separadas por vírgula)" value={artForm.tags} onChange={(v) => setArtForm({ ...artForm, tags: v })} placeholder="instagram, publicação, tutorial" />
                {artError && <div className="rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{artError}</div>}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setArtModal(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={saveArticle} disabled={artSaving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{artSaving ? "Salvando..." : artEditId ? "Salvar" : "Criar"}</button>
            </div>
          </div>
        </Ov>
      )}

      {/* ── Ticket detail modal ──────────────────── */}
      {detailTicket && (
        <Ov onClose={() => setDetailTicket(null)}>
          <div className="mx-4 flex w-full max-w-[580px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold text-[var(--txt)] truncate">{detailTicket.subject}</h2>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--txt3)]">
                  <span>{detailTicket.client_name}</span>
                  {(() => { const st = TICKET_STATUS[detailTicket.status]; return <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: st.bg, color: st.text }}>{st.label}</span>; })()}
                </div>
              </div>
              <button onClick={() => setDetailTicket(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 border-b border-[var(--bdr)] px-6 py-3">
              {Object.entries(TICKET_STATUS).filter(([k]) => k !== detailTicket.status).map(([k, v]) => (
                <button key={k} onClick={() => changeTicketStatus(detailTicket.id, k)} className="rounded-lg border border-[var(--bdr)] px-3 py-1 text-[11px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                  {v.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMsgs ? <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
              : messages.length === 0 ? <div className="text-[12px] text-[var(--txt3)]">Nenhuma mensagem ainda.</div>
              : (
                <div className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_staff ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${m.is_staff ? "bg-[var(--orange3)] text-[var(--txt)]" : "bg-[var(--bg3)] text-[var(--txt)]"}`}>
                        <div className="text-[10px] font-bold text-[var(--txt3)] mb-0.5">{m.sender}</div>
                        <div className="text-[13px] whitespace-pre-wrap">{m.message}</div>
                        <div className="mt-1 text-[9px] text-[var(--txt3)]">{new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            {detailTicket.status !== "closed" && (
              <div className="flex gap-2 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
                <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} placeholder="Escreva sua resposta..." className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-40">
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            )}
          </div>
        </Ov>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Ov({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{children}</div>;
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glass flex flex-col gap-1 p-4 page-fade">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">{label}</div>
      <span className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

function Fld({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" /></div>;
}

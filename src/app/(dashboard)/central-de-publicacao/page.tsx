"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Post {
  id: string;
  user_id: string;
  licensee_id: string;
  format: string;
  field_values: Record<string, unknown>;
  scheduled_at: string;
  status: string;
  error_msg: string | null;
  image_url: string | null;
  ig_post_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Licensee { id: string; name: string; }
interface Store { id: string; name: string; licensee_id: string; }
interface Profile { id: string; name: string | null; store_id: string | null; licensee_id: string | null; }

interface Filters {
  search: string;
  format: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  licensee: string;
}

/* ── Constants ───────────────────────────────────── */

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "var(--blue3)", text: "var(--blue)", label: "Agendado" },
  published: { bg: "var(--green3)", text: "var(--green)", label: "Publicado" },
  failed:    { bg: "var(--red3)", text: "var(--red)", label: "Falhou" },
  cancelled: { bg: "var(--bg3)", text: "var(--txt3)", label: "Cancelado" },
};

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};

const REFRESH_INTERVAL = 30;

/* ── Helpers ─────────────────────────────────────── */

function formatDate(d: string): string {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getCaption(fv: Record<string, unknown>): string {
  return (fv.legenda ?? fv.caption ?? fv.destino ?? "") as string;
}

function getDestino(fv: Record<string, unknown>): string {
  return (fv.destino ?? fv.destination ?? "") as string;
}

/* ── Component ───────────────────────────────────── */

export default function CentralPublicacaoPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [filters, setFilters] = useState<Filters>({ search: "", format: "", status: "", dateFrom: "", dateTo: "", licensee: "" });
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [postsR, licR, storeR, profR] = await Promise.all([
        supabase.from("scheduled_posts").select("*").order("scheduled_at", { ascending: false }).limit(100),
        supabase.from("licensees").select("id, name"),
        supabase.from("stores").select("id, name, licensee_id"),
        supabase.from("profiles").select("id, name, store_id, licensee_id"),
      ]);
      setPosts((postsR.data as Post[]) ?? []);
      setLicensees((licR.data as Licensee[]) ?? []);
      setStores((storeR.data as Store[]) ?? []);
      setProfiles((profR.data as Profile[]) ?? []);
    } catch (err) {
      console.error("[Central] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Auto-refresh ──────────────────────────────── */

  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { loadData(); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadData]);

  /* ── Derived maps ──────────────────────────────── */

  const licMap = useMemo(() => {
    const m: Record<string, string> = {};
    licensees.forEach((l) => { m[l.id] = l.name; });
    return m;
  }, [licensees]);

  const profMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => { m[p.id] = p; });
    return m;
  }, [profiles]);

  const storesByLic = useMemo(() => {
    const m: Record<string, Store[]> = {};
    stores.forEach((s) => {
      if (!m[s.licensee_id]) m[s.licensee_id] = [];
      m[s.licensee_id].push(s);
    });
    return m;
  }, [stores]);

  function getStoreName(post: Post): string {
    const prof = profMap[post.user_id];
    if (prof?.store_id) {
      const store = stores.find((s) => s.id === prof.store_id);
      if (store) return store.name;
    }
    return "—";
  }

  /* ── KPIs ──────────────────────────────────────── */

  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const mesAtual = hoje.slice(0, 7);
    const postsHoje = posts.filter((p) => p.status === "published" && p.updated_at.startsWith(hoje)).length;
    const agendados = posts.filter((p) => p.status === "pending").length;
    const falhas = posts.filter((p) => p.status === "failed").length;
    const totalMes = posts.filter((p) => p.created_at.startsWith(mesAtual)).length;
    return { postsHoje, agendados, falhas, totalMes };
  }, [posts]);

  /* ── Filtered ──────────────────────────────────── */

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const lowerSearch = filters.search.toLowerCase();
      const licName = licMap[p.licensee_id] ?? "";
      const storeName = getStoreName(p);
      const destino = getDestino(p.field_values);

      const ms = !lowerSearch || licName.toLowerCase().includes(lowerSearch) || storeName.toLowerCase().includes(lowerSearch) || destino.toLowerCase().includes(lowerSearch);
      const mf = !filters.format || p.format === filters.format;
      const mst = !filters.status || p.status === filters.status;
      const ml = !filters.licensee || p.licensee_id === filters.licensee;
      const mdf = !filters.dateFrom || p.scheduled_at >= `${filters.dateFrom}T00:00:00`;
      const mdt = !filters.dateTo || p.scheduled_at <= `${filters.dateTo}T23:59:59`;

      return ms && mf && mst && ml && mdf && mdt;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, filters, licMap]);

  /* ── Actions ───────────────────────────────────── */

  async function cancelPost(id: string) {
    await supabase.from("scheduled_posts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    if (detailPost?.id === id) setDetailPost(null);
  }

  async function retryPost(id: string) {
    await supabase.from("scheduled_posts").update({ status: "pending", error_msg: null, updated_at: new Date().toISOString() }).eq("id", id);
    await loadData();
  }

  const hasFilters = filters.search || filters.format || filters.status || filters.dateFrom || filters.dateTo || filters.licensee;

  function clearFilters() {
    setFilters({ search: "", format: "", status: "", dateFrom: "", dateTo: "", licensee: "" });
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiMini label="Posts hoje" value={String(kpis.postsHoje)} color="var(--green)" />
        <KpiMini label="Agendados" value={String(kpis.agendados)} color="var(--blue)" />
        <KpiMini label="Falhas" value={String(kpis.falhas)} color="var(--red)" />
        <KpiMini label="Total do mês" value={String(kpis.totalMes)} color="var(--orange)" />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Central de Publicação</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Fila de publicações agendadas e realizadas</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--txt3)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          Atualiza em {countdown}s
        </div>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[180px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar cliente, loja, destino..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr2)] bg-[var(--input-bg)] pl-9 pr-3 text-[12px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--orange)]" />
        </div>

        <select value={filters.format} onChange={(e) => setFilters({ ...filters, format: e.target.value })} className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Todos formatos</option>
          {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Todos status</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={filters.licensee} onChange={(e) => setFilters({ ...filters, licensee: e.target.value })} className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Todos clientes</option>
          {licensees.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="h-9 rounded-lg border border-[var(--bdr2)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--txt)] outline-none" />

        {hasFilters && (
          <button onClick={clearFilters} className="h-9 rounded-lg border border-[var(--bdr2)] px-3 text-[12px] font-semibold text-[var(--txt3)] hover:border-[var(--red)] hover:text-[var(--red)]">
            Limpar
          </button>
        )}
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="card-glass overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando publicações...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue3)]">
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-[var(--blue)]">
                <path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-[15px] font-bold text-[var(--txt)]">Nenhuma publicação encontrada</div>
            <div className="text-[13px] text-[var(--txt3)]">{hasFilters ? "Tente ajustar os filtros." : "Publicações agendadas aparecerão aqui."}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--bdr)] bg-[var(--hover-bg)]">
                  {["", "Cliente / Loja", "Formato", "Destino", "Agendado para", "Status", "Ações"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => {
                  const st = STATUS_STYLES[post.status] ?? STATUS_STYLES.pending;
                  const licName = licMap[post.licensee_id] ?? "—";
                  const storeName = getStoreName(post);
                  const destino = getDestino(post.field_values);

                  return (
                    <tr key={post.id} className="border-b border-[var(--bdr)] transition-colors last:border-b-0 hover:bg-[var(--hover-bg)]">
                      {/* Miniatura */}
                      <td className="whitespace-nowrap pl-5 pr-2 py-2">
                        {post.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={post.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-[var(--bdr)]" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)]">
                            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[var(--txt3)]"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1" /><path d="M3 13l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1" /></svg>
                          </div>
                        )}
                      </td>
                      {/* Cliente / Loja */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="font-medium text-[var(--txt)]">{licName}</div>
                        <div className="text-[10px] text-[var(--txt3)]">{storeName}</div>
                      </td>
                      {/* Formato */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="rounded-md bg-[var(--bg3)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--txt2)]">
                          {FORMAT_LABELS[post.format] ?? post.format}
                        </span>
                      </td>
                      {/* Destino */}
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--txt2)]">{destino || "—"}</td>
                      {/* Agendado para */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="font-medium text-[var(--txt)]">{formatDate(post.scheduled_at)}</div>
                      </td>
                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                      {/* Ações */}
                      <td className="whitespace-nowrap pr-5 pl-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDetailPost(post)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Detalhes</button>
                          {post.status === "pending" && (
                            <button onClick={() => cancelPost(post.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Cancelar</button>
                          )}
                          {post.status === "failed" && (
                            <button onClick={() => retryPost(post.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--orange)]">Republicar</button>
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

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--bdr)] px-4 py-2.5 text-[11px] text-[var(--txt3)]">
            <span>{filtered.length} publicação{filtered.length !== 1 ? "ões" : ""}</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
              Atualiza em {countdown}s
            </span>
          </div>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────── */}
      {detailPost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={() => setDetailPost(null)}>
          <div className="mx-4 w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">Detalhes da publicação</h2>
              <button onClick={() => setDetailPost(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Image preview */}
              {detailPost.image_url && (
                <div className="mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailPost.image_url} alt="Arte" className="w-full max-h-[300px] rounded-xl object-contain border border-[var(--bdr)]" />
                </div>
              )}

              {/* Status badge */}
              <div className="mb-5">
                {(() => {
                  const st = STATUS_STYLES[detailPost.status] ?? STATUS_STYLES.pending;
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: st.bg, color: st.text }}>
                      {st.label}
                    </span>
                  );
                })()}
              </div>

              {/* Data rows */}
              <div className="flex flex-col gap-3">
                <DetailRow label="Cliente" value={licMap[detailPost.licensee_id] ?? "—"} />
                <DetailRow label="Loja" value={getStoreName(detailPost)} />
                <DetailRow label="Formato" value={FORMAT_LABELS[detailPost.format] ?? detailPost.format} />
                <DetailRow label="Destino" value={getDestino(detailPost.field_values) || "—"} />
                <DetailRow label="Legenda" value={getCaption(detailPost.field_values) || "—"} multiline />
                <DetailRow label="Agendado para" value={formatDate(detailPost.scheduled_at)} />
                {detailPost.status === "published" && detailPost.updated_at && (
                  <DetailRow label="Publicado em" value={formatDate(detailPost.updated_at)} />
                )}
                {detailPost.ig_post_id && (
                  <DetailRow label="ID do post IG" value={detailPost.ig_post_id} />
                )}
                {detailPost.error_msg && (
                  <div>
                    <div className="text-[11px] font-medium text-[var(--txt3)]">Erro</div>
                    <div className="mt-1 rounded-lg bg-[var(--red3)] px-3 py-2 text-[12px] text-[var(--red)]">{detailPost.error_msg}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 flex gap-3">
                {detailPost.status === "pending" && (
                  <button onClick={() => cancelPost(detailPost.id)} className="flex-1 rounded-lg border border-[var(--red)] py-2 text-[13px] font-semibold text-[var(--red)] hover:bg-[var(--red3)]">
                    Cancelar publicação
                  </button>
                )}
                {detailPost.status === "failed" && (
                  <button onClick={() => { retryPost(detailPost.id); setDetailPost(null); }} className="flex-1 rounded-lg bg-[var(--orange)] py-2 text-[13px] font-semibold text-white hover:opacity-90">
                    Republicar
                  </button>
                )}
                <button onClick={() => setDetailPost(null)} className="flex-1 rounded-lg py-2 text-[13px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glass flex flex-col gap-1 p-4">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">{label}</div>
      <span className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-[var(--txt3)]">{label}</div>
      <div className={`mt-0.5 text-[13px] text-[var(--txt)] ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Send, Users, Sparkles, BarChart3, CalendarClock, Image as ImageIcon, Plane,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Vendedor {
  id: string;
  name: string | null;
  email: string | null;
}

interface ScheduledPost {
  id: string;
  format: string;
  field_values: Record<string, unknown>;
  status: string;
  scheduled_at: string;
  image_url: string | null;
}

interface Noticia { title: string; url: string; image?: string | null; source?: string; }

const SEGMENT_MAP: Record<string, string> = {
  "7dd6759b-ba23-4d33-b898-c7a00cdf7b80": "turismo",
  "741c1469-9552-449a-835e-c79966680e68": "imobiliaria",
  "3b5aacc8-c0f0-483d-a282-0cda7520fdcb": "moda",
  "0deb6f4d-91a8-4ee8-b6d3-081caae6ccf0": "beleza",
  "7071c508-3e6b-4a91-b5f4-dfcc070798d1": "educacao",
  "eeb1f1b9-eac1-4c5b-afb5-59af3c1b8e6f": "restaurante",
  "2b068193-9cb9-47e9-8796-ff3abc7318e0": "saude",
};

/* ── Constantes ──────────────────────────────────── */

const FALLBACK_QUOTES = [
  "Cada destino começa com uma decisão.",
  "Vender viagem é vender memórias.",
  "Inspire primeiro, venda depois.",
  "Destinos não se vendem — se sonham.",
  "Cada post é um convite para sonhar.",
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "var(--blue3)",   color: "var(--blue)",   label: "Agendado" },
  published: { bg: "var(--green3)",  color: "var(--green)",  label: "Publicado" },
  failed:    { bg: "var(--red3)",    color: "var(--red)",    label: "Falhou" },
  cancelled: { bg: "var(--bg3)",     color: "var(--txt3)",   label: "Cancelado" },
};

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function getDestino(fv: Record<string, unknown>): string {
  return (fv?.destino ?? fv?.destination ?? fv?.titulo ?? "Sem destino") as string;
}

/* ── Component ───────────────────────────────────── */

export default function UnidadeInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [quote, setQuote] = useState<string>("");

  const [postsHoje, setPostsHoje] = useState(0);
  const [postsMes, setPostsMes] = useState(0);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [ultimasPub, setUltimasPub] = useState<ScheduledPost[]>([]);

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiaIdx, setNoticiaIdx] = useState(0);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.store_id) { setLoading(false); return; }

      // Frase do segmento
      let segmentQuotes: string[] | null = null;
      const segmentId = p.licensee?.segment_id ?? null;
      if (segmentId) {
        const { data: seg } = await supabase.from("segments").select("quotes").eq("id", segmentId).single();
        const arr = (seg as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      if (!segmentQuotes) {
        const { data: outros } = await supabase.from("segments").select("quotes").eq("name", "Outros").single();
        const arr = (outros as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      setQuote(pickRandom(segmentQuotes ?? FALLBACK_QUOTES));

      // Datas
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      const inicioMes = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), 1);

      // Posts hoje / mês (activity_logs filtrado por store_id no metadata)
      const [logsHojeRes, logsMesRes] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("id, metadata")
          .gte("created_at", inicioDia.toISOString())
          .in("event_type", ["post_instagram", "post_scheduled"]),
        supabase
          .from("activity_logs")
          .select("id, metadata")
          .gte("created_at", inicioMes.toISOString())
          .in("event_type", ["post_instagram", "post_scheduled"]),
      ]);
      const countByStore = (rows: { metadata: Record<string, unknown> | null }[] | null) =>
        (rows ?? []).filter((l) => l.metadata?.store_id === p.store_id).length;
      setPostsHoje(countByStore(logsHojeRes.data));
      setPostsMes(countByStore(logsMesRes.data));

      // Vendedores da unidade
      const { data: vendData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("store_id", p.store_id)
        .eq("role", "vendedor")
        .order("name");
      const vendList = (vendData ?? []) as Vendedor[];
      setVendedores(vendList);

      // Últimas publicações: scheduled_posts não tem store_id → filtra por user_id
      const userIds = [p.id, ...vendList.map((v) => v.id)];
      const { data: posts } = await supabase
        .from("scheduled_posts")
        .select("id, format, field_values, status, scheduled_at, image_url")
        .in("user_id", userIds)
        .order("scheduled_at", { ascending: false })
        .limit(5);
      setUltimasPub((posts ?? []) as ScheduledPost[]);

      // Notícias do setor
      try {
        const segmentName = SEGMENT_MAP[segmentId ?? ""] ?? "default";
        const res = await fetch(`/api/noticias?segment=${segmentName}`);
        if (res.ok) {
          const items = await res.json();
          if (items.length) setNoticias(items);
        }
      } catch { /* silent */ }
    } catch (err) {
      console.error("[UnidadeInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (noticias.length <= 1) return;
    const t = setInterval(() => {
      setNoticiaIdx(i => (i + 1) % noticias.length);
    }, 6000);
    return () => clearInterval(t);
  }, [noticias.length]);

  /* ── Derived ───────────────────────────────────── */

  const maxPostsDay = profile?.plan?.max_posts_day ?? null;
  const limiteIlimitado = maxPostsDay === -1;
  const limitePct = maxPostsDay && maxPostsDay > 0
    ? Math.min(100, Math.round((postsHoje / maxPostsDay) * 100))
    : null;

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel da Unidade · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              {profile?.store?.name || "Sua unidade"}
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] italic text-[var(--txt2)]">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
          </div>

          <Link
            href="/unidade/publicar"
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Sparkles size={15} /> Publicar agora
          </Link>
        </div>
      </div>

      {/* ═══ KPI Row ═══════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Posts hoje */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Send size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts de hoje</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsHoje}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Publicações confirmadas</div>
          </div>
        </div>

        {/* Posts do mês */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--blue)]"
            style={{ background: "var(--blue3)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts do mês</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsMes}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Total da unidade</div>
          </div>
        </div>

        {/* Limite diário */}
        <div className="card-glass px-5 py-5">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--gold)]"
              style={{ background: "var(--gold3)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <CalendarClock size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Limite diário</div>
              <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
                {limiteIlimitado ? "∞" : maxPostsDay !== null ? `${postsHoje}/${maxPostsDay}` : "—"}
              </div>
              <div className="mt-1 text-[11px] text-[var(--txt3)]">
                {limiteIlimitado ? "Ilimitado" : "Posts de hoje"}
              </div>
            </div>
          </div>
          {limitePct !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg2)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${limitePct}%`,
                  background: limitePct > 90
                    ? "var(--red)"
                    : limitePct > 70
                      ? "var(--orange)"
                      : "linear-gradient(90deg, var(--orange), #D4A843)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ Vendedores + Últimas publicações ═══════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Vendedores ────────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Vendedores</h3>
              <span className="rounded-full bg-[var(--green3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--green)]">
                {vendedores.length} {vendedores.length === 1 ? "ativo" : "ativos"}
              </span>
            </div>
          </div>
          <div className="p-5">
            {vendedores.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhum vendedor cadastrado nesta unidade.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {vendedores.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-[var(--txt)]">{v.name || v.email || "—"}</div>
                      {v.email && <div className="truncate text-[10px] text-[var(--txt3)]">{v.email}</div>}
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-[var(--green3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--green)]">
                      Ativo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Últimas publicações ───────────────── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Últimas publicações</h3>
            </div>
            <Link
              href="/central-de-publicacao"
              className="text-[11px] font-semibold text-[var(--orange)] hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="p-5">
            {ultimasPub.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhuma publicação ainda.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {ultimasPub.map((post) => {
                  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.pending;
                  const destino = getDestino(post.field_values || {});
                  const formatLabel = FORMAT_LABELS[post.format] ?? post.format;
                  return (
                    <div key={post.id} className="flex items-center gap-3 rounded-lg border border-[var(--bdr)] px-3 py-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--bdr)] bg-[var(--bg2)]">
                        {post.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--txt3)]">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium text-[var(--txt)]">{destino}</div>
                        <div className="truncate text-[10px] text-[var(--txt3)]">
                          {formatLabel} · {formatDateTime(post.scheduled_at)}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Notícias do setor ═══════════════════════ */}
      <div className="card-glass flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Plane size={15} className="text-[var(--orange)]" />
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Notícias do setor</h3>
          </div>
          {noticias.length > 0 && (
            <div className="flex gap-1">
              {noticias.map((_, i) => (
                <button key={i} onClick={() => setNoticiaIdx(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === noticiaIdx ? 16 : 6, background: i === noticiaIdx ? "var(--orange)" : "var(--bdr2)" }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-1 overflow-hidden">
          {noticias.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[var(--txt3)]">Carregando notícias...</div>
          ) : (() => {
            const n = noticias[noticiaIdx];
            return (
              <a href={n.url} target="_blank" rel="noopener noreferrer"
                className="block hover:opacity-90 transition-opacity">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt=""
                    className="w-full h-36 max-h-36 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="px-5 py-4">
                  <p className="text-[13px] font-semibold leading-snug text-[var(--txt)]"
                    style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {n.title}
                  </p>
                  {n.source && (
                    <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-[var(--orange)]">
                      {n.source}
                    </span>
                  )}
                </div>
              </a>
            );
          })()}
        </div>
      </div>
    </>
  );
}

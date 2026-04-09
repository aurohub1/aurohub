"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

/* ── Types ───────────────────────────────────────── */

interface UserProfile {
  id: string;
  name: string | null;
  role: string;
  licensee_id: string | null;
  store_id: string | null;
}

interface Store { id: string; name: string; licensee_id: string; }
interface Licensee { id: string; name: string; plan: string; status: string; expires_at: string | null; }
interface LogEntry { id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string; }
interface Embarque { id: string; destino: string; data_embarque: string; cliente_nome: string; }
interface IgCredential { ig_user_id: string; access_token: string; }

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

/* ── Component ───────────────────────────────────── */

export default function InicioPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [licensee, setLicensee] = useState<Licensee | null>(null);
  const [loading, setLoading] = useState(true);

  // KPIs
  const [postsMes, setPostsMes] = useState(0);
  const [downloadsMes, setDownloadsMes] = useState(0);
  const [seguidores, setSeguidores] = useState<number | null>(null);
  const [engajamento, setEngajamento] = useState<string | null>(null);

  // Content
  const [recentArts, setRecentArts] = useState<{ url: string; date: string }[]>([]);
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [igConnected, setIgConnected] = useState(false);
  const [planName, setPlanName] = useState("—");
  const [postsLimit, setPostsLimit] = useState("—");

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profile
      const { data: prof } = await supabase.from("profiles").select("id, name, role, licensee_id, store_id").eq("id", user.id).single();
      if (!prof) { setLoading(false); return; }
      setProfile(prof as UserProfile);

      const licId = prof.licensee_id;
      const storeId = prof.store_id;

      // Store & Licensee
      if (storeId) {
        const { data: s } = await supabase.from("stores").select("id, name, licensee_id").eq("id", storeId).single();
        if (s) { setStore(s as Store); }
      }

      const effectiveLicId = licId ?? (store?.licensee_id ?? null);

      if (effectiveLicId) {
        const { data: l } = await supabase.from("licensees").select("id, name, plan, status, expires_at").eq("id", effectiveLicId).single();
        if (l) setLicensee(l as Licensee);
      }

      // Plan info
      if (licensee?.plan) {
        const { data: p } = await supabase.from("plans").select("name, max_posts_day").eq("slug", licensee.plan).single();
        if (p) {
          setPlanName(p.name);
          setPostsLimit(p.max_posts_day === -1 ? "Ilimitado" : `${p.max_posts_day}/dia`);
        }
      }

      // KPIs from activity_logs
      const { start, end } = monthRange();

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, event_type, metadata, created_at")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      const allLogs = (logs as LogEntry[]) ?? [];

      // Filter by user's store/licensee if possible
      const userLogs = allLogs.filter((l) => {
        const meta = l.metadata ?? {};
        if (storeId && meta.store_id) return meta.store_id === storeId;
        if (licId && meta.licensee_id) return meta.licensee_id === licId;
        return true;
      });

      setPostsMes(userLogs.filter((l) => l.event_type === "post_instagram" || l.event_type === "post_scheduled").length);
      setDownloadsMes(userLogs.filter((l) => l.event_type === "download").length);

      // Recent arts (from downloads with image URL)
      const arts = userLogs
        .filter((l) => l.event_type === "download" && l.metadata?.image_url)
        .slice(0, 4)
        .map((l) => ({ url: l.metadata!.image_url as string, date: l.created_at }));
      setRecentArts(arts);

      // Instagram followers
      if (effectiveLicId) {
        const { data: igCred } = await supabase
          .from("instagram_credentials")
          .select("ig_user_id, access_token")
          .eq("licensee_id", effectiveLicId)
          .single();

        if (igCred) {
          setIgConnected(true);
          const cred = igCred as IgCredential;
          try {
            const res = await fetch(
              `https://graph.instagram.com/${cred.ig_user_id}?fields=followers_count&access_token=${cred.access_token}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.followers_count) setSeguidores(data.followers_count);
            }
          } catch { /* silent */ }
        }
      }

      // Embarques da semana
      const hoje = new Date().toISOString().split("T")[0];
      const semana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      if (effectiveLicId) {
        const { data: emb } = await supabase
          .from("embarques")
          .select("id, destino, data_embarque, cliente_nome")
          .eq("licensee_id", effectiveLicId)
          .gte("data_embarque", hoje)
          .lte("data_embarque", semana)
          .order("data_embarque")
          .limit(5);
        setEmbarques((emb as Embarque[]) ?? []);
      }
    } catch (err) {
      console.error("[Inicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload plan info when licensee loads
  useEffect(() => {
    if (!licensee?.plan) return;
    supabase.from("plans").select("name, max_posts_day").eq("slug", licensee.plan).single()
      .then(({ data }) => {
        if (data) {
          setPlanName(data.name);
          setPostsLimit(data.max_posts_day === -1 ? "Ilimitado" : `${data.max_posts_day}/dia`);
        }
      });
  }, [licensee?.plan]);

  const displayName = store?.name ?? licensee?.name ?? profile?.name ?? "Usuário";

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;
  }

  return (
    <>
      {/* ═══ ZONA 1 — Hero de ação ══════════════════ */}
      <div className="card-glass relative overflow-hidden px-8 py-10">
        {/* Gradient bg accent */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }} />

        <div className="relative z-10">
          <h1 className="font-[family-name:var(--font-dm-serif)] text-[28px] font-bold leading-tight text-[var(--txt)]">
            {greeting()}, {displayName}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--txt2)]">
            O que vamos criar hoje?
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/editor-de-templates"
              className="flex items-center gap-2.5 rounded-xl px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
            >
              <span className="text-[18px]">✨</span>
              Criar arte agora
            </Link>
            <Link
              href="/central-de-publicacao"
              className="flex items-center gap-2.5 rounded-xl border border-[var(--bdr2)] px-6 py-3 text-[14px] font-medium text-[var(--txt2)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
            >
              <span className="text-[16px]">📅</span>
              Ver agendamentos
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ ZONA 2 — KPIs ══════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Posts este mês"
          value={String(postsMes)}
          icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          color="var(--orange)"
        />
        <KpiCard
          label="Downloads este mês"
          value={String(downloadsMes)}
          icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          color="var(--blue)"
        />
        <KpiCard
          label="Seguidores IG"
          value={seguidores !== null ? seguidores.toLocaleString("pt-BR") : "—"}
          icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="14.5" cy="5.5" r="1" fill="currentColor" /></svg>}
          color="var(--purple)"
        />
        <KpiCard
          label="Engajamento médio"
          value={engajamento ?? "—"}
          icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          color="var(--gold)"
        />
      </div>

      {/* ═══ ZONA 3 — Três colunas ══════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ── Col 1: Últimas artes ──────────────── */}
        <div className="card-glass flex flex-col">
          <div className="border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Últimas artes criadas</h3>
          </div>
          <div className="flex-1 p-5">
            {recentArts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--orange3)]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[var(--orange)]"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1" /><path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1" /></svg>
                </div>
                <p className="text-[13px] text-[var(--txt3)]">Nenhuma arte criada ainda</p>
                <Link href="/editor-de-templates" className="text-[12px] font-medium text-[var(--orange)] hover:underline">Criar primeira arte</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recentArts.map((art, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-[var(--bdr)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art.url} alt="" className="aspect-square w-full object-cover" />
                    <div className="px-2 py-1.5 text-[10px] text-[var(--txt3)]">
                      {new Date(art.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Col 2: Sugestões inteligentes ──────── */}
        <div className="card-glass flex flex-col">
          <div className="border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Sugestões da semana</h3>
          </div>
          <div className="flex-1 p-5">
            {/* Embarques */}
            {embarques.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Embarques próximos</div>
                <div className="flex flex-col gap-2">
                  {embarques.map((e) => {
                    const diff = Math.round((new Date(e.data_embarque + "T00:00:00").getTime() - Date.now()) / 86400000);
                    const isToday = diff <= 0;
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                        <div>
                          <div className="text-[12px] font-medium text-[var(--txt)]">{e.destino}</div>
                          <div className="text-[10px] text-[var(--txt3)]">{e.cliente_nome}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[0.55rem] font-bold ${isToday ? "bg-[var(--red3)] text-[var(--red)]" : "bg-[var(--orange3)] text-[var(--orange)]"}`}>
                          {isToday ? "HOJE" : `em ${diff}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dicas */}
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Dicas</div>
              <div className="flex flex-col gap-2">
                <SuggestionCard emoji="🎨" text="Crie artes para os embarques da semana" />
                <SuggestionCard emoji="📊" text="Confira suas métricas do Instagram" />
                <SuggestionCard emoji="📅" text="Agende posts para os próximos dias" />
              </div>
            </div>

            {embarques.length === 0 && (
              <div className="mt-4 rounded-lg bg-[var(--bg3)] p-4 text-center">
                <p className="text-[12px] text-[var(--txt3)]">Sem embarques esta semana</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Col 3: Status da conta ─────────────── */}
        <div className="card-glass flex flex-col">
          <div className="border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Status da conta</h3>
          </div>
          <div className="flex-1 p-5">
            <div className="flex flex-col gap-4">
              {/* Plano */}
              <StatusRow
                label="Plano"
                value={planName}
                badge={licensee?.status === "active" ? { text: "Ativo", bg: "var(--green3)", color: "var(--green)" } : { text: "Inativo", bg: "var(--red3)", color: "var(--red)" }}
              />

              {/* Limite posts */}
              <StatusRow label="Limite de posts" value={postsLimit} />

              {/* Token IG */}
              <StatusRow
                label="Instagram"
                value={igConnected ? "Conectado" : "Não conectado"}
                badge={igConnected ? { text: "OK", bg: "var(--green3)", color: "var(--green)" } : { text: "Conectar", bg: "var(--red3)", color: "var(--red)" }}
              />

              {/* Vencimento */}
              <StatusRow
                label="Próximo vencimento"
                value={licensee?.expires_at ? new Date(licensee.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
              />

              {/* Loja */}
              {store && <StatusRow label="Loja" value={store.name} />}

              {/* Licenciado */}
              {licensee && <StatusRow label="Marca" value={licensee.name} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card-glass flex items-center gap-4 px-5 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">{label}</div>
        <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">{value}</div>
      </div>
    </div>
  );
}

function SuggestionCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bdr)] px-3 py-2.5 hover:bg-[var(--hover-bg)]">
      <span className="text-[16px]">{emoji}</span>
      <span className="text-[12px] text-[var(--txt2)]">{text}</span>
    </div>
  );
}

function StatusRow({ label, value, badge }: { label: string; value: string; badge?: { text: string; bg: string; color: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] font-medium text-[var(--txt3)]">{label}</div>
        <div className="text-[13px] font-medium text-[var(--txt)]">{value}</div>
      </div>
      {badge && (
        <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>
      )}
    </div>
  );
}

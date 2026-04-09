"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

/* ── Types ───────────────────────────────────────── */

interface Profile { id: string; name: string | null; role: string; licensee_id: string | null; store_id: string | null; }
interface Store { id: string; name: string; licensee_id: string; }
interface Licensee { id: string; name: string; plan: string; status: string; expires_at: string | null; }
interface LogEntry { id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string; }
interface Embarque { id: string; destino: string; data_embarque: string; cliente_nome: string; }
interface PlanInfo { name: string; max_posts_day: number; }
interface DataComemorativa { id: string; nome: string; data_mes: number; data_dia: number; tipo: string; cidade: string | null; estado: string | null; destaque: boolean; }

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

const TIPO_EMOJI: Record<string, string> = { feriado: "🎌", aniversario: "🏙️", evento: "🎉" };
const TIPO_STYLE: Record<string, { bg: string; text: string }> = {
  feriado:      { bg: "var(--red3)", text: "var(--red)" },
  aniversario:  { bg: "var(--blue3)", text: "var(--blue)" },
  evento:       { bg: "var(--gold3)", text: "var(--gold)" },
};

/* ── Component ───────────────────────────────────── */

export default function InicioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [licensee, setLicensee] = useState<Licensee | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  // KPIs
  const [postsMes, setPostsMes] = useState(0);
  const [downloadsMes, setDownloadsMes] = useState(0);
  const [seguidores, setSeguidores] = useState<number | null>(null);
  const [engajamento, setEngajamento] = useState<string | null>(null);

  // Content
  const [recentArts, setRecentArts] = useState<{ url: string; date: string }[]>([]);
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [datasComem, setDatasComem] = useState<DataComemorativa[]>([]);
  const [igConnected, setIgConnected] = useState(false);
  const [postsUsados, setPostsUsados] = useState(0);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      // Nome via email do auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const email = user.email || "";
      const nameFromEmail = email.split("@")[0];
      setUserName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));

      // Profile (pode não existir para ADM)
      const { data: prof } = await supabase.from("profiles").select("id, name, role, licensee_id, store_id").eq("id", user.id).single();
      const p = prof as Profile | null;
      if (p) setProfile(p);

      // Store
      let effectiveLicId = p?.licensee_id ?? null;
      if (p?.store_id) {
        const { data: s } = await supabase.from("stores").select("id, name, licensee_id").eq("id", p.store_id).single();
        if (s) { setStore(s as Store); effectiveLicId = effectiveLicId ?? s.licensee_id; }
      }

      // Fallback AZV — sempre carrega licensee para mostrar dados
      if (!effectiveLicId) {
        effectiveLicId = "fd7cd9a7-2680-4682-a271-94b7dfe0a97e";
      }

      // Licensee + Plan
      const { data: licData } = await supabase
        .from("licensees")
        .select("id, name, plan, status, expires_at")
        .eq("id", effectiveLicId)
        .single();
      if (licData) {
        const lic = licData as Licensee;
        setLicensee(lic);
        if (lic.plan) {
          const { data: pi } = await supabase.from("plans").select("name, max_posts_day").eq("slug", lic.plan).single();
          if (pi) setPlanInfo(pi as PlanInfo);
        }
      }

      // Activity logs do mês
      const inicio = monthStart();
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, event_type, metadata, created_at")
        .gte("created_at", inicio)
        .order("created_at", { ascending: false })
        .limit(200);

      const allLogs = (logs as LogEntry[]) ?? [];
      const userLogs = allLogs.filter((lg) => {
        const m = lg.metadata ?? {};
        if (p?.store_id && m.store_id) return m.store_id === p.store_id;
        if (effectiveLicId && m.licensee_id) return m.licensee_id === effectiveLicId;
        return true;
      });

      const posts = userLogs.filter((lg) => lg.event_type === "post_instagram" || lg.event_type === "post_scheduled").length;
      setPostsMes(posts);
      setPostsUsados(posts);
      setDownloadsMes(userLogs.filter((lg) => lg.event_type === "download").length);

      // Recent arts
      setRecentArts(
        userLogs
          .filter((lg) => lg.event_type === "download" && lg.metadata?.image_url)
          .slice(0, 4)
          .map((lg) => ({ url: lg.metadata!.image_url as string, date: lg.created_at }))
      );

      // Instagram
      if (effectiveLicId) {
        const { data: ig } = await supabase.from("instagram_credentials").select("ig_user_id, access_token").eq("licensee_id", effectiveLicId).single();
        if (ig) {
          setIgConnected(true);
          try {
            const res = await fetch(`https://graph.instagram.com/${ig.ig_user_id}?fields=followers_count&access_token=${ig.access_token}`);
            if (res.ok) {
              const d = await res.json();
              if (d.followers_count) setSeguidores(d.followers_count);
            }
          } catch { /* silent */ }

          // Engajamento dos últimos posts
          try {
            const res = await fetch(`https://graph.instagram.com/${ig.ig_user_id}/media?fields=like_count,comments_count&limit=10&access_token=${ig.access_token}`);
            if (res.ok) {
              const d = await res.json();
              const media = d.data as { like_count?: number; comments_count?: number }[];
              if (media?.length > 0 && seguidores) {
                const totalInteractions = media.reduce((s, m) => s + (m.like_count ?? 0) + (m.comments_count ?? 0), 0);
                const rate = (totalInteractions / media.length / (seguidores || 1)) * 100;
                setEngajamento(`${rate.toFixed(1)}%`);
              }
            }
          } catch { /* silent */ }
        }

        // Embarques da semana
        const hoje = new Date().toISOString().split("T")[0];
        const semana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
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

      // Datas comemorativas dos próximos 14 dias
      const hojeDt = new Date();
      const mesAtual = hojeDt.getMonth() + 1;
      const diaAtual = hojeDt.getDate();
      const diaFim = diaAtual + 14;

      console.log("[Inicio] Buscando datas comemorativas:", { mesAtual, diaAtual, diaFim });
      if (diaFim <= 31) {
        const { data: dc, error: dcErr } = await supabase
          .from("datas_comemorativas")
          .select("*")
          .eq("data_mes", mesAtual)
          .gte("data_dia", diaAtual)
          .lte("data_dia", diaFim)
          .order("data_dia");
        console.log("[Inicio] Datas encontradas:", dc?.length ?? 0, dcErr?.message ?? "OK");
        setDatasComem((dc as DataComemorativa[]) ?? []);
      } else {
        // Virada de mês: busca fim do mês atual + início do próximo
        const { data: dc1 } = await supabase
          .from("datas_comemorativas")
          .select("*")
          .eq("data_mes", mesAtual)
          .gte("data_dia", diaAtual)
          .order("data_dia");
        const proxMes = mesAtual === 12 ? 1 : mesAtual + 1;
        const { data: dc2 } = await supabase
          .from("datas_comemorativas")
          .select("*")
          .eq("data_mes", proxMes)
          .lte("data_dia", diaFim - 31)
          .order("data_dia");
        setDatasComem([...((dc1 as DataComemorativa[]) ?? []), ...((dc2 as DataComemorativa[]) ?? [])]);
      }
    } catch (err) { console.error("[Inicio] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const displayName = userName || store?.name || licensee?.name || profile?.name || "Usuário";
  const postsLimite = planInfo ? (planInfo.max_posts_day === -1 ? "Ilimitado" : `${planInfo.max_posts_day}/dia`) : "—";
  const postsRestantes = planInfo && planInfo.max_posts_day > 0
    ? Math.max(0, planInfo.max_posts_day * 30 - postsUsados)
    : null;

  /* ── Render ────────────────────────────────────── */

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-8 py-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[var(--txt3)]">{greeting()}</p>
            <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] font-bold leading-tight text-[var(--txt)]">{displayName}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/editor-de-templates" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}>
              <span className="text-[16px]">✨</span>Criar arte agora
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 ml-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/central-de-publicacao" className="flex items-center gap-2 rounded-xl border border-[var(--bdr2)] px-5 py-2.5 text-[13px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]">
              <span className="text-[14px]">📅</span>Agendamentos
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ KPIs ═══════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Posts este mês" value={String(postsMes)} color="var(--orange)" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3v10M6 7l4-4 4 4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
        <Kpi label="Downloads este mês" value={String(downloadsMes)} color="var(--blue)" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
        <Kpi label="Seguidores IG" value={seguidores !== null ? seguidores.toLocaleString("pt-BR") : "—"} color="var(--purple)" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="14.5" cy="5.5" r="1" fill="currentColor" /></svg>} />
        <Kpi label="Engajamento médio" value={engajamento ?? "—"} color="var(--gold)" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M2 14l4-4 4 4 4-6 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
      </div>

      {/* ═══ 3 COLUNAS ══════════════════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ── Últimas artes ──────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Últimas artes</h3>
          </div>
          <div className="flex-1 p-5">
            {recentArts.length === 0 ? (
              <Empty icon="🎨" text="Nenhuma arte criada ainda" action={{ label: "Criar primeira arte", href: "/editor-de-templates" }} />
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

        {/* ── Sugestões ─────────────────────────── */}
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
                    const diff = Math.max(0, Math.round((new Date(e.data_embarque + "T00:00:00").getTime() - Date.now()) / 86400000));
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                        <div>
                          <div className="text-[12px] font-medium text-[var(--txt)]">{e.destino}</div>
                          <div className="text-[10px] text-[var(--txt3)]">{e.cliente_nome}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[0.55rem] font-bold ${diff === 0 ? "bg-[var(--red3)] text-[var(--red)]" : "bg-[var(--orange3)] text-[var(--orange)]"}`}>
                          {diff === 0 ? "HOJE" : `em ${diff}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Datas comemorativas */}
            {datasComem.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Próximas datas</div>
                <div className="flex flex-col gap-1.5">
                  {datasComem.map((d) => {
                    const emoji = TIPO_EMOJI[d.tipo] ?? "📅";
                    const style = TIPO_STYLE[d.tipo] ?? TIPO_STYLE.evento;
                    const dataStr = `${String(d.data_dia).padStart(2, "0")}/${String(d.data_mes).padStart(2, "0")}`;
                    return (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px]">{emoji}</span>
                          <div>
                            <span className="text-[12px] text-[var(--txt)]">{dataStr} — {d.nome}</span>
                            {d.cidade && <span className="ml-1 text-[10px] text-[var(--txt3)]">({d.cidade}/{d.estado})</span>}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.5rem] font-bold" style={{ background: style.bg, color: style.text }}>
                          {d.tipo === "feriado" ? "Feriado" : d.tipo === "aniversario" ? "Aniv." : "Evento"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dicas rápidas */}
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">Dicas</div>
              <div className="flex flex-col gap-1.5">
                <Tip emoji="🎨" text="Crie artes para os embarques da semana" />
                <Tip emoji="📊" text="Confira suas métricas do Instagram" />
                <Tip emoji="📅" text="Agende posts para as datas do mês" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sua conta ─────────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Sua conta</h3>
          </div>
          <div className="flex-1 p-5">
            <div className="flex flex-col gap-4">
              <StatusRow
                label="Plano atual"
                value={planInfo?.name ?? "—"}
                badge={licensee?.status === "active"
                  ? { text: "Ativo", bg: "var(--green3)", color: "var(--green)" }
                  : { text: "Inativo", bg: "var(--red3)", color: "var(--red)" }
                }
              />
              <StatusRow label="Limite de posts" value={postsLimite} />
              {postsRestantes !== null && (
                <StatusRow label="Posts restantes (est. mês)" value={String(postsRestantes)} />
              )}
              <StatusRow label="Posts usados este mês" value={String(postsUsados)} />
              <div className="h-px bg-[var(--bdr)]" />
              <StatusRow
                label="Instagram"
                value={igConnected ? "Conectado" : "Não conectado"}
                badge={igConnected
                  ? { text: "OK", bg: "var(--green3)", color: "var(--green)" }
                  : { text: "Conectar", bg: "var(--red3)", color: "var(--red)" }
                }
              />
              <StatusRow
                label="Próximo vencimento"
                value={licensee?.expires_at
                  ? new Date(licensee.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                  : "—"
                }
              />
              <div className="h-px bg-[var(--bdr)]" />
              {store && <StatusRow label="Loja" value={store.name} />}
              {licensee && <StatusRow label="Marca" value={licensee.name} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Kpi({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
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

function StatusRow({ label, value, badge }: { label: string; value: string; badge?: { text: string; bg: string; color: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] font-medium text-[var(--txt3)]">{label}</div>
        <div className="text-[13px] font-medium text-[var(--txt)]">{value}</div>
      </div>
      {badge && <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>}
    </div>
  );
}

function Tip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bdr)] px-3 py-2 hover:bg-[var(--hover-bg)]">
      <span className="text-[14px]">{emoji}</span>
      <span className="text-[12px] text-[var(--txt2)]">{text}</span>
    </div>
  );
}

function Empty({ icon, text, action }: { icon: string; text: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--orange3)] text-[20px]">{icon}</div>
      <p className="text-[13px] text-[var(--txt3)]">{text}</p>
      {action && <Link href={action.href} className="text-[12px] font-medium text-[var(--orange)] hover:underline">{action.label}</Link>}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Users, DollarSign, Send, Camera, AlertTriangle,
  UserPlus, Palette, CalendarClock, UserCog, Gem, Calculator,
  ArrowRight,
} from "lucide-react";

/* ── Types ───────────────────────────────────────── */

interface LicenseeRow {
  id: string;
  name: string;
  status: string | null;
  plan: string | null;
  plan_slug: string | null;
  expires_at: string | null;
  created_at: string;
}
interface PlanRow { slug: string; name: string; price_monthly: number; max_posts_day: number }
interface LogRow {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/* ── Helpers ─────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ── Component ───────────────────────────────────── */

export default function InicioPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [postsHoje, setPostsHoje] = useState(0);
  const [tokensAtivos, setTokensAtivos] = useState(0);

  const [ultimosClientes, setUltimosClientes] = useState<Array<LicenseeRow & { planName: string | null }>>([]);
  const [atividade, setAtividade] = useState<Array<{ id: string; cliente: string; template: string; time: string }>>([]);
  const [alertas, setAlertas] = useState<{ expiring: number; inactiveTokens: number; overLimit: number }>({ expiring: 0, inactiveTokens: 0, overLimit: 0 });

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const n = user.email.split("@")[0];
        setUserName(n.charAt(0).toUpperCase() + n.slice(1));
      }

      const [{ data: licData }, { data: plansData }, { data: igData }] = await Promise.all([
        supabase.from("licensees").select("id, name, status, plan, plan_slug, expires_at, created_at"),
        supabase.from("plans").select("slug, name, price_monthly, max_posts_day"),
        supabase.from("instagram_credentials").select("licensee_id"),
      ]);

      const licensees = (licData as LicenseeRow[] | null) ?? [];
      const plans = (plansData as PlanRow[] | null) ?? [];
      const planBySlug = new Map(plans.map((p) => [p.slug, p]));

      const ativos = licensees.filter((l) => l.status === "active");
      setClientesAtivos(ativos.length);

      const mrrTotal = ativos.reduce((sum, l) => {
        const slug = l.plan_slug || l.plan || "";
        const p = planBySlug.get(slug);
        return sum + (p?.price_monthly ?? 0);
      }, 0);
      setMrr(mrrTotal);

      setTokensAtivos((igData as { licensee_id: string }[] | null)?.length ?? 0);

      // Posts hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { data: logsHoje } = await supabase
        .from("activity_logs")
        .select("id")
        .in("event_type", ["post_instagram", "post_scheduled"])
        .gte("created_at", hoje.toISOString());
      setPostsHoje((logsHoje as { id: string }[] | null)?.length ?? 0);

      // Últimos clientes
      const recentes = [...licensees]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((l) => {
          const slug = l.plan_slug || l.plan || "";
          return { ...l, planName: planBySlug.get(slug)?.name ?? null };
        });
      setUltimosClientes(recentes);

      // Atividade recente
      const { data: logsRec } = await supabase
        .from("activity_logs")
        .select("id, event_type, metadata, created_at")
        .in("event_type", ["post_instagram", "post_scheduled", "download"])
        .order("created_at", { ascending: false })
        .limit(10);

      const licById = new Map(licensees.map((l) => [l.id, l.name]));
      const recent = ((logsRec as LogRow[] | null) ?? []).slice(0, 5).map((lg) => {
        const m = lg.metadata ?? {};
        const licId = typeof m.licensee_id === "string" ? m.licensee_id : "";
        const tmpl = (m.template_name as string) || (m.format as string) || (lg.event_type === "download" ? "Download" : "Post");
        return {
          id: lg.id,
          cliente: licById.get(licId) ?? "—",
          template: tmpl,
          time: relTime(lg.created_at),
        };
      });
      setAtividade(recent);

      // Alertas
      const now = Date.now();
      const in7d = now + 7 * 86400000;
      const expiring = ativos.filter((l) => {
        if (!l.expires_at) return false;
        const t = new Date(l.expires_at).getTime();
        return t >= now && t <= in7d;
      }).length;

      const tokenLicIds = new Set(((igData as { licensee_id: string }[] | null) ?? []).map((i) => i.licensee_id));
      const inactiveTokens = ativos.filter((l) => !tokenLicIds.has(l.id)).length;

      setAlertas({ expiring, inactiveTokens, overLimit: 0 });
    } catch (err) {
      console.error("[AdmInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ Header minimalista ═══ */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">ADM · {greeting()}</p>
          <h1 className="mt-1 font-[family-name:var(--font-dm-serif)] text-[26px] font-bold leading-tight text-[var(--txt)]">
            {userName ? `Olá, ${userName}` : "Painel administrativo"}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--txt3)]">Visão geral da plataforma Aurohub.</p>
        </div>
      </div>

      {/* ═══ TOP STATS ═══ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={String(clientesAtivos)} icon={<Users size={18} />} accent="#1E3A6E" />
        <StatCard label="Receita MRR" value={brl(mrr)} icon={<DollarSign size={18} />} accent="#D4A843" />
        <StatCard label="Posts publicados hoje" value={String(postsHoje)} icon={<Send size={18} />} accent="#3B82F6" />
        <StatCard label="Tokens Instagram ativos" value={String(tokensAtivos)} icon={<Camera size={18} />} accent="#A78BFA" />
      </div>

      {/* ═══ MIDDLE 3 COLS ═══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Últimos clientes */}
        <Panel title="Últimos clientes cadastrados">
          {ultimosClientes.length === 0 ? (
            <EmptyText>Nenhum cliente cadastrado.</EmptyText>
          ) : (
            <div className="flex flex-col">
              {ultimosClientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-[var(--bdr)] px-4 py-2.5 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--txt)]">{c.name}</div>
                    <div className="truncate text-[11px] text-[var(--txt3)]">{c.planName ?? "Sem plano"}</div>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--txt3)] tabular-nums">{shortDate(c.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          <FooterLink href="/clientes">Ver todos</FooterLink>
        </Panel>

        {/* Atividade recente */}
        <Panel title="Atividade recente">
          {atividade.length === 0 ? (
            <EmptyText>Sem atividade recente.</EmptyText>
          ) : (
            <div className="flex flex-col">
              {atividade.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-[var(--bdr)] px-4 py-2.5 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--txt)]">{a.cliente}</div>
                    <div className="truncate text-[11px] text-[var(--txt3)]">{a.template}</div>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--txt3)] tabular-nums">{a.time}</span>
                </div>
              ))}
            </div>
          )}
          <FooterLink href="/logs">Ver logs</FooterLink>
        </Panel>

        {/* Alertas */}
        <Panel title="Alertas do sistema">
          <div className="flex flex-col">
            <AlertRow
              label="Planos vencendo em 7 dias"
              count={alertas.expiring}
              critical={alertas.expiring > 0}
            />
            <AlertRow
              label="Clientes sem token Instagram"
              count={alertas.inactiveTokens}
              critical={alertas.inactiveTokens > 3}
            />
            <AlertRow
              label="Clientes acima do limite"
              count={alertas.overLimit}
              critical={alertas.overLimit > 0}
            />
          </div>
          <FooterLink href="/clientes">Gerenciar clientes</FooterLink>
        </Panel>
      </div>

      {/* ═══ AÇÕES RÁPIDAS ═══ */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <QuickAction href="/clientes" icon={<UserPlus size={18} />} label="Novo Cliente" subtitle="Cadastrar licenciado" />
          <QuickAction href="/editor-de-templates" icon={<Palette size={18} />} label="Editor" subtitle="Templates visuais" />
          <QuickAction href="/central-de-publicacao" icon={<CalendarClock size={18} />} label="Publicação" subtitle="Agenda central" />
          <QuickAction href="/usuarios" icon={<UserCog size={18} />} label="Usuários" subtitle="Gerenciar acessos" />
          <QuickAction href="/planos" icon={<Gem size={18} />} label="Planos" subtitle="Preços e limites" />
          <QuickAction href="/calculadora" icon={<Calculator size={18} />} label="Calculadora" subtitle="Precificação" />
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] px-5 py-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">{label}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)] tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--bdr)] bg-[var(--bg1)]">
      <div className="border-b border-[var(--bdr)] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--txt)]">{title}</h3>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12px] text-[var(--txt3)]">{children}</div>;
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-end gap-1 border-t border-[var(--bdr)] px-4 py-2.5 text-[11px] font-semibold text-[var(--orange)] hover:bg-[var(--hover-bg)]"
    >
      {children} <ArrowRight size={11} />
    </Link>
  );
}

function AlertRow({ label, count, critical }: { label: string; count: number; critical: boolean }) {
  const bg = critical ? "var(--red3)" : count > 0 ? "var(--orange3)" : "var(--bg2)";
  const color = critical ? "var(--red)" : count > 0 ? "var(--orange)" : "var(--txt3)";
  return (
    <div className="flex items-center justify-between border-b border-[var(--bdr)] px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {critical && <AlertTriangle size={13} className="shrink-0" style={{ color: "var(--red)" }} />}
        <span className="truncate text-[12px] text-[var(--txt2)]">{label}</span>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
        style={{ background: bg, color }}
      >
        {count}
      </span>
    </div>
  );
}

function QuickAction({ href, icon, label, subtitle }: { href: string; icon: React.ReactNode; label: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--orange3)] hover:shadow-sm"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--txt2)] transition-colors group-hover:bg-[var(--orange3)] group-hover:text-[var(--orange)]">
        {icon}
      </span>
      <div>
        <div className="text-[13px] font-semibold text-[var(--txt)]">{label}</div>
        <div className="text-[11px] text-[var(--txt3)]">{subtitle}</div>
      </div>
    </Link>
  );
}

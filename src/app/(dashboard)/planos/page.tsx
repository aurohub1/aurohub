"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string; price_monthly: number; price_yearly: number;
  max_feed_reels_day?: number | null; max_stories_day?: number | null;
  price_setup?: number; min_months?: number;
  max_users: number; max_posts_day: number; can_schedule: boolean; can_metrics: boolean;
  can_print: boolean; is_enterprise: boolean; active: boolean; sort_order: number;
}
interface Licensee { id: string; name: string; plan: string; status: string; }
interface StoreCount { licensee_id: string; count: number; }
type TabFilter = "all" | "basic" | "pro" | "business" | "enterprise" | "none";

/* ── Static plan data (display only) ─────────────── */

const PLAN_INFO: Record<string, {
  name: string; emoji: string; accent: string; bg: string; border: string; badge: string | null;
  price: string; implant: string; fidelity: string;
  profiles: string; logins: string; posts: string; stories: string;
  features: { label: string; included: boolean }[];
}> = {
  basic: {
    name: "Essencial", emoji: "🎯", accent: "var(--blue)", bg: "var(--blue3)", border: "var(--txt3)", badge: null,
    price: "R$497", implant: "R$1.500", fidelity: "6 meses",
    profiles: "1 perfil", logins: "1 login", posts: "Sem publicação IG", stories: "—",
    features: [
      { label: "Download ilimitado", included: true },
      { label: "Publicação Instagram", included: false },
      { label: "Agendamento", included: false },
      { label: "Métricas Instagram", included: false },
      { label: "IA de legenda", included: false },
      { label: "Transmissão", included: false },
    ],
  },
  pro: {
    name: "Profissional", emoji: "⚡", accent: "var(--gold)", bg: "var(--gold3)", border: "#3B82F6", badge: "Mais popular",
    price: "R$997", implant: "R$2.500", fidelity: "6 meses",
    profiles: "1 perfil IG", logins: "2 logins", posts: "5 Feed+Reels/dia", stories: "5 Stories/dia",
    features: [
      { label: "Download ilimitado", included: true },
      { label: "Publicação Instagram", included: true },
      { label: "Agendamento", included: false },
      { label: "Métricas Instagram", included: false },
      { label: "IA de legenda", included: false },
      { label: "Transmissão", included: false },
    ],
  },
  business: {
    name: "Franquia", emoji: "🏢", accent: "var(--orange)", bg: "var(--orange3)", border: "#FF7A1A", badge: "Melhor custo-benefício",
    price: "R$1.797", implant: "R$4.500", fidelity: "12 meses",
    profiles: "Até 3 perfis", logins: "6 logins", posts: "20 posts/dia por perfil", stories: "20 Stories/dia",
    features: [
      { label: "Download ilimitado", included: true },
      { label: "Publicação Instagram", included: true },
      { label: "Agendamento", included: true },
      { label: "Métricas Instagram", included: true },
      { label: "IA de legenda", included: true },
      { label: "Transmissão (add-on)", included: true },
    ],
  },
  enterprise: {
    name: "Enterprise", emoji: "👑", accent: "var(--purple)", bg: "var(--purple3)", border: "#D4A843", badge: null,
    price: "Sob consulta", implant: "Negociado", fidelity: "Negociado",
    profiles: "Até 50 perfis", logins: "Ilimitados", posts: "Ilimitados", stories: "Ilimitados",
    features: [
      { label: "Download ilimitado", included: true },
      { label: "Publicação Instagram", included: true },
      { label: "Agendamento", included: true },
      { label: "Métricas Instagram", included: true },
      { label: "IA de legenda", included: true },
      { label: "Transmissão (inclusa)", included: true },
    ],
  },
};

const ADDON_TRANSMISSAO = [
  { name: "Individual", price: "R$29", period: "/mês", desc: "1 vendedor", emoji: "👤", features: ["1 perfil de vendedor", "Link personalizado", "QR Code individual"] },
  { name: "Time", price: "R$199", period: "/mês", desc: "Até 10 vendedores", emoji: "👥", features: ["Até 10 vendedores", "Painel do gestor", "Ranking de vendas"] },
  { name: "Rede", price: "R$449", period: "/mês", desc: "Até 30 vendedores", emoji: "🏪", features: ["Até 30 vendedores", "Multi-loja", "Relatórios avançados"] },
];

/* ── Helpers ─────────────────────────────────────── */

function fmt(v: number): string {
  return `R$${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

/* ── Component ───────────────────────────────────── */

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [storeCounts, setStoreCounts] = useState<StoreCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, Record<string, string | boolean>>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [changingClient, setChangingClient] = useState<string | null>(null);
  const [changePlan, setChangePlan] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [pRes, lRes, sRes] = await Promise.all([
        supabase.from("plans").select("*").order("sort_order"),
        supabase.from("licensees").select("id, name, plan, status").order("name"),
        supabase.from("stores").select("licensee_id"),
      ]);
      setPlans((pRes.data as Plan[]) ?? []);
      setLicensees((lRes.data as Licensee[]) ?? []);
      const c: Record<string, number> = {};
      ((sRes.data ?? []) as { licensee_id: string }[]).forEach((s) => { c[s.licensee_id] = (c[s.licensee_id] || 0) + 1; });
      setStoreCounts(Object.entries(c).map(([licensee_id, count]) => ({ licensee_id, count })));
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const storeMap = useMemo(() => { const m: Record<string, number> = {}; storeCounts.forEach((s) => { m[s.licensee_id] = s.count; }); return m; }, [storeCounts]);
  const planMap = useMemo(() => { const m: Record<string, Plan> = {}; plans.forEach((p) => { m[p.slug] = p; }); return m; }, [plans]);

  const kpis = useMemo(() => {
    const active = licensees.filter((l) => l.status === "active").length;
    const mrr = licensees.filter((l) => l.status === "active").reduce((s, l) => s + (planMap[l.plan]?.price_monthly ?? 0), 0);
    return { active, mrr, activePlans: plans.filter((p) => p.active).length, overdue: 0 };
  }, [licensees, plans, planMap]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: licensees.length, none: 0 };
    licensees.forEach((l) => { if (!l.plan) { c.none++; } else { c[l.plan] = (c[l.plan] || 0) + 1; } });
    return c;
  }, [licensees]);

  const filtered = useMemo(() => {
    return licensees.filter((l) => {
      const ms = !search || l.name.toLowerCase().includes(search.toLowerCase());
      const mt = tab === "all" || (tab === "none" ? !l.plan : l.plan === tab);
      return ms && mt;
    });
  }, [licensees, search, tab]);

  function openEdit() {
    const d: Record<string, Record<string, string | boolean>> = {};
    plans.forEach((p) => {
      const setupDefaults: Record<string, string> = { basic: "1500", pro: "2500", business: "4500", enterprise: "7500" };
      const monthDefaults: Record<string, string> = { basic: "6", pro: "6", business: "12", enterprise: "12" };
      const monthly = p.price_monthly;
      const expectedYearly = monthly * 12 * 0.85;
      const isAutoYearly = !p.price_yearly || Math.abs(p.price_yearly - expectedYearly) < 1;
      d[p.id] = {
        price_monthly: String(p.price_monthly), price_yearly: String(p.price_yearly),
        discount: "15", yearly_auto: isAutoYearly,
        price_setup: String(p.price_setup ?? setupDefaults[p.slug] ?? "0"),
        min_months: String(p.min_months ?? monthDefaults[p.slug] ?? "6"),
        max_users: String(p.max_users), max_posts_day: String(p.max_posts_day),
        max_feed_reels_day: String(p.max_feed_reels_day ?? 0),
        max_stories_day: String(p.max_stories_day ?? 0),
        can_schedule: p.can_schedule, can_metrics: p.can_metrics,
        can_print: p.can_print, is_enterprise: p.is_enterprise,
      };
    });
    setEditData(d); setEditError(""); setEditOpen(true);
  }

  async function saveEdit() {
    setEditSaving(true); setEditError("");
    try {
      for (const plan of plans) {
        const f = editData[plan.id]; if (!f) continue;
        const { error } = await supabase.from("plans").update({
          price_monthly: parseFloat(f.price_monthly as string) || 0,
          price_yearly: parseFloat(f.price_yearly as string) || 0,
          price_setup: parseFloat(f.price_setup as string) || 0,
          min_months: parseInt(f.min_months as string) || 6,
          max_users: parseInt(f.max_users as string) || 1,
          max_posts_day: parseInt(f.max_posts_day as string) || 0,
          max_feed_reels_day: parseInt(f.max_feed_reels_day as string) || 0,
          max_stories_day: parseInt(f.max_stories_day as string) || 0,
          can_schedule: f.can_schedule as boolean,
          can_metrics: f.can_metrics as boolean,
        }).eq("id", plan.id);
        if (error) { setEditError(`${plan.name}: ${error.message}`); return; }
      }
      setEditOpen(false); await loadData();
    } catch { setEditError("Erro ao salvar."); } finally { setEditSaving(false); }
  }

  function ef(id: string, k: string, v: string | boolean) {
    setEditData((prev) => {
      const updated = { ...prev, [id]: { ...prev[id], [k]: v } };
      const f = updated[id];
      // Auto-recalc yearly when monthly or discount changes
      if ((k === "price_monthly" || k === "discount") && f.yearly_auto) {
        const monthly = parseFloat(f.price_monthly as string) || 0;
        const disc = parseFloat(f.discount as string) || 0;
        f.price_yearly = String(Math.round(monthly * 12 * (1 - disc / 100) * 100) / 100);
      }
      // If user manually edits yearly, unlink auto
      if (k === "price_yearly") { f.yearly_auto = false; }
      return updated;
    });
  }

  async function saveClientPlan() {
    if (!changingClient) return;
    await supabase.from("licensees").update({ plan: changePlan }).eq("id", changingClient);
    setChangingClient(null); await loadData();
  }

  const SLUGS = ["basic", "pro", "business", "enterprise"] as const;

  return (
    <>
      {/* ── KPIs (compact row) ───────────────────── */}
      <div className="flex flex-wrap gap-6">
        <KpiInline label="Assinantes" value={String(kpis.active)} />
        <KpiInline label="MRR" value={fmt(kpis.mrr)} accent />
        <KpiInline label="Planos ativos" value={String(kpis.activePlans)} />
        <KpiInline label="Inadimplentes" value="0" />
      </div>

      {/* ── Section header ───────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Planos</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie valores, limites e permissões</p>
        </div>
        <button onClick={openEdit} className="rounded-lg border border-[var(--bdr2)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] transition-colors hover:border-[var(--txt)] hover:text-[var(--txt)]">
          Editar planos
        </button>
      </div>

      {/* ── Plan cards ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SLUGS.map((slug) => {
          const info = PLAN_INFO[slug];
          const subs = tabCounts[slug] ?? 0;
          const isPro = slug === "pro";
          const dbPlan = planMap[slug];
          const postsStr = dbPlan?.max_feed_reels_day != null && dbPlan.max_feed_reels_day > 0
            ? `${dbPlan.max_feed_reels_day} Feed+Reels/dia`
            : info.posts;
          const storiesStr = dbPlan?.max_stories_day != null && dbPlan.max_stories_day > 0
            ? (dbPlan.max_stories_day >= 99 ? "Stories ilimitados" : `${dbPlan.max_stories_day} Stories/dia`)
            : info.stories;

          return (
            <div
              key={slug}
              className={`relative flex flex-col overflow-hidden rounded-2xl border transition-shadow ${isPro ? "border-[var(--bdr2)] shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_8px_32px_rgba(0,0,0,0.25)]" : "border-[var(--bdr)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"}`}
              style={{
                borderTop: `2px solid ${info.border}`,
                background: isPro ? "linear-gradient(180deg, var(--blue3) 0%, transparent 40%), var(--card-bg)" : "var(--card-bg)",
              }}
            >
              {/* Badge */}
              {info.badge && (
                <div
                  className="absolute right-4 top-4 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: info.border, color: "#fff" }}
                >
                  {info.badge}
                </div>
              )}

              <div className="flex flex-1 flex-col px-6 pb-6 pt-7">
                {/* Name */}
                <div className="mb-6 text-[14px] font-semibold text-[var(--txt)]">{info.name}</div>

                {/* Price block */}
                <div className="mb-1">
                  <span className="font-[family-name:var(--font-dm-serif)] text-[2.75rem] font-bold leading-none tracking-tight text-[var(--txt)]">
                    {info.price}
                  </span>
                </div>
                <div className="text-[13px] text-[var(--txt3)]">
                  {slug !== "enterprise" ? "por mês" : "preço sob consulta"}
                </div>
                <div className="mt-2 mb-6 text-[12px] text-[var(--txt3)]">
                  {slug !== "enterprise" ? `${info.implant} implantação · ${info.fidelity}` : "Tudo negociado"}
                </div>

                {/* Capacity */}
                <div className="mb-1.5 text-[12px] font-medium text-[var(--txt2)]">{info.profiles} · {info.logins}</div>
                <div className="mb-1 text-[12px] text-[var(--txt3)]">{postsStr}</div>
                {storiesStr !== "—" && <div className="mb-0 text-[12px] text-[var(--txt3)]">{storiesStr}</div>}

                {/* Divider */}
                <div className="my-5 h-px bg-[var(--bdr)]" />

                {/* Features */}
                <div className="flex flex-1 flex-col gap-2.5">
                  {info.features.map((f) => (
                    <div key={f.label} className="flex items-center gap-2 text-[13px] leading-tight">
                      <svg viewBox="0 0 16 16" className={`h-4 w-4 shrink-0 ${f.included ? "text-[var(--green)]" : "text-[var(--txt3)] opacity-30"}`}>
                        {f.included
                          ? <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          : <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        }
                      </svg>
                      <span className={f.included ? "text-[var(--txt)]" : "text-[var(--txt3)] opacity-40 line-through"}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between text-[12px] text-[var(--txt3)]">
                  <span>{subs} cliente{subs !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add-on: Transmissão ──────────────────── */}
      <div className="mt-2">
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="text-[16px] font-bold text-[var(--txt)]">Transmissão</h3>
          <span className="text-[12px] text-[var(--txt3)]">Add-on para Franquia e Enterprise</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ADDON_TRANSMISSAO.map((a) => (
            <div key={a.name} className="rounded-xl border border-[var(--bdr)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.1)]" style={{ background: "var(--card-bg)" }}>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-[var(--txt)]">{a.name}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--txt3)]">{a.desc}</div>
                </div>
                <div className="text-right">
                  <span className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold text-[var(--txt)]">{a.price}</span>
                  <span className="text-[12px] text-[var(--txt3)]">{a.period}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-[var(--bdr)] pt-3">
                {a.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[12px] text-[var(--txt2)]">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[var(--green)]">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Client list header ───────────────────── */}
      <div className="mt-4 border-b border-[var(--bdr)] pb-3">
        <h3 className="text-[16px] font-bold text-[var(--txt)]">Clientes licenciados</h3>
      </div>

      {/* ── Tabs + search ────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {([
            { key: "all" as TabFilter, label: "Todos" },
            { key: "basic" as TabFilter, label: "Essencial" },
            { key: "pro" as TabFilter, label: "Pro" },
            { key: "business" as TabFilter, label: "Franquia" },
            { key: "enterprise" as TabFilter, label: "Enterprise" },
            { key: "none" as TabFilter, label: "Sem plano" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${tab === t.key ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)] hover:text-[var(--txt2)]"}`}>
              {t.label}{" "}<span className="text-[10px] opacity-50">{tabCounts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px]">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum cliente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Cliente</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Plano</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">Lojas</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">IA</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">Lâmina</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-[var(--txt3)]">Métricas</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)]">Status</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[var(--txt3)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const info = PLAN_INFO[l.plan] ?? null;
                  const plan = planMap[l.plan];
                  const stores = storeMap[l.id] ?? 0;
                  const isActive = l.status === "active";
                  const isChanging = changingClient === l.id;

                  return (
                    <tr key={l.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{l.name.charAt(0).toUpperCase()}</div>
                          <span className="font-medium text-[var(--txt)]">{l.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isChanging ? (
                          <div className="flex items-center gap-1.5">
                            <select value={changePlan} onChange={(e) => setChangePlan(e.target.value)} className="h-7 rounded border border-[var(--bdr2)] bg-[var(--bg2)] px-1.5 text-[11px] text-[var(--txt)] outline-none">
                              {Object.entries(PLAN_INFO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                            </select>
                            <button onClick={saveClientPlan} className="rounded bg-[var(--txt)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bg)]">OK</button>
                            <button onClick={() => setChangingClient(null)} className="text-[11px] text-[var(--txt3)] hover:text-[var(--txt)]">cancelar</button>
                          </div>
                        ) : info ? (
                          <span className="text-[12px] font-medium" style={{ color: info.border }}>{info.name}</span>
                        ) : <span className="text-[var(--txt3)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--txt2)]">{stores}</td>
                      <td className="px-4 py-3 text-center"><span className={plan?.is_enterprise || l.plan === "business" ? "text-[var(--green)]" : "text-[var(--txt3)] opacity-40"}>{plan?.is_enterprise || l.plan === "business" ? "✓" : "—"}</span></td>
                      <td className="px-4 py-3 text-center"><span className={l.plan === "business" || l.plan === "enterprise" ? "text-[var(--green)]" : "text-[var(--txt3)] opacity-40"}>{l.plan === "business" || l.plan === "enterprise" ? "✓" : "—"}</span></td>
                      <td className="px-4 py-3 text-center"><span className={plan?.can_metrics ? "text-[var(--green)]" : "text-[var(--txt3)] opacity-40"}>{plan?.can_metrics ? "✓" : "—"}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] ${isActive ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />{isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => { setChangingClient(l.id); setChangePlan(l.plan || "basic"); }} className="text-[12px] font-medium text-[var(--txt3)] transition-colors hover:text-[var(--txt)]">Editar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit modal ───────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={() => setEditOpen(false)}>
          <div className="mx-4 flex w-full max-w-[960px] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[var(--bdr)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]" style={{ background: "var(--card-bg)", backdropFilter: "blur(20px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">Configurar planos</h2>
                <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Valores, limites e autorizações</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {plans.map((plan) => {
                  const info = PLAN_INFO[plan.slug] ?? PLAN_INFO.basic;
                  const f = editData[plan.id]; if (!f) return null;
                  const pm = parseFloat(f.price_monthly as string) || 0;

                  return (
                    <div key={plan.id} className="rounded-xl border border-[var(--bdr)] p-5" style={{ borderTop: `2px solid ${info.border}` }}>
                      <div className="mb-4 text-[14px] font-semibold text-[var(--txt)]">{info.name}</div>

                      {/* Live preview */}
                      <div className="mb-5 rounded-lg bg-[var(--bg3)] px-4 py-3 text-center">
                        <span className="font-[family-name:var(--font-dm-serif)] text-[1.25rem] font-bold text-[var(--txt)]">{plan.is_enterprise ? "Sob consulta" : fmt(pm)}</span>
                        {!plan.is_enterprise && <span className="ml-1 text-[11px] text-[var(--txt3)]">/mês</span>}
                      </div>

                      <div className="flex flex-col gap-3">
                        <MF label="Mensal (R$)" value={f.price_monthly as string} onChange={(v) => ef(plan.id, "price_monthly", v)} />
                        <MF label="Desconto anual (%)" value={f.discount as string} onChange={(v) => ef(plan.id, "discount", v)} hint="default 15%" />
                        <div>
                          <div className="mb-1 flex items-baseline justify-between">
                            <label className="text-[11px] font-medium text-[var(--txt3)]">Anual (R$)</label>
                            {!f.yearly_auto && (
                              <button type="button" onClick={() => { ef(plan.id, "yearly_auto", true); ef(plan.id, "discount", f.discount as string); }} className="text-[10px] text-[var(--txt3)] hover:text-[var(--txt)]">↺ Recalcular</button>
                            )}
                          </div>
                          <input type="number" step="0.01" value={f.price_yearly as string} onChange={(e) => ef(plan.id, "price_yearly", e.target.value)} className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none transition-colors focus:border-[var(--txt3)]" />
                          {(parseFloat(f.price_yearly as string) || 0) > 0 && (
                            <div className="mt-1 text-[10px] text-[var(--txt3)]">
                              {fmt(Math.round((parseFloat(f.price_yearly as string) || 0) / 12 * 100) / 100)}/mês cobrado anualmente
                            </div>
                          )}
                        </div>
                        <MF label="Implantação (R$)" value={f.price_setup as string} onChange={(v) => ef(plan.id, "price_setup", v)} />
                        <MF label="Fidelidade (meses)" value={f.min_months as string} onChange={(v) => ef(plan.id, "min_months", v)} />
                        <div className="h-px bg-[var(--bdr)]" />
                        <MF label="Máx. usuários" value={f.max_users as string} onChange={(v) => ef(plan.id, "max_users", v)} hint="-1 = ilimitado" />
                        <MF label="Posts/dia" value={f.max_posts_day as string} onChange={(v) => ef(plan.id, "max_posts_day", v)} hint="0 = sem posts" />
                        <MF label="Feed/Reels por dia" value={f.max_feed_reels_day as string} onChange={(v) => ef(plan.id, "max_feed_reels_day", v)} hint="0 = não permite" />
                        <MF label="Stories por dia" value={f.max_stories_day as string} onChange={(v) => ef(plan.id, "max_stories_day", v)} hint="99 = ilimitado" />
                        <div className="h-px bg-[var(--bdr)]" />
                        <div className="text-[11px] font-medium text-[var(--txt3)]">Autorizações</div>
                        <div className="flex flex-col gap-2 text-[12px]">
                          <label className="flex items-center gap-2 text-[var(--txt2)]"><input type="checkbox" checked={f.can_print as boolean} onChange={(e) => ef(plan.id, "can_print", e.target.checked)} className="accent-[var(--green)]" /> Publicação IG</label>
                          <label className="flex items-center gap-2 text-[var(--txt2)]"><input type="checkbox" checked={f.can_schedule as boolean} onChange={(e) => ef(plan.id, "can_schedule", e.target.checked)} className="accent-[var(--green)]" /> Agendamento</label>
                          <label className="flex items-center gap-2 text-[var(--txt2)]"><input type="checkbox" checked={f.can_metrics as boolean} onChange={(e) => ef(plan.id, "can_metrics", e.target.checked)} className="accent-[var(--green)]" /> Métricas</label>
                          <label className="flex items-center gap-2 text-[var(--txt2)]"><input type="checkbox" checked={f.is_enterprise as boolean} onChange={(e) => ef(plan.id, "is_enterprise", e.target.checked)} className="accent-[var(--green)]" /> IA legenda</label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {editError && <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{editError}</div>}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setEditOpen(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={saveEdit} disabled={editSaving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{editSaving ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function KpiInline({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] text-[var(--txt3)]">{label}</span>
      <span className={`text-[16px] font-bold ${accent ? "text-[var(--gold)]" : "text-[var(--txt)]"}`}>{value}</span>
    </div>
  );
}

function MF({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-[11px] font-medium text-[var(--txt3)]">{label}</label>
        {hint && <span className="text-[10px] text-[var(--txt3)] opacity-60">{hint}</span>}
      </div>
      <input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none transition-colors focus:border-[var(--txt3)]" />
    </div>
  );
}

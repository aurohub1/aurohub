"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string;
  price_monthly: number; price_yearly: number;
  price_setup: number; min_months: number;
  max_users: number; max_posts_day: number;
  max_feed_reels_day?: number | null;
  max_stories_day?: number | null;
  is_internal?: boolean | null;
}

interface AddOn {
  id: string; slug: string; name: string; description: string | null;
  price_monthly: number; type: string; limit_per_month: number;
  available_from_plan: string; included_in_plans: string[];
  is_active: boolean; sort_order: number;
}

type Periodo = "mensal" | "anual";

/* ── Constants ───────────────────────────────────── */

const SLUG_EMOJI: Record<string, string> = {
  basic: "🎯", pro: "⚡", business: "🏢", enterprise: "👑",
};

// Maps DB plan slugs → values that may appear in add_ons.included_in_plans
const PLAN_INCLUDED_AS: Record<string, string[]> = {
  basic:      ["basic", "essencial"],
  pro:        ["pro", "profissional"],
  business:   ["business", "franquia"],
  enterprise: ["enterprise"],
};

const EXCLUDE_SLUGS = new Set(["novo_template", "badge_design"]);

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isAddonIncluded(addon: AddOn, planSlug: string): boolean {
  const aliases = PLAN_INCLUDED_AS[planSlug] ?? [planSlug];
  return addon.included_in_plans.some((p) => aliases.includes(p));
}

/* ── Component ───────────────────────────────────── */

export default function CalculadoraPage() {
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [addOnItems, setAddOnItems] = useState<AddOn[]>([]);
  const [loading, setLoading]       = useState(true);

  const [selectedPlan, setSelectedPlan]     = useState("pro");
  const [lojas, setLojas]                   = useState(1);
  const [usuarios, setUsuarios]             = useState(2);
  const [feedPosts, setFeedPosts]           = useState(5);
  const [storiesQty, setStoriesQty]         = useState(5);
  const [periodo, setPeriodo]               = useState<Periodo>("mensal");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [copied, setCopied]                 = useState(false);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("add_ons").select("*").eq("is_active", true).order("sort_order"),
    ]);
    setPlans((pRes.data as Plan[]) ?? []);
    setAddOnItems(
      ((aRes.data as AddOn[]) ?? []).filter((a) => !EXCLUDE_SLUGS.has(a.slug))
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const planData = useMemo(() => plans.find((p) => p.slug === selectedPlan), [plans, selectedPlan]);

  const { regularAddOns, transmissaoAddOns } = useMemo(() => ({
    regularAddOns:    addOnItems.filter((a) => !a.slug.startsWith("transmissao_")),
    transmissaoAddOns: addOnItems.filter((a) =>  a.slug.startsWith("transmissao_")),
  }), [addOnItems]);

  const annualDiscountPct = useMemo(() => {
    if (!planData?.price_yearly || !planData.price_monthly) return 15;
    return Math.max(0, Math.round((1 - planData.price_yearly / (planData.price_monthly * 12)) * 100));
  }, [planData]);

  /* ── Calc ──────────────────────────────────────── */

  const calc = useMemo(() => {
    if (!planData) return { base: 0, mensalidade: 0, implantacao: 0, addonMensal: 0, totalMensal: 0, totalPeriodo: 0, meses: 1 };

    const base = periodo === "anual" && planData.price_yearly > 0
      ? planData.price_yearly / 12
      : planData.price_monthly;

    const mensalidade = base * lojas * usuarios;
    const implantacao = (planData.price_setup ?? 0) * lojas;
    const addonMensal = addOnItems
      .filter((a) => selectedAddons.includes(a.slug) && !isAddonIncluded(a, selectedPlan))
      .reduce((s, a) => s + a.price_monthly, 0);
    const totalMensal  = mensalidade + addonMensal;
    const meses        = periodo === "anual" ? 12 : (planData.min_months ?? 1);
    const totalPeriodo = totalMensal * meses + implantacao;
    return { base, mensalidade, implantacao, addonMensal, totalMensal, totalPeriodo, meses };
  }, [planData, lojas, usuarios, periodo, selectedAddons, addOnItems, selectedPlan]);

  /* ── Recomendação ──────────────────────────────── */

  const recommendation = useMemo(() => {
    if (plans.length === 0 || !planData) return null;

    const costs = plans
      .filter((p) => p.price_monthly > 0 && !p.is_internal)
      .map((p) => {
        const base = periodo === "anual" && p.price_yearly > 0 ? p.price_yearly / 12 : p.price_monthly;
        const planAddonMensal = addOnItems
          .filter((a) => selectedAddons.includes(a.slug))
          .reduce((s, a) => s + (isAddonIncluded(a, p.slug) ? 0 : a.price_monthly), 0);
        const total         = base * lojas * usuarios + planAddonMensal;
        const coversUsers   = p.max_users === -1 || p.max_users >= usuarios;
        const coversFeed    = p.max_feed_reels_day == null || p.max_feed_reels_day === -1 || p.max_feed_reels_day >= feedPosts;
        const coversStories = p.max_stories_day == null || p.max_stories_day === -1 || p.max_stories_day >= storiesQty;
        const coversAll     = coversUsers && coversFeed && coversStories;
        return { plan: p, total, coversUsers, coversFeed, coversStories, coversAll };
      });

    const currentCost = costs.find((c) => c.plan.slug === selectedPlan);
    if (!currentCost) return null;

    if (!currentCost.coversAll) {
      const reasons: string[] = [];
      if (!currentCost.coversUsers)   reasons.push(`${usuarios} usuários por loja`);
      if (!currentCost.coversFeed)    reasons.push(`${feedPosts} Feed/Reels por dia`);
      if (!currentCost.coversStories) reasons.push(`${storiesQty} Stories por dia`);

      const fullCover = costs
        .filter((c) => c.coversAll && c.plan.slug !== selectedPlan)
        .sort((a, b) => a.total - b.total)[0];
      if (fullCover) {
        return { type: "upgrade" as const, plan: fullCover.plan, diff: fullCover.total - currentCost.total,
          reason: `Seu uso excede o ${planData.name}: ${reasons.join(", ")}.` };
      }

      const ranked = costs
        .filter((c) => c.plan.slug !== selectedPlan)
        .map((c) => {
          const norm = (v: number | null | undefined) => (v == null || v === -1 ? 9999 : v);
          return { c, score: norm(c.plan.max_users) + norm(c.plan.max_feed_reels_day) + norm(c.plan.max_stories_day) };
        })
        .sort((a, b) => b.score - a.score);

      const best = ranked[0]?.c;
      if (best && (best.plan.max_users === -1 || best.plan.max_users > currentCost.plan.max_users ||
          (best.plan.max_stories_day ?? 9999) > (currentCost.plan.max_stories_day ?? 0) ||
          (best.plan.max_feed_reels_day ?? 9999) > (currentCost.plan.max_feed_reels_day ?? 0))) {
        return { type: "upgrade" as const, plan: best.plan, diff: best.total - currentCost.total,
          reason: `Nenhum plano cobre 100% (${reasons.join(", ")}), mas o ${best.plan.name} é o mais próximo.` };
      }
      return null;
    }

    const cheapest = costs.filter((c) => c.coversAll).sort((a, b) => a.total - b.total)[0];
    if (cheapest && cheapest.plan.slug !== selectedPlan && cheapest.total < currentCost.total) {
      const saving      = currentCost.total - cheapest.total;
      const isDowngrade = cheapest.plan.max_users < (currentCost.plan.max_users === -1 ? Infinity : currentCost.plan.max_users);
      return {
        type: isDowngrade ? ("savings" as const) : ("better" as const),
        plan: cheapest.plan, diff: -saving,
        reason: isDowngrade
          ? `Sua configuração atual (${lojas} loja${lojas > 1 ? "s" : ""}, ${usuarios} user/loja) cabe no ${cheapest.plan.name}.`
          : `O ${cheapest.plan.name} oferece mais recursos pelo mesmo custo ou menos.`,
      };
    }

    return null;
  }, [plans, planData, selectedPlan, lojas, usuarios, feedPosts, storiesQty, periodo, selectedAddons, addOnItems]);

  /* ── Proposta ──────────────────────────────────── */

  function copyProposta() {
    const planName  = planData?.name ?? selectedPlan;
    const planEmoji = SLUG_EMOJI[selectedPlan] ?? "📦";

    const payingLines   = addOnItems
      .filter((a) => selectedAddons.includes(a.slug) && !isAddonIncluded(a, selectedPlan))
      .map((a) => `  • ${a.name}: ${brl(a.price_monthly)}/mês`);
    const includedLines = addOnItems
      .filter((a) => isAddonIncluded(a, selectedPlan))
      .map((a) => `  • ${a.name}: incluso no plano`);

    const addonBlock = [...payingLines, ...includedLines].join("\n");

    const text = [
      `*PROPOSTA AUROHUB*`,
      ``,
      `*Plano:* ${planName} ${planEmoji}`,
      `*Lojas:* ${lojas}`,
      `*Usuários/loja:* ${usuarios}`,
      `*Período:* ${periodo === "anual" ? `Anual (${annualDiscountPct}% desc)` : "Mensal"}`,
      addonBlock ? `\n*Add-ons:*\n${addonBlock}` : "",
      ``,
      `─────────────────`,
      `*Implantação:* ${brl(calc.implantacao)}`,
      `*Mensalidade:* ${brl(calc.totalMensal)}/mês`,
      `*Total em ${calc.meses} meses:* ${brl(calc.totalPeriodo)}`,
      `─────────────────`,
      ``,
      `_Proposta gerada pelo Aurohub_`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function saveAsLead() {
    const planName = planData?.name ?? selectedPlan;
    await supabase.from("leads").insert({
      name: `Lead Calculadora — ${planName}`,
      plan_interest: selectedPlan,
      origin: "Calculadora",
      status: "new",
      priority: "media",
      notes: `${lojas} loja(s), ${usuarios} user/loja, ${periodo}, ${brl(calc.totalMensal)}/mês`,
    });
    alert("Lead salvo no CRM!");
  }

  function toggleAddon(slug: string) {
    if (slug.startsWith("transmissao_")) {
      setSelectedAddons((prev) => {
        const withoutTrans = prev.filter((k) => !k.startsWith("transmissao_"));
        return prev.includes(slug) ? withoutTrans : [...withoutTrans, slug];
      });
    } else {
      setSelectedAddons((prev) =>
        prev.includes(slug) ? prev.filter((k) => k !== slug) : [...prev, slug]
      );
    }
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  const planName  = planData?.name ?? selectedPlan;

  return (
    <div className="flex flex-1 items-start justify-center page-fade">
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>

        {/* Header */}
        <div className="border-b border-[var(--bdr)] px-4 py-2.5 text-center">
          <h2 className="font-[family-name:var(--font-dm-serif)] text-[16px] font-bold leading-tight text-[var(--txt)]">Calculadora de Proposta</h2>
        </div>

        {/* Plan tabs */}
        <div className="grid grid-cols-4 border-b border-[var(--bdr)]">
          {plans.filter((p) => !p.is_internal).map((p) => {
            const active = selectedPlan === p.slug;
            return (
              <button
                key={p.slug}
                onClick={() => setSelectedPlan(p.slug)}
                className={`flex items-center justify-center gap-1.5 py-2 text-center transition-colors ${active ? "bg-[var(--bg3)]" : "hover:bg-[var(--hover-bg)]"}`}
                style={active ? { borderBottom: "2px solid var(--orange)" } : {}}
              >
                <span className="text-[14px]">{SLUG_EMOJI[p.slug] ?? "📦"}</span>
                <div className="flex flex-col leading-tight">
                  <span className={`text-[11px] font-semibold ${active ? "text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{p.name}</span>
                  <span className={`text-[9px] ${active ? "text-[var(--orange)]" : "text-[var(--txt3)]"}`}>
                    {p.price_monthly > 0 ? brl(p.price_monthly) : "Consulta"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recomendação */}
        {recommendation && (
          <button
            onClick={() => setSelectedPlan(recommendation.plan.slug)}
            className="flex w-full items-center gap-2.5 border-b border-[var(--bdr)] px-4 py-2 text-left transition-colors hover:brightness-110"
            style={{ background: "linear-gradient(90deg, rgba(212,168,67,0.14), rgba(255,122,26,0.08))" }}
          >
            <span className="text-[14px]">{recommendation.type === "upgrade" ? "⚡" : recommendation.type === "savings" ? "💡" : "✨"}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[11px] font-semibold text-[var(--txt)]">
                {recommendation.type === "upgrade"
                  ? `Troque para ${recommendation.plan.name}`
                  : `Com sua configuração, ${recommendation.plan.name} ${recommendation.diff < 0 ? `economiza ${brl(Math.abs(recommendation.diff))}/mês` : "cobre seu uso"}.`}
              </div>
              <div className="truncate text-[10px] text-[var(--txt3)]">{recommendation.reason}</div>
            </div>
            <span className="shrink-0 rounded-md bg-[var(--gold)] px-2 py-1 text-[10px] font-bold text-white">Mudar</span>
          </button>
        )}

        {/* Config */}
        <div className="flex flex-col gap-2.5 px-4 py-3">

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Lojas / Perfis</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{lojas}</span>
            </div>
            <input type="range" min={1} max={10} value={lojas} onChange={(e) => setLojas(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Usuários por loja</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{usuarios}</span>
            </div>
            <input type="range" min={1} max={20} value={usuarios} onChange={(e) => setUsuarios(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Posts Feed/Reels por dia</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{feedPosts}</span>
            </div>
            <input type="range" min={0} max={25} value={feedPosts} onChange={(e) => setFeedPosts(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Stories por dia</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">
                {storiesQty >= 99 ? "Ilimitado" : storiesQty}
              </span>
            </div>
            <input type="range" min={0} max={99} value={storiesQty} onChange={(e) => setStoriesQty(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          {/* Período */}
          <div className="flex gap-0.5 rounded-md border border-[var(--bdr)] p-0.5">
            <button onClick={() => setPeriodo("mensal")} className={`flex h-7 flex-1 items-center justify-center rounded-[5px] text-[11px] font-medium ${periodo === "mensal" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Mensal</button>
            <button onClick={() => setPeriodo("anual")} className={`flex h-7 flex-1 items-center justify-center rounded-[5px] text-[11px] font-medium ${periodo === "anual" ? "bg-[var(--green3)] text-[var(--green)]" : "text-[var(--txt3)]"}`}>
              Anual <span className="ml-1 text-[9px] opacity-75">(-{annualDiscountPct}%)</span>
            </button>
          </div>

          {/* Add-ons mensais */}
          {regularAddOns.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Add-ons mensais</div>
              {regularAddOns.map((a) => {
                const included = isAddonIncluded(a, selectedPlan);
                const checked  = included || selectedAddons.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    onClick={() => !included && toggleAddon(a.slug)}
                    disabled={included}
                    className={`flex h-9 items-center justify-between rounded-md border px-3 text-left transition-colors ${
                      included
                        ? "cursor-default border-[var(--green)] bg-[rgba(34,197,94,0.08)]"
                        : checked
                          ? "border-[var(--gold)] bg-[var(--gold3)]"
                          : "border-[var(--bdr)] hover:bg-[var(--hover-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2 ${
                        included ? "border-[var(--green)] bg-[var(--green)]"
                        : checked ? "border-[var(--gold)] bg-[var(--gold)]"
                        : "border-[var(--txt3)]"
                      }`}>
                        {checked && <div className="h-1 w-1 rounded-full bg-white" />}
                      </div>
                      <span className={`text-[11px] font-medium ${
                        included ? "text-[var(--green)]" : checked ? "text-[var(--gold)]" : "text-[var(--txt)]"
                      }`}>{a.name}</span>
                    </div>
                    {included ? (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)" }}>Incluso</span>
                    ) : (
                      <span className={`text-[11px] font-semibold ${checked ? "text-[var(--gold)]" : "text-[var(--txt2)]"}`}>
                        {a.price_monthly > 0 ? `+${brl(a.price_monthly)}` : "Sob consulta"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Transmissão de tela — radio */}
          {transmissaoAddOns.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Transmissão de tela</div>
              {transmissaoAddOns.map((a) => {
                const included = isAddonIncluded(a, selectedPlan);
                const checked  = included || selectedAddons.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    onClick={() => !included && toggleAddon(a.slug)}
                    disabled={included}
                    className={`flex h-9 items-center justify-between rounded-md border px-3 text-left transition-colors ${
                      included
                        ? "cursor-default border-[var(--green)] bg-[rgba(34,197,94,0.08)]"
                        : checked
                          ? "border-[var(--gold)] bg-[var(--gold3)]"
                          : "border-[var(--bdr)] hover:bg-[var(--hover-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Radio indicator */}
                      <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                        included ? "border-[var(--green)] bg-[var(--green)]"
                        : checked ? "border-[var(--gold)] bg-[var(--gold)]"
                        : "border-[var(--txt3)]"
                      }`}>
                        {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-[11px] font-medium ${
                        included ? "text-[var(--green)]" : checked ? "text-[var(--gold)]" : "text-[var(--txt)]"
                      }`}>{a.name.replace("Transmissão ", "")}</span>
                      {a.description && <span className="text-[10px] text-[var(--txt3)]">· {a.description}</span>}
                    </div>
                    {included ? (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)" }}>Incluso</span>
                    ) : (
                      <span className={`text-[11px] font-semibold ${checked ? "text-[var(--gold)]" : "text-[var(--txt2)]"}`}>
                        {a.price_monthly > 0 ? `+${brl(a.price_monthly)}` : "Sob consulta"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="border-t border-[var(--bdr)] bg-[var(--bg2)] px-4 py-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--txt3)]">Plano base</span>
              <span className="font-medium text-[var(--txt)]">{planName}{periodo === "anual" ? ` (anual -${annualDiscountPct}%)` : ""}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--txt3)]">Implantação</span>
              <span className="font-medium text-[var(--txt)]">{brl(calc.implantacao)}</span>
            </div>
            {calc.implantacao > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--txt3)] opacity-60">· em até 12×</span>
                <span className="text-[var(--txt3)] tabular-nums">{brl(calc.implantacao / 12)}/mês</span>
              </div>
            )}
            {calc.addonMensal > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--txt3)]">Add-ons</span>
                <span className="font-medium text-[var(--txt)]">+{brl(calc.addonMensal)}/mês</span>
              </div>
            )}
            <div className="my-1 h-px bg-[var(--bdr)]" />
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-[var(--txt)]">Mensalidade</span>
              <span className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-none text-[var(--orange)]">
                {brl(calc.totalMensal)}<span className="text-[10px] font-normal text-[var(--txt3)]">/mês</span>
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--txt3)]">Total em {calc.meses} meses</span>
              <span className="font-bold text-[var(--txt)]">{brl(calc.totalPeriodo)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-[var(--bdr)] px-4 py-2.5">
          <button onClick={copyProposta} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "#22C55E" }}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" /></svg>
            {copied ? "Copiado!" : "Copiar WhatsApp"}
          </button>
          <button onClick={saveAsLead} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--bdr2)] text-[11px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]">
            Salvar como lead
          </button>
        </div>
      </div>
    </div>
  );
}

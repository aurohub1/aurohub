"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string;
  price_monthly: number; max_users: number; max_posts_day: number;
  max_feed_reels_day?: number | null;
  max_stories_day?: number | null;
  is_internal?: boolean | null;
}

type Periodo = "mensal" | "anual";

/* ── Constants ───────────────────────────────────── */

const PLAN_DISPLAY: Record<string, { label: string; emoji: string; implant: number; fidelity: number }> = {
  basic:      { label: "Essencial",    emoji: "🎯", implant: 1500, fidelity: 6 },
  pro:        { label: "Profissional", emoji: "⚡", implant: 2500, fidelity: 6 },
  business:   { label: "Franquia",     emoji: "🏢", implant: 4500, fidelity: 12 },
  enterprise: { label: "Enterprise",   emoji: "👑", implant: 0,    fidelity: 12 },
};

const ADDONS = [
  { key: "individual", label: "Transmissão Individual", price: 29, desc: "1 consultor" },
  { key: "time", label: "Transmissão Time", price: 199, desc: "Até 10 consultores" },
  { key: "rede", label: "Transmissão Rede", price: 449, desc: "Até 30 consultores" },
];

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ── Component ───────────────────────────────────── */

export default function CalculadoraPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [lojas, setLojas] = useState(1);
  const [usuarios, setUsuarios] = useState(2);
  const [feedPosts, setFeedPosts] = useState(5);
  const [storiesQty, setStoriesQty] = useState(5);
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [addons, setAddons] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  /* ── Load ──────────────────────────────────────── */

  const loadPlans = useCallback(async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data as Plan[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  /* ── Calc ──────────────────────────────────────── */

  const planData = useMemo(() => plans.find((p) => p.slug === selectedPlan), [plans, selectedPlan]);
  const display = PLAN_DISPLAY[selectedPlan] ?? PLAN_DISPLAY.pro;

  const calc = useMemo(() => {
    const base = planData?.price_monthly ?? 0;
    const desconto = periodo === "anual" ? 0.85 : 1;
    const mensalidade = base * lojas * usuarios * desconto;
    const implantacao = display.implant * lojas;
    const addonMensal = ADDONS.filter((a) => addons.includes(a.key)).reduce((s, a) => s + a.price, 0);
    const totalMensal = mensalidade + addonMensal;
    const meses = periodo === "anual" ? 12 : display.fidelity;
    const totalPeriodo = totalMensal * meses + implantacao;
    return { mensalidade, implantacao, addonMensal, totalMensal, totalPeriodo, meses, base };
  }, [planData, lojas, usuarios, periodo, addons, display.implant, display.fidelity]);

  /* ── Recomendação de plano ────────────────────── */

  const recommendation = useMemo(() => {
    if (plans.length === 0 || !planData) return null;

    const desconto = periodo === "anual" ? 0.85 : 1;
    const addonMensal = ADDONS.filter((a) => addons.includes(a.key)).reduce((s, a) => s + a.price, 0);

    // Custo mensal por plano com configuração atual
    // Null/undefined nos limites Feed/Stories = não configurado (assume ilimitado).
    // Exclui planos internos (uso ADM apenas, sem cobrança).
    const costs = plans
      .filter((p) => PLAN_DISPLAY[p.slug] && p.price_monthly > 0 && !p.is_internal)
      .map((p) => {
        const total = p.price_monthly * lojas * usuarios * desconto + addonMensal;
        const coversUsers = p.max_users === -1 || p.max_users >= usuarios;
        const feedLimit = p.max_feed_reels_day;
        const storiesLimit = p.max_stories_day;
        const coversFeed = feedLimit == null || feedLimit === -1 || feedLimit >= feedPosts;
        const coversStories = storiesLimit == null || storiesLimit === -1 || storiesLimit >= storiesQty;
        const coversAll = coversUsers && coversFeed && coversStories;
        return { plan: p, total, coversUsers, coversFeed, coversStories, coversAll };
      });

    const currentCost = costs.find((c) => c.plan.slug === selectedPlan);
    if (!currentCost) {
      console.log("[Calc] currentCost not found for", selectedPlan);
      console.log("[Calc] costs", JSON.stringify(costs.map(c => ({ slug: c.plan.slug, total: c.total, coversAll: c.coversAll, coversUsers: c.coversUsers, coversFeed: c.coversFeed, coversStories: c.coversStories, max_users: c.plan.max_users, max_feed: c.plan.max_feed_reels_day, max_stories: c.plan.max_stories_day })), null, 2));
      return null;
    }

    console.log("[Calc] config", { selectedPlan, lojas, usuarios, feedPosts, storiesQty, addons });
    console.log("[Calc] currentCost", {
      total: currentCost.total,
      coversUsers: currentCost.coversUsers,
      coversFeed: currentCost.coversFeed,
      coversStories: currentCost.coversStories,
      coversAll: currentCost.coversAll,
      plan: { max_users: currentCost.plan.max_users, max_feed: currentCost.plan.max_feed_reels_day, max_stories: currentCost.plan.max_stories_day },
    });
    console.log("[Calc] costs", JSON.stringify(costs.map(c => ({ slug: c.plan.slug, total: c.total, coversAll: c.coversAll, coversUsers: c.coversUsers, coversFeed: c.coversFeed, coversStories: c.coversStories, max_users: c.plan.max_users, max_feed: c.plan.max_feed_reels_day, max_stories: c.plan.max_stories_day })), null, 2));

    // 1. Plano atual não cobre algum limite → upgrade forçado
    if (!currentCost.coversAll) {
      const reasons: string[] = [];
      if (!currentCost.coversUsers) reasons.push(`${usuarios} usuários por loja`);
      if (!currentCost.coversFeed) reasons.push(`${feedPosts} Feed/Reels por dia`);
      if (!currentCost.coversStories) reasons.push(`${storiesQty} Stories por dia`);

      // Preferência 1: plano que cobre TUDO, mais barato
      const fullCover = costs
        .filter((c) => c.coversAll && c.plan.slug !== selectedPlan)
        .sort((a, b) => a.total - b.total)[0];
      if (fullCover) {
        return {
          type: "upgrade" as const,
          plan: fullCover.plan,
          diff: fullCover.total - currentCost.total,
          reason: `Seu uso excede o ${PLAN_DISPLAY[selectedPlan].label}: ${reasons.join(", ")}.`,
        };
      }

      // Preferência 2: nenhum cobre 100% → pega o que mais melhora a dimensão faltante
      const ranked = costs
        .filter((c) => c.plan.slug !== selectedPlan)
        .map((c) => {
          // Score = soma dos limites relevantes (null/-1 = ilimitado = 9999)
          const norm = (v: number | null | undefined) => v == null || v === -1 ? 9999 : v;
          const score =
            norm(c.plan.max_users) +
            norm(c.plan.max_feed_reels_day) +
            norm(c.plan.max_stories_day);
          return { c, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = ranked[0]?.c;
      if (best && (best.plan.max_users === -1 || best.plan.max_users > currentCost.plan.max_users ||
          (best.plan.max_stories_day ?? 9999) > (currentCost.plan.max_stories_day ?? 0) ||
          (best.plan.max_feed_reels_day ?? 9999) > (currentCost.plan.max_feed_reels_day ?? 0))) {
        return {
          type: "upgrade" as const,
          plan: best.plan,
          diff: best.total - currentCost.total,
          reason: `Nenhum plano cobre 100% (${reasons.join(", ")}), mas o ${PLAN_DISPLAY[best.plan.slug].label} é o mais próximo.`,
        };
      }
      return null;
    }

    // 2. Entre os planos viáveis, o mais barato — se diferente do atual e mais barato → recomenda
    const cheapest = costs
      .filter((c) => c.coversAll)
      .sort((a, b) => a.total - b.total)[0];

    if (cheapest && cheapest.plan.slug !== selectedPlan && cheapest.total < currentCost.total) {
      const saving = currentCost.total - cheapest.total;
      // Se o plano mais barato tem menos recursos, é downgrade (economia)
      const isDowngrade = cheapest.plan.max_users < (currentCost.plan.max_users === -1 ? Infinity : currentCost.plan.max_users);
      return {
        type: isDowngrade ? ("savings" as const) : ("better" as const),
        plan: cheapest.plan,
        diff: -saving,
        reason: isDowngrade
          ? `Sua configuração atual (${lojas} loja${lojas > 1 ? "s" : ""}, ${usuarios} user/loja) cabe no ${PLAN_DISPLAY[cheapest.plan.slug].label}.`
          : `O ${PLAN_DISPLAY[cheapest.plan.slug].label} oferece mais recursos pelo mesmo custo ou menos.`,
      };
    }

    return null;
  }, [plans, planData, selectedPlan, lojas, usuarios, feedPosts, storiesQty, periodo, addons]);

  /* ── Proposta ──────────────────────────────────── */

  function copyProposta() {
    const addonText = addons.length > 0
      ? ADDONS.filter((a) => addons.includes(a.key)).map((a) => `  • ${a.label}: ${brl(a.price)}/mês`).join("\n")
      : "";
    const text = [
      `*PROPOSTA AUROHUB*`,
      ``,
      `*Plano:* ${display.label} ${display.emoji}`,
      `*Lojas:* ${lojas}`,
      `*Usuários/loja:* ${usuarios}`,
      `*Período:* ${periodo === "anual" ? "Anual (15% desc)" : "Mensal"}`,
      addons.length > 0 ? `\n*Add-ons:*\n${addonText}` : "",
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
    await supabase.from("leads").insert({
      name: `Lead Calculadora — ${display.label}`,
      plan_interest: selectedPlan,
      origin: "Calculadora",
      status: "new",
      priority: "media",
      notes: `${lojas} loja(s), ${usuarios} user/loja, ${periodo}, ${brl(calc.totalMensal)}/mês`,
    });
    alert("Lead salvo no CRM!");
  }

  function toggleAddon(key: string) {
    const transmissaoKeys = ["individual", "time", "rede"];
    if (transmissaoKeys.includes(key)) {
      setAddons((prev) => {
        const semTrans = prev.filter((k) => !transmissaoKeys.includes(k));
        return prev.includes(key) ? semTrans : [...semTrans, key];
      });
    } else {
      setAddons((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    }
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <div className="flex flex-1 items-start justify-center">
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>

        {/* Header */}
        <div className="border-b border-[var(--bdr)] px-4 py-2.5 text-center">
          <h2 className="font-[family-name:var(--font-dm-serif)] text-[16px] font-bold leading-tight text-[var(--txt)]">Calculadora de Proposta</h2>
        </div>

        {/* Plan tabs */}
        <div className="grid grid-cols-4 border-b border-[var(--bdr)]">
          {plans.filter((p) => PLAN_DISPLAY[p.slug]).map((p) => {
            const d = PLAN_DISPLAY[p.slug];
            const active = selectedPlan === p.slug;
            return (
              <button
                key={p.slug}
                onClick={() => setSelectedPlan(p.slug)}
                className={`flex items-center justify-center gap-1.5 py-2 text-center transition-colors ${active ? "bg-[var(--bg3)]" : "hover:bg-[var(--hover-bg)]"}`}
                style={active ? { borderBottom: "2px solid var(--orange)" } : {}}
              >
                <span className="text-[14px]">{d.emoji}</span>
                <div className="flex flex-col leading-tight">
                  <span className={`text-[11px] font-semibold ${active ? "text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{d.label}</span>
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
                  ? `Troque para ${PLAN_DISPLAY[recommendation.plan.slug].label}`
                  : `Com sua configuração, ${PLAN_DISPLAY[recommendation.plan.slug].label} ${recommendation.diff < 0 ? `economiza ${brl(Math.abs(recommendation.diff))}/mês` : "cobre seu uso"}.`}
              </div>
              <div className="truncate text-[10px] text-[var(--txt3)]">{recommendation.reason}</div>
            </div>
            <span className="shrink-0 rounded-md bg-[var(--gold)] px-2 py-1 text-[10px] font-bold text-white">
              Mudar
            </span>
          </button>
        )}

        {/* Config */}
        <div className="flex flex-col gap-2.5 px-4 py-3">

          {/* Lojas slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Lojas / Perfis</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{lojas}</span>
            </div>
            <input type="range" min={1} max={10} value={lojas} onChange={(e) => setLojas(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          {/* Usuários slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Usuários por loja</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{usuarios}</span>
            </div>
            <input type="range" min={1} max={20} value={usuarios} onChange={(e) => setUsuarios(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          {/* Feed/Reels slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[var(--txt3)]">Posts Feed/Reels por dia</label>
              <span className="text-[12px] font-bold text-[var(--txt)] tabular-nums">{feedPosts}</span>
            </div>
            <input type="range" min={0} max={25} value={feedPosts} onChange={(e) => setFeedPosts(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
          </div>

          {/* Stories slider */}
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
              Anual <span className="ml-1 text-[9px] opacity-75">(-15%)</span>
            </button>
          </div>

          {/* Add-ons */}
          <div className="flex flex-col gap-1">
            {ADDONS.map((a) => {
              const checked = addons.includes(a.key);
              return (
                <button key={a.key} onClick={() => toggleAddon(a.key)} className={`flex h-9 items-center justify-between rounded-md border px-3 text-left transition-colors ${checked ? "border-[var(--gold)] bg-[var(--gold3)]" : "border-[var(--bdr)] hover:bg-[var(--hover-bg)]"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--txt3)]"}`}>
                      {checked && <div className="h-1 w-1 rounded-full bg-white" />}
                    </div>
                    <span className={`text-[11px] font-medium ${checked ? "text-[var(--gold)]" : "text-[var(--txt)]"}`}>{a.label}</span>
                    <span className="text-[10px] text-[var(--txt3)]">· {a.desc}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${checked ? "text-[var(--gold)]" : "text-[var(--txt2)]"}`}>+{brl(a.price)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result */}
        <div className="border-t border-[var(--bdr)] bg-[var(--bg2)] px-4 py-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--txt3)]">Plano base</span>
              <span className="font-medium text-[var(--txt)]">{display.label}{periodo === "anual" ? " (anual -15%)" : ""}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--txt3)]">Implantação</span>
              <span className="font-medium text-[var(--txt)]">{brl(calc.implantacao)}</span>
            </div>
            {calc.addonMensal > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--txt3)]">Add-ons</span>
                <span className="font-medium text-[var(--txt)]">+{brl(calc.addonMensal)}/mês</span>
              </div>
            )}
            <div className="my-1 h-px bg-[var(--bdr)]" />
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-[var(--txt)]">Mensalidade</span>
              <span className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-none text-[var(--orange)]">{brl(calc.totalMensal)}<span className="text-[10px] font-normal text-[var(--txt3)]">/mês</span></span>
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

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string;
  price_monthly: number; max_users: number; max_posts_day: number;
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
  { key: "individual", label: "Transmissão Individual", price: 29, desc: "1 vendedor" },
  { key: "time", label: "Transmissão Time", price: 199, desc: "Até 10 vendedores" },
  { key: "rede", label: "Transmissão Rede", price: 449, desc: "Até 30 vendedores" },
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
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [addons, setAddons] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  /* ── Load ──────────────────────────────────────── */

  const loadPlans = useCallback(async () => {
    const { data } = await supabase.from("plans").select("id, slug, name, price_monthly, max_users, max_posts_day").order("sort_order");
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
    <div className="flex flex-1 items-start justify-center py-4">
      <div className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>

        {/* Header */}
        <div className="border-b border-[var(--bdr)] px-6 py-5 text-center">
          <h2 className="font-[family-name:var(--font-dm-serif)] text-[22px] font-bold text-[var(--txt)]">Calculadora de Proposta</h2>
          <p className="mt-1 text-[13px] text-[var(--txt3)]">Monte uma proposta comercial</p>
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
                className={`flex flex-col items-center gap-1 py-4 text-center transition-colors ${active ? "bg-[var(--bg3)]" : "hover:bg-[var(--hover-bg)]"}`}
                style={active ? { borderBottom: "2px solid var(--orange)" } : {}}
              >
                <span className="text-[16px]">{d.emoji}</span>
                <span className={`text-[12px] font-semibold ${active ? "text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{d.label}</span>
                <span className={`text-[11px] ${active ? "text-[var(--orange)]" : "text-[var(--txt3)]"}`}>
                  {p.price_monthly > 0 ? brl(p.price_monthly) : "Sob consulta"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Config */}
        <div className="flex flex-col gap-6 px-6 py-6">

          {/* Lojas slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[var(--txt3)]">Lojas / Perfis</label>
              <span className="text-[14px] font-bold text-[var(--txt)]">{lojas}</span>
            </div>
            <input type="range" min={1} max={10} value={lojas} onChange={(e) => setLojas(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
            <div className="flex justify-between text-[10px] text-[var(--txt3)]"><span>1</span><span>10</span></div>
          </div>

          {/* Usuários slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[var(--txt3)]">Usuários por loja</label>
              <span className="text-[14px] font-bold text-[var(--txt)]">{usuarios}</span>
            </div>
            <input type="range" min={1} max={20} value={usuarios} onChange={(e) => setUsuarios(Number(e.target.value))} className="w-full accent-[var(--orange)]" />
            <div className="flex justify-between text-[10px] text-[var(--txt3)]"><span>1</span><span>20</span></div>
          </div>

          {/* Período */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-[var(--txt3)]">Período</label>
            <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
              <button onClick={() => setPeriodo("mensal")} className={`flex-1 rounded-md py-2 text-[13px] font-medium ${periodo === "mensal" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Mensal</button>
              <button onClick={() => setPeriodo("anual")} className={`flex-1 rounded-md py-2 text-[13px] font-medium ${periodo === "anual" ? "bg-[var(--green3)] text-[var(--green)]" : "text-[var(--txt3)]"}`}>
                Anual <span className="text-[10px] opacity-75">(-15%)</span>
              </button>
            </div>
          </div>

          {/* Add-ons */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-[var(--txt3)]">Add-ons</label>
            <div className="flex flex-col gap-2">
              {ADDONS.map((a) => {
                const checked = addons.includes(a.key);
                return (
                  <button key={a.key} onClick={() => toggleAddon(a.key)} className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-colors ${checked ? "border-[var(--gold)] bg-[var(--gold3)]" : "border-[var(--bdr)] hover:bg-[var(--hover-bg)]"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--txt3)]"}`}>
                        {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className={`text-[13px] font-medium ${checked ? "text-[var(--gold)]" : "text-[var(--txt)]"}`}>{a.label}</div>
                        <div className="text-[11px] text-[var(--txt3)]">{a.desc}</div>
                      </div>
                    </div>
                    <span className={`text-[13px] font-semibold ${checked ? "text-[var(--gold)]" : "text-[var(--txt2)]"}`}>+{brl(a.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="border-t border-[var(--bdr)] bg-[var(--bg2)] px-6 py-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--txt3)]">Plano base</span>
              <span className="font-medium text-[var(--txt)]">{display.label}{periodo === "anual" ? " (anual -15%)" : ""}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--txt3)]">Implantação</span>
              <span className="font-medium text-[var(--txt)]">{brl(calc.implantacao)}</span>
            </div>
            {calc.addonMensal > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--txt3)]">Add-ons</span>
                <span className="font-medium text-[var(--txt)]">+{brl(calc.addonMensal)}/mês</span>
              </div>
            )}
            <div className="h-px bg-[var(--bdr)]" />
            <div className="flex justify-between items-baseline">
              <span className="text-[14px] font-semibold text-[var(--txt)]">Mensalidade</span>
              <span className="font-[family-name:var(--font-dm-serif)] text-[24px] font-bold text-[var(--orange)]">{brl(calc.totalMensal)}<span className="text-[12px] font-normal text-[var(--txt3)]">/mês</span></span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--txt3)]">Total em {calc.meses} meses</span>
              <span className="font-bold text-[var(--txt)]">{brl(calc.totalPeriodo)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[var(--bdr)] px-6 py-4">
          <button onClick={copyProposta} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white" style={{ background: "#22C55E" }}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" /></svg>
            {copied ? "Copiado!" : "Copiar para WhatsApp"}
          </button>
          <button onClick={saveAsLead} className="flex-1 rounded-xl border border-[var(--bdr2)] py-2.5 text-[13px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]">
            Salvar como lead
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string;
  price_monthly: number; max_users: number; max_posts_day: number;
  can_schedule: boolean; can_metrics: boolean; is_enterprise: boolean;
}

interface Licensee { id: string; name: string; email: string; }
interface Lead { id: string; name: string; company: string | null; email: string | null; }

type TransmissaoTier = "none" | "individual" | "time" | "rede";

/* ── Constants ───────────────────────────────────── */

const PLAN_DISPLAY: Record<string, { label: string; emoji: string; accent: string; bg: string; implant: number; fidelity: number }> = {
  basic:      { label: "Essencial",     emoji: "🎯", accent: "var(--blue)",   bg: "var(--blue3)",   implant: 1500, fidelity: 6 },
  pro:        { label: "Profissional",  emoji: "⚡", accent: "var(--gold)",   bg: "var(--gold3)",   implant: 2500, fidelity: 6 },
  business:   { label: "Franquia",      emoji: "🏢", accent: "var(--orange)", bg: "var(--orange3)", implant: 4500, fidelity: 12 },
  enterprise: { label: "Enterprise",    emoji: "👑", accent: "var(--purple)", bg: "var(--purple3)", implant: 0,    fidelity: 12 },
};

const TRANSMISSAO: Record<TransmissaoTier, { label: string; price: number; desc: string }> = {
  none:       { label: "Nenhum",     price: 0,   desc: "" },
  individual: { label: "Individual", price: 29,  desc: "1 vendedor" },
  time:       { label: "Time",       price: 199, desc: "Até 10 vendedores" },
  rede:       { label: "Rede",       price: 449, desc: "Até 30 vendedores" },
};

/* ── Helpers ─────────────────────────────────────── */

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

/* ── Component ───────────────────────────────────── */

export default function CalculadoraPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [numLojas, setNumLojas] = useState(1);
  const [numUsers, setNumUsers] = useState(2);
  const [fidelidade, setFidelidade] = useState(6);
  const [transmissao, setTransmissao] = useState<TransmissaoTier>("none");
  const [customMensalidade, setCustomMensalidade] = useState("");
  const [customImplant, setCustomImplant] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteType, setClienteType] = useState<"lead" | "cliente">("lead");

  // Proposta
  const [responsavel, setResponsavel] = useState("Duane — Aurovista");
  const [validade, setValidade] = useState("7");
  const [copied, setCopied] = useState(false);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [plR, licR, leadR] = await Promise.all([
        supabase.from("plans").select("id, slug, name, price_monthly, max_users, max_posts_day, can_schedule, can_metrics, is_enterprise").order("sort_order"),
        supabase.from("licensees").select("id, name, email").order("name"),
        supabase.from("leads").select("id, name, company, email").order("created_at", { ascending: false }).limit(50),
      ]);
      setPlans((plR.data as Plan[]) ?? []);
      setLicensees((licR.data as Licensee[]) ?? []);
      setLeads((leadR.data as Lead[]) ?? []);
    } catch (err) { console.error("[Calc] load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync fidelidade when plan changes
  useEffect(() => {
    const display = PLAN_DISPLAY[selectedPlan];
    if (display) setFidelidade(display.fidelity);
  }, [selectedPlan]);

  /* ── Calc ──────────────────────────────────────── */

  const planData = useMemo(() => plans.find((p) => p.slug === selectedPlan), [plans, selectedPlan]);
  const display = PLAN_DISPLAY[selectedPlan] ?? PLAN_DISPLAY.pro;

  const calc = useMemo(() => {
    const baseMensal = customMensalidade ? parseFloat(customMensalidade) || 0 : (planData?.price_monthly ?? 0);
    const mensalidade = baseMensal * numLojas;
    const implantBase = customImplant ? parseFloat(customImplant) || 0 : display.implant;
    const implantacao = implantBase * numLojas;
    const addonMensal = TRANSMISSAO[transmissao].price * numLojas;
    const totalMensal = mensalidade + addonMensal;
    const totalPeriodo = totalMensal * fidelidade + implantacao;
    const parcImplant = implantacao > 0 ? Math.ceil(implantacao / 12 * 100) / 100 : 0;
    return { mensalidade, implantacao, addonMensal, totalMensal, totalPeriodo, parcImplant, baseMensal };
  }, [planData, numLojas, fidelidade, transmissao, customMensalidade, customImplant, display.implant]);

  /* ── Selected client/lead name ─────────────────── */

  const clienteNome = useMemo(() => {
    if (!clienteId) return "";
    if (clienteType === "cliente") {
      const l = licensees.find((x) => x.id === clienteId);
      return l?.name ?? "";
    }
    const ld = leads.find((x) => x.id === clienteId);
    return ld ? (ld.company || ld.name) : "";
  }, [clienteId, clienteType, licensees, leads]);

  /* ── Proposta text ─────────────────────────────── */

  const propostaText = useMemo(() => {
    const planLabel = display.label;
    const validadeDate = new Date();
    validadeDate.setDate(validadeDate.getDate() + (parseInt(validade) || 7));
    const validStr = validadeDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    return [
      `*PROPOSTA COMERCIAL — AUROHUB*`,
      ``,
      clienteNome ? `*Para:* ${clienteNome}` : "",
      `*Plano:* ${planLabel}`,
      `*Lojas/Perfis:* ${numLojas}`,
      `*Usuários:* ${numUsers}`,
      transmissao !== "none" ? `*Transmissão:* ${TRANSMISSAO[transmissao].label} (${brl(TRANSMISSAO[transmissao].price)}/mês por loja)` : "",
      ``,
      `───────────────────`,
      `*Mensalidade:* ${brl(calc.mensalidade)}/mês`,
      calc.addonMensal > 0 ? `*Add-ons:* ${brl(calc.addonMensal)}/mês` : "",
      `*Total mensal:* ${brl(calc.totalMensal)}/mês`,
      ``,
      `*Implantação:* ${brl(calc.implantacao)} (única vez)`,
      calc.implantacao > 0 ? `  → até 12x de ${brl(calc.parcImplant)}` : "",
      ``,
      `*Fidelidade:* ${fidelidade} meses`,
      `*Total no período:* ${brl(calc.totalPeriodo)}`,
      `───────────────────`,
      ``,
      `*Validade:* ${validStr}`,
      `*Responsável:* ${responsavel}`,
      ``,
      `_Proposta gerada pelo Aurohub_`,
    ].filter(Boolean).join("\n");
  }, [display.label, clienteNome, numLojas, numUsers, transmissao, calc, fidelidade, validade, responsavel]);

  /* ── Actions ───────────────────────────────────── */

  function copyProposta() {
    navigator.clipboard.writeText(propostaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function saveAsLead() {
    if (!clienteNome) return;
    await supabase.from("leads").insert({
      name: clienteNome,
      plan_interest: selectedPlan,
      origin: "Calculadora",
      status: "new",
      priority: "media",
      notes: `Proposta: ${display.label}, ${numLojas} loja(s), ${brl(calc.totalMensal)}/mês`,
    });
    alert("Lead salvo no CRM!");
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* Header */}
      <div className="border-b border-[var(--bdr)] pb-4">
        <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Calculadora de Proposta</h2>
        <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Monte uma proposta comercial com valores reais</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── COLUNA 1: Configuração ──────────────── */}
        <div className="flex flex-col gap-6">

          {/* Cliente / Lead */}
          <Section title="Cliente / Lead">
            <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5 mb-3">
              <button onClick={() => { setClienteType("lead"); setClienteId(""); }} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${clienteType === "lead" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Lead</button>
              <button onClick={() => { setClienteType("cliente"); setClienteId(""); }} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${clienteType === "cliente" ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>Cliente</button>
            </div>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
              <option value="">Selecionar {clienteType === "lead" ? "lead" : "cliente"}...</option>
              {clienteType === "lead"
                ? leads.map((l) => <option key={l.id} value={l.id}>{l.company || l.name}{l.email ? ` — ${l.email}` : ""}</option>)
                : licensees.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.email}</option>)
              }
            </select>
          </Section>

          {/* Plano */}
          <Section title="Plano">
            <div className="grid grid-cols-2 gap-3">
              {plans.filter((p) => PLAN_DISPLAY[p.slug]).map((p) => {
                const d = PLAN_DISPLAY[p.slug];
                const active = selectedPlan === p.slug;
                return (
                  <button
                    key={p.slug}
                    onClick={() => setSelectedPlan(p.slug)}
                    className={`rounded-xl border p-4 text-left transition-all ${active ? "border-2 shadow-lg" : "border-[var(--bdr)] hover:border-[var(--bdr2)]"}`}
                    style={active ? { borderColor: d.accent, background: d.bg } : {}}
                  >
                    <div className="text-[18px]">{d.emoji}</div>
                    <div className="mt-1 text-[14px] font-bold text-[var(--txt)]">{d.label}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--txt3)]">
                      {p.is_enterprise ? "Sob consulta" : `${brl(p.price_monthly)}/mês`}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--txt3)]">
                      Implant.: {d.implant > 0 ? brl(d.implant) : "Negociado"}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Detalhes */}
          <Section title="Detalhes">
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Nº de lojas / perfis" value={numLojas} onChange={setNumLojas} min={1} />
              <NumField label="Nº de usuários" value={numUsers} onChange={setNumUsers} min={1} />
              <NumField label="Fidelidade (meses)" value={fidelidade} onChange={setFidelidade} min={1} />
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Transmissão</label>
                <select value={transmissao} onChange={(e) => setTransmissao(e.target.value as TransmissaoTier)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                  {Object.entries(TRANSMISSAO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}{v.price > 0 ? ` — ${brl(v.price)}/mês` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* Override */}
          <Section title="Valores personalizados (opcional)">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Mensalidade por loja (R$)</label>
                <input type="number" value={customMensalidade} onChange={(e) => setCustomMensalidade(e.target.value)} placeholder={planData ? String(planData.price_monthly) : "0"} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Implantação por loja (R$)</label>
                <input type="number" value={customImplant} onChange={(e) => setCustomImplant(e.target.value)} placeholder={String(display.implant)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
              </div>
            </div>
          </Section>
        </div>

        {/* ── COLUNA 2: Resumo + Proposta ─────────── */}
        <div className="flex flex-col gap-6">

          {/* Resumo financeiro */}
          <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <h3 className="text-[15px] font-bold text-[var(--txt)]">Resumo financeiro</h3>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-3">
                <SummaryRow label="Mensalidade" value={`${brl(calc.mensalidade)}/mês`} sub={numLojas > 1 ? `${numLojas} lojas × ${brl(calc.baseMensal)}` : undefined} />
                <SummaryRow label="Implantação" value={brl(calc.implantacao)} sub={calc.implantacao > 0 ? `até 12× de ${brl(calc.parcImplant)}` : undefined} />
                {calc.addonMensal > 0 && (
                  <SummaryRow label={`Add-on Transmissão (${TRANSMISSAO[transmissao].label})`} value={`${brl(calc.addonMensal)}/mês`} />
                )}
                <div className="h-px bg-[var(--bdr)]" />
                <SummaryRow label="Total mensal" value={`${brl(calc.totalMensal)}/mês`} bold accent="var(--orange)" />
                <SummaryRow label={`Total em ${fidelidade} meses`} value={brl(calc.totalPeriodo)} bold />
              </div>
            </div>
          </div>

          {/* Proposta */}
          <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <h3 className="text-[15px] font-bold text-[var(--txt)]">Gerar proposta</h3>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Responsável</label>
                  <input type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Validade (dias)</label>
                  <input type="number" value={validade} onChange={(e) => setValidade(e.target.value)} min={1} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none" />
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-[var(--bdr)] bg-[var(--bg2)] p-5 mb-4">
                <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--txt2)] font-[family-name:var(--font-sans)]">{propostaText}</pre>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button onClick={copyProposta} className="flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" /></svg>
                  {copied ? "Copiado!" : "Copiar para WhatsApp"}
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M4 6V2h8v4M4 12H2V8h12v4h-2M4 10h8v4H4v-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                  Imprimir / PDF
                </button>
                <button onClick={saveAsLead} disabled={!clienteNome} className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-40">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Salvar como lead
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
      <div className="border-b border-[var(--bdr)] px-6 py-4">
        <h3 className="text-[15px] font-bold text-[var(--txt)]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange, min }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Math.max(min ?? 0, parseInt(e.target.value) || 0))} min={min} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none" />
    </div>
  );
}

function SummaryRow({ label, value, sub, bold, accent }: { label: string; value: string; sub?: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className={`text-[13px] ${bold ? "font-bold" : "font-medium"} text-[var(--txt2)]`}>{label}</div>
        {sub && <div className="text-[11px] text-[var(--txt3)]">{sub}</div>}
      </div>
      <div className={`text-[14px] ${bold ? "font-bold" : "font-semibold"} text-right`} style={{ color: accent ?? "var(--txt)" }}>{value}</div>
    </div>
  );
}

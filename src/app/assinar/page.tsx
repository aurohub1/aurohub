"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { fillTemplate } from "@/lib/contract-template";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ── Types ───────────────────────────────────────────── */

interface Plan {
  id: string; slug: string; name: string;
  price_monthly: number; price_yearly: number;
  price_setup: number; min_months: number;
  max_users: number; max_posts_day: number;
  is_active: boolean; sort_order: number;
  can_metrics: boolean; can_schedule: boolean; can_ia_legenda: boolean; can_roteiro: boolean;
  is_internal: boolean | null;
}

interface AddOn {
  id: string; slug: string; name: string; description: string | null;
  price_monthly: number; is_active: boolean; sort_order: number;
}

type Step = 1 | 2 | 3 | 4;
type Cycle = "monthly" | "annual";

interface SubscriberData {
  name: string; email: string; phone: string;
  company_name: string; cnpj: string; city: string; state: string;
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const PLAN_EMOJI: Record<string, string> = {
  basic: "🎯", pro: "⚡", business: "🏢", enterprise: "👑",
};

/* ── Helpers ──────────────────────────────────────────── */

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function planFeatures(p: Plan): string[] {
  const feats = [
    `Até ${p.max_users} usuário${p.max_users !== 1 ? "s" : ""}`,
    `${p.max_posts_day} posts/dia`,
  ];
  if (p.can_schedule) feats.push("Agendamento");
  if (p.can_metrics) feats.push("Métricas");
  if (p.can_ia_legenda) feats.push("IA de legendas");
  if (p.can_roteiro) feats.push("Roteiro turístico");
  feats.push(`Fidelidade: ${p.min_months} meses`);
  return feats;
}

/* ── Step indicator ───────────────────────────────────── */

function StepBar({ current }: { current: Step }) {
  const steps = ["Plano", "Dados", "Contrato", "Pagamento"];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-all"
                style={{
                  background: done ? "#22C55E" : active ? "#1A56C4" : "rgba(255,255,255,0.08)",
                  color: done || active ? "#fff" : "#6b7fa8",
                  border: active ? "2px solid #3B82F6" : "2px solid transparent",
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                className="mt-1 text-[11px] font-medium"
                style={{ color: active ? "#e2e8f0" : done ? "#22C55E" : "#6b7fa8" }}
              >
                {label}
              </span>
            </div>
            {i < 3 && (
              <div
                className="mx-2 mb-5 h-px w-12"
                style={{ background: done ? "#22C55E" : "rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */

export default function AssinarPage() {
  const [step, setStep] = useState<Step>(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Step 1
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedAddonSlugs, setSelectedAddonSlugs] = useState<string[]>([]);

  // Step 2
  const [sub, setSub] = useState<SubscriberData>({
    name: "", email: "", phone: "", company_name: "", cnpj: "", city: "", state: "SP",
  });
  const [step2Error, setStep2Error] = useState("");

  // Step 3
  const [accepted, setAccepted] = useState(false);

  // Step 4
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");

  /* ── Load plans & addons ────────────────────────────── */

  useEffect(() => {
    (async () => {
      const [planRes, addonRes] = await Promise.all([
        supabase.from("plans").select("*").eq("is_active", true).neq("slug", "interno").order("sort_order"),
        supabase.from("add_ons").select("*").eq("is_active", true).not("slug", "in", '("novo_template","badge_design")').order("sort_order"),
      ]);
      setPlans((planRes.data as Plan[]) ?? []);
      setAddons((addonRes.data as AddOn[]) ?? []);
      setLoadingData(false);
    })();
  }, []);

  /* ── Computed prices ────────────────────────────────── */

  const priceMonthly = useMemo(() => {
    if (!selectedPlan) return 0;
    const base = cycle === "annual" && selectedPlan.price_yearly > 0
      ? selectedPlan.price_yearly / 12
      : selectedPlan.price_monthly;
    const addonTotal = addons
      .filter((a) => selectedAddonSlugs.includes(a.slug))
      .reduce((s, a) => s + a.price_monthly, 0);
    return base + addonTotal;
  }, [selectedPlan, cycle, selectedAddonSlugs, addons]);

  const priceImplantacao = selectedPlan?.price_setup ?? 0;

  const annualDiscount = useMemo(() => {
    if (!selectedPlan || !selectedPlan.price_yearly || !selectedPlan.price_monthly) return 0;
    return Math.max(0, Math.round((1 - selectedPlan.price_yearly / (selectedPlan.price_monthly * 12)) * 100));
  }, [selectedPlan]);

  const selectedAddonItems = addons.filter((a) => selectedAddonSlugs.includes(a.slug));

  /* ── Contract text ──────────────────────────────────── */

  const contractText = useMemo(() => {
    if (!selectedPlan) return "";
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + (selectedPlan.min_months ?? 12));
    return fillTemplate({
      contract_number: "—",
      company_name: sub.company_name || sub.name || "—",
      company_cnpj: sub.cnpj || "A definir",
      company_address: sub.city && sub.state ? `${sub.city} / ${sub.state}` : "—",
      contact_name: sub.name || "—",
      user_email: sub.email || "—",
      plan_name: selectedPlan.name,
      stores_count: 1,
      users_count: selectedPlan.max_users,
      addons_list: selectedAddonItems.map((a) => a.name).join(", ") || "Nenhum",
      contract_duration: selectedPlan.min_months ?? 12,
      start_date: today.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
      monthly_value: priceMonthly,
      monthly_total: priceMonthly * (selectedPlan.min_months ?? 12),
      setup_fee: priceImplantacao,
      payment_method: "Cartão de crédito / Pix (Mercado Pago)",
      payment_day: "—",
    });
  }, [selectedPlan, sub, selectedAddonItems, priceMonthly, priceImplantacao]);

  /* ── Handlers ───────────────────────────────────────── */

  function toggleAddon(slug: string) {
    setSelectedAddonSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function validateStep2(): boolean {
    if (!sub.name.trim()) { setStep2Error("Nome completo é obrigatório."); return false; }
    if (!sub.email.trim() || !sub.email.includes("@")) { setStep2Error("E-mail inválido."); return false; }
    if (!sub.phone.trim()) { setStep2Error("Telefone é obrigatório."); return false; }
    if (!sub.company_name.trim()) { setStep2Error("Nome da empresa é obrigatório."); return false; }
    if (!sub.city.trim()) { setStep2Error("Cidade é obrigatória."); return false; }
    setStep2Error("");
    return true;
  }

  async function handlePay() {
    setProcessing(true);
    setPayError("");
    try {
      const ip = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json())
        .then((d: { ip: string }) => d.ip)
        .catch(() => "unknown");

      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_slug: selectedPlan!.slug,
          billing_cycle: cycle,
          selected_addons: selectedAddonSlugs,
          price_monthly: priceMonthly,
          price_implantacao: priceImplantacao,
          subscriber_data: sub,
          contract_accepted_ip: ip,
        }),
      });

      const data = await res.json() as { init_point?: string; error?: string };
      if (!res.ok || !data.init_point) {
        setPayError(data.error ?? "Erro ao iniciar pagamento. Tente novamente.");
        setProcessing(false);
        return;
      }

      window.location.href = data.init_point;
    } catch {
      setPayError("Erro de conexão. Tente novamente.");
      setProcessing(false);
    }
  }

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ minHeight: "100dvh", background: "#060D1A", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.5px" }}>
          <span style={{ color: "#D4A843" }}>Auro</span>hub
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <StepBar current={step} />

        {/* ── STEP 1: Plano ─────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>Escolha seu plano</h1>
            <p style={{ color: "#6b7fa8", textAlign: "center", marginBottom: 32, fontSize: 14 }}>
              Todos os planos incluem suporte e atualizações.
            </p>

            {/* Ciclo toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 4 }}>
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    style={{
                      padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: cycle === c ? "#1A56C4" : "transparent",
                      color: cycle === c ? "#fff" : "#6b7fa8",
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {c === "monthly" ? "Mensal" : `Anual${annualDiscount > 0 && selectedPlan ? ` (${annualDiscount}% off)` : ""}`}
                  </button>
                ))}
              </div>
            </div>

            {loadingData ? (
              <div style={{ textAlign: "center", color: "#6b7fa8", padding: 40 }}>Carregando planos...</div>
            ) : (
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
                {plans.filter((p) => !p.is_internal).map((p) => {
                  const isSelected = selectedPlan?.slug === p.slug;
                  const displayPrice = cycle === "annual" && p.price_yearly > 0
                    ? p.price_yearly / 12
                    : p.price_monthly;
                  return (
                    <div
                      key={p.slug}
                      onClick={() => setSelectedPlan(p)}
                      style={{
                        width: 240, flexShrink: 0, borderRadius: 16, padding: "24px 20px", cursor: "pointer",
                        border: `2px solid ${isSelected ? "#1A56C4" : "rgba(255,255,255,0.08)"}`,
                        background: isSelected ? "rgba(26,86,196,0.12)" : "rgba(255,255,255,0.04)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>{PLAN_EMOJI[p.slug] ?? "📦"}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: isSelected ? "#3B82F6" : "#e2e8f0", marginBottom: 2 }}>
                        R$ {fmtBRL(displayPrice)}
                        <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7fa8" }}>/mês</span>
                      </div>
                      {p.price_setup > 0 && (
                        <div style={{ fontSize: 11, color: "#6b7fa8", marginBottom: 12 }}>
                          + R$ {fmtBRL(p.price_setup)} implantação
                        </div>
                      )}
                      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                        {planFeatures(p).map((f) => (
                          <li key={f} style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add-ons */}
            {addons.length > 0 && (
              <div style={{ maxWidth: 780, margin: "0 auto 40px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#94a3b8" }}>Add-ons opcionais</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {addons.map((a) => {
                    const on = selectedAddonSlugs.includes(a.slug);
                    return (
                      <label
                        key={a.slug}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                          borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${on ? "#1A56C4" : "rgba(255,255,255,0.1)"}`,
                          background: on ? "rgba(26,86,196,0.1)" : "rgba(255,255,255,0.03)",
                          transition: "all 0.12s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleAddon(a.slug)}
                          style={{ accentColor: "#1A56C4", width: 15, height: 15 }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                          {a.description && <div style={{ fontSize: 11, color: "#6b7fa8" }}>{a.description}</div>}
                          <div style={{ fontSize: 12, color: "#D4A843", marginTop: 2 }}>
                            + R$ {fmtBRL(a.price_monthly)}/mês
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resumo + CTA */}
            {selectedPlan && (
              <div style={{ maxWidth: 780, margin: "0 auto" }}>
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, padding: "20px 24px", marginBottom: 24,
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#6b7fa8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Resumo
                  </h3>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                    <span>{selectedPlan.name} ({cycle === "annual" ? "anual" : "mensal"})</span>
                    <span>R$ {fmtBRL(cycle === "annual" && selectedPlan.price_yearly > 0 ? selectedPlan.price_yearly / 12 : selectedPlan.price_monthly)}/mês</span>
                  </div>
                  {selectedAddonItems.map((a) => (
                    <div key={a.slug} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>
                      <span>{a.name}</span>
                      <span>R$ {fmtBRL(a.price_monthly)}/mês</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 12, paddingTop: 12 }}>
                    {priceImplantacao > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>
                        <span>Implantação (única)</span>
                        <span>R$ {fmtBRL(priceImplantacao)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                      <span>Total mensal</span>
                      <span style={{ color: "#3B82F6" }}>R$ {fmtBRL(priceMonthly)}/mês</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      padding: "14px 36px", borderRadius: 10, background: "#1A56C4",
                      color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                    }}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Dados ─────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Seus dados</h1>
            <p style={{ color: "#6b7fa8", marginBottom: 32, fontSize: 14 }}>Preencha para criar sua conta.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Nome completo *" value={sub.name} onChange={(v) => setSub({ ...sub, name: v })} />
              <Field label="E-mail *" type="email" value={sub.email} onChange={(v) => setSub({ ...sub, email: v })} />
              <Field label="Telefone / WhatsApp *" type="tel" value={sub.phone} onChange={(v) => setSub({ ...sub, phone: v })} placeholder="(11) 99999-9999" />
              <Field label="Nome da empresa *" value={sub.company_name} onChange={(v) => setSub({ ...sub, company_name: v })} />
              <Field label="CNPJ (opcional)" value={sub.cnpj} onChange={(v) => setSub({ ...sub, cnpj: v })} placeholder="00.000.000/0001-00" />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Cidade *" value={sub.city} onChange={(v) => setSub({ ...sub, city: v })} />
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Estado *</label>
                  <select
                    value={sub.state}
                    onChange={(e) => setSub({ ...sub, state: e.target.value })}
                    style={{
                      width: "100%", height: 44, padding: "0 12px", borderRadius: 10,
                      border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)",
                      color: "#e2e8f0", fontSize: 14,
                    }}
                  >
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {step2Error && (
              <div style={{ marginTop: 16, color: "#F87171", fontSize: 13 }}>{step2Error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "12px 24px", borderRadius: 10, background: "transparent", color: "#6b7fa8", border: "1.5px solid rgba(255,255,255,0.12)", fontSize: 14, cursor: "pointer" }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                style={{ padding: "14px 36px", borderRadius: 10, background: "#1A56C4", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Contrato ──────────────────────── */}
        {step === 3 && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Contrato de serviço</h1>
            <p style={{ color: "#6b7fa8", marginBottom: 24, fontSize: 14 }}>
              Leia o contrato antes de prosseguir para o pagamento.
            </p>

            <div style={{
              maxHeight: 400, overflowY: "auto", padding: "20px 24px",
              border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12,
              background: "rgba(255,255,255,0.03)", marginBottom: 24,
              fontSize: 13, lineHeight: 1.7, color: "#94a3b8",
              fontFamily: "monospace", whiteSpace: "pre-wrap",
            }}>
              {contractText}
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 32 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ accentColor: "#1A56C4", width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
                Li e aceito os <strong style={{ color: "#e2e8f0" }}>Termos de Serviço</strong> e o{" "}
                <strong style={{ color: "#e2e8f0" }}>Contrato de Prestação de Serviços da Aurovista</strong>
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep(2)}
                style={{ padding: "12px 24px", borderRadius: 10, background: "transparent", color: "#6b7fa8", border: "1.5px solid rgba(255,255,255,0.12)", fontSize: 14, cursor: "pointer" }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { setStep(4); handlePay(); }}
                disabled={!accepted}
                style={{
                  padding: "14px 36px", borderRadius: 10,
                  background: accepted ? "#1A56C4" : "rgba(255,255,255,0.06)",
                  color: accepted ? "#fff" : "#4a5a78",
                  fontSize: 15, fontWeight: 700, border: "none",
                  cursor: accepted ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                Ir para pagamento →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Redirecionando ─────────────────── */}
        {step === 4 && (
          <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
            {payError ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Erro ao processar</h2>
                <p style={{ color: "#6b7fa8", fontSize: 14, marginBottom: 32 }}>{payError}</p>
                <button
                  onClick={() => { setStep(3); setPayError(""); }}
                  style={{ padding: "12px 28px", borderRadius: 10, background: "#1A56C4", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  ← Tentar novamente
                </button>
              </>
            ) : (
              <>
                <div style={{ width: 48, height: 48, border: "4px solid rgba(26,86,196,0.3)", borderTopColor: "#1A56C4", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Redirecionando para pagamento...</h2>
                <p style={{ color: "#6b7fa8", fontSize: 14 }}>
                  Aguarde. Você será redirecionado para o Mercado Pago.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Field component ─────────────────────────────────── */

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", height: 44, padding: "0 14px", borderRadius: 10, boxSizing: "border-box",
          border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)",
          color: "#e2e8f0", fontSize: 14, outline: "none",
        }}
      />
    </div>
  );
}

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
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  price_setup: number;
  min_months: number;
  max_feed_reels_day: number;
  max_stories_day: number;
  max_users: number;
  max_stores: number;
  is_enterprise: boolean;
  active: boolean;
  sort_order: number;
}

interface AddOn {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  is_active: boolean;
  sort_order: number;
}

type Step = 1 | 2 | 3 | 4;
type Cycle = "monthly" | "annual";

interface SubscriberData {
  name: string; email: string; phone: string;
  company_name: string; cnpj: string; city: string; state: string;
}

/* ── Constants ───────────────────────────────────────── */

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const PLAN_TOP_COLOR: Record<string, string> = {
  essencial:    "#1A56C4",
  profissional: "#1A56C4",
  franquia:     "#FF7A1A",
  enterprise:   "#D4A843",
};

/* ── Helpers ─────────────────────────────────────────── */

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function planFeatures(p: Plan): string[] {
  const f: string[] = [];
  if (p.max_users)           f.push(`Até ${p.max_users} usuário${p.max_users !== 1 ? "s" : ""}`);
  if (p.max_stores)          f.push(`Até ${p.max_stores} loja${p.max_stores !== 1 ? "s" : ""}`);
  if (p.max_feed_reels_day)  f.push(`${p.max_feed_reels_day} feed/reels por dia`);
  if (p.max_stories_day)     f.push(`${p.max_stories_day} stories por dia`);
  return f;
}

/* ── StepBar ─────────────────────────────────────────── */

function StepBar({ current }: { current: Step }) {
  const steps = ["Plano", "Dados", "Contrato", "Pagamento"];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done   = current > n;
        const active = current === n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                background: done ? "#22C55E" : active ? "#1A56C4" : "#E5E7EB",
                color: (done || active) ? "#fff" : "#9CA3AF",
                border: `2px solid ${active ? "#1A56C4" : "transparent"}`,
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{
                marginTop: 4, fontSize: 11, fontWeight: 500,
                color: active ? "#1A56C4" : done ? "#22C55E" : "#9CA3AF",
              }}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div style={{
                width: 44, height: 1, margin: "0 8px 18px",
                background: done ? "#22C55E" : "#E5E7EB",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field ───────────────────────────────────────────── */

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", height: 44, padding: "0 14px", boxSizing: "border-box",
          borderRadius: 10, border: "1.5px solid #E5E7EB",
          background: "#fff", color: "#0D1628", fontSize: 14, outline: "none",
        }}
      />
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */

export default function AssinarPage() {
  const [step, setStep]       = useState<Step>(1);
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [addons, setAddons]   = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan]             = useState<Plan | null>(null);
  const [cycle, setCycle]                           = useState<Cycle>("monthly");
  const [selectedAddonSlugs, setSelectedAddonSlugs] = useState<string[]>([]);

  const [sub, setSub]             = useState<SubscriberData>({
    name: "", email: "", phone: "", company_name: "", cnpj: "", city: "", state: "SP",
  });
  const [step2Error, setStep2Error] = useState("");
  const [accepted, setAccepted]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError]     = useState("");

  /* ── Load ─────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      const [planRes, addonRes] = await Promise.all([
        supabase
          .from("plans")
          .select("id,name,slug,price_monthly,price_yearly,price_setup,min_months,max_feed_reels_day,max_stories_day,max_users,max_stores,is_enterprise,active,sort_order")
          .eq("active", true)
          .neq("slug", "interno")
          .eq("is_internal", false)
          .order("sort_order"),
        supabase
          .from("add_ons")
          .select("id,slug,name,description,price_monthly,is_active,sort_order")
          .eq("is_active", true)
          .not("slug", "in", '("novo_template","badge_design")')
          .order("sort_order"),
      ]);
      console.log("[assinar] plans:", planRes.data, planRes.error);
      console.log("[assinar] addons:", addonRes.data, addonRes.error);
      console.log({ plans: planRes.data });
      setPlans((planRes.data as Plan[]) ?? []);
      setAddons((addonRes.data as AddOn[]) ?? []);
      setLoading(false);
    })();
  }, []);

  /* ── Computed ─────────────────────────────────────── */

  const priceMonthly = useMemo(() => {
    if (!selectedPlan) return 0;
    const base = cycle === "annual" && selectedPlan.price_yearly > 0
      ? selectedPlan.price_yearly / 12
      : selectedPlan.price_monthly;
    return base + addons
      .filter((a) => selectedAddonSlugs.includes(a.slug))
      .reduce((s, a) => s + a.price_monthly, 0);
  }, [selectedPlan, cycle, selectedAddonSlugs, addons]);

  const priceSetup        = selectedPlan?.price_setup ?? 0;
  const selectedAddonItems = addons.filter((a) => selectedAddonSlugs.includes(a.slug));

  const contractText = useMemo(() => {
    if (!selectedPlan) return "";
    const today = new Date();
    const end   = new Date(today);
    end.setMonth(end.getMonth() + (selectedPlan.min_months ?? 12));
    return fillTemplate({
      contract_number:   "—",
      company_name:      sub.company_name || sub.name || "—",
      company_cnpj:      sub.cnpj || "A definir",
      company_address:   sub.city && sub.state ? `${sub.city} / ${sub.state}` : "—",
      contact_name:      sub.name || "—",
      user_email:        sub.email || "—",
      plan_name:         selectedPlan.name,
      stores_count:      selectedPlan.max_stores || 1,
      users_count:       selectedPlan.max_users,
      addons_list:       selectedAddonItems.map((a) => a.name).join(", ") || "Nenhum",
      contract_duration: selectedPlan.min_months ?? 12,
      start_date:        today.toISOString().split("T")[0],
      end_date:          end.toISOString().split("T")[0],
      monthly_value:     priceMonthly,
      monthly_total:     priceMonthly * (selectedPlan.min_months ?? 12),
      setup_fee:         priceSetup,
      payment_method:    "Cartão de crédito / Pix (Mercado Pago)",
      payment_day:       "—",
    });
  }, [selectedPlan, sub, selectedAddonItems, priceMonthly, priceSetup]);

  /* ── Handlers ─────────────────────────────────────── */

  function toggleAddon(slug: string) {
    setSelectedAddonSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function validateStep2(): boolean {
    if (!sub.name.trim())                            { setStep2Error("Nome completo é obrigatório."); return false; }
    if (!sub.email.trim() || !sub.email.includes("@")) { setStep2Error("E-mail inválido."); return false; }
    if (!sub.phone.trim())                           { setStep2Error("Telefone é obrigatório."); return false; }
    if (!sub.company_name.trim())                    { setStep2Error("Nome da empresa é obrigatório."); return false; }
    if (!sub.city.trim())                            { setStep2Error("Cidade é obrigatória."); return false; }
    setStep2Error("");
    return true;
  }

  async function handlePay() {
    setProcessing(true);
    setPayError("");
    try {
      const ip  = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json()).then((d: { ip: string }) => d.ip).catch(() => "unknown");
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_slug:            selectedPlan!.slug,
          billing_cycle:        cycle,
          selected_addons:      selectedAddonSlugs,
          price_monthly:        priceMonthly,
          price_implantacao:    priceSetup,
          subscriber_data:      sub,
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

  /* ── Render ───────────────────────────────────────── */

  return (
    <div style={{ minHeight: "100dvh", background: "#F8FAFC", color: "#0D1628", fontFamily: "DM Sans, sans-serif" }}>

      {/* ── TOPBAR ──────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        height: 72, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 24, fontWeight: 700, color: "#D4A843",
          fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "-0.3px",
        }}>
          Aurohub
        </span>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <StepBar current={step} />
        </div>
        <div style={{ width: 80 }} />
      </header>

      {/* ── MAIN ────────────────────────────────────── */}
      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ═══ STEP 1: Plano ══════════════════════════ */}
        {step === 1 && (
          <div style={{ width: "100%" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>
              Escolha seu plano
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 36 }}>
              Todos os planos incluem suporte e atualizações.
            </p>

            {/* Toggle mensal / anual */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-flex", background: "#F3F4F6", borderRadius: 50, padding: 4, gap: 2 }}>
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    style={{
                      padding: "8px 26px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                      background: cycle === c ? "#1A56C4" : "transparent",
                      color: cycle === c ? "#fff" : "#6B7280",
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    {c === "monthly" ? "Mensal" : (
                      <>
                        Anual
                        <span style={{
                          background: "#22C55E", color: "#fff", fontSize: 10, fontWeight: 800,
                          padding: "2px 7px", borderRadius: 50,
                        }}>-15%</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 60 }}>Carregando planos...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start", width: "100%" }}>

                {/* LEFT: cards + add-ons */}
                <div>
                  {/* Plan cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
                    {plans.map((p) => {
                      const isSelected   = selectedPlan?.slug === p.slug;
                      const topColor     = PLAN_TOP_COLOR[p.slug] ?? "#1A56C4";
                      const isEnterprise = p.is_enterprise;
                      const displayPrice = cycle === "annual" && p.price_yearly > 0
                        ? p.price_yearly / 12
                        : p.price_monthly;

                      return (
                        <div
                          key={p.slug}
                          onClick={() => !isEnterprise && setSelectedPlan(p)}
                          style={{
                            position: "relative",
                            background: "#fff",
                            border: `1.5px solid ${isSelected ? topColor : "#E5E7EB"}`,
                            borderTop: `3px solid ${topColor}`,
                            borderRadius: 16,
                            padding: "28px 18px 20px",
                            cursor: isEnterprise ? "default" : "pointer",
                            boxShadow: isSelected
                              ? `0 0 0 3px ${topColor}22, 0 2px 8px rgba(0,0,0,0.08)`
                              : "0 1px 4px rgba(0,0,0,0.06)",
                            transition: "all 0.15s",
                          }}
                        >
                          {/* Badge MAIS POPULAR */}
                          {p.slug === "profissional" && (
                            <div style={{
                              position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                              background: "#1A56C4", color: "#fff", fontSize: 9, fontWeight: 800,
                              padding: "3px 10px", borderRadius: 50, whiteSpace: "nowrap", letterSpacing: "0.5px",
                            }}>
                              MAIS POPULAR
                            </div>
                          )}

                          {/* Badge MELHOR CUSTO-BENEFÍCIO */}
                          {p.slug === "franquia" && (
                            <div style={{
                              position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                              background: "#FF7A1A", color: "#fff", fontSize: 9, fontWeight: 800,
                              padding: "3px 10px", borderRadius: 50, whiteSpace: "nowrap", letterSpacing: "0.5px",
                            }}>
                              MELHOR CUSTO-BENEFÍCIO
                            </div>
                          )}

                          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#0D1628" }}>
                            {p.name}
                          </div>

                          {isEnterprise ? (
                            <div style={{ fontSize: 22, fontWeight: 800, color: "#D4A843", marginBottom: 12 }}>
                              Sob consulta
                            </div>
                          ) : (
                            <>
                              <div style={{ lineHeight: 1, marginBottom: 4 }}>
                                <span style={{ fontSize: 26, fontWeight: 800, color: "#0D1628" }}>
                                  R$ {fmtBRL(displayPrice)}
                                </span>
                                <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400 }}>/mês</span>
                              </div>
                              {p.price_setup > 0 && (
                                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
                                  + R$ {fmtBRL(p.price_setup)} implantação
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 14 }}>
                                Fidelidade: {p.min_months} meses
                              </div>
                            </>
                          )}

                          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
                            {planFeatures(p).map((feat) => (
                              <li key={feat} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 6, alignItems: "flex-start" }}>
                                <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
                                {feat}
                              </li>
                            ))}
                          </ul>

                          {isEnterprise ? (
                            <a
                              href="/suporte"
                              style={{
                                display: "block", textAlign: "center", width: "100%",
                                padding: "10px 0", borderRadius: 10,
                                background: "#D4A843", color: "#fff",
                                fontSize: 13, fontWeight: 700, textDecoration: "none",
                              }}
                            >
                              Falar com consultor
                            </a>
                          ) : (
                            <button
                              onClick={() => setSelectedPlan(p)}
                              style={{
                                width: "100%", padding: "10px 0", borderRadius: 10,
                                background: isSelected ? "#1A56C4" : "#F3F4F6",
                                color: isSelected ? "#fff" : "#374151",
                                fontSize: 13, fontWeight: 700,
                                border: isSelected ? "none" : "1.5px solid #E5E7EB",
                                cursor: "pointer", transition: "all 0.15s",
                              }}
                            >
                              {isSelected ? "✓ Selecionado" : "Selecionar"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add-ons */}
                  {addons.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#0D1628" }}>
                        Add-ons opcionais
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        {addons.map((a) => {
                          const on = selectedAddonSlugs.includes(a.slug);
                          return (
                            <label
                              key={a.slug}
                              style={{
                                display: "flex", alignItems: "flex-start", gap: 10,
                                padding: "14px", borderRadius: 12, cursor: "pointer",
                                border: `1.5px solid ${on ? "#1A56C4" : "#E5E7EB"}`,
                                background: on ? "rgba(26,86,196,0.04)" : "#F9FAFB",
                                transition: "all 0.12s",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleAddon(a.slug)}
                                style={{ accentColor: "#1A56C4", width: 15, height: 15, marginTop: 2, flexShrink: 0 }}
                              />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1628" }}>{a.name}</div>
                                {a.description && (
                                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{a.description}</div>
                                )}
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#D4A843", marginTop: 4 }}>
                                  + R$ {fmtBRL(a.price_monthly)}/mês
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: sticky sidebar */}
                <div style={{ position: "sticky", top: 88 }}>
                  <div style={{
                    background: "#fff", border: "1.5px solid #E5E7EB",
                    borderRadius: 16, padding: "24px 20px",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                  }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#0D1628" }}>Resumo</h3>

                    {!selectedPlan ? (
                      <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
                        Selecione um plano para ver o resumo.
                      </p>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                          <span style={{ color: "#374151" }}>{selectedPlan.name}</span>
                          <span style={{ fontWeight: 600, color: "#0D1628" }}>
                            R$ {fmtBRL(
                              cycle === "annual" && selectedPlan.price_yearly > 0
                                ? selectedPlan.price_yearly / 12
                                : selectedPlan.price_monthly
                            )}/mês
                          </span>
                        </div>

                        {selectedAddonItems.map((a) => (
                          <div key={a.slug} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
                            <span>{a.name}</span>
                            <span>R$ {fmtBRL(a.price_monthly)}/mês</span>
                          </div>
                        ))}

                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                          {cycle === "monthly" ? "Cobrança mensal" : "Cobrança anual"} · {selectedPlan.min_months} meses fidelidade
                        </div>

                        <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 16, paddingTop: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 13, color: "#374151" }}>Total mensal</span>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 26, fontWeight: 800, color: "#1A56C4", lineHeight: 1 }}>
                                R$ {fmtBRL(priceMonthly)}
                              </div>
                              <div style={{ fontSize: 10, color: "#9CA3AF" }}>/mês</div>
                            </div>
                          </div>

                          {priceSetup > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9CA3AF", marginTop: 10 }}>
                              <span>Implantação (única)</span>
                              <span>R$ {fmtBRL(priceSetup)}</span>
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                            <span>Total {selectedPlan.min_months} meses</span>
                            <span style={{ fontWeight: 600 }}>R$ {fmtBRL(priceMonthly * selectedPlan.min_months)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setStep(2)}
                          style={{
                            width: "100%", marginTop: 20, padding: "13px 0",
                            borderRadius: 10, background: "#1A56C4", color: "#fff",
                            fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                          }}
                        >
                          Continuar →
                        </button>

                        <div style={{ marginTop: 12, fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
                          🔒 Pagamento seguro via Mercado Pago
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Dados ══════════════════════════ */}
        {step === 2 && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#0D1628" }}>Seus dados</h1>
            <p style={{ color: "#6B7280", marginBottom: 28, fontSize: 14 }}>Preencha para criar sua conta.</p>

            <div style={{
              background: "#fff", border: "1.5px solid #E5E7EB",
              borderRadius: 16, padding: "28px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Nome completo *"          value={sub.name}         onChange={(v) => setSub({ ...sub, name: v })} />
                <Field label="E-mail *"                 type="email" value={sub.email}  onChange={(v) => setSub({ ...sub, email: v })} />
                <Field label="Telefone / WhatsApp *"    type="tel"   value={sub.phone}  onChange={(v) => setSub({ ...sub, phone: v })} placeholder="(11) 99999-9999" />
                <Field label="Nome da empresa *"        value={sub.company_name} onChange={(v) => setSub({ ...sub, company_name: v })} />
                <Field label="CNPJ (opcional)"          value={sub.cnpj}         onChange={(v) => setSub({ ...sub, cnpj: v })} placeholder="00.000.000/0001-00" />
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Cidade *" value={sub.city} onChange={(v) => setSub({ ...sub, city: v })} />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Estado *</label>
                    <select
                      value={sub.state}
                      onChange={(e) => setSub({ ...sub, state: e.target.value })}
                      style={{
                        width: "100%", height: 44, padding: "0 12px",
                        borderRadius: 10, border: "1.5px solid #E5E7EB",
                        background: "#fff", color: "#0D1628", fontSize: 14, outline: "none",
                      }}
                    >
                      {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {step2Error && (
              <div style={{ marginTop: 12, color: "#EF4444", fontSize: 13 }}>{step2Error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "12px 24px", borderRadius: 10, background: "#fff", color: "#6B7280", border: "1.5px solid #E5E7EB", fontSize: 14, cursor: "pointer" }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                style={{ padding: "13px 36px", borderRadius: 10, background: "#1A56C4", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Contrato ═══════════════════════ */}
        {step === 3 && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#0D1628" }}>Contrato de serviço</h1>
            <p style={{ color: "#6B7280", marginBottom: 24, fontSize: 14 }}>
              Leia o contrato antes de prosseguir para o pagamento.
            </p>

            <div style={{
              maxHeight: 400, overflowY: "auto", padding: "20px 24px",
              border: "1.5px solid #E5E7EB", borderRadius: 12,
              background: "#fff", marginBottom: 24,
              fontSize: 13, lineHeight: 1.7, color: "#374151",
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
              <span style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
                Li e aceito os <strong style={{ color: "#0D1628" }}>Termos de Serviço</strong> e o{" "}
                <strong style={{ color: "#0D1628" }}>Contrato de Prestação de Serviços da Aurovista</strong>
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep(2)}
                style={{ padding: "12px 24px", borderRadius: 10, background: "#fff", color: "#6B7280", border: "1.5px solid #E5E7EB", fontSize: 14, cursor: "pointer" }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { setStep(4); handlePay(); }}
                disabled={!accepted}
                style={{
                  padding: "13px 36px", borderRadius: 10,
                  background: accepted ? "#1A56C4" : "#F3F4F6",
                  color: accepted ? "#fff" : "#9CA3AF",
                  fontSize: 15, fontWeight: 700, border: "none",
                  cursor: accepted ? "pointer" : "not-allowed",
                }}
              >
                Ir para pagamento →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Redirecionando ══════════════════ */}
        {step === 4 && (
          <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
            {payError ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0D1628" }}>Erro ao processar</h2>
                <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 32 }}>{payError}</p>
                <button
                  onClick={() => { setStep(3); setPayError(""); }}
                  style={{ padding: "12px 28px", borderRadius: 10, background: "#1A56C4", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  ← Tentar novamente
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: 48, height: 48, margin: "0 auto 24px",
                  border: "4px solid #E5E7EB", borderTopColor: "#1A56C4",
                  borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0D1628" }}>
                  Redirecionando para pagamento...
                </h2>
                <p style={{ color: "#6B7280", fontSize: 14 }}>
                  Aguarde. Você será redirecionado para o Mercado Pago.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer style={{
        background: "#1A56C4", color: "#fff",
        padding: "28px 24px", textAlign: "center",
      }}>
        <p style={{ fontSize: 13, margin: "0 0 10px", opacity: 0.8 }}>
          © 2026 Aurovista · Todos os direitos reservados
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12 }}>
          <a href="/termos"    style={{ color: "#fff", opacity: 0.75, textDecoration: "none" }}>Termos de Serviço</a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/privacidade" style={{ color: "#fff", opacity: 0.75, textDecoration: "none" }}>Privacidade</a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/suporte"   style={{ color: "#fff", opacity: 0.75, textDecoration: "none" }}>Suporte</a>
        </div>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

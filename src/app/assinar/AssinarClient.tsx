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

/* ── Helpers ─────────────────────────────────────────── */

function fmtBRL(v: number) {
  return Math.round(v).toLocaleString("pt-BR");
}

function planFeatures(p: Plan): string[] {
  const f: string[] = [];
  if (p.max_users)          f.push(`Até ${p.max_users} usuário${p.max_users !== 1 ? "s" : ""}`);
  if (p.max_stores)         f.push(`Até ${p.max_stores} loja${p.max_stores !== 1 ? "s" : ""}`);
  if (p.max_feed_reels_day) f.push(`${p.max_feed_reels_day} feed/reels por dia`);
  if (p.max_stories_day)    f.push(`${p.max_stories_day} stories por dia`);
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
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: active ? "#0F2557" : "transparent",
                color: active ? "#fff" : done ? "#0F2557" : "#B0B8C8",
                border: `1.5px solid ${active ? "#0F2557" : done ? "#0F2557" : "#D8DDE8"}`,
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{
                marginTop: 3, fontSize: 10, fontWeight: 500,
                color: active ? "#0F2557" : done ? "#0F2557" : "#B0B8C8",
              }}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div style={{
                width: 28, height: 1, margin: "0 6px 18px",
                background: "#D8DDE8",
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
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, color: "#B0B8C8",
        marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", height: 44, padding: "0 14px", boxSizing: "border-box",
          borderRadius: 10, border: "1px solid #E4E7ED",
          background: "rgba(255,255,255,0.85)", color: "#0A0F1E",
          fontSize: 14, outline: "none",
        }}
      />
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export default function AssinarClient() {
  const [step, setStep]       = useState<Step>(1);
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [addons, setAddons]   = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan]             = useState<Plan | null>(null);
  const [cycle, setCycle]                           = useState<Cycle>("monthly");
  const [selectedAddonSlugs, setSelectedAddonSlugs] = useState<string[]>([]);

  const [sub, setSub] = useState<SubscriberData>({
    name: "", email: "", phone: "", company_name: "", cnpj: "", city: "", state: "SP",
  });
  const [step2Error, setStep2Error] = useState("");
  const [accepted, setAccepted]     = useState(false);
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
          .order("sort_order"),
        supabase
          .from("add_ons")
          .select("id,slug,name,description,price_monthly,is_active,sort_order")
          .eq("is_active", true)
          .not("slug", "in", '("novo_template","badge_design")')
          .order("sort_order"),
      ]);
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

  const priceSetup         = selectedPlan?.price_setup ?? 0;
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
    if (!sub.name.trim())                               { setStep2Error("Nome completo é obrigatório."); return false; }
    if (!sub.email.trim() || !sub.email.includes("@")) { setStep2Error("E-mail inválido."); return false; }
    if (!sub.phone.trim())                             { setStep2Error("Telefone é obrigatório."); return false; }
    if (!sub.company_name.trim())                      { setStep2Error("Nome da empresa é obrigatório."); return false; }
    if (!sub.city.trim())                              { setStep2Error("Cidade é obrigatória."); return false; }
    setStep2Error("");
    return true;
  }

  async function handlePay() {
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
        setStep(3);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setPayError("Erro de conexão. Tente novamente.");
      setStep(3);
    }
  }

  /* ── Render ───────────────────────────────────────── */

  return (
    <div style={{ minHeight: "100dvh", width: "100%", color: "#0A0F1E", fontSize: 14, position: "relative" }}>

      {/* Linha dourada no topo */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 1, zIndex: 100,
        background: "linear-gradient(90deg,transparent,rgba(212,168,67,0.7),transparent)",
        pointerEvents: "none",
      }} />

      {/* ── TOPBAR ──────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 1, zIndex: 50,
        background: "rgba(247,247,248,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(10,15,30,0.08)",
        height: 58, padding: "0 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 18, fontWeight: 800,
          color: "#0A0F1E", letterSpacing: "-0.4px",
        }}>
          Aurohub
        </span>

        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <StepBar current={step} />
        </div>
        <div style={{ width: 100 }} />
      </header>

      {/* ── MAIN ────────────────────────────────────── */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 60px" }}>

        {/* ═══ STEP 1 ══════════════════════════════════ */}
        {step === 1 && (
          <div>
            {/* Título */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h1 style={{
                fontSize: 28, fontWeight: 700, color: "#0A0F1E",
                letterSpacing: "-0.5px", marginBottom: 8,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                Escolha seu plano
                <span className="pulse-dot" />
              </h1>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                Sem taxas surpresa. Suporte e atualizações incluídos.
              </p>
            </div>

            {/* Toggle mensal / anual */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div style={{
                display: "inline-flex",
                background: "#EDEEF0",
                borderRadius: 10, padding: 3, gap: 2,
              }}>
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    style={{
                      padding: "7px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: cycle === c ? "#fff" : "transparent",
                      color: cycle === c ? "#0F2557" : "#8A94A6",
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      boxShadow: cycle === c ? "0 1px 4px rgba(10,15,30,0.1)" : "none",
                      borderBottom: cycle === c ? "2px solid rgba(255,122,26,0.3)" : "2px solid transparent",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {c === "monthly" ? "Mensal" : (
                      <>
                        Anual
                        <span style={{
                          background: "#D4A843", color: "#0A0F1E",
                          fontSize: 9, fontWeight: 700,
                          padding: "2px 5px", borderRadius: 4,
                        }}>-15%</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "#B0B8C8", padding: 60 }}>
                Carregando planos...
              </div>
            ) : (
              <>
                {/* Cards de plano */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10, marginBottom: 28, paddingTop: 12,
                }}>
                  {plans.map((p) => {
                    const isSelected   = selectedPlan?.slug === p.slug;
                    const isEnterprise = p.is_enterprise;
                    const displayPrice = cycle === "annual" && p.price_yearly > 0
                      ? p.price_yearly / 12
                      : p.price_monthly;

                    return (
                      <div
                        key={p.slug}
                        className="plan-card"
                        onClick={() => !isEnterprise && setSelectedPlan(p)}
                        style={{
                          position: "relative",
                          background: isSelected
                            ? "linear-gradient(160deg,#fff,#FFFCF5)"
                            : "rgba(255,255,255,0.85)",
                          border: isSelected
                            ? "1px solid rgba(212,168,67,0.6)"
                            : "1px solid rgba(255,255,255,0.95)",
                          borderTop: (p.slug === "pro" || p.slug === "enterprise")
                            ? "2px solid #D4A843"
                            : "2px solid transparent",
                          borderRadius: 16,
                          padding: "22px 16px",
                          cursor: isEnterprise ? "default" : "pointer",
                          boxShadow: isSelected
                            ? "0 0 0 3px rgba(212,168,67,0.1), 0 8px 28px rgba(10,15,30,0.1)"
                            : "0 1px 3px rgba(10,15,30,0.05)",
                          transition: "all 0.25s ease",
                        }}
                      >
                        {/* Badge MAIS POPULAR */}
                        {p.slug === "pro" && (
                          <div style={{
                            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                            background: "#0F2557", color: "rgba(212,168,67,0.9)",
                            fontSize: 9, fontWeight: 700,
                            padding: "3px 10px", borderRadius: 4,
                            whiteSpace: "nowrap", letterSpacing: "0.08em",
                            boxShadow: "0 0 0 1px rgba(212,168,67,0.2)",
                          }}>
                            MAIS POPULAR
                          </div>
                        )}

                        {/* Badge FRANQUIA */}
                        {p.slug === "business" && (
                          <div style={{
                            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                            background: "#0F2557", color: "#fff",
                            fontSize: 9, fontWeight: 700,
                            padding: "3px 10px", borderRadius: 4,
                            whiteSpace: "nowrap", letterSpacing: "0.08em",
                          }}>
                            FRANQUIA
                          </div>
                        )}

                        {/* Nome */}
                        <div style={{
                          fontSize: 10, fontWeight: 600,
                          marginTop: (p.slug === "pro" || p.slug === "business") ? 10 : 0,
                          marginBottom: 12,
                          color: "#B0B8C8",
                          textTransform: "uppercase", letterSpacing: "0.12em",
                        }}>
                          {p.name}
                        </div>

                        {/* Preço */}
                        {isEnterprise ? (
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#D4A843", marginBottom: 8 }}>
                            Sob consulta
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 1, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2557", marginBottom: 3, lineHeight: 1 }}>R$</span>
                              <span style={{ fontSize: 32, fontWeight: 800, color: "#0F2557", letterSpacing: "-1.5px", lineHeight: 1 }}>
                                {fmtBRL(displayPrice)}
                              </span>
                              <span style={{ fontSize: 11, color: "#B0B8C8", fontWeight: 400, marginBottom: 3, lineHeight: 1 }}>/mês</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#B0B8C8", marginBottom: 1 }}>
                              {p.price_setup > 0 ? `+ R$${fmtBRL(p.price_setup)} implantação` : "Sem implantação"}
                            </div>
                            <div style={{ fontSize: 10, color: "#B0B8C8", marginBottom: 10 }}>
                              {p.min_months} meses fidelidade
                            </div>
                          </>
                        )}

                        {/* Separador */}
                        <div style={{
                          height: 1, marginBottom: 10,
                          background: "linear-gradient(90deg,rgba(255,122,26,0.12),transparent)",
                        }} />

                        {/* Features */}
                        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {planFeatures(p).map((feat) => (
                            <li key={feat} style={{
                              fontSize: 11, color: "#4A5568",
                              display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.5,
                            }}>
                              <span style={{ color: "#D4A843", flexShrink: 0 }}>—</span>
                              {feat}
                            </li>
                          ))}
                        </ul>

                        {/* Botão */}
                        {isEnterprise ? (
                          <a
                            href="/suporte"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: "100%", height: 38, borderRadius: 9, boxSizing: "border-box",
                              background: "transparent",
                              border: "1px solid #D4A843",
                              color: "#B8902A",
                              fontSize: 12, fontWeight: 600, textDecoration: "none",
                            }}
                          >
                            Falar com consultor
                          </a>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPlan(p); }}
                            style={{
                              width: "100%", height: 38, borderRadius: 9,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: isSelected ? "#0F2557" : "#F7F7F8",
                              color: isSelected ? "#fff" : "#0F2557",
                              fontSize: 12, fontWeight: 600,
                              border: `1px solid ${isSelected ? "#0F2557" : "#E4E7ED"}`,
                              cursor: "pointer", transition: "all 0.2s ease",
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
                  <div style={{ marginBottom: 28 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
                      textTransform: "uppercase", color: "#B0B8C8",
                      marginBottom: 10,
                    }}>
                      Add-ons opcionais
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
                      {addons.map((a) => {
                        const on = selectedAddonSlugs.includes(a.slug);
                        return (
                          <label
                            key={a.slug}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 8,
                              padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                              border: `1px solid ${on ? "rgba(212,168,67,0.5)" : "rgba(255,255,255,0.9)"}`,
                              background: on ? "rgba(255,251,235,0.8)" : "rgba(255,255,255,0.7)",
                              boxShadow: "0 1px 3px rgba(10,15,30,0.04)",
                              transition: "all 0.12s",
                            }}
                          >
                            <div style={{
                              width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1,
                              background: on ? "#D4A843" : "transparent",
                              border: `1.5px solid ${on ? "#D4A843" : "#D8DDE8"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: "#0A0F1E", fontWeight: 700,
                            }}>
                              {on ? "✓" : ""}
                            </div>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleAddon(a.slug)}
                              style={{ display: "none" }}
                            />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 500, color: "#0F2557" }}>{a.name}</div>
                              <div style={{ fontSize: 10, color: "#D4A843", fontWeight: 600, marginTop: 2 }}>
                                + R${fmtBRL(a.price_monthly)}/mês
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── RESUMO DO PEDIDO ──────────────────── */}
                <div style={{ position: "relative", marginTop: 28 }}>
                  <div style={{
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(255,255,255,0.95)",
                    borderTop: "2px solid rgba(212,168,67,0.35)",
                    borderRadius: 16, padding: "22px 28px",
                    boxShadow: "0 4px 20px rgba(15,37,87,0.08)",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 24,
                  }}>
                    {/* Label flutuante */}
                    <div style={{
                      position: "absolute", top: -9, left: 24,
                      fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: "0.1em", color: "#B0B8C8",
                      background: "linear-gradient(180deg,#F5F4F0,#EEEEF2)",
                      padding: "0 8px",
                    }}>
                      RESUMO DO PEDIDO
                    </div>

                    {/* Esquerda: itens separados */}
                    <div style={{ display: "flex", alignItems: "center", flex: 1, flexWrap: "wrap", gap: 0 }}>
                      <div style={{ paddingRight: 20 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0B8C8", marginBottom: 3 }}>Plano</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2557" }}>
                          {selectedPlan ? selectedPlan.name : "—"}
                        </div>
                      </div>

                      {selectedPlan && <div style={{ width: 1, height: 32, background: "#E8E9EB", marginRight: 20 }} />}

                      {selectedAddonItems.length > 0 && (
                        <>
                          <div style={{ paddingRight: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0B8C8", marginBottom: 3 }}>Add-ons</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2557" }}>
                              {selectedAddonItems.map((a) => a.name).join(", ")}
                            </div>
                          </div>
                          <div style={{ width: 1, height: 32, background: "#E8E9EB", marginRight: 20 }} />
                        </>
                      )}

                      {selectedPlan && (
                        <>
                          <div style={{ paddingRight: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0B8C8", marginBottom: 3 }}>Fidelidade</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2557" }}>{selectedPlan.min_months} meses</div>
                          </div>
                          <div style={{ width: 1, height: 32, background: "#E8E9EB", marginRight: 20 }} />
                          <div style={{ paddingRight: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0B8C8", marginBottom: 3 }}>Implantação</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2557" }}>
                              {priceSetup > 0 ? `R$${fmtBRL(priceSetup)}` : "Gratuita"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Direita: preço + botão */}
                    <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
                      {selectedPlan && (
                        <div style={{ borderRight: "1px solid #E4E7ED", paddingRight: 24 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0B8C8", marginBottom: 3 }}>Por mês</div>
                          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F2557", letterSpacing: "-1px", lineHeight: 1 }}>
                            R${fmtBRL(priceMonthly)}
                          </div>
                          <div style={{ fontSize: 10, color: "#B0B8C8", marginTop: 3 }}>
                            {selectedPlan.min_months} meses: R${fmtBRL(priceMonthly * selectedPlan.min_months + priceSetup)}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => selectedPlan && setStep(2)}
                          disabled={!selectedPlan}
                          style={{
                            height: 46, padding: "0 32px", borderRadius: 10,
                            background: selectedPlan ? "#0F2557" : "#EDEEF0",
                            color: selectedPlan ? "#fff" : "#B0B8C8",
                            fontSize: 13, fontWeight: 700,
                            border: "none",
                            borderBottom: selectedPlan ? "2px solid rgba(255,122,26,0.4)" : "2px solid transparent",
                            cursor: selectedPlan ? "pointer" : "not-allowed",
                            transition: "all 0.2s",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Continuar →
                        </button>
                        <div style={{ fontSize: 10, color: "#C0C8D8", textAlign: "center" }}>
                          🔒 Mercado Pago · Ambiente seguro
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Dados ══════════════════════════ */}
        {step === 2 && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#0A0F1E" }}>Seus dados</h1>
            <p style={{ color: "#6B7280", marginBottom: 24, fontSize: 13 }}>Preencha para criar sua conta.</p>

            <div style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.95)",
              borderRadius: 16, padding: "24px 20px",
              boxShadow: "0 4px 20px rgba(15,37,87,0.08)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Nome completo *"       value={sub.name}         onChange={(v) => setSub({ ...sub, name: v })} />
                <Field label="E-mail *"              type="email" value={sub.email}   onChange={(v) => setSub({ ...sub, email: v })} />
                <Field label="Telefone / WhatsApp *" type="tel"   value={sub.phone}   onChange={(v) => setSub({ ...sub, phone: v })} placeholder="(11) 99999-9999" />
                <Field label="Nome da empresa *"     value={sub.company_name}         onChange={(v) => setSub({ ...sub, company_name: v })} />
                <Field label="CNPJ (opcional)"       value={sub.cnpj}                 onChange={(v) => setSub({ ...sub, cnpj: v })} placeholder="00.000.000/0001-00" />
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Cidade *" value={sub.city} onChange={(v) => setSub({ ...sub, city: v })} />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#B0B8C8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Estado *
                    </label>
                    <select
                      value={sub.state}
                      onChange={(e) => setSub({ ...sub, state: e.target.value })}
                      style={{
                        width: "100%", height: 44, padding: "0 12px",
                        borderRadius: 10, border: "1px solid #E4E7ED",
                        background: "rgba(255,255,255,0.85)", color: "#0A0F1E",
                        fontSize: 14, outline: "none",
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

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "11px 22px", borderRadius: 10,
                  background: "rgba(255,255,255,0.85)", color: "#6B7280",
                  border: "1px solid #E4E7ED", fontSize: 13, cursor: "pointer",
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                style={{
                  padding: "12px 32px", borderRadius: 10,
                  background: "#0F2557", color: "#fff",
                  fontSize: 13, fontWeight: 700,
                  border: "none",
                  borderBottom: "2px solid rgba(255,122,26,0.4)",
                  cursor: "pointer",
                }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Contrato ═══════════════════════ */}
        {step === 3 && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#0A0F1E" }}>Contrato de serviço</h1>
            <p style={{ color: "#6B7280", marginBottom: 20, fontSize: 13 }}>
              Leia o contrato antes de prosseguir para o pagamento.
            </p>

            <div style={{
              maxHeight: 400, overflowY: "auto", padding: "20px 24px",
              border: "1px solid rgba(255,255,255,0.95)",
              borderRadius: 16,
              background: "rgba(255,255,255,0.9)", marginBottom: 20,
              fontSize: 13, lineHeight: 1.7, color: "#475569",
              fontFamily: "monospace", whiteSpace: "pre-wrap",
              boxShadow: "0 4px 20px rgba(15,37,87,0.08)",
            }}>
              {contractText}
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 28 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ accentColor: "#0F2557", width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                Li e aceito os <strong style={{ color: "#0A0F1E" }}>Termos de Serviço</strong> e o{" "}
                <strong style={{ color: "#0A0F1E" }}>Contrato de Prestação de Serviços da Aurovista</strong>
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "11px 22px", borderRadius: 10,
                  background: "rgba(255,255,255,0.85)", color: "#6B7280",
                  border: "1px solid #E4E7ED", fontSize: 13, cursor: "pointer",
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => { setStep(4); handlePay(); }}
                disabled={!accepted}
                style={{
                  padding: "12px 32px", borderRadius: 10,
                  background: accepted ? "#0F2557" : "#EDEEF0",
                  color: accepted ? "#fff" : "#B0B8C8",
                  fontSize: 13, fontWeight: 700,
                  border: "none",
                  borderBottom: accepted ? "2px solid rgba(255,122,26,0.4)" : "2px solid transparent",
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
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0A0F1E" }}>Erro ao processar</h2>
                <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 28 }}>{payError}</p>
                <button
                  onClick={() => { setStep(3); setPayError(""); }}
                  style={{
                    padding: "12px 28px", borderRadius: 10,
                    background: "#0F2557", color: "#fff",
                    fontSize: 13, fontWeight: 700,
                    border: "none",
                    borderBottom: "2px solid rgba(255,122,26,0.4)",
                    cursor: "pointer",
                  }}
                >
                  ← Tentar novamente
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: 48, height: 48, margin: "0 auto 24px",
                  border: "3px solid #E4E7ED", borderTopColor: "#0F2557",
                  borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0A0F1E" }}>
                  Redirecionando para pagamento...
                </h2>
                <p style={{ color: "#6B7280", fontSize: 13 }}>
                  Aguarde. Você será redirecionado para o Mercado Pago.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer style={{
        background: "rgba(255,255,255,0.5)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        padding: "20px 48px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: "#B0B8C8" }}>© 2026 Aurovista</span>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/termos"      style={{ fontSize: 11, color: "#B0B8C8", textDecoration: "none" }}>Termos</a>
          <a href="/privacidade" style={{ fontSize: 11, color: "#B0B8C8", textDecoration: "none" }}>Privacidade</a>
          <a href="/suporte"     style={{ fontSize: 11, color: "#B0B8C8", textDecoration: "none" }}>Suporte</a>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(255,122,26,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(255,122,26,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,122,26,0); }
        }
        .pulse-dot {
          display: inline-block;
          width: 8px; height: 8px;
          background: #FF7A1A;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(255,122,26,0.5);
          animation: pulse-ring 1.8s ease-out infinite;
          vertical-align: middle;
        }
        .plan-card:hover {
          box-shadow: 0 6px 20px rgba(10,15,30,0.09) !important;
        }
      `}</style>
    </div>
  );
}

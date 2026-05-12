"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import {
  FileText, Plus, X, Check, Clock, Ban, Eye, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { fillTemplate } from "@/lib/contract-template";
import { decrypt, isEncrypted } from "@/lib/crypto";

const safeDec = (v: string) => v && isEncrypted(v) ? decrypt(v) : (v || "");

/* ── Types ───────────────────────────────────────── */

interface Contract {
  id: string;
  contract_number: string;
  licensee_id: string;
  contact_name: string;
  user_email: string;
  company_name: string;
  company_cnpj: string | null;
  company_address: string | null;
  plan_name: string;
  monthly_value: number;
  monthly_total: number;
  setup_fee: number;
  stores_count: number;
  users_count: number;
  addons_list: string | null;
  payment_method: string | null;
  payment_day: number;
  contract_duration: number;
  start_date: string;
  end_date: string;
  status: "pending" | "signed" | "cancelled";
  signed_at: string | null;
  ip_address: string | null;
  document_hash: string | null;
  document_version: string;
  created_at: string;
}

interface Licensee { id: string; name: string | null }

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", signed: "Assinado", cancelled: "Cancelado" };
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  signed: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/30",
};

const PLAN_OPTS = ["Essencial", "Pro", "Business", "Interno"];
const PAYMENT_OPTS = ["Pix", "Boleto", "Cartão de crédito", "Transferência bancária"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = s.includes("T") ? new Date(s) : new Date(s + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

/* ── Page ────────────────────────────────────────── */

export default function AdmContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    licensee_id: "",
    contact_name: "",
    user_email: "",
    company_name: "",
    company_cnpj: "",
    company_address: "",
    plan_name: "Pro",
    monthly_value: "",
    monthly_total: "",
    setup_fee: "",
    stores_count: "1",
    users_count: "5",
    addons_list: "",
    payment_method: "Pix",
    payment_day: "10",
    contract_duration: "12",
    start_date: new Date().toISOString().split("T")[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("licensees").select("id, name").order("name"),
    ]);
    setContracts((cs ?? []) as Contract[]);
    setLicensees((ls ?? []) as Licensee[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === "monthly_value" || key === "contract_duration") {
      const mv = key === "monthly_value" ? parseFloat(value) : parseFloat(form.monthly_value);
      const dur = key === "contract_duration" ? parseInt(value) : parseInt(form.contract_duration);
      if (!isNaN(mv) && !isNaN(dur)) {
        setForm(f => ({ ...f, [key]: value, monthly_total: (mv * dur).toFixed(2) }));
      }
    }
  }

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthly_value: parseFloat(form.monthly_value),
          monthly_total: parseFloat(form.monthly_total),
          setup_fee: parseFloat(form.setup_fee),
          stores_count: parseInt(form.stores_count),
          users_count: parseInt(form.users_count),
          payment_day: parseInt(form.payment_day),
          contract_duration: parseInt(form.contract_duration),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: json.error ?? "Erro ao gerar contrato" }); return; }
      setShowModal(false);
      setMsg({ type: "ok", text: `Contrato ${json.contract.contract_number} gerado!` });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancelar este contrato?")) return;
    await supabase.from("contracts").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  async function resend(c: Contract) {
    const subject = encodeURIComponent(`Seu contrato Aurohub — ${c.contract_number}`);
    const body = encodeURIComponent(
      `Olá ${c.contact_name},\n\nSeu contrato está disponível para assinatura em:\nhttps://app.aurohub.com.br/cliente/contrato\n\nContrato: ${c.contract_number}\n\nAtenciosamente,\nEquipe Aurohub`
    );
    window.open(`mailto:${c.user_email}?subject=${subject}&body=${body}`);
  }

  function openPreview(c: Contract) {
    const dec = {
      ...c,
      company_cnpj: c.company_cnpj ? safeDec(c.company_cnpj) : null,
      company_address: c.company_address ? safeDec(c.company_address) : null,
      ip_address: c.ip_address ? safeDec(c.ip_address) : null,
    };
    setPreviewText(fillTemplate(dec as unknown as Record<string, unknown>));
    setPreviewId(c.id);
  }

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center text-[13px] text-[var(--txt3)]">Carregando contratos…</div>;
  }

  return (
    <div className="flex flex-col gap-6 page-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--txt)]">Contratos</h1>
          <p className="text-[12px] text-[var(--txt3)]">{contracts.length} contratos cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--orange)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} /> Gerar contrato
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-[13px] ${msg.type === "ok" ? "border-green-500/30 bg-green-500/10 text-green-600" : "border-red-500/30 bg-red-500/10 text-red-500"}`}>
          {msg.type === "ok" ? <Check size={14} /> : <X size={14} />} {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--bdr)] bg-[var(--surface)]">
              {["Nº Contrato", "Empresa", "Plano", "Valor/mês", "Período", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[var(--txt3)]">Nenhum contrato cadastrado</td></tr>
            )}
            {contracts.map(c => (
              <>
                <tr
                  key={c.id}
                  className="border-b border-[var(--bdr)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <td className="px-4 py-3 font-mono text-[12px] font-bold text-[var(--txt)]">{c.contract_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-[var(--txt)]">{c.company_name}</div>
                    <div className="text-[11px] text-[var(--txt3)]">{c.contact_name}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--txt2)]">{c.plan_name}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[var(--txt)]">{fmtBRL(c.monthly_value)}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--txt2)]">
                    {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[c.status]}`}>
                      {c.status === "pending" && <Clock size={10} />}
                      {c.status === "signed" && <Check size={10} />}
                      {c.status === "cancelled" && <Ban size={10} />}
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); openPreview(c); }} title="Visualizar" className="rounded p-1.5 text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"><Eye size={14} /></button>
                      {c.status === "pending" && (
                        <button onClick={e => { e.stopPropagation(); resend(c); }} title="Reenviar por e-mail" className="rounded p-1.5 text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"><Send size={14} /></button>
                      )}
                      {c.status !== "cancelled" && (
                        <button onClick={e => { e.stopPropagation(); cancel(c.id); }} title="Cancelar" className="rounded p-1.5 text-[var(--txt3)] hover:bg-red-500/10 hover:text-red-500"><Ban size={14} /></button>
                      )}
                      <span className="text-[var(--txt3)]">{expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                    </div>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr key={`${c.id}-exp`} className="border-b border-[var(--bdr)] bg-[var(--surface)]">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[12px]">
                        <Info label="CNPJ" value={c.company_cnpj ? safeDec(c.company_cnpj) : "—"} />
                        <Info label="Endereço" value={c.company_address ? safeDec(c.company_address) : "—"} />
                        <Info label="E-mail" value={c.user_email} />
                        <Info label="Pagamento" value={`Dia ${c.payment_day} — ${c.payment_method ?? "—"}`} />
                        <Info label="Lojas" value={String(c.stores_count)} />
                        <Info label="Usuários" value={String(c.users_count)} />
                        <Info label="Add-ons" value={c.addons_list ?? "—"} />
                        <Info label="Setup" value={fmtBRL(c.setup_fee)} />
                        {c.signed_at && <Info label="Assinado em" value={fmtDate(c.signed_at)} />}
                        {c.ip_address && <Info label="IP" value={safeDec(c.ip_address)} />}
                        {c.document_hash && (
                          <div className="col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Hash SHA-256</span>
                            <p className="mt-0.5 break-all font-mono text-[10px] text-[var(--txt2)]">{c.document_hash}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Modal */}
      {showModal && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
          <div style={{ background: "var(--bg1)", borderRadius: "12px", width: "min(640px, 92vw)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--bdr)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-4">
              <div className="flex items-center gap-2 text-[var(--txt)]">
                <FileText size={18} className="text-[var(--orange)]" />
                <span className="text-[16px] font-bold">Gerar contrato</span>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded p-1 text-[var(--txt3)] hover:text-[var(--txt)]"><X size={18} /></button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Licensee" span={2}>
                  <select value={form.licensee_id} onChange={e => field("licensee_id", e.target.value)} className="input">
                    <option value="">Selecione…</option>
                    {licensees.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Responsável">
                  <input value={form.contact_name} onChange={e => field("contact_name", e.target.value)} placeholder="Nome completo" className="input" />
                </FormField>
                <FormField label="E-mail">
                  <input type="email" value={form.user_email} onChange={e => field("user_email", e.target.value)} placeholder="email@empresa.com" className="input" />
                </FormField>
                <FormField label="Razão Social" span={2}>
                  <input value={form.company_name} onChange={e => field("company_name", e.target.value)} placeholder="Nome da empresa" className="input" />
                </FormField>
                <FormField label="CNPJ">
                  <input value={form.company_cnpj} onChange={e => field("company_cnpj", e.target.value)} placeholder="00.000.000/0001-00" className="input" />
                </FormField>
                <FormField label="Endereço">
                  <input value={form.company_address} onChange={e => field("company_address", e.target.value)} placeholder="Rua, nº — Cidade/UF" className="input" />
                </FormField>
                <FormField label="Plano">
                  <select value={form.plan_name} onChange={e => field("plan_name", e.target.value)} className="input">
                    {PLAN_OPTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FormField>
                <FormField label="Duração (meses)">
                  <input type="number" min={1} value={form.contract_duration} onChange={e => field("contract_duration", e.target.value)} className="input" />
                </FormField>
                <FormField label="Valor mensal (R$)">
                  <input type="number" step="0.01" min={0} value={form.monthly_value} onChange={e => field("monthly_value", e.target.value)} placeholder="0,00" className="input" />
                </FormField>
                <FormField label="Total do contrato (R$)">
                  <input type="number" step="0.01" min={0} value={form.monthly_total} onChange={e => field("monthly_total", e.target.value)} placeholder="0,00" className="input" />
                </FormField>
                <FormField label="Setup (R$)">
                  <input type="number" step="0.01" min={0} value={form.setup_fee} onChange={e => field("setup_fee", e.target.value)} placeholder="0,00" className="input" />
                </FormField>
                <FormField label="Início do contrato">
                  <input type="date" value={form.start_date} onChange={e => field("start_date", e.target.value)} className="input" />
                </FormField>
                <FormField label="Lojas/Unidades">
                  <input type="number" min={1} value={form.stores_count} onChange={e => field("stores_count", e.target.value)} className="input" />
                </FormField>
                <FormField label="Usuários">
                  <input type="number" min={1} value={form.users_count} onChange={e => field("users_count", e.target.value)} className="input" />
                </FormField>
                <FormField label="Forma de pagamento">
                  <select value={form.payment_method} onChange={e => field("payment_method", e.target.value)} className="input">
                    {PAYMENT_OPTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FormField>
                <FormField label="Dia de vencimento">
                  <input type="number" min={1} max={28} value={form.payment_day} onChange={e => field("payment_day", e.target.value)} className="input" />
                </FormField>
                <FormField label="Add-ons" span={2}>
                  <input value={form.addons_list} onChange={e => field("addons_list", e.target.value)} placeholder="Ex: Card WhatsApp, Música" className="input" />
                </FormField>
              </div>

              {msg && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
                  <X size={14} /> {msg.text}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[13px] text-[var(--txt2)] hover:bg-[var(--hover-bg)]">Cancelar</button>
              <button onClick={generate} disabled={busy} className="flex items-center gap-2 rounded-lg bg-[var(--orange)] px-5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                <FileText size={14} /> {busy ? "Gerando…" : "Gerar contrato"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Preview Modal */}
      {previewId && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
          <div style={{ background: "var(--bg1)", borderRadius: "12px", width: "min(760px, 92vw)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--bdr)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-4">
              <span className="text-[16px] font-bold text-[var(--txt)]">Visualizar contrato</span>
              <button onClick={() => setPreviewId(null)} className="rounded p-1 text-[var(--txt3)] hover:text-[var(--txt)]"><X size={18} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--txt2)]">{previewText}</pre>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`.input { width: 100%; border-radius: 6px; border: 1px solid var(--bdr); background: var(--surface); padding: 8px 12px; font-size: 12px; color: var(--txt); outline: none; } .input:focus { border-color: var(--orange); }`}</style>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">{label}</span>
      <p className="text-[12px] text-[var(--txt2)]">{value}</p>
    </div>
  );
}

function FormField({ label, span, children }: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">{label}</label>
      {children}
    </div>
  );
}

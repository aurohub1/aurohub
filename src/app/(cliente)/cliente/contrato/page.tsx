"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import { fillTemplate } from "@/lib/contract-template";
import { Check, Clock, FileText, ShieldCheck, AlertCircle } from "lucide-react";

interface Contract {
  id: string;
  contract_number: string;
  company_name: string;
  contact_name: string;
  plan_name: string;
  monthly_value: number;
  start_date: string;
  end_date: string;
  status: "pending" | "signed" | "cancelled";
  signed_at: string | null;
  document_hash: string | null;
  document_version: string;
  [key: string]: unknown;
}

export default function ClienteContratoPage() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [filled, setFilled] = useState("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signResult, setSignResult] = useState<{ hash: string; signed_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getProfile(supabase);
      if (!profile?.licensee_id) { setLoading(false); return; }

      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("licensee_id", profile.licensee_id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const c = data as Contract;
        setContract(c);
        setFilled(fillTemplate(c as Record<string, unknown>));
        if (c.status === "signed") {
          setSigned(true);
          setSignResult({ hash: c.document_hash ?? "", signed_at: c.signed_at ?? "" });
        }
      }
      setLoading(false);
    })();
  }, []);

  async function handleSign() {
    if (!contract) return;
    setSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contract.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao assinar"); return; }
      setSigned(true);
      setSignResult({ hash: json.hash, signed_at: json.signed_at });
      setContract(c => c ? { ...c, status: "signed", signed_at: json.signed_at, document_hash: json.hash } : c);
    } finally {
      setSigning(false);
    }
  }

  function fmtDate(s: string | null) {
    if (!s) return "—";
    const d = s.includes("T") ? new Date(s) : new Date(s + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }
  function fmtTime(s: string | null) {
    if (!s) return "";
    return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center text-[13px] text-[var(--txt3)]">Carregando contrato…</div>;
  }

  if (!contract) {
    return (
      <div className="flex max-w-2xl flex-col items-center gap-4 py-16 page-fade">
        <FileText size={48} className="text-[var(--txt3)]" />
        <h1 className="text-[18px] font-bold text-[var(--txt)]">Nenhum contrato encontrado</h1>
        <p className="text-center text-[13px] text-[var(--txt3)]">
          Seu contrato ainda não foi gerado. Entre em contato com o suporte Aurohub.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 page-fade">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-[var(--orange)]" />
          <h1 className="text-[20px] font-bold text-[var(--txt)]">Contrato de Serviço</h1>
        </div>
        <p className="text-[12px] text-[var(--txt3)]">
          {contract.contract_number} · {contract.plan_name} · Vigência: {fmtDate(contract.start_date)} a {fmtDate(contract.end_date)}
        </p>
      </div>

      {/* Status banner */}
      {signed ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/8 p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-green-600" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-green-700 dark:text-green-400">Contrato assinado com sucesso</p>
            <p className="text-[12px] text-green-700/80 dark:text-green-400/80">
              Assinado em {fmtDate(signResult?.signed_at ?? null)} às {fmtTime(signResult?.signed_at ?? null)}
            </p>
            {signResult?.hash && (
              <div className="mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700/60 dark:text-green-400/60">Hash SHA-256 do documento</span>
                <p className="break-all font-mono text-[10px] text-green-700/80 dark:text-green-400/80">{signResult.hash}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/8 p-4">
          <Clock size={18} className="shrink-0 text-orange-500" />
          <p className="text-[13px] text-orange-600 dark:text-orange-400">
            Aguardando sua assinatura. Leia o contrato abaixo e clique em "Li e aceito os termos".
          </p>
        </div>
      )}

      {/* Contract text */}
      <section className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)]">
        <div className="border-b border-[var(--bdr)] px-5 py-3">
          <span className="text-[12px] font-semibold text-[var(--txt2)]">Texto do contrato — versão {contract.document_version}</span>
        </div>
        <div className="max-h-[480px] overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--txt2)]">{filled}</pre>
        </div>
      </section>

      {/* Sign block */}
      {!signed && (
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--orange)]"
            />
            <span className="text-[13px] text-[var(--txt2)]">
              Declaro que li e compreendi todas as cláusulas deste contrato e concordo com os termos e condições
              estabelecidos, incluindo valores, prazos e obrigações das partes.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!accepted || signing}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--orange)] text-[14px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {signing ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Assinando…</span>
            ) : (
              <><Check size={16} /> Li e aceito os termos</>
            )}
          </button>

          <p className="text-center text-[10px] text-[var(--txt3)]">
            Ao clicar, seu IP e a data/hora serão registrados junto ao hash SHA-256 do documento,
            constituindo assinatura eletrônica válida nos termos da Lei 14.063/2020.
          </p>
        </section>
      )}
    </div>
  );
}

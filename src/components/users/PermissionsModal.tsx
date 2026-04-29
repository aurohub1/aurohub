"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const FORM_OPTIONS = [
  { id: "pacote",        label: "Pacote" },
  { id: "campanha",      label: "Campanha" },
  { id: "passagem",      label: "Passagem" },
  { id: "cruzeiro",      label: "Cruzeiro" },
  { id: "anoiteceu",     label: "Anoiteceu" },
  { id: "card_whatsapp", label: "Card WhatsApp" },
];

export interface StoreOption { id: string; name: string; }

interface Props {
  userId: string;
  licenseeId: string;
  userName: string;
  stores: StoreOption[];
  onClose: () => void;
  onSaved: () => void;
  /** undefined = ADM (todos os forms). Array com ids = limita ao que o pai tem. */
  parentAllowedForms?: string[];
}

export function PermissionsModal({ userId, licenseeId, userName, stores, onClose, onSaved, parentAllowedForms }: Props) {
  // Forms disponíveis para conceder: restritos ao que o pai tem (ou todos se ADM)
  const availableForms = (!parentAllowedForms || parentAllowedForms.length === 0)
    ? FORM_OPTIONS
    : FORM_OPTIONS.filter(f => parentAllowedForms.includes(f.id));

  const [allowedForms, setAllowedForms]     = useState<Set<string>>(new Set());
  const [allStores, setAllStores]           = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [canPublish, setCanPublish]         = useState(true);
  const [canDownload, setCanDownload]       = useState(true);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [errorMsg, setErrorMsg]             = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setAllowedForms(new Set(data.allowed_forms ?? []));
        const sids: string[] = data.store_ids ?? [];
        setAllStores(sids.length === 0);
        setSelectedStoreIds(new Set(sids));
        setCanPublish(data.can_publish ?? true);
        setCanDownload(data.can_download ?? true);
      }
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleForm(id: string) {
    setAllowedForms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleStore(id: string) {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    const validFormIds = new Set(availableForms.map(f => f.id));
    const payload = {
      user_id: userId,
      licensee_id: licenseeId,
      allowed_forms: Array.from(allowedForms).filter(f => validFormIds.has(f)),
      store_ids: allStores ? [] : Array.from(selectedStoreIds),
      can_publish: canPublish,
      can_download: canDownload,
    };
    const { data: existing } = await supabase
      .from("user_permissions")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("user_permissions").update(payload).eq("user_id", userId)
      : await supabase.from("user_permissions").insert(payload);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    onSaved();
    onClose();
  }

  async function handleRemoveRestrictions() {
    setSaving(true);
    await supabase.from("user_permissions").delete().eq("user_id", userId);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-[480px] max-h-[92vh] flex-col rounded-2xl border border-[var(--bdr)]"
        style={{ background: "var(--card-bg)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4 shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--txt)]">Permissões</h3>
            <p className="mt-0.5 text-[11px] text-[var(--txt3)]">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] hover:text-[var(--txt)]"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-[13px] text-[var(--txt3)]">
            Carregando...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

            {/* FORMULÁRIOS */}
            <div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
                  Formulários liberados
                </span>
                <span className="text-[10px] text-[var(--txt3)] opacity-60">vazio = todos</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableForms.map(f => {
                  const checked = allowedForms.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleForm(f.id)}
                      className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
                      style={checked
                        ? { background: "rgba(59,130,246,0.1)", borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }
                        : { background: "transparent", borderColor: "var(--bdr)", color: "var(--txt3)" }
                      }
                    >
                      {checked && "✓ "}{f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LOJAS */}
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Lojas</div>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    checked={allStores}
                    onChange={() => setAllStores(true)}
                    className="accent-[var(--brand-primary)] h-3.5 w-3.5"
                  />
                  <span className="text-[13px] text-[var(--txt)]">Todas as lojas</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    checked={!allStores}
                    onChange={() => setAllStores(false)}
                    className="accent-[var(--brand-primary)] h-3.5 w-3.5"
                  />
                  <span className="text-[13px] text-[var(--txt)]">Lojas específicas</span>
                </label>
                {!allStores && (
                  <div className="ml-6 flex flex-wrap gap-2 pt-1">
                    {stores.map(s => {
                      const checked = selectedStoreIds.has(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleStore(s.id)}
                          className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
                          style={checked
                            ? { background: "rgba(34,197,94,0.1)", borderColor: "#22C55E", color: "#22C55E" }
                            : { background: "transparent", borderColor: "var(--bdr)", color: "var(--txt3)" }
                          }
                        >
                          {checked && "✓ "}{s.name}
                        </button>
                      );
                    })}
                    {stores.length === 0 && (
                      <span className="text-[12px] text-[var(--txt3)]">Nenhuma loja disponível</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PUBLICAÇÃO */}
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Publicação</div>
              <div className="flex flex-col gap-2">
                <PermToggle label="Pode publicar no Instagram" checked={canPublish} onChange={setCanPublish} />
                <PermToggle label="Pode baixar imagem" checked={canDownload} onChange={setCanDownload} />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-[var(--red)] bg-[var(--red3)] px-3 py-2 text-[11px] text-[var(--red)]">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 border-t border-[var(--bdr)] px-5 py-4 shrink-0">
          <button
            onClick={handleRemoveRestrictions}
            disabled={saving || loading}
            className="rounded-lg border border-[var(--bdr)] px-3 py-2 text-[11px] font-semibold text-[var(--txt3)] hover:text-[var(--txt)] disabled:opacity-50"
          >
            Sem restrições
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12px] text-[var(--txt3)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            {saving ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3 hover:bg-[var(--hover-bg)]">
      <span className="text-[13px] text-[var(--txt)]">{label}</span>
      <div
        onClick={e => { e.preventDefault(); onChange(!checked); }}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ADM_FULL_PERMISSIONS,
  ADM_PERMISSIONS_SELECT,
  rowToAdmPermissions,
  type AdmPermissions,
} from "@/lib/adm-permissions";

const PERM_OPTIONS: { key: keyof AdmPermissions; label: string; desc: string }[] = [
  { key: "can_use_editor",     label: "Estúdio de Templates", desc: "Criar e editar templates" },
  { key: "can_manage_plans",   label: "Planos",               desc: "Criar e editar planos" },
  { key: "can_manage_configs", label: "Configurações",        desc: "Alterar configs do sistema" },
  { key: "can_manage_clients", label: "Clientes",             desc: "Gerenciar licenciados" },
  { key: "can_manage_users",   label: "Usuários",             desc: "Gerenciar usuários" },
  { key: "can_view_logs",      label: "Logs",                 desc: "Visualizar logs de atividade" },
  { key: "can_view_vault",     label: "Vault",                desc: "Acessar o vault" },
  { key: "can_view_health",    label: "Saúde",                desc: "Visualizar saúde do sistema" },
  { key: "can_manage_library", label: "Banco de Imagens",     desc: "Gerenciar biblioteca" },
];

interface Props {
  userId: string;
  userName: string;
  admLevel: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AdmPermissionsModal({ userId, userName, admLevel, onClose, onSaved }: Props) {
  const [perms, setPerms]     = useState<AdmPermissions>(ADM_FULL_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("adm_permissions")
        .select(ADM_PERMISSIONS_SELECT)
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setPerms(rowToAdmPermissions(data as Record<string, unknown>));
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function togglePerm(key: keyof AdmPermissions) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    const payload = { user_id: userId, ...perms };
    const { data: existing } = await supabase
      .from("adm_permissions").select("user_id").eq("user_id", userId).maybeSingle();
    const { error } = existing
      ? await supabase.from("adm_permissions").update(payload).eq("user_id", userId)
      : await supabase.from("adm_permissions").insert(payload);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
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
            <h3 className="text-[15px] font-bold text-[var(--txt)]">Permissões ADM</h3>
            <p className="mt-0.5 text-[11px] text-[var(--txt3)]">
              {userName}
              <span className="ml-2 rounded-full bg-[var(--gold3)] px-2 py-px text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
                {admLevel}
              </span>
            </p>
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
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {PERM_OPTIONS.map(opt => (
              <label
                key={opt.key}
                className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)]"
              >
                <div>
                  <div className="text-[13px] font-medium text-[var(--txt)]">{opt.label}</div>
                  <div className="text-[11px] text-[var(--txt3)]">{opt.desc}</div>
                </div>
                <div
                  onClick={e => { e.preventDefault(); togglePerm(opt.key); }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${perms[opt.key] ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${perms[opt.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </label>
            ))}
            {errorMsg && (
              <div className="rounded-lg border border-[var(--red)] bg-[var(--red3)] px-3 py-2 text-[11px] text-[var(--red)]">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 border-t border-[var(--bdr)] px-5 py-4 shrink-0">
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] text-[var(--txt3)]">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

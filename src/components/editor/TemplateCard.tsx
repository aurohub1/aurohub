"use client";

import { useRef, useState } from "react";
import { Pencil, Copy, CopyPlus, Trash2, Building2, MapPin, Users, RefreshCw, CheckCircle, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface CanvasTemplate {
  key: string;
  displayName: string;
  nome: string;
  format: string;
  formType: string;
  updatedAt: string | null;
  licenseeId: string | null;
  licenseeNome: string;
  lojaNome: string;
  thumbnail: string | null;
  isBase: boolean;
  baseTipo: string | null;
  accessLicensees?: string[];
  formTemplateId?: string | null;
  formTemplateActive?: boolean | null;
  formTemplateCreatedAt?: string | null;
}

interface TemplateCardProps {
  template: CanvasTemplate;
  onEdit: (key: string) => void;
  onDuplicate: (key: string) => void;
  onDelete: (key: string) => void;
  onClone?: (key: string) => void;
  onUpdate?: (key: string) => void;
  onAccess?: (key: string) => void;
  onNameChange: (key: string, nome: string) => void;
  onMetaChange?: (key: string, data: { nome: string; formType: string; format: string }) => void;
  onThumbUpload: (key: string, file: File) => void;
  onThumbCapture: (key: string) => void;
  thumbUploading?: boolean;
  activeStatus?: "active" | "inactive" | null;
  onSetActive?: (key: string) => void;
}

export function TemplateCard({
  template: t,
  onEdit,
  onDuplicate,
  onDelete,
  onClone,
  onUpdate,
  onAccess,
  onNameChange,
  onMetaChange,
  onThumbUpload,
  onThumbCapture,
  thumbUploading = false,
  activeStatus,
  onSetActive,
}: TemplateCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(t.nome);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Local overrides — atualizados após quick-edit sem depender do estado do pai
  const [localNome, setLocalNome] = useState<string | null>(null);
  const [localFormType, setLocalFormType] = useState<string | null>(null);
  const [localFormat, setLocalFormat] = useState<string | null>(null);

  const displayNome = localNome ?? t.nome;
  const displayFormType = localFormType ?? t.formType;
  const displayFormat = localFormat ?? t.format;

  // Quick-edit popover
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [qeNome, setQeNome] = useState(displayNome);
  const [qeFormType, setQeFormType] = useState(displayFormType);
  const [qeFormat, setQeFormat] = useState(displayFormat);
  const [qeSaving, setQeSaving] = useState(false);
  const [qeError, setQeError] = useState<string | null>(null);

  function openQuickEdit() {
    setQeNome(localNome ?? t.nome);
    setQeFormType(localFormType ?? t.formType);
    setQeFormat(localFormat ?? t.format);
    setQeError(null);
    setQuickEditOpen(true);
  }

  async function handleQuickEditSave() {
    const nome = qeNome.trim();
    if (!nome) { setQeError("Nome obrigatório"); return; }
    setQeSaving(true);
    setQeError(null);
    try {
      // 1. Busca schema atual
      const { data: cfg } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", t.key)
        .single();

      if (cfg) {
        const currentSchema = JSON.parse(cfg.value as string);
        // 2. Salva histórico ANTES de qualquer alteração
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const { error: hErr } = await supabase.from("template_history").insert({
            template_id: t.key.replace(/^tmpl_/, ""),
            schema: currentSchema,
            saved_by: user?.id ?? null,
            note: "quick-edit (tipo/formato/nome)",
          });
          if (!hErr) {
            const { data: oldRows } = await supabase
              .from("template_history")
              .select("id, saved_at")
              .eq("template_id", t.key.replace(/^tmpl_/, ""))
              .order("saved_at", { ascending: false })
              .range(10, 999);
            if (oldRows && oldRows.length > 0) {
              await supabase.from("template_history").delete()
                .in("id", (oldRows as { id: string }[]).map(r => r.id));
            }
          }
        } catch {}

        // 3. Atualiza system_config (apenas metadados, schema intacto)
        const updated = { ...currentSchema, nome, format: qeFormat, formType: qeFormType };
        await supabase.from("system_config").upsert({
          key: t.key,
          value: JSON.stringify(updated),
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
      }

      // 4. Atualiza form_templates
      await supabase.from("form_templates")
        .update({ name: nome, form_type: qeFormType, format: qeFormat })
        .eq("config_key", t.key);

      // 5. Atualiza estado local do card
      setLocalNome(nome);
      setLocalFormType(qeFormType);
      setLocalFormat(qeFormat);
      setTempName(nome);
      onMetaChange?.(t.key, { nome, formType: qeFormType, format: qeFormat });
      setQuickEditOpen(false);
    } catch (err) {
      setQeError("Erro ao salvar. Tente novamente.");
      console.error("[QuickEdit] save error:", err);
    } finally {
      setQeSaving(false);
    }
  }

  const handleNameBlur = async () => {
    if (savingName) return;
    const trimmed = tempName.trim();
    if (!trimmed || trimmed === t.nome) {
      setTempName(t.nome);
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await onNameChange(t.key, trimmed);
      setEditingName(false);
    } catch (err) {
      console.error("[TemplateCard] rename error:", err);
      setTempName(t.nome);
    } finally {
      setSavingName(false);
    }
  };

  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onThumbUpload(t.key, file);
  };

  return (
    <div
      data-tmpl-key={t.key}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--bdr)] bg-[var(--surface)] transition-all hover:border-[var(--txt3)] hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" style={{ height: '180px' }}>
        {t.thumbnail ? (
          <img
            src={t.thumbnail}
            alt={t.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl opacity-20">📄</span>
          </div>
        )}

        {/* Thumbnail actions (hover) */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => thumbInputRef.current?.click()}
            disabled={thumbUploading}
            className="rounded-lg bg-white/90 p-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
            title="Upload thumbnail"
          >
            {thumbUploading ? "⏳" : "📁"}
          </button>
          <button
            onClick={() => onThumbCapture(t.key)}
            disabled={thumbUploading}
            className="rounded-lg bg-white/90 p-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
            title="Capturar preview"
          >
            📸
          </button>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleThumbChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Nome (editável) */}
        {editingName ? (
          <div className="relative">
            <input
              autoFocus
              disabled={savingName}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameBlur();
                if (e.key === "Escape" && !savingName) {
                  setTempName(t.nome);
                  setEditingName(false);
                }
              }}
              className="w-full rounded border border-[var(--orange)] bg-transparent px-2 py-1 text-sm font-medium text-[var(--txt)] outline-none disabled:opacity-50"
            />
            {savingName && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--orange)] border-t-transparent"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="group/name flex items-center gap-1.5">
            <h3
              onClick={() => setEditingName(true)}
              className="flex-1 cursor-text text-sm font-medium text-[var(--txt)] line-clamp-2 hover:text-[var(--txt2)]"
              title="Clique para editar"
            >
              {displayNome || "Sem nome"}
            </h3>
            <button
              onClick={() => setEditingName(true)}
              className="shrink-0 opacity-0 transition-opacity group-hover/name:opacity-100"
              title="Editar nome"
            >
              <Pencil size={12} className="text-[var(--txt3)] hover:text-[var(--txt)]" />
            </button>
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1">
          <span
            className="text-[9px] font-semibold uppercase"
            style={{
              background: getTypeColor(displayFormType),
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {formatTypeLabel(displayFormType)}
          </span>
          <span
            className="text-[9px] font-medium"
            style={{
              background: displayFormat === "reels" ? "#f3e8ff" : displayFormat === "tv" ? "#fef3c7" : "#e2e8f0",
              color: displayFormat === "reels" ? "#7c3aed" : displayFormat === "tv" ? "#d97706" : "#475569",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {formatFormatLabel(displayFormat)}
          </span>
          {activeStatus && (
            <span
              className="text-[9px] font-semibold uppercase"
              style={{
                background: activeStatus === "active" ? "#22c55e" : "#ef4444",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {activeStatus === "active" ? "ATIVO" : "INATIVO"}
            </span>
          )}
        </div>

        {/* Meta info */}
        {!t.isBase && (
          <div className="mt-auto space-y-0.5 border-t border-[var(--bdr)] pt-2 text-[10px] text-[var(--txt3)]">
            <p className="flex items-center gap-1">
              <Building2 size={11} />
              {t.licenseeNome}
            </p>
            {t.lojaNome && (
              <p className="flex items-center gap-1">
                <MapPin size={11} />
                {t.lojaNome}
              </p>
            )}
          </div>
        )}

        {/* Access badge (se template tem acesso compartilhado) */}
        {t.isBase && t.accessLicensees && t.accessLicensees.length > 0 && (
          <div className="mt-2 border-t border-[var(--bdr)] pt-2">
            <div className="flex flex-wrap gap-1">
              {t.accessLicensees.slice(0, 2).map((name, i) => (
                <span
                  key={i}
                  className="text-[9px] font-medium"
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {name}
                </span>
              ))}
              {t.accessLicensees.length > 2 && (
                <span
                  className="text-[9px] font-medium"
                  style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  +{t.accessLicensees.length - 2}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex border-t border-[var(--bdr)]">
        {/* Tooltip customizado */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%) translateY(-4px)",
              background: "#0E1520",
              border: "0.5px solid #D4A843",
              color: "#D4A843",
              fontSize: "10px",
              fontWeight: 500,
              borderRadius: "6px",
              padding: "4px 8px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 50,
              opacity: 1,
              transition: "opacity 0.15s",
            }}
          >
            {tooltip}
          </div>
        )}

        <button
          onClick={() => onEdit(t.key)}
          onMouseEnter={() => setTooltip("Editar")}
          onMouseLeave={() => setTooltip(null)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[var(--txt)]"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={openQuickEdit}
          onMouseEnter={() => setTooltip("Tipo / Formato")}
          onMouseLeave={() => setTooltip(null)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[var(--txt)]"
        >
          <SlidersHorizontal size={15} />
        </button>
        {activeStatus !== null && onSetActive && (
          <button
            onClick={() => onSetActive(t.key)}
            onMouseEnter={() => setTooltip(activeStatus === "active" ? "Desativar" : "Ativar")}
            onMouseLeave={() => setTooltip(null)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${activeStatus === "active" ? "text-[#16a34a] hover:bg-[rgba(239,68,68,0.10)] hover:text-[#ef4444]" : "text-[#ef4444] hover:bg-[rgba(22,163,74,0.10)] hover:text-[#16a34a]"}`}
          >
            <CheckCircle size={15} />
          </button>
        )}
        {onAccess && (
          <button
            onClick={() => onAccess(t.key)}
            onMouseEnter={() => setTooltip("Acesso")}
            onMouseLeave={() => setTooltip(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[var(--txt)]"
          >
            <Users size={16} />
          </button>
        )}
        {t.isBase && onClone && (
          <button
            onClick={() => onClone(t.key)}
            onMouseEnter={() => setTooltip("Clonar")}
            onMouseLeave={() => setTooltip(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[var(--txt)]"
          >
            <Copy size={16} />
          </button>
        )}
        {t.isBase && onUpdate && (
          <button
            onClick={() => onUpdate(t.key)}
            onMouseEnter={() => setTooltip("Atualizar clientes")}
            onMouseLeave={() => setTooltip(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(59,130,246,0.10)] hover:text-[#3b82f6]"
          >
            <RefreshCw size={15} />
          </button>
        )}
        <button
          onClick={() => onDuplicate(t.key)}
          onMouseEnter={() => setTooltip("Duplicar")}
          onMouseLeave={() => setTooltip(null)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[var(--txt)]"
        >
          <CopyPlus size={16} />
        </button>
        <button
          onClick={() => onDelete(t.key)}
          onMouseEnter={() => setTooltip("Excluir")}
          onMouseLeave={() => setTooltip(null)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[rgba(212,168,67,0.08)] hover:text-[#ef4444]"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Quick-edit modal */}
      {quickEditOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50"
          style={{ zIndex: 9999 }}
          onClick={() => !qeSaving && setQuickEditOpen(false)}
        >
          <div
            className="w-72 rounded-xl border border-[var(--bdr)] p-4 shadow-2xl"
            style={{ background: "var(--bg2, #ffffff)", opacity: 1, zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-[var(--txt)]">Editar metadados</h3>

            <label className="mb-3 block">
              <span className="text-[11px] text-[var(--txt3)]">Nome</span>
              <input
                autoFocus
                value={qeNome}
                onChange={(e) => setQeNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickEditSave()}
                disabled={qeSaving}
                className="mt-1 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 py-1.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--orange)] disabled:opacity-50"
              />
            </label>

            <label className="mb-3 block">
              <span className="text-[11px] text-[var(--txt3)]">Tipo</span>
              <select
                value={qeFormType}
                onChange={(e) => setQeFormType(e.target.value)}
                disabled={qeSaving}
                className="mt-1 w-full rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--orange)] disabled:opacity-50" style={{ background: "var(--bg2, #ffffff)" }}
              >
                <option value="pacote">Pacote</option>
                <option value="campanha">Campanha</option>
                <option value="cruzeiro">Cruzeiro</option>
                <option value="anoiteceu">Anoiteceu</option>
                <option value="card_whatsapp">Card WhatsApp</option>
                <option value="tv">TV</option>
                <option value="lamina">Lâmina</option>
              </select>
            </label>

            <label className="mb-4 block">
              <span className="text-[11px] text-[var(--txt3)]">Formato</span>
              <select
                value={qeFormat}
                onChange={(e) => setQeFormat(e.target.value)}
                disabled={qeSaving}
                className="mt-1 w-full rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--orange)] disabled:opacity-50" style={{ background: "var(--bg2, #ffffff)" }}
              >
                <option value="stories">Stories 9:16</option>
                <option value="reels">Reels 9:16</option>
                <option value="feed">Feed 4:5</option>
                <option value="tv">TV 16:9</option>
              </select>
            </label>

            {qeError && (
              <p className="mb-2 text-[11px] text-red-400">{qeError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setQuickEditOpen(false)}
                disabled={qeSaving}
                className="flex-1 rounded-lg border border-[var(--bdr)] py-1.5 text-sm text-[var(--txt3)] hover:text-[var(--txt)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickEditSave}
                disabled={qeSaving}
                className="flex-1 rounded-lg bg-[var(--orange)] py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {qeSaving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getTypeColor(formType: string): string {
  const colors: Record<string, string> = {
    pacote: "#3b82f6",
    campanha: "#e05c1a",
    passagem: "#7c3aed",
    cruzeiro: "#0891b2",
    anoiteceu: "#4f46e5",
    card_whatsapp: "#16a34a",
    lamina: "#d97706",
    tv: "#0891b2",
  };
  return colors[formType] || "#64748b";
}

function formatTypeLabel(formType: string): string {
  const labels: Record<string, string> = {
    pacote: "Pacote",
    campanha: "Campanha",
    passagem: "Passagem",
    cruzeiro: "Cruzeiro",
    anoiteceu: "Anoiteceu",
    card_whatsapp: "WhatsApp",
    lamina: "Lâmina",
    tv: "TV",
  };
  return labels[formType] || formType;
}

function formatFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    stories: "Stories 9:16",
    reels: "Reels 9:16",
    feed: "Feed 1:1",
    tv: "TV 16:9",
  };
  return labels[format] || format;
}

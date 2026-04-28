"use client";

import { useRef, useState } from "react";
import { Pencil, Copy, CopyPlus, Trash2, Building2, MapPin, Users } from "lucide-react";

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
}

interface TemplateCardProps {
  template: CanvasTemplate;
  onEdit: (key: string) => void;
  onDuplicate: (key: string) => void;
  onDelete: (key: string) => void;
  onClone?: (key: string) => void;
  onAccess?: (key: string) => void;
  onNameChange: (key: string, nome: string) => void;
  onThumbUpload: (key: string, file: File) => void;
  onThumbCapture: (key: string) => void;
  thumbUploading?: boolean;
}

export function TemplateCard({
  template: t,
  onEdit,
  onDuplicate,
  onDelete,
  onClone,
  onAccess,
  onNameChange,
  onThumbUpload,
  onThumbCapture,
  thumbUploading = false,
}: TemplateCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(t.nome);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

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
              {t.nome || "Sem nome"}
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
              background: getTypeColor(t.formType),
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {formatTypeLabel(t.formType)}
          </span>
          <span
            className="text-[9px] font-medium"
            style={{
              background: t.format === "reels" ? "#f3e8ff" : t.format === "tv" ? "#fef3c7" : "#e2e8f0",
              color: t.format === "reels" ? "#7c3aed" : t.format === "tv" ? "#d97706" : "#475569",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {formatFormatLabel(t.format)}
          </span>
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

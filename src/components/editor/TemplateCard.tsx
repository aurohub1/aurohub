"use client";

import { useRef, useState } from "react";

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
}

interface TemplateCardProps {
  template: CanvasTemplate;
  onEdit: (key: string) => void;
  onDuplicate: (key: string) => void;
  onDelete: (key: string) => void;
  onClone?: (key: string) => void;
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
  onNameChange,
  onThumbUpload,
  onThumbCapture,
  thumbUploading = false,
}: TemplateCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(t.nome);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const handleNameBlur = () => {
    setEditingName(false);
    if (tempName.trim() && tempName !== t.nome) {
      onNameChange(t.key, tempName.trim());
    } else {
      setTempName(t.nome);
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
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
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
          <input
            autoFocus
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameBlur();
              if (e.key === "Escape") {
                setTempName(t.nome);
                setEditingName(false);
              }
            }}
            className="rounded border border-[var(--bdr)] bg-transparent px-2 py-1 text-sm font-medium text-[var(--txt)] outline-none focus:border-[var(--txt)]"
          />
        ) : (
          <h3
            onClick={() => setEditingName(true)}
            className="cursor-text text-sm font-medium text-[var(--txt)] line-clamp-2 hover:text-[var(--txt2)]"
            title="Clique para editar"
          >
            {t.nome || "Sem nome"}
          </h3>
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
            <p>📍 {t.licenseeNome}</p>
            {t.lojaNome && <p>🏪 {t.lojaNome}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-[var(--bdr)] text-[9px]">
        <button
          onClick={() => onEdit(t.key)}
          className="flex-1 py-1 font-medium text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
        >
          ✏️ Editar
        </button>
        {t.isBase && onClone && (
          <button
            onClick={() => onClone(t.key)}
            className="flex-1 py-1 font-medium text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
          >
            📋 Clonar
          </button>
        )}
        <button
          onClick={() => onDuplicate(t.key)}
          className="flex-1 py-1 font-medium text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt)]"
        >
          📑 Duplicar
        </button>
        <button
          onClick={() => onDelete(t.key)}
          className="flex-1 py-1 font-medium text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-red-500"
        >
          🗑️ Excluir
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

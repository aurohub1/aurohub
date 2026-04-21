"use client";

import { useMemo, useState } from "react";
import {
  Package,
  Megaphone,
  Ship,
  Moon,
  LayoutGrid,
  Film,
  Monitor,
  Image as ImageIcon,
  ArrowLeft,
  Lock,
} from "lucide-react";

export type WizardFormType = "pacote" | "campanha" | "cruzeiro" | "anoiteceu" | "quatro_destinos";
export type WizardFormat = "stories" | "feed" | "reels" | "tv";

export interface WizardTemplate {
  key: string;
  id: string;
  nome: string;
  format: WizardFormat;
  formType: string;
  thumbnail?: string | null;
}

interface TypeMeta {
  key: WizardFormType;
  label: string;
  description: string;
  Icon: typeof Package;
  accent: string;
}

const TYPES: TypeMeta[] = [
  { key: "pacote",          label: "Pacote",    description: "Destino, hotel, preço e parcelas", Icon: Package,    accent: "#FF7A1A" },
  { key: "campanha",        label: "Campanha",  description: "Promoções e ofertas relâmpago",    Icon: Megaphone,  accent: "#D4A843" },
  { key: "cruzeiro",        label: "Cruzeiro",  description: "Roteiro marítimo com cabine",      Icon: Ship,       accent: "#3B82F6" },
  { key: "anoiteceu",       label: "Anoiteceu", description: "Lâmina noturna com destaque",      Icon: Moon,       accent: "#8B5CF6" },
  { key: "quatro_destinos", label: "Cards",     description: "Card WhatsApp multi-destino",      Icon: LayoutGrid, accent: "#10B981" },
];

const FORMAT_META: Record<WizardFormat, { label: string; description: string; Icon: typeof Film }> = {
  stories: { label: "Stories", description: "9:16 · 1080×1920", Icon: Film },
  feed:    { label: "Feed",    description: "4:5 · 1080×1350",  Icon: LayoutGrid },
  reels:   { label: "Reels",   description: "9:16 · 1080×1920", Icon: Film },
  tv:      { label: "TV",      description: "16:9 · 1920×1080", Icon: Monitor },
};

const FORMAT_ORDER: WizardFormat[] = ["stories", "feed", "reels", "tv"];

interface Props {
  agencyName?: string;
  templates: WizardTemplate[];
  visibleFormats: WizardFormat[];
  initialType?: WizardFormType;
  initialFormat?: WizardFormat;
  onComplete: (type: WizardFormType, format: WizardFormat) => void;
}

export default function PublicarWizard({
  agencyName,
  templates,
  visibleFormats,
  initialType,
  initialFormat,
  onComplete,
}: Props) {
  const [step, setStep] = useState<1 | 2>(initialType && initialFormat ? 2 : 1);
  const [selectedType, setSelectedType] = useState<WizardFormType | null>(initialType ?? null);
  const [selectedFormat, setSelectedFormat] = useState<WizardFormat | null>(initialFormat ?? null);

  const typesWithTemplate = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) set.add(t.formType);
    return set;
  }, [templates]);

  const formatsForType = useMemo<WizardFormat[]>(() => {
    if (!selectedType) return [];
    const set = new Set<WizardFormat>();
    for (const t of templates) {
      if (t.formType === selectedType && visibleFormats.includes(t.format)) set.add(t.format);
    }
    return FORMAT_ORDER.filter((f) => set.has(f));
  }, [templates, selectedType, visibleFormats]);

  const previewTemplate = useMemo(() => {
    if (!selectedType || !selectedFormat) return null;
    return templates.find((t) => t.formType === selectedType && t.format === selectedFormat) ?? null;
  }, [templates, selectedType, selectedFormat]);

  const typeMeta = useMemo(
    () => (selectedType ? TYPES.find((t) => t.key === selectedType) ?? null : null),
    [selectedType]
  );

  function pickType(t: WizardFormType) {
    setSelectedType(t);
    setSelectedFormat(null);
    setStep(2);
  }

  function confirm() {
    if (!selectedType || !selectedFormat) return;
    onComplete(selectedType, selectedFormat);
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 page-fade">
      {/* Header */}
      <div className="flex flex-col gap-1">
        {agencyName && (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--txt3)]">
            {agencyName}
          </span>
        )}
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] font-bold leading-tight text-[var(--txt)]">
          {step === 1 ? "O que você vai publicar?" : "Qual o formato?"}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
          <span className={step === 1 ? "text-[var(--orange)]" : ""}>1 · Tipo</span>
          <span>›</span>
          <span className={step === 2 ? "text-[var(--orange)]" : ""}>2 · Formato</span>
          <span>›</span>
          <span>3 · Arte</span>
        </div>
      </div>

      {/* Step 1 — Tipo */}
      {step === 1 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {TYPES.map(({ key, label, description, Icon, accent }) => {
            const enabled = typesWithTemplate.has(key);
            return (
              <button
                key={key}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && pickType(key)}
                title={enabled ? "" : "Sem template disponível"}
                className="group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--bg1)",
                  borderColor: "var(--bdr)",
                }}
                onMouseEnter={(e) => {
                  if (!enabled) return;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = accent;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px -12px ${accent}55`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bdr)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-[var(--txt)]">{label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[var(--txt3)]">
                    {description}
                  </div>
                </div>
                {!enabled && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                    <Lock size={9} /> Sem template
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2 — Formato */}
      {step === 2 && typeMeta && (
        <div className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setSelectedFormat(null);
            }}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--txt2)] hover:text-[var(--txt)]"
          >
            <ArrowLeft size={12} /> Trocar tipo
          </button>

          <div
            className="flex items-center gap-3 rounded-xl border p-3"
            style={{ background: "var(--bg1)", borderColor: "var(--bdr)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: `${typeMeta.accent}22`, color: typeMeta.accent }}
            >
              <typeMeta.Icon size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--txt)]">{typeMeta.label}</div>
              <div className="text-[11px] text-[var(--txt3)]">{typeMeta.description}</div>
            </div>
          </div>

          {/* Pills de formato */}
          <div className="flex flex-wrap gap-2">
            {FORMAT_ORDER.map((f) => {
              const allowed = formatsForType.includes(f);
              const active = selectedFormat === f;
              if (!allowed) return null;
              const meta = FORMAT_META[f];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors"
                  style={
                    active
                      ? {
                          borderColor: typeMeta.accent,
                          background: `${typeMeta.accent}18`,
                          color: typeMeta.accent,
                        }
                      : {
                          borderColor: "var(--bdr)",
                          background: "var(--bg1)",
                          color: "var(--txt2)",
                        }
                  }
                >
                  <meta.Icon size={13} strokeWidth={2.2} />
                  {meta.label}
                  <span className="text-[10px] font-normal text-[var(--txt3)]">{meta.description}</span>
                </button>
              );
            })}
            {formatsForType.length === 0 && (
              <div className="text-[12px] text-[var(--txt3)]">
                Nenhum formato disponível para este tipo no seu plano.
              </div>
            )}
          </div>

          {/* Thumbnail preview */}
          {selectedFormat && (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl border p-6"
              style={{ background: "var(--bg1)", borderColor: "var(--bdr)" }}
            >
              <div
                className="relative flex items-center justify-center overflow-hidden rounded-xl border"
                style={{
                  borderColor: "var(--bdr)",
                  background: "var(--bg2)",
                  width: selectedFormat === "tv" ? 240 : 160,
                  height: selectedFormat === "tv" ? 135 : selectedFormat === "feed" ? 200 : 284,
                }}
              >
                {previewTemplate?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewTemplate.thumbnail}
                    alt={previewTemplate.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-1"
                    style={{ color: typeMeta.accent }}
                  >
                    <typeMeta.Icon size={32} strokeWidth={1.6} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--txt3)]">
                      {FORMAT_META[selectedFormat].label}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-[12px] font-bold text-[var(--txt)]">
                  {previewTemplate?.nome || "Template automático"}
                </div>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--txt3)]">
                  <ImageIcon size={10} /> template automático
                </div>
              </div>
            </div>
          )}

          {/* Continuar */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedFormat}
              onClick={confirm}
              className="rounded-full px-6 py-2.5 text-[13px] font-bold uppercase tracking-wider text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--orange)",
                boxShadow: selectedFormat ? "0 6px 18px -6px rgba(255,122,26,0.55)" : "none",
              }}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

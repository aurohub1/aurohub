"use client";

import {
  Package,
  Megaphone,
  Plane,
  Ship,
  Moon,
  LayoutGrid,
  Lock,
} from "lucide-react";

export type PublicarFlowType =
  | "pacote"
  | "campanha"
  | "passagem"
  | "cruzeiro"
  | "anoiteceu"
  | "quatro_destinos";

interface TypeMeta {
  key: PublicarFlowType;
  label: string;
  description: string;
  Icon: typeof Package;
  accent: string;
}

const TYPES: TypeMeta[] = [
  { key: "pacote",          label: "Pacote",    description: "Destino, hotel, preço e parcelas",  Icon: Package,    accent: "#FF7A1A" },
  { key: "campanha",        label: "Campanha",  description: "Promoções e ofertas relâmpago",     Icon: Megaphone,  accent: "#D4A843" },
  { key: "passagem",        label: "Passagem",  description: "Ida e volta com tipo de voo",       Icon: Plane,      accent: "#3B82F6" },
  { key: "cruzeiro",        label: "Cruzeiro",  description: "Roteiro marítimo com cabine",       Icon: Ship,       accent: "#06B6D4" },
  { key: "anoiteceu",       label: "Anoiteceu", description: "Lâmina noturna com destaque",       Icon: Moon,       accent: "#8B5CF6" },
  { key: "quatro_destinos", label: "Cards",     description: "Card multi-destino pro WhatsApp",   Icon: LayoutGrid, accent: "#10B981" },
];

interface Props {
  agencyName?: string;
  availableTypes: Set<PublicarFlowType>;
  onSelectType: (type: PublicarFlowType) => void;
}

export default function PublicarFlow({ agencyName, availableTypes, onSelectType }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 page-fade">
      <div className="flex flex-col gap-1">
        {agencyName && (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--txt3)]">
            {agencyName}
          </span>
        )}
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] font-bold leading-tight text-[var(--txt)]">
          O que você vai publicar?
        </h1>
        <p className="text-[12px] text-[var(--txt3)]">
          Escolha o tipo de arte. Só aparece o que está liberado pra sua agência.
        </p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {TYPES.map(({ key, label, description, Icon, accent }) => {
          const enabled = availableTypes.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onSelectType(key)}
              title={enabled ? "" : "Sem template disponível"}
              className="card-glass group relative flex flex-col items-start gap-3 p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--bdr)" }}
              onMouseEnter={(e) => {
                if (!enabled) return;
                (e.currentTarget as HTMLButtonElement).style.borderColor = accent;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px -12px ${accent}55`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bdr)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
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
    </div>
  );
}

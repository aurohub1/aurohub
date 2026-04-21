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
import type { PublicarFlowType } from "./PublicarFlow";

interface TypeMeta {
  key: PublicarFlowType;
  label: string;
  Icon: typeof Package;
  accent: string;
}

const TYPES: TypeMeta[] = [
  { key: "pacote",          label: "Pacote",    Icon: Package,    accent: "#FF7A1A" },
  { key: "campanha",        label: "Campanha",  Icon: Megaphone,  accent: "#D4A843" },
  { key: "passagem",        label: "Passagem",  Icon: Plane,      accent: "#3B82F6" },
  { key: "cruzeiro",        label: "Cruzeiro",  Icon: Ship,       accent: "#06B6D4" },
  { key: "anoiteceu",       label: "Anoiteceu", Icon: Moon,       accent: "#8B5CF6" },
  { key: "quatro_destinos", label: "Cards",     Icon: LayoutGrid, accent: "#10B981" },
];

interface Props {
  current: PublicarFlowType | string;
  availableTypes: Set<PublicarFlowType>;
  onSelect: (type: PublicarFlowType) => void;
}

export default function TypeTabs({ current, availableTypes, onSelect }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--bdr)] px-3 py-2">
      {TYPES.map(({ key, label, Icon, accent }) => {
        const enabled = availableTypes.has(key);
        const active = current === key;
        return (
          <button
            key={key}
            type="button"
            disabled={!enabled}
            onClick={() => enabled && onSelect(key)}
            title={enabled ? label : "Sem template disponível"}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={
              active
                ? { borderColor: accent, background: `${accent}1A`, color: accent }
                : { borderColor: "var(--bdr)", color: "var(--txt3)", background: "transparent" }
            }
          >
            <Icon size={12} strokeWidth={2.2} />
            {label}
            {!enabled && <Lock size={9} className="ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

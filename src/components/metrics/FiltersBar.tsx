"use client";

import { Formato, Tipo, PeriodoDias, PERIODO_LABEL, FORMATO_LABEL } from "./types";

interface Props {
  periodo: PeriodoDias;
  onPeriodoChange: (p: PeriodoDias) => void;
  formato: Formato | "all";
  onFormatoChange: (f: Formato | "all") => void;
  tipo: Tipo | "all";
  onTipoChange: (t: Tipo | "all") => void;
  extra?: React.ReactNode;
}

function Pill<T extends string | number>({
  options, value, onChange,
}: {
  options: readonly { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map(o => {
        const active = value === o.v;
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              active
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function FiltersBar({
  periodo, onPeriodoChange, formato, onFormatoChange, tipo, onTipoChange, extra,
}: Props) {
  const PERIODOS = [
    { v: 7 as const,  label: PERIODO_LABEL[7]  },
    { v: 30 as const, label: PERIODO_LABEL[30] },
    { v: 90 as const, label: PERIODO_LABEL[90] },
  ];
  const FORMATOS = [
    { v: "all"     as const, label: "Todos"                },
    { v: "stories" as const, label: FORMATO_LABEL.stories  },
    { v: "reels"   as const, label: FORMATO_LABEL.reels    },
    { v: "feed"    as const, label: FORMATO_LABEL.feed     },
    { v: "tv"      as const, label: FORMATO_LABEL.tv       },
  ];
  const TIPOS = [
    { v: "all"       as const, label: "Todos"       },
    { v: "publicado" as const, label: "Publicado"   },
    { v: "download"  as const, label: "Download"    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Pill options={PERIODOS} value={periodo} onChange={onPeriodoChange} />
      <Pill options={FORMATOS} value={formato} onChange={onFormatoChange} />
      <Pill options={TIPOS} value={tipo} onChange={onTipoChange} />
      {extra}
    </div>
  );
}

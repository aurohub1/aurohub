"use client";

interface TemplateFiltersProps {
  filterType: string;
  filterFormat: string;
  onTypeChange: (type: string) => void;
  onFormatChange: (format: string) => void;
}

export function TemplateFilters({
  filterType,
  filterFormat,
  onTypeChange,
  onFormatChange,
}: TemplateFiltersProps) {
  const typeOptions = [
    { k: "", l: "Todos" },
    { k: "pacote", l: "Pacote" },
    { k: "campanha", l: "Campanha" },
    { k: "card_whatsapp", l: "Card WhatsApp" },
    { k: "anoiteceu", l: "Anoiteceu" },
  ];

  const formatOptions = [
    { k: "", l: "Todos" },
    { k: "stories", l: "Stories" },
    { k: "reels", l: "Reels" },
    { k: "feed", l: "Feed" },
    { k: "tv", l: "TV" },
  ];

  const hasFilter = filterType || filterFormat;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--surface)] p-3">
      {/* Tipo */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
          Tipo
        </span>
        {typeOptions.map((f) => (
          <button
            key={f.k || "all-type"}
            onClick={() => onTypeChange(f.k)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filterType === f.k
                ? "border-[var(--orange)] bg-[var(--orange3)] text-[var(--orange)]"
                : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Formato */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
          Formato
        </span>
        {formatOptions.map((f) => (
          <button
            key={f.k || "all-fmt"}
            onClick={() => onFormatChange(f.k)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filterFormat === f.k
                ? "border-[var(--orange)] bg-[var(--orange3)] text-[var(--orange)]"
                : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasFilter && (
        <button
          onClick={() => {
            onTypeChange("");
            onFormatChange("");
          }}
          className="self-start text-[11px] text-[var(--txt3)] hover:text-red-500"
        >
          ✕ Limpar filtros
        </button>
      )}
    </div>
  );
}

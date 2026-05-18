"use client";

/**
 * FormSections — formulários compartilhados para o módulo de publicação.
 *
 * Componentes self-contained (têm seus próprios Section/Field/SearchableSelect) para não
 * depender dos primitivos inline de cada page.tsx do publicar/. Recebem o mesmo contrato
 * de props: `fields` (valores) + `set(k, v)` (mutador). Isso bate com o que a referência
 * em publish-forms.tsx especifica.
 *
 * Consumidores:
 *   - src/app/(gerente)/gerente/publicar/page.tsx
 *   - src/app/(consultor)/consultor/publicar/page.tsx
 *
 * Gatilho funcional: tab/formType === "campanha"|"cruzeiro"|"anoiteceu".
 */

import { useState, useMemo, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase as _sb_for_lamina } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Tag, CreditCard, FileText, Ship } from "lucide-react";
import SugerirLegenda from "./SugerirLegenda";

export { SugerirLegenda };

/* ── Constantes ──────────────────────────────────────── */

// Unificadas (Fase 1 refactor)
export const DESCONTO_OPTS = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];
export const PARCELAS_OPTS = Array.from({ length: 35 }, (_, i) => `${i + 2}x`); // 2x-36x
export const PARCELAS_OPTS_PASSAGEM = Array.from({ length: 23 }, (_, i) => `${i + 2}x`); // 2x-24x
export const VOO_OPTS = ["Voo Direto", "Voo Conexão"];

// Legados (manter compat temporária)
export const DESCONTO_OPTS_FORM = DESCONTO_OPTS;
export const PARCELAS_OPTS_FORM = Array.from({ length: 19 }, (_, i) => `${i + 2}x`); // 2x-20x
export const NAVIOS_DEFAULT = [
  // ═══════════════════════════════════════════════════════
  // Costa Cruises — 9 navios
  // ═══════════════════════════════════════════════════════
  "— COSTA CRUISES —",
  "Costa Diadema",
  "Costa Deliziosa",
  "Costa Fascinosa",
  "Costa Firenze",
  "Costa Fortuna",
  "Costa Luminosa",
  "Costa Magica",
  "Costa Pacifica",
  "Costa Serena",
  // ═══════════════════════════════════════════════════════
  // Disney Cruise Line — 6 navios
  // ═══════════════════════════════════════════════════════
  "— DISNEY —",
  "Disney Dream",
  "Disney Fantasy",
  "Disney Magic",
  "Disney Treasure",
  "Disney Wish",
  "Disney Wonder",
  // ═══════════════════════════════════════════════════════
  // MSC Cruises — 21 navios
  // ═══════════════════════════════════════════════════════
  "— MSC CRUISES —",
  "MSC Armonia",
  "MSC Bellissima",
  "MSC Divina",
  "MSC Fantasia",
  "MSC Grandiosa",
  "MSC Lirica",
  "MSC Magnifica",
  "MSC Meraviglia",
  "MSC Musica",
  "MSC Opera",
  "MSC Orchestra",
  "MSC Poesia",
  "MSC Preziosa",
  "MSC Seascape",
  "MSC Seashore",
  "MSC Seaside",
  "MSC Seaview",
  "MSC Sinfonia",
  "MSC Splendida",
  "MSC Virtuosa",
  "MSC World Europa",
  // ═══════════════════════════════════════════════════════
  // Norwegian Cruise Line — 16 navios
  // ═══════════════════════════════════════════════════════
  "— NORWEGIAN —",
  "Norwegian Bliss",
  "Norwegian Breakaway",
  "Norwegian Dawn",
  "Norwegian Encore",
  "Norwegian Epic",
  "Norwegian Escape",
  "Norwegian Gem",
  "Norwegian Getaway",
  "Norwegian Jade",
  "Norwegian Jewel",
  "Norwegian Joy",
  "Norwegian Pearl",
  "Norwegian Prima",
  "Norwegian Spirit",
  "Norwegian Star",
  "Norwegian Sun",
  // ═══════════════════════════════════════════════════════
  // Oceania Cruises — 7 navios
  // ═══════════════════════════════════════════════════════
  "— OCEANIA —",
  "Oceania Insignia",
  "Oceania Marina",
  "Oceania Nautica",
  "Oceania Regatta",
  "Oceania Riviera",
  "Oceania Sirena",
  "Oceania Vista",
  // ═══════════════════════════════════════════════════════
  // Princess Cruises — 18 navios
  // ═══════════════════════════════════════════════════════
  "— PRINCESS —",
  "Caribbean Princess",
  "Coral Princess",
  "Crown Princess",
  "Diamond Princess",
  "Discovery Princess",
  "Emerald Princess",
  "Enchanted Princess",
  "Golden Princess",
  "Grand Princess",
  "Island Princess",
  "Pacific Princess",
  "Regal Princess",
  "Royal Princess",
  "Ruby Princess",
  "Sapphire Princess",
  "Sky Princess",
  "Star Princess",
  "Sun Princess",
  // ═══════════════════════════════════════════════════════
  // Royal Caribbean — 18 navios
  // ═══════════════════════════════════════════════════════
  "— ROYAL CARIBBEAN —",
  "Adventure of the Seas",
  "Allure of the Seas",
  "Brilliance of the Seas",
  "Enchantment of the Seas",
  "Explorer of the Seas",
  "Grandeur of the Seas",
  "Harmony of the Seas",
  "Icon of the Seas",
  "Jewel of the Seas",
  "Mariner of the Seas",
  "Navigator of the Seas",
  "Oasis of the Seas",
  "Serenade of the Seas",
  "Symphony of the Seas",
  "Utopia of the Seas",
  "Vision of the Seas",
  "Voyager of the Seas",
  "Wonder of the Seas",
  // ═══════════════════════════════════════════════════════
  // Celebrity Cruises — 13 navios
  // ═══════════════════════════════════════════════════════
  "— CELEBRITY —",
  "Celebrity Apex",
  "Celebrity Ascent",
  "Celebrity Beyond",
  "Celebrity Constellation",
  "Celebrity Eclipse",
  "Celebrity Edge",
  "Celebrity Equinox",
  "Celebrity Infinity",
  "Celebrity Millennium",
  "Celebrity Reflection",
  "Celebrity Silhouette",
  "Celebrity Solstice",
  "Celebrity Summit",
];

/* ── Helpers ─────────────────────────────────────────── */

function capitalizarDestino(v: string): string {
  return v.toUpperCase();
}

// Formatação de datas unificada (Fase 3)
function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function calcularNoites(ida: string, volta: string): number {
  if (!ida || !volta) return 0;
  const d1 = new Date(ida);
  const d2 = new Date(volta);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

// Período "DD/MM a DD/MM/AAAA" — unificado de formatPeriodo e formatPeriodo
function formatPeriodo(ida: string, volta: string): string {
  if (!ida || !volta) return "";
  const [yi, mi, di] = ida.split("-");
  const [yv, mv, dv] = volta.split("-");
  if (!yi || !yv) return "";
  const p = (n: string) => n.padStart(2, "0");
  if (yi === yv && mi === mv) return `${p(di)} a ${p(dv)}/${p(mi)}/${yi}`;
  if (yi === yv) return `${p(di)}/${p(mi)} a ${p(dv)}/${p(mv)}/${yi}`;
  return `${p(di)}/${p(mi)}/${yi} a ${p(dv)}/${p(mv)}/${yv}`;
}

const fmtDataCurta = (iso: string) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/** Retorna true se `binds` não foi passado (sem filtro) OU se algum dos keys está no set. */
function hasBind(binds: Set<string> | undefined, ...keys: string[]): boolean {
  if (!binds) return true;
  return keys.some((k) => binds.has(k));
}

/* ── Primitives ──────────────────────────────────────── */

export function Section({
  title, icon, color, children,
}: {
  title: string;
  icon?: ReactNode;
  color?: string;
  children: ReactNode;
}) {
  void color;
  return (
    <div
      className="px-3 py-2 border-b last:border-b-0"
      style={{ borderColor: "var(--bdr)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon && (typeof icon === "string" ? <span className="text-[13px]">{icon}</span> : icon)}
        <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
          {title}
        </h4>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
  asSection = false,
}: {
  label: string;
  children: ReactNode;
  asSection?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={asSection ? "text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]" : "text-[11px] font-700 uppercase tracking-[0.08em] text-[var(--txt3)]"}>
        {label}
      </span>
      {children}
    </label>
  );
}

const INPUT_CLASS =
  "h-[34px] w-full rounded-lg border border-[var(--bdr)] bg-[var(--input-bg)] px-3 text-[13px] text-[var(--txt)] placeholder:text-[var(--txt3)] placeholder:opacity-45 outline-none focus:border-[var(--brand-primary,var(--orange))]";

const SELECT_CLASS =
  "h-[34px] w-full rounded-lg border border-[var(--bdr)] px-3 pr-8 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--brand-primary,var(--orange)] appearance-none";

const SELECT_STYLE = {
  background: "var(--bg2) url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjOEE5QkJGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==') right 12px center/12px no-repeat"
} as const;

/* ── Funções utilitárias de preço ─────────────────────── */

function applyPriceMask(raw: string): {
  formatted: string;
  valorint: string;
  valdec: string;
} {
  const clean = raw.replace(/[^\d.,]/g, '');
  const normalized = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);

  if (!clean || isNaN(num) || num === 0) {
    return { formatted: '', valorint: '', valdec: '' };
  }

  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  return {
    formatted,
    valorint: intPart.toLocaleString('pt-BR'),
    valdec: ',' + String(decPart).padStart(2, '0'),
  };
}

function textoTotalApto(valorFormatado: string): string {
  return valorFormatado
    ? `ou R$ ${valorFormatado} por pessoa apto. duplo.`
    : '';
}

function textoTotalCabine(valorFormatado: string): string {
  return valorFormatado
    ? `ou R$ ${valorFormatado} por pessoa cabine dupla.`
    : '';
}

/* ── SearchableSelect ─────────────────────────────────── */

export function SearchableSelect({
  value, onChange, onBlur, options, placeholder, allowCustom = false, readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) setQ(value ?? '');
  }, [open, value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    // Manter separadores mesmo quando filtrando
    return options.filter((o) => {
      if (o.startsWith("—")) return true; // sempre mostrar separadores
      return o.toLowerCase().includes(needle);
    });
  }, [q, options]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className={INPUT_CLASS}
        value={open ? q : value}
        placeholder={placeholder}
        readOnly={readOnly}
        style={readOnly ? { cursor: 'pointer' } : undefined}
        onClick={() => { if (readOnly) { setOpen(true); setQ(''); } }}
        onFocus={() => { setOpen(true); setQ(value); }}
        onChange={(e) => { setQ(e.target.value); if (allowCustom) onChange(e.target.value); }}
        onBlur={(e) => {
          // Se o foco foi pra dentro do componente (clique em opção), ignora.
          if (ref.current?.contains(e.relatedTarget as Node)) return;
          setOpen(false);
          onBlur?.(allowCustom ? (q || value) : value);
        }}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-auto"
          style={{ background: "var(--bg1)", borderColor: "var(--bdr)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid var(--bdr)" }}
        >
          {filtered.map((opt) => {
            const isSeparator = opt.startsWith("—");
            if (isSeparator) {
              return (
                <div
                  key={opt}
                  className="px-3 py-2 text-[10px] font-bold text-[var(--txt3)] border-b border-[var(--bdr)] bg-[var(--bg2)]"
                  style={{ letterSpacing: "0.5px" }}
                >
                  {opt}
                </div>
              );
            }
            return (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt); setOpen(false); onBlur?.(opt); }}
                className="block w-full px-3 py-1.5 text-left text-[12px] text-[var(--txt)] hover:bg-[var(--bg2)]"
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Shared sections ────────────────────────────────── */

type Fields = Record<string, string | boolean | number | undefined | null>;
type Setter = (k: string, v: string | boolean | number | null) => void;

export function BadgesSection({
  fields, set, formType, feriadoOpts, binds,
}: {
  fields: Fields;
  set: Setter;
  formType: "pacote" | "campanha";
  feriadoOpts?: string[];
  binds?: Set<string>;
}) {
  const toggle = (key: string) => set(key, !fields[key]);
  const Toggle = ({ label, k }: { label: string; k: string }) => {
    const active = !!fields[k];
    return (
      <Field label={label}>
        <button
          type="button"
          onClick={() => toggle(k)}
          className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
          style={{
            background: active ? "var(--brand-primary)" : "var(--bg2)",
            color: active ? "#fff" : "var(--txt2)",
            border: active ? "1px solid rgba(212,168,67,0.6)" : "1px solid rgba(212,168,67,0.4)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {active && <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)",pointerEvents:"none"}}/>}
          <span style={{position:"relative",zIndex:1}}>{active ? "✓ Ativado" : "Desativado"}</span>
        </button>
      </Field>
    );
  };

  const opts = feriadoOpts ?? [""];
  const showAll = hasBind(binds, "allinclusive", "allinclusivo");
  const showUltCh = hasBind(binds, "ultimachamada");
  const showUltLug = hasBind(binds, "ultimoslugares");
  const showOfertas = formType === "pacote" && hasBind(binds, "ofertas");
  const showDesc = hasBind(binds, "numerodesconto", "desconto");
  const showFeriado = hasBind(binds, "feriado");
  const anyContent = showAll || showUltCh || showUltLug || showOfertas || showDesc || showFeriado;
  if (!anyContent) return null;

  return (
    <Section title="Selos" icon={<Tag size={13} />}>
      {showAll && <Toggle label="All Inclusive"   k="allinclusive" />}
      {showUltCh && <Toggle label="Última Chamada"  k="ultimachamada" />}
      {showUltLug && <Toggle label="Últimos Lugares" k="ultimoslugares" />}
      {showOfertas && <Toggle label="Ofertas" k="ofertas" />}

      {showDesc && (
        <Field label="Desconto">
          <div className="flex flex-wrap gap-1">
            {DESCONTO_OPTS_FORM.map((d) => {
              const active = fields.numerodesconto === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("numerodesconto", active ? "" : d)}
                  className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all"
                  style={{
                    background: active ? "var(--brand-primary)" : "var(--bg2)",
                    color: active ? "#fff" : "var(--txt2)",
                    border: active ? "1px solid rgba(212,168,67,0.6)" : "1px solid rgba(212,168,67,0.4)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {active && <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)",pointerEvents:"none"}}/>}
                  <span style={{position:"relative",zIndex:1}}>{d}</span>
                </button>
              );
            })}
          </div>
          {fields.numerodesconto ? (
            <p className="mt-1 text-[10px] text-[var(--txt3)]">
              Badge mostrará: <strong>{String(fields.numerodesconto)}</strong>
            </p>
          ) : null}
        </Field>
      )}

      {showFeriado && (
        <Field label="Feriado">
          <SearchableSelect
            value={(fields.feriado as string) || ""}
            onChange={(v) => set("feriado", v)}
            options={opts}
            placeholder="Selecionar feriado..."
          />
        </Field>
      )}
    </Section>
  );
}

/* ── DestinoField (Fase 3) ──────────────────────────── */

export function DestinoField({
  value, onChange, onBlur, options = [], uppercase = true, allowCustom = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  options?: string[];
  uppercase?: boolean;
  allowCustom?: boolean;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={(v) => onChange(uppercase ? v.toUpperCase() : v)}
      onBlur={(v) => {
        const final = uppercase ? v.toUpperCase() : v;
        onChange(final);
        onBlur?.(final);
      }}
      options={options}
      placeholder="ex. CANCÚN"
      allowCustom={allowCustom}
    />
  );
}

/* ── TipoVooField (Fase 3) ──────────────────────────── */

export function TipoVooField({
  value, onChange, variant = "buttons",
}: {
  value: string;
  onChange: (v: string) => void;
  variant?: "buttons" | "select";
}) {
  const opts = VOO_OPTS;

  if (variant === "select") {
    return (
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={opts}
        placeholder="Selecionar..."
      />
    );
  }

  // Radio buttons variant (PacoteForm style)
  return (
    <div
      className="flex rounded-lg border p-0.5"
      style={{ background: "var(--bg2)", borderColor: "var(--bdr)", gap: "8px", flexWrap: "wrap" }}
    >
      {opts.map((opt) => {
        const fullOpt = opt === "Voo Direto" ? "( Voo Direto )" : "( Voo Conexão )";
        const sel = value === fullOpt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(fullOpt)}
            className="flex-1 font-semibold transition-all"
            style={
              sel
                ? { background: "var(--brand-primary)", color: "#FFFFFF", boxShadow: "0 1px 6px color-mix(in srgb, var(--brand-primary) 40%, transparent)", padding: "6px 16px", fontSize: "11px", borderRadius: "8px" }
                : { background: "transparent", color: "var(--txt3)", padding: "6px 16px", fontSize: "11px", borderRadius: "8px" }
            }
          >
            {fullOpt}
          </button>
        );
      })}
    </div>
  );
}

/* ── ServicosField (Fase 2) ─────────────────────────── */

export function ServicosField({
  servicos, setServicos, set, binds, count = 6, applyDict = false,
}: {
  servicos: string[];
  setServicos: (s: string[]) => void;
  set: Setter;
  binds?: Set<string>;
  count?: number;
  applyDict?: boolean;
}) {
  const showServicos =
    !binds ||
    binds.has("servicoslista") ||
    Array.from({ length: count }, (_, i) => `servico${i + 1}`).some((k) => binds.has(k));

  if (!showServicos) return null;

  // Dicionário de normalização (do PacoteForm)
  function applyServicoDict(v: string): string {
    if (!v) return v;
    const s = v.trim();
    if (/^traslado(\s+(ida\s+e\s+volta|i\/v))?$/i.test(s)) return "Transfer";
    if (/^translado(\s+(ida\s+e\s+volta|i\/v))?$/i.test(s)) return "Transfer";
    if (/^transfer(\s+(ida\s+e\s+volta|i\/v))?$/i.test(s)) return "Transfer";
    if (/^caf[eé]\s+da\s+manh[aã]\s+e\s+(almo[cç]o|jan(tar)?)$/i.test(s)) return "Meia Pensão";
    if (/^meia\s+pens[aã]o$/i.test(s)) return "Meia Pensão";
    if (/^(caf[eé]\s+da\s+manh[aã],?\s+almo[cç]o\s+e\s+jantar|pens[aã]o\s+completa)$/i.test(s)) return "Pensão Completa";
    if (/^caf[eé]\s+da\s+manh[aã]$/i.test(s)) return "Café da Manhã";
    if (/^all\s+inclusive$/i.test(s)) return "All Inclusive";
    if (/^tudo\s+inclu[ií]do$/i.test(s)) return "All Inclusive";
    if (/^almo[cç]o$/i.test(s)) return "Almoço";
    if (/^jantar$/i.test(s)) return "Jantar";
    return s;
  }

  function isAllInclusive(v: string): boolean {
    return /all\s*inclusive|tudo\s*inclu[ií]do/i.test(v || "");
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        if (binds && !binds.has(`servico${i + 1}`) && !binds.has("servicoslista")) return null;
        const val = servicos[i] ?? "";
        return (
          <input
            key={i}
            value={val}
            onChange={(e) => {
              const n = [...servicos];
              n[i] = e.target.value;
              setServicos(n);
            }}
            onBlur={(e) => {
              let v = e.target.value;
              if (applyDict && v !== applyServicoDict(v)) {
                v = applyServicoDict(v);
                const n = [...servicos];
                n[i] = v;
                setServicos(n);
              }
              if (isAllInclusive(v)) set("allinclusive", true);
            }}
            placeholder={`Serviço ${i + 1}`}
            className={INPUT_CLASS}
          />
        );
      })}
    </>
  );
}

/* ── DatasField (Fase 2) ────────────────────────────── */

export function DatasField({
  fields, set, today, binds,
  labels = { ida: "Ida", volta: "Volta" },
  showNoites = true,
  onIdaChange, onVoltaChange,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  binds?: Set<string>;
  labels?: { ida: string; volta: string };
  showNoites?: boolean;
  onIdaChange?: (v: string) => void;
  onVoltaChange?: (v: string) => void;
}) {
  const showIda = hasBind(binds, "dataida", "dataperiodo");
  const showVolta = hasBind(binds, "datavolta", "dataperiodo");
  const noites = calcularNoites(
    (fields.dataida as string) || "",
    (fields.datavolta as string) || ""
  );

  if (!showIda && !showVolta) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {showIda && (
        <Field label={`${labels.ida} *`}>
          <input
            type="date"
            min={today}
            value={(fields.dataida as string) || ""}
            onChange={(e) => {
              onIdaChange ? onIdaChange(e.target.value) : set("dataida", e.target.value);
            }}
            className={INPUT_CLASS}
          />
        </Field>
      )}
      {showVolta && (
        <Field label={`${labels.volta} *`}>
          <input
            type="date"
            min={(fields.dataida as string) || today}
            value={(fields.datavolta as string) || ""}
            onChange={(e) => {
              onVoltaChange ? onVoltaChange(e.target.value) : set("datavolta", e.target.value);
            }}
            className={INPUT_CLASS}
          />
        </Field>
      )}
      {showNoites && noites > 0 && (
        <div className="col-span-2">
          <p className="text-[11px] text-[var(--txt3)]">
            🗓️ {noites} noite{noites === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── LegendaPostSection (Fase 1) ───────────────────── */

export function LegendaPostSection({
  fields, set, formato, nomeLoja, tipoArte, destino,
}: {
  fields: Fields;
  set: Setter;
  formato?: string;
  nomeLoja?: string;
  tipoArte: "pacote" | "campanha" | "cruzeiro";
  destino: string;
}) {
  if (formato !== "feed" && formato !== "reels") return null;

  return (
    <Section title="Legenda do Post" icon={<FileText size={13} />}>
      <Field label="Legenda (opcional)" asSection>
        <div className="flex flex-col gap-2">
          <textarea
            value={(fields.legenda_post as string) || ""}
            onChange={(e) => set("legenda_post", e.target.value)}
            placeholder="Escreva a legenda do post aqui..."
            className={`${INPUT_CLASS} h-auto resize-none py-2`}
            rows={4}
          />
          {destino?.trim() && formato && (
            <SugerirLegenda
              destino={destino}
              tipoArte={tipoArte}
              formato={formato}
              nomeLoja={nomeLoja}
              onSelect={(legenda) => set("legenda_post", legenda)}
            />
          )}
        </div>
      </Field>
    </Section>
  );
}

export function PagamentoSection({
  fields, set, totalLabel, binds,
}: {
  fields: Fields;
  set: Setter;
  totalLabel: string;
  binds?: Set<string>;
}) {
  const formas: { value: string; label: string }[] = [
    { value: "cartao",  label: "Cartão s/ Juros" },
    { value: "entrada", label: "Boleto c/ Entrada" },
  ];

  const showForma = hasBind(binds, "formapagamento");
  const showEntrada = fields.formapagamento === "entrada";
  const showParcelas = hasBind(binds, "parcelas");
  const showValorParc = hasBind(binds, "valorparcela");
  const showTotal = hasBind(binds, "valortotal", "totalduplo");
  if (!showForma && !showEntrada && !showParcelas && !showValorParc && !showTotal) return null;

  return (
    <Section title="Pagamento" icon={<CreditCard size={13} />}>
      {showForma && (
        <Field label="Forma de Pagamento *">
          <div className="flex flex-wrap gap-1">
            {formas.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("formapagamento", opt.value)}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
                style={
                  fields.formapagamento === opt.value
                    ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                    : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          {fields.formapagamento ? (
            <p className="mt-1 text-[10px] text-[var(--txt3)]">
              Arte mostrará:{" "}
              <strong>
                {fields.formapagamento === "cartao"
                  ? "No Cartão de Crédito Sem Juros"
                  : fields.formapagamento === "entrada"
                    ? `Entrada de R$ ${fields.entrada || "___"} +`
                    : "No Débito"}
              </strong>
            </p>
          ) : null}
        </Field>
      )}

      {showEntrada && (
        <Field label="Valor Entrada (R$) *">
          <input
            type="text"
            value={(fields.entrada as string) || ""}
            onChange={(e) => set("entrada", e.target.value)}
            onBlur={(e) => {
              const f = applyPriceMask(e.target.value);
              set("entrada", f.formatted || e.target.value);
            }}
            placeholder="ex. 1.200,00"
            className={INPUT_CLASS}
          />
        </Field>
      )}

      {(showParcelas || showValorParc) && (
        <div style={{ display: "flex", gap: "8px" }}>
          {showParcelas && (
            <div style={{ flex: "0 0 40%" }}>
              <Field label="Parcelas *">
                <SearchableSelect
                  value={(fields.parcelas as string) || ""}
                  onChange={(v) => set("parcelas", v)}
                  options={PARCELAS_OPTS_FORM}
                  placeholder="Selecionar..."
                  readOnly
                />
              </Field>
            </div>
          )}
          {showValorParc && (
            <div style={{ flex: 1 }}>
              <Field label="Valor da Parcela *">
                <input
                  type="text"
                  value={(fields.valorparcela as string) || ""}
                  onChange={(e) => set("valorparcela", e.target.value)}
                  onBlur={(e) => {
                    const f = applyPriceMask(e.target.value);
                    set("valorparcela", f.formatted || e.target.value);
                    set("valorint", f.valorint);
                    set("valdec", f.valdec);
                  }}
                  placeholder="ex. 890,00"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {showTotal && (
        <Field label={`Valor Total (R$) — ${totalLabel}`}>
          <input
            type="text"
            value={(fields.valortotal as string) || ""}
            onChange={(e) => set("valortotal", e.target.value)}
            onBlur={(e) => {
              const f = applyPriceMask(e.target.value);
              set("valortotal", f.formatted || e.target.value);
              set("totalduplo", f.formatted || e.target.value);
              set("valor_total_texto", textoTotalApto(f.formatted));
            }}
            placeholder="ex. 8.900,00"
            className={INPUT_CLASS}
          />
          {fields.valortotal ? (
            <p className="mt-1 text-[10px] text-[var(--txt3)]">
              Arte mostrará: <strong>ou R$ {String(fields.valortotal)} {totalLabel}</strong>
            </p>
          ) : null}
        </Field>
      )}
    </Section>
  );
}

/* ── PacoteForm (port V1 _fPacote + _fGrpPreco) ───────────
 * Binds específicos do Pacote — destino, saida, tipovoo, dataida/datavolta,
 * dataperiodo (derivado), feriado, hotel, servico1..6, servicoslista (derivado),
 * allinclusive/ultimachamada/ultimoslugares/ofertas, formapagamento, entrada,
 * parcelas, valorparcela, valorint/valdec (derivados), numerodesconto,
 * valortotal, valortotalfmt/totalduplo (derivados). Não toca PagamentoSection
 * compartilhado — mantém os valores V1 exatos ("Cartão de Crédito" / "Boleto"). */

// "12345678" (cents) → "123.456,78"
function pacoteFormatReal(raw: string): string {
  const nums = (raw || "").replace(/\D/g, "");
  if (!nums) return "";
  const n = parseInt(nums, 10);
  return Math.floor(n / 100).toLocaleString("pt-BR") + "," + String(n % 100).padStart(2, "0");
}

// Valores spec ("cartao"/"entrada") — useFormAdapter traduz p/ legacy "Cartão de Crédito"/"Boleto" no write
// e legacy → spec no read, consistente com PagamentoSection compartilhado.
const PACOTE_FORMA_PGTO_OPTS: { value: string; label: string }[] = [
  { value: "cartao",  label: "Cartão de Crédito" },
  { value: "entrada", label: "Boleto" },
];

export function PacoteForm({
  fields, set, servicos, setServicos,
  today, feriadoOpts,
  loadDestinos, loadHoteis,
  onImgFundo,
  onHotelBlur,
  binds,
  formato,
  nomeLoja,
}: {
  fields: Fields;
  set: Setter;
  servicos: string[];
  setServicos: (s: string[]) => void;
  today: string;
  feriadoOpts?: string[];
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
  /** Callback pra atualizar imgfundo — chamado no blur de destino e hotel. */
  onImgFundo?: (url: string) => void;
  /** Callback opcional no blur do hotel — a page pode rodar fetchImgHotel + fallback. */
  onHotelBlur?: (hotel: string) => void;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
}) {
  const [destinoOpts, setDestinoOpts] = useState<string[]>([]);
  const [hotelOpts, setHotelOpts] = useState<string[]>([]);
  useEffect(() => {
    loadDestinos?.().then(setDestinoOpts).catch(() => {});
    loadHoteis?.().then(setHotelOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca imgfundo aleatório: match ILIKE por destino, fallback any. Cancela fetch
  // anterior via token — se o usuário troca destino rápido, só o último commit vence.
  const fetchTokenRef = useRef(0);
  async function fetchImgFundo(needle: string) {
    if (!onImgFundo) return;
    const token = ++fetchTokenRef.current;
    try {
      let url: string | null = null;
      if (needle.trim()) {
        const { data } = await _sb_for_lamina
          .from("imgfundo")
          .select("url")
          .ilike("nome", `%${needle.trim()}%`)
          .limit(50);
        if (token !== fetchTokenRef.current) return; // stale
        const rows = (data ?? []) as { url: string }[];
        if (rows.length) url = rows[Math.floor(Math.random() * rows.length)].url;
      }
      if (!url) {
        const { data } = await _sb_for_lamina.from("imgfundo").select("url").limit(500);
        if (token !== fetchTokenRef.current) return; // stale
        const rows = (data ?? []) as { url: string }[];
        if (rows.length) url = rows[Math.floor(Math.random() * rows.length)].url;
      }
      if (url) onImgFundo(url);
    } catch { /* silent — RLS ou tabela ausente */ }
  }

  // ── Handlers com cálculos derivados ─────────────────
  const onIdaChange = (v: string) => {
    set("dataida", v);
    const volta = (fields.datavolta as string) || "";
    set("dataperiodo", volta ? formatPeriodo(v, volta) : "");
    const n = calcularNoites(v, volta);
    set("noites", n > 0 ? String(n) : "");
  };
  const onVoltaChange = (v: string) => {
    set("datavolta", v);
    const ida = (fields.dataida as string) || "";
    set("dataperiodo", ida ? formatPeriodo(ida, v) : "");
    const n = calcularNoites(ida, v);
    set("noites", n > 0 ? String(n) : "");
  };
  const onValorParcelaChange = (raw: string) => {
    const f = applyPriceMask(raw);
    set("valorparcela", f.formatted);
    set("valorint", f.valorint);
    set("valdec", f.valdec);
    // Prefixados
    set("pct_valorparcela", f.formatted);
    set("pct_valorint", f.valorint);
    set("pct_valdec", f.valdec);
  };
  const onValorTotalChange = (raw: string) => {
    const f = applyPriceMask(raw);
    set("valortotal", f.formatted);
    set("totalduplo", f.formatted); // compat com PreviewStage.resolveBindParam("valortotalfmt")
    set("valortotalfmt", textoTotalApto(f.formatted));
    set("valor_total_texto", textoTotalApto(f.formatted));
    // Prefixados
    set("pct_valortotal", f.formatted);
    set("pct_totalduplo", f.formatted);
    set("pct_valortotalfmt", textoTotalApto(f.formatted));
    set("pct_valor_total_texto", textoTotalApto(f.formatted));
  };
  const onEntradaChange = (raw: string) => {
    const f = applyPriceMask(raw);
    set("entrada", f.formatted);
    set("pct_entrada", f.formatted); // Prefixado
  };

  function updateServicos(n: string[]) {
    setServicos(n);
    for (let i = 0; i < 6; i++) set(`servico${i + 1}`, n[i] || "");
    set("servicoslista", n.filter(Boolean).map((s) => `• ${s}`).join("\n"));
  }

  // ── Visibilidade por binds do template ─────────────
  const showDestino = hasBind(binds, "destino");
  const showSaida = hasBind(binds, "saida");
  const showTipovoo = hasBind(binds, "tipovoo");
  const showIda = hasBind(binds, "dataida", "dataperiodo");
  const showVolta = hasBind(binds, "datavolta", "dataperiodo");
  const showHotel = hasBind(binds, "hotel", "imghotel");
  const showServicos =
    !binds ||
    binds.has("servicoslista") ||
    [1, 2, 3, 4, 5, 6].some((i) => binds.has(`servico${i}`));
  const showAllInc = hasBind(binds, "allinclusive", "all_inclusive_badge");
  const showUltCh = hasBind(binds, "ultimachamada", "ultima_chamada_badge");
  const showUltLug = hasBind(binds, "ultimoslugares", "ultimos_lugares_badge");
  const showOfertas = hasBind(binds, "ofertas", "ofertas_azul_badge");
  const showBadges = showAllInc || showUltCh || showUltLug || showOfertas;
  const showForma = hasBind(binds, "formapagamento");
  const showEntrada = fields.formapagamento === "entrada";
  const showParcelas = hasBind(binds, "parcelas");
  const showValorParc = hasBind(binds, "valorparcela", "valorint", "valdec");
  const showDesconto = hasBind(binds, "numerodesconto", "desconto");
  const showValorTotal = hasBind(binds, "valortotal", "valortotalfmt", "totalduplo");
  const showPgtoBlock = showForma || showEntrada || showParcelas || showValorParc || showDesconto || showValorTotal;
  const feriadosNormalizados = [...new Set(
    (feriadoOpts ?? []).map(f => f.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
  )].sort();

  return (
    <div className="flex flex-col gap-2">
      {(showDestino || showSaida || showTipovoo) && (
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--bdr)" }}>
          {showDestino && (
            <Field label="Destino *" asSection>
              <SearchableSelect
                value={(fields.destino as string) || ""}
                onChange={(v) => set("destino", v.toUpperCase())}
                onBlur={(v) => {
                  const up = v.toUpperCase();
                  if (up.trim()) onImgFundo?.(up);
                }}
                options={destinoOpts}
                placeholder="ex. CANCÚN"
                allowCustom
              />
            </Field>
          )}
          {(showSaida || showTipovoo) && (
            <div className="flex flex-col gap-2">
              {showSaida && (
                <div style={{ marginTop: "12px" }}>
                  <Field label="Saída *" asSection>
                    <input
                      value={(fields.saida as string) || ""}
                      onChange={(e) => set("saida", e.target.value)}
                      placeholder="ex. GRU"
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}
              {showTipovoo && (
                <Field label="Tipo de Voo *" asSection>
                  <div className="flex gap-1">
                    {["( Voo Direto )", "( Voo Conexão )"].map((opt) => {
                      const sel = fields.tipovoo === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set("tipovoo", opt)}
                          className="flex-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold transition-all"
                          style={
                            sel
                              ? { background: "var(--brand-primary)", color: "#fff", borderColor: "var(--brand-primary)" }
                              : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                          }
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      <Section title="Datas">
        {(showIda || showVolta) && (
          <div className="grid grid-cols-2 gap-2">
            {showIda && (
              <Field label="Ida *">
                <input
                  type="date"
                  min={today}
                  value={(fields.dataida as string) || ""}
                  onChange={(e) => onIdaChange(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            {showVolta && (
              <Field label="Volta *">
                <input
                  type="date"
                  min={(fields.dataida as string) || today}
                  value={(fields.datavolta as string) || ""}
                  onChange={(e) => onVoltaChange(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
        )}
        {fields.dataperiodo ? (
          <p className="text-[11px] text-[var(--txt3)]">
            Período: <strong>{String(fields.dataperiodo)}</strong>
            {fields.noites ? <> · <strong>{String(fields.noites)} noite{Number(fields.noites) === 1 ? "" : "s"}</strong></> : null}
          </p>
        ) : null}
        <Field label="Feriado">
          <SearchableSelect
            value={(fields.feriado as string) || ""}
            onChange={(v) => set("feriado", v === "– nenhum –" ? "" : v)}
            options={["– nenhum –", ...feriadosNormalizados]}
            placeholder="– nenhum –"
            readOnly
          />
        </Field>
      </Section>

      {showHotel && (
        <div className="px-3 py-2 border-b last:border-b-0" style={{ borderColor: "var(--bdr)" }}>
          <Field label="Hotel *" asSection>
            {/* Hotel só grava hotel — imghotel é bindParam separado que fica com page-level logic. */}
            <SearchableSelect
              value={(fields.hotel as string) || ""}
              onChange={(v) => set("hotel", v)}
              onBlur={(v) => { if (v.trim()) onHotelBlur?.(v); }}
              options={hotelOpts}
              placeholder="Nome do hotel"
              allowCustom
            />
          </Field>
        </div>
      )}

      {(hasBind(binds, "servicoslista") || [1,2,3,4,5,6].some(i => hasBind(binds, `servico${i}`))) && (
        <Section title="Serviços Inclusos">
          <ServicosField
            servicos={servicos}
            setServicos={updateServicos}
            set={set}
            binds={binds}
            count={6}
            applyDict={true}
          />
        </Section>
      )}

      {showBadges && (
        <Section title="Selos & Destaques" icon={<Tag size={13} />}>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "allinclusive",    label: "All Inclusive",    show: showAllInc  },
              { key: "ultimachamada",   label: "Última Chamada",   show: showUltCh   },
              { key: "ultimoslugares",  label: "Últimos Lugares",  show: showUltLug  },
              { key: "ofertas",         label: "Ofertas Azul",     show: showOfertas },
            ].filter((b) => b.show).map((b) => {
              const on = !!fields[b.key];
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => set(b.key, !on)}
                  className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
                  style={{
                    background: on ? "var(--brand-primary)" : "var(--bg2)",
                    color: on ? "#fff" : "var(--txt2)",
                    border: on ? "1px solid rgba(212,168,67,0.6)" : "1px solid rgba(212,168,67,0.4)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {on && <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)",pointerEvents:"none"}}/>}
                  <span style={{position:"relative",zIndex:1}}>{on ? "✓ " : ""}{b.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {showPgtoBlock && (
        <Section title="Pagamento" icon={<CreditCard size={13} />}>
          {showForma && (
            <Field label="Forma de Pagamento *">
              <div className="flex gap-1">
                {PACOTE_FORMA_PGTO_OPTS.map((opt) => {
                  const sel = fields.formapagamento === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        set("formapagamento", opt.value);
                        set("pct_formapagamento", opt.value); // Prefixado
                      }}
                      className="flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all"
                      style={
                        sel
                          ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                          : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          {showEntrada && (
            <Field label="Valor da Entrada (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={(fields.entrada as string) || ""}
                onChange={(e) => set("entrada", e.target.value)}
                onBlur={(e) => {
                  const f = applyPriceMask(e.target.value);
                  set("entrada", f.formatted || e.target.value);
                }}
                placeholder="ex. 1.500,00"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {(showParcelas || showValorParc) && (
            <div style={{ display: "flex", gap: "8px" }}>
              {showParcelas && (
                <div style={{ flex: "0 0 40%" }}>
                  <Field label="Parcelas *">
                    <SearchableSelect
                      value={(fields.parcelas as string) || ""}
                      onChange={(v) => {
                        set("parcelas", v);
                        set("pct_parcelas", v); // Prefixado
                      }}
                      options={PARCELAS_OPTS}
                      placeholder="Selecione..."
                      readOnly
                    />
                  </Field>
                </div>
              )}
              {showValorParc && (
                <div style={{ flex: 1 }}>
                  <Field label="Valor da Parcela">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={(fields.valorparcela as string) || ""}
                      onChange={(e) => set("valorparcela", e.target.value)}
                      onBlur={(e) => {
                        const f = applyPriceMask(e.target.value);
                        set("valorparcela", f.formatted || e.target.value);
                        set("valorint", f.valorint);
                        set("valdec", f.valdec);
                      }}
                      placeholder="ex. 890,00"
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
          {showDesconto && (
            <Field label="% Desconto">
              <SearchableSelect
                value={(fields.numerodesconto as string) || ""}
                onChange={(v) => set("numerodesconto", v)}
                options={["10","15","20","25","30","40","50"]}
                placeholder="Selecione"
                readOnly
              />
            </Field>
          )}
          {showValorTotal && (
            <Field label="Valor Total (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={(fields.valortotal as string) || ""}
                onChange={(e) => set("valortotal", e.target.value)}
                onBlur={(e) => {
                  const f = applyPriceMask(e.target.value);
                  set("valortotal", f.formatted || e.target.value);
                  set("totalduplo", f.formatted || e.target.value);
                  set("valortotalfmt", textoTotalApto(f.formatted));
                  set("valor_total_texto", textoTotalApto(f.formatted));
                }}
                placeholder="ex. 8.900,00"
                className={INPUT_CLASS}
              />
              {fields.valortotalfmt ? (
                <p className="mt-1 text-[10px] text-[var(--txt3)]">
                  Arte: <strong>{String(fields.valortotalfmt)}</strong>
                </p>
              ) : null}
            </Field>
          )}
        </Section>
      )}

      <LegendaPostSection
        fields={fields}
        set={set}
        formato={formato}
        nomeLoja={nomeLoja}
        tipoArte="pacote"
        destino={(fields.destino as string) || ""}
      />
    </div>
  );
}

/* ── CampanhaForm ───────────────────────────────────── */

export function CampanhaForm({
  fields, set, servicos, setServicos, today, feriadoOpts, loadHoteis, binds, formato, nomeLoja,
}: {
  fields: Fields;
  set: Setter;
  servicos: string[];
  setServicos: (s: string[]) => void;
  today: string;
  feriadoOpts?: string[];
  loadHoteis?: () => Promise<string[]>;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
}) {
  const [hotelOpts, setHotelOpts] = useState<string[]>([]);
  useEffect(() => {
    loadHoteis?.().then(setHotelOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showDestino = hasBind(binds, "destino");
  const showSaida = hasBind(binds, "saida");
  const showTipovoo = hasBind(binds, "tipovoo");
  const showIda = hasBind(binds, "dataida");
  const showVolta = hasBind(binds, "datavolta");
  const showHotel = hasBind(binds, "hotel", "imghotel");
  const showTipoHospedagem = showHotel || hasBind(binds, "tipohospedagem");
  // Serviços — mostra se qualquer servico1..N estiver presente (sem binds = todos).
  const showServicos = !binds || Array.from({ length: 8 }, (_, i) => `servico${i + 1}`).some((k) => binds.has(k));
  const feriadosNormalizados = [...new Set(
    (feriadoOpts ?? []).map(f => f.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
  )].sort();

  return (
    <>
      {(showDestino || showSaida || showTipovoo) && (
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--bdr)" }}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[13px]">✈️</span>
          </div>
          {showDestino && (
            <Field label="Destino *" asSection>
              <input
                value={(fields.destino as string) || ""}
                onChange={(e) => set("destino", capitalizarDestino(e.target.value))}
                onBlur={(e) => set("destino", e.target.value.toUpperCase())}
                placeholder="ex. CANCÚN"
                className={`${INPUT_CLASS} uppercase`}
              />
            </Field>
          )}
          {(showSaida || showTipovoo) && (
            <div className="flex flex-col gap-2">
              {showSaida && (
                <div style={{ marginTop: "12px" }}>
                  <Field label="Saída *" asSection>
                    <SearchableSelect
                      value={(fields.saida as string) || ""}
                      onChange={(v) => set("saida", v)}
                      options={["GRU", "CGH", "VCP", "BSB", "GIG", "SDU", "SSA", "FOR", "REC", "CWB", "POA", "FLN"]}
                      placeholder="Aeroporto..."
                      allowCustom
                    />
                  </Field>
                </div>
              )}
              {showTipovoo && (
                <Field label="Tipo de Voo *" asSection>
                  <SearchableSelect
                    value={(fields.tipovoo as string) || ""}
                    onChange={(v) => set("tipovoo", v)}
                    options={["Voo Direto", "Voo com Conexão"]}
                    placeholder="Selecionar..."
                  />
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      <Section title="Datas" icon="📅">
        {(hasBind(binds, "dataida") || hasBind(binds, "datavolta")) && (
          <DatasField
            fields={fields}
            set={set}
            today={today}
            binds={binds}
            onIdaChange={(v) => {
              set("dataida", v);
              set("dataida_fmt", fmtDate(v));
            }}
            onVoltaChange={(v) => {
              set("datavolta", v);
              set("datavolta_fmt", fmtDate(v));
            }}
          />
        )}
        <Field label="Feriado">
          <SearchableSelect
            value={(fields.feriado as string) || ""}
            onChange={(v) => set("feriado", v === "– nenhum –" ? "" : v)}
            options={["– nenhum –", ...feriadosNormalizados]}
            placeholder="– nenhum –"
            readOnly
          />
        </Field>
      </Section>

      {showTipoHospedagem && (
        <div className="px-3 py-2 border-b last:border-b-0" style={{ borderColor: "var(--bdr)" }}>
          <Field label="Tipo de Hospedagem *" asSection>
            <SearchableSelect
              value={(fields.tipohospedagem as string) || "Hotel:"}
              onChange={(v) => set("tipohospedagem", v)}
              options={["Hotel:", "Pousada:", "Resort:", "Apart-hotel:", "Flat:", "Chalé:", "Hostel:", "Fazenda:", "Lodge:"]}
              placeholder="Hotel:"
              allowCustom
            />
          </Field>
        </div>
      )}

      {showHotel && (
        <div className="px-3 py-2 border-b last:border-b-0" style={{ borderColor: "var(--bdr)" }}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[13px]">🏨</span>
          </div>
          <Field label="Hotel *" asSection>
            <SearchableSelect
              value={(fields.hotel as string) || ""}
              onChange={(v) => set("hotel", v)}
              options={hotelOpts}
              placeholder="Nome do hotel"
              allowCustom
            />
          </Field>
        </div>
      )}

      {showServicos && (
        <Section title="Serviços Inclusos" icon="🎒">
          <ServicosField
            servicos={servicos}
            setServicos={setServicos}
            set={set}
            binds={binds}
            count={8}
            applyDict={false}
          />
        </Section>
      )}

      <BadgesSection fields={fields} set={set} formType="campanha" feriadoOpts={feriadoOpts} binds={binds} />
      <PagamentoSection fields={fields} set={set} totalLabel="por pessoa apto. duplo" binds={binds} />

      <LegendaPostSection
        fields={fields}
        set={set}
        formato={formato}
        nomeLoja={nomeLoja}
        tipoArte="campanha"
        destino={(fields.destino as string) || "Campanha"}
      />
    </>
  );
}

/* ── CruzeiroForm ───────────────────────────────────── */

// Mapa de imagens de navios (URLs do Cloudinary)
const NAVIOS_IMAGENS: Record<string, string[]> = {
  'COSTA DELICIOZA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750765/costa_delicioza1_mgyc19.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750765/costa_deliziosa_vfs70t.png'],
  'COSTA DIADEMA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750765/costa_diadema_adxsj1.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750766/costa_didadema_bxgazw.png'],
  'COSTA FASCINOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750770/costa_fascinosa_yascek.png'],
  'COSTA FAVOLOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750771/costa_favolosa_2_sed3lb.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750771/costa_favolosa_luecz4.png'],
  'COSTA FORTUNA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750771/costa_fortuna_v5c7ql.png'],
  'COSTA PACIFICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750775/costa_pacifica_ipb6tb.png'],
  'COSTA SERENA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750776/costa_serena_jhtijo.png'],
  'COSTA SMERALDA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750777/costa_smeralda_bnimi3.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750780/costa_smeralda1_eg9c15.png'],
  'COSTA TOSCANA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750780/costa_toscana_pf6qev.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750781/costa_toscana1_djko2y.png'],
  'COSTA VENEZIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750784/costa_venezia_m3tlww.png'],
  'COSTA FIRENZE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487783/costa_firenze_u2qoxf.png'],
  'COSTA LUMINOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487783/Costa_Luminosa_cm6zol.png'],
  'COSTA MAGICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487777/Costa_Magica_gpdus4.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487772/Costa_Magica_2_g10xjs.png'],
  'DISNEY ADVENTURE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750785/disney_adventure_uidfkw.png'],
  'DISNEY DREAM': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750793/disney_dream_pmzq8r.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750793/disney_dream11_u8b4wz.png'],
  'DISNEY FANTASY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750798/disney_fantasy1_dssyvk.png'],
  'DISNEY MAGIC': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750799/disney_magic_vsuhhw.png'],
  'DISNEY TREASURE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750800/disney_treadure34_kpbbfm.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750802/disney_treasure_zajhpl.png'],
  'DISNEY WISH': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750804/disney_wish_mzftq9.png'],
  'DISNEY WONDER': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750805/disney_wonder_pju13s.png'],
  'MSC ARMONIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750832/mscarmonia_bef1zv.png'],
  'MSC BELLISSIMA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750817/msc_belissima_kqy4bn.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750818/msc_belissima1_ap0dok.png'],
  'MSC DIVINA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750818/msc_divina_a1fjf2.png'],
  'MSC EURIBIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750819/msc_euribia_u4aqfk.png'],
  'MSC FANTASIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750819/msc_fantasia_zm8zbp.png'],
  'MSC GRANDIOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750820/msc_grandiosa_maun7t.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750820/msc_grandiosa1_jiwqhu.png'],
  'MSC LIRICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750821/msc_lirica_1_xnwvwx.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750822/msc_lirica_2_bvlqkn.png'],
  'MSC MAGNIFICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750823/msc_magnifica_i5cssz.png'],
  'MSC MERAVIGLIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750823/msc_meraviglia_hsf4qn.png'],
  'MSC MUSICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750823/msc_musica11_gvf1vf.png'],
  'MSC OPERA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750824/msc_opera_hqijth.png'],
  'MSC ORCHESTRA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750824/msc_orchestra_gg6ak5.png'],
  'MSC POESIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750825/msc_poesia_kldjnp.png'],
  'MSC PREZIOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750825/msc_preciosa_2_kguvwk.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750826/msc_preciosa_znxixl.png'],
  'MSC SEASCAPE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750827/msc_seascape_ktrdwh.png'],
  'MSC SEASHORE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750827/msc_seashore_uhhjsy.png'],
  'MSC SEASIDE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750828/msc_seaside_hodp84.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750828/msc_seaside_2_qpc3yp.png'],
  'MSC SEAVIEW': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750828/msc_seaview_2_kwvpgu.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750829/msc_seaview_ekacm5.png'],
  'MSC SINFONIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750829/msc_sinfonia_tnzrua.png'],
  'MSC SPLENDIDA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750830/msc_splendida_odittb.png'],
  'MSC VIRTUOSA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750831/msc_virtuosa_xmfjs4.png'],
  'MSC WORLD AMERICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750831/msc_world_america_taiav7.png'],
  'MSC WORLD EUROPA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750832/msc_world_of_europa_mfsjfq.png'],
  'NORWEGIAN AQUA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750832/norwegian_aqua_2_gtudqi.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750833/norwegian_aqua_n6wlod.png'],
  'NORWEGIAN BLISS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750833/NORWEGIAN_BLISS_gyostg.png'],
  'NORWEGIAN BREAKAWAY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750834/NORWEGIAN_BREAKAWAY_dtb99u.png'],
  'NORWEGIAN DAWN': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750835/NORWEGIAN_DAWN_j65a6t.png'],
  'NORWEGIAN ENCORE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750836/NORWEGIAN_ENCORE1_anaozz.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750837/NORWEGIAN_ENCORE2_elm4ic.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750837/NORWEGIAN_ENCORE3_jfuszp.png'],
  'NORWEGIAN ESCAPE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750838/NORWEGIAN_ESCAPE_tgnhkg.png'],
  'NORWEGIAN GEM': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750839/NORWEGIAN_GEM_rhewip.png'],
  'NORWEGIAN GETAWAY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750840/NORWEGIAN_GETAWAY1_rl7hoh.png'],
  'NORWEGIAN JOY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750841/NORWEGIAN_JOY1_pah8dg.png'],
  'NORWEGIAN PEARL': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750843/Norwegian_Pearl1_ga3vsh.png'],
  'NORWEGIAN SKY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750843/NORWEGIAN_SKY_ezvqe9.png'],
  'NORWEGIAN SPIRIT': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750843/NORWEGIAN_SPIRIT1_yrl0va.png'],
  'NORWEGIAN STAR': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750846/NORWEGIAN_STAR1_mkamfq.png'],
  'NORWEGIAN SUN': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750845/NORWEGIAN_SUN1_uxsvri.png'],
  'NORWEGIAN VIVA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750846/norwegian_viva_zymx5e.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750847/NORWEGIAN_VIVA2_cjbk11.png'],
  'NORWEGIAN EPIC': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487779/norwigean_epic_wvhh7u.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487773/norwigean_epic_2_qhcrb6.png'],
  'NORWEGIAN JADE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487781/Norwegian_Jade_oypu63.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487772/Norwegian_Jade_2_q9uxjn.png'],
  'NORWEGIAN JEWEL': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487778/Norwegian_Jewel_inbs2n.png'],
  'NORWEGIAN PRIMA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487779/Norwegian_Prima_qoka4w.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487773/Norwegian_Prima_2_pivjhu.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487773/Norwegian_Prima_3_mad3po.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487773/Norwegian_Prima_4_vxrxyu.png'],
  'OCEANIA CRUISES ALLURA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750848/OCEANIA_CRUISES_ALLURA_o3ul30.png'],
  'OCEANIA CRUISES INSIGNIA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750848/OCEANIA_CRUISES_INSIGNIA_e8smg3.png'],
  'OCEANIA CRUISES MARINA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750849/OCEANIA_CRUISES_MARINA1_i3kdlo.png'],
  'OCEANIA CRUISES NAUTICA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750850/OCEANIA_CRUISES_NAUTICA1_p84w6a.png'],
  'OCEANIA CRUISES REGATTA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750851/OCEANIA_CRUISES_REGATTA1_dpz5zt.png'],
  'OCEANIA CRUISES RIVIERA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750852/OCEANIA_CRUISES_RIVIERA_xr2wrz.png'],
  'OCEANIA CRUISES SIRENA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750853/OCEANIA_CRUISES_SIRENA1_zo6ssk.png'],
  'OCEANIA CRUISES VISTA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750854/OCEANIA_CRUISES_VISTA_c664v5.png'],
  'PRINCESS CRUISE - CARIBBEAN PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750857/PRINCESS_CRUISE_-_CARIBBEAN_PRINCESS_uynwi5.png'],
  'PRINCESS CRUISE - CROWN PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750857/PRINCESS_CRUISE_-_CROWN_PRINCESS_vgax76.png'],
  'PRINCESS CRUISE - DIAMOND PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750857/PRINCESS_CRUISE_-_DIAMOND_PRINCESS1_lb1dn4.png'],
  'PRINCESS CRUISE - DISCOVERY PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750858/PRINCESS_CRUISE_-_DISCOVERY_PRINCESS_kxn1ed.png'],
  'PRINCESS CRUISE - ENCHANTED PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750859/PRINCESS_CRUISE_-_ENCHANTED_PRINCESS1_i7sslc.png'],
  'PRINCESS CRUISE - MAJESTIC PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750861/PRINCESS_CRUISE_-_MAJESTIC_PRINCESS_rtr9ut.png'],
  'PRINCESS CRUISE - REGAL PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750862/PRINCESS_CRUISE_-_REGAL_PRINCESS_lmpp6e.png'],
  'PRINCESS CRUISE - ROYAL PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750855/PRINCESS_-_ROYAL_otim8d.png'],
  'PRINCESS CRUISE - SKY PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750863/PRINCESS_CRUISE_-_SKY_PRINCESS_ojiptu.png'],
  'PRINCESS CRUISE - STAR PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750863/PRINCESS_CRUISE_-_STAR_PRINCESS_waowes.png'],
  'PRINCESS CRUISE - SUN PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750864/PRINCESS_CRUISE_-_SUN_PRINCESS1_xeyjy1.png'],
  'PRINCESS CRUISE - CORAL PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487777/Princess_Coral_Princess_ihcyyc.png'],
  'PRINCESS CRUISE - EMERALD PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487782/Emerald_Princess_nsq815.png'],
  'PRINCESS CRUISE - GOLDEN PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487782/Golden_Princess_nhc9k8.png'],
  'PRINCESS CRUISE - GRAND PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487779/Grand_Princess_ceani6.png'],
  'PRINCESS CRUISE - ISLAND PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487783/Island_Princess_jtqund.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487773/Island_Princess_2_lmbjvp.png'],
  'PRINCESS CRUISE - PACIFIC PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487782/Pacific_Princess_fzof7v.png'],
  'PRINCESS CRUISE - RUBY PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777488761/Ruby_Princess_1_yntbyu.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777488763/Ruby_Princess_tkuu6x.png'],
  'PRINCESS CRUISE - SAPPHIRE PRINCESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487784/Sapphire_Princess_jkq4br.png'],
  'ROYAL CARIBBEAN - ADVENTURE OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750866/ROYAL_CARIBBEAN_-_ADVENTURE_OF_THE_SEAS1_vsb4oz.png'],
  'ROYAL CARIBBEAN - ALLURE OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750867/ROYAL_CARIBBEAN_-_ALLURE_OF_THE_SEAS1_m521oo.png'],
  'ROYAL CARIBBEAN - ANTHEM OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750869/ROYAL_CARIBBEAN_-_ANTHEM_OF_THE_SEAS2_2_xkxddi.png'],
  'ROYAL CARIBBEAN - ENCHANTMENT OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750870/ROYAL_CARIBBEAN_-_ENCHANTMENT_OF_THE_SEAS_c4quxw.png'],
  'ROYAL CARIBBEAN - EXPLORER OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750871/ROYAL_CARIBBEAN_-_EXPLORER_OF_THE_SEAS_oiqsau.png'],
  'ROYAL CARIBBEAN - FREEDOM OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750872/ROYAL_CARIBBEAN_-_FREEDOM_OF_THE_SEAS1_ousev8.png'],
  'ROYAL CARIBBEAN - HARMONY OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750874/ROYAL_CARIBBEAN_-_HARMONY_OF_THE_SEAS_zho9fv.png'],
  'ROYAL CARIBBEAN - ICON OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750865/ROYAL_ICON_letim6.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750876/ROYAL_CARIBBEAN_-_ICON_OF_THE_SEAS5_krepgf.png'],
  'ROYAL CARIBBEAN - INDEPENDENCE OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750877/ROYAL_CARIBBEAN_-_INDEPENDENCE_OF_THE_SEAS_hwya8x.png'],
  'ROYAL CARIBBEAN - JEWEL OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750878/ROYAL_CARIBBEAN_-_JEWEL_OF_THE_SEAS_rfnjgv.png'],
  'ROYAL CARIBBEAN - LEGEND OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750902/ROYAL_Legend_of_the_Seas_i4ubju.png'],
  'ROYAL CARIBBEAN - LIBERTY OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750879/ROYAL_CARIBBEAN_-_LIBERTY_OF_THE_SEAS_orqyk3.png'],
  'ROYAL CARIBBEAN - MARINER OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750882/ROYAL_CARIBBEAN_-_MARINER_OF_THE_SEAS1_nsgxfg.png'],
  'ROYAL CARIBBEAN - NAVIGATOR OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750885/ROYAL_CARIBBEAN_-_NAVIGATOR_OF_THE_SEAS1_ighkhh.png'],
  'ROYAL CARIBBEAN - OASIS OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750886/ROYAL_CARIBBEAN_-_OASIS_OF_THE_SEAS_qvtyhj.png'],
  'ROYAL CARIBBEAN - ODYSSEY OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750887/ROYAL_CARIBBEAN_-_ODYSSEY_OF_THE_SEAS1_cregdp.png'],
  'ROYAL CARIBBEAN - OVATION OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750889/ROYAL_CARIBBEAN_-_OVATION_OF_THE_SEAS2_izlkor.png'],
  'ROYAL CARIBBEAN - QUANTUM OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750890/ROYAL_CARIBBEAN_-_QUANTUM_OF_THE_SEAS_uqcb2j.png'],
  'ROYAL CARIBBEAN - RADIANCE OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750891/ROYAL_CARIBBEAN_-_RADIANCE_OF_THE_SEAS1_xvewft.png'],
  'ROYAL CARIBBEAN - RHAPSODY OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750893/ROYAL_CARIBBEAN_-_RHAPSODY_OF_THE_SEAS1_xcjed0.png'],
  'ROYAL CARIBBEAN - SERENADE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750902/ROYAL_SERENADE_fjpgga.png'],
  'ROYAL CARIBBEAN - SPECTRUM OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750894/ROYAL_CARIBBEAN_-_SPECTRUM_OF_THE_SEAS_qxxv5f.png'],
  'ROYAL CARIBBEAN - STARS OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750903/ROYAL_Star_of_the_Seas_xag66h.png'],
  'ROYAL CARIBBEAN - SYMPHONY OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750897/ROYAL_CARIBBEAN_-_SYMPHONY_OF_THE_SEAS_jijt1j.png'],
  'ROYAL CARIBBEAN - VISION OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750904/ROYAL_VISION_vwnrjl.png'],
  'ROYAL CARIBBEAN - VOYAGER OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750898/ROYAL_CARIBBEAN_-_VOYAGER_OF_THE_SEAS2_au1e9r.png'],
  'ROYAL CARIBBEAN - WONDER OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750900/ROYAL_CARIBBEAN_-_WONDER_OF_THE_SEAS2_r384rb.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750904/ROYAL_Wonder_of_the_Seas_dqrgmr.png'],
  'ROYAL CARIBBEAN - BRILLIANCE OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487772/Brilliance_of_the_Seas_wcdswk.png'],
  'ROYAL CARIBBEAN - GRANDEUR OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487776/Grandeur_of_the_Seas_btmywz.png'],
  'ROYAL CARIBBEAN - UTOPIA OF THE SEAS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487781/Utopia_of_the_Seas_1_n5pj3r.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487772/Utopia_of_the_Seas_2_y0n4w9.png','https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487772/Utopia_of_the_Seas_3_fmzmc0.png'],
  'X CELEBRITY CRUISE - APEX': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750906/X_Celebrity_Apex_fvq5qk.png'],
  'X CELEBRITY CRUISE - ASCENT': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750907/X_Celebrity_Ascent_wkuqws.png'],
  'X CELEBRITY CRUISE - BOUNDLESS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750908/X_Celebrity_Boundless_pxbakr.png'],
  'CELEBRITY COMPASS': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750909/X_Celebrity_Compass_d7q0fu.png'],
  'X CELEBRITY CRUISE - CONSTELLATION': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750910/X_Celebrity_Constellation_lpypwj.png'],
  'X CELEBRITY CRUISE - ECLIPSE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750910/X_Celebrity_Eclipse_q2erw0.png'],
  'X CELEBRITY CRUISE - EDGE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750911/X_Celebrity_Edge_ckhwxd.png'],
  'X CELEBRITY CRUISE - EQUINOX': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750912/X_Celebrity_Equinox_u9qg3o.png'],
  'X CELEBRITY CRUISE - FLORA': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750913/X_Celebrity_Flora_v0jtzf.png'],
  'X CELEBRITY CRUISE - INFINITY': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750913/X_Celebrity_Infinity_lsjww6.png'],
  'X CELEBRITY CRUISE - REFLECTION': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750914/X_Celebrity_Reflection_fs3shu.png'],
  'X CELEBRITY CRUISE - SILHOUETTE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750918/X_Celebrity_Silhouette_mngyov.png'],
  'X CELEBRITY CRUISE - SOLSTICE': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750918/X_Celebrity_Solstice_qin5da.png'],
  'X CELEBRITY CRUISE - SUMMIT': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750919/X_Celebrity_Summit_u7mlf5.png'],
  'X CELEBRITY CRUISE - XCEL': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1773750921/X_Celebrity_Xcel_f4ur5j.png'],
  'X CELEBRITY CRUISE - BEYOND': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487781/X_Celebrity_Beyond_o9cvtb.png'],
  'X CELEBRITY CRUISE - MILLENNIUM': ['https://res.cloudinary.com/dxgj4bcch/image/upload/v1777487780/X_Celebrity_Millennium_p4jsip.png'],
};

// URLs exatas dos logos das companhias marítimas (V1 client.js linha 1708-1716)
const CIA_LOGOS: Record<string, string> = {
  'MSC':       'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106669/msc_uqiqji.png',
  'COSTA':     'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106668/costa_rzno1p.png',
  'NORWEGIAN': 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106667/norwegian_ugg7j9.png',
  'CARNIVAL':  'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106661/carnival_logo.png',
  'ROYAL':     'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106662/royal_madqky.png',
  'CELEBRITY': 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106665/xcruise_blcv45.png',
  'PRINCESS':  'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106664/princess_xteony.png',
  'OCEANIA':   'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106671/ocean_mccpbc.png',
  'DISNEY':    'https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106663/disney_ttcdgq.png',
};

function detectCompaniaLogo(navio: string): string {
  const n = (navio || '').toUpperCase();
  for (const [cia, url] of Object.entries(CIA_LOGOS)) {
    if (n.includes(cia)) return url;
  }
  return '';
}

export function CruzeiroForm({
  fields, set, today, binds, formato, nomeLoja, onImgFundo,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
  onImgFundo?: (nome: string) => Promise<void>;
}) {
  void onImgFundo;
  // ═══ CÁLCULO AUTOMÁTICO: QUANTAS NOITES ═══
  const dataIda = (fields.dataida as string) || '';
  const dataVolta = (fields.datavolta as string) || '';
  const quantasNoites = useMemo(() => {
    if (!dataIda || !dataVolta) return 0;
    const d1 = new Date(dataIda);
    const d2 = new Date(dataVolta);
    const diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [dataIda, dataVolta]);

  // ═══ AUTO-DETECTAR: logo_cia + img_fundo ═══
  useEffect(() => {
    const navio = (fields.navio as string || '').trim();
    if (!navio) return;

    // 1. Logo da companhia
    const logo = detectCompaniaLogo(navio);
    if (logo) set('logo_cia', logo);

    // 2. img_fundo via lookup no mapa (sem query ao banco)
    const navioUpper = navio.toUpperCase();

    // Busca exata primeiro
    let imagens = NAVIOS_IMAGENS[navioUpper];

    // Se não encontrar, busca por substring
    if (!imagens) {
      const chave = Object.keys(NAVIOS_IMAGENS).find(k =>
        navioUpper.includes(k) || k.includes(navioUpper)
      );
      if (chave) imagens = NAVIOS_IMAGENS[chave];
    }

    if (imagens && imagens.length > 0) {
      // Escolhe uma imagem aleatória do array
      set('img_fundo', imagens[Math.floor(Math.random() * imagens.length)]);
    }
    // Se não encontrar, não seta fallback — mantém o que estava
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.navio]);

  // ═══ BIND: data_periodo (formatPeriodo) ═══
  useEffect(() => {
    if (dataIda && dataVolta) {
      set('data_periodo', formatPeriodo(dataIda, dataVolta));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataIda, dataVolta]);

  // ═══ BIND: forma_pgto (texto formatado conforme forma de pagamento) ═══
  useEffect(() => {
    const fp = (fields.formapagamento as string) || '';
    const valorparcela = (fields.valorparcela as string) || '';

    let texto = '';

    if (fp === 'cartao') {
      texto = 'No Cartão de Crédito Sem Juros';
    } else if (fp === 'entrada') {
      if (valorparcela) {
        texto = `Entrada de R$ ${valorparcela} +`;
      }
    }

    set('forma_pgto', texto);
    set('crz_forma_pgto', texto); // Prefixado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.formapagamento, fields.valorparcela]);

  // ═══ BIND: q_vezes (parcelas) ═══
  useEffect(() => {
    const p = fields.parcelas as string;
    if (p) {
      set('q_vezes', p);
      set('crz_q_vezes', p); // Prefixado
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.parcelas]);

  // ═══ BIND: valor_total ═══
  useEffect(() => {
    const vt = fields.valortotal as string;
    if (vt) {
      set('valor_total', vt);
      set('crz_valor_total', vt); // Prefixado
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.valortotal]);

  return (
    <>
      <Section title="Cruzeiro" icon={<Ship size={13} />}>
        <Field label="Navio *">
          <SearchableSelect
            value={(fields.navio as string) || ''}
            onChange={(v) => set('navio', v)}
            options={NAVIOS_DEFAULT}
            placeholder="Buscar navio..."
            allowCustom
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Data Ida *">
            <input
              type="date"
              value={dataIda}
              onChange={(e) => {
                set('dataida', e.target.value);
                if (e.target.value && dataVolta) {
                  set('data_correta', formatPeriodo(e.target.value, dataVolta));
                }
              }}
              min={today}
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Data Volta *">
            <input
              type="date"
              value={dataVolta}
              onChange={(e) => {
                set('datavolta', e.target.value);
                if (dataIda && e.target.value) {
                  set('data_correta', formatPeriodo(dataIda, e.target.value));
                }
              }}
              min={dataIda || today}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {quantasNoites > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2">
            <span className="text-[14px] text-[var(--orange)]">🌙</span>
            <span className="text-[12px] font-bold text-[var(--txt)]">
              {quantasNoites} {quantasNoites === 1 ? 'noite' : 'noites'}
            </span>
            <span className="text-[10px] text-[var(--txt3)]">calculado automaticamente</span>
          </div>
        )}

        <Field label="Itinerário *">
          <textarea
            value={(fields.itinerario as string) || ''}
            onChange={(e) => set('itinerario', e.target.value)}
            placeholder="ex: Santos / Navegação / Búzios / Navegação / Santos"
            className={`${INPUT_CLASS} h-auto resize-none py-2`}
            rows={2}
          />
        </Field>

        <Field label="Incluso (opcional)">
          <textarea
            value={(fields.incluso as string) || ''}
            onChange={(e) => set('incluso', e.target.value)}
            placeholder="ex: Cabine Interna, Pensão Completa, Bebidas"
            className={`${INPUT_CLASS} h-auto resize-none py-2`}
            rows={2}
          />
        </Field>
      </Section>

      <Section title="Pagamento" icon="💳">
        <Field label="Forma de Pagamento *">
          <div className="flex gap-1">
            {[
              { value: 'cartao', label: 'Cartão' },
              { value: 'entrada', label: 'Boleto' },
            ].map((opt) => {
              const sel = fields.formapagamento === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    set('formapagamento', opt.value);
                    // Setar forma_de_pagamento derivado
                    if (opt.value === 'cartao') {
                      set('forma_de_pagamento', 'No Cartão de Crédito Sem Juros');
                    } else if (opt.value === 'entrada') {
                      const entrada = (fields.entrada as string) || '';
                      set('forma_de_pagamento', entrada ? `Entrada de R$ ${entrada} +` : 'Boleto');
                    }
                  }}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all"
                  style={
                    sel
                      ? { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }
                      : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Entrada (Boleto) */}
        {fields.formapagamento === 'entrada' && (
          <Field label="Valor da Entrada (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={(fields.entrada as string) || ''}
              onChange={(e) => set('entrada', e.target.value)}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                set('entrada', f.formatted || e.target.value);
                set('crz_entrada', f.formatted || e.target.value); // Prefixado
              }}
              placeholder="0,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '12px' }}>
          {/* Parcelas */}
          <Field label="Parcelas *">
            <SearchableSelect
              value={(fields.parcelas as string) || ''}
              onChange={(v) => {
                set('parcelas', v);
                set('q_vezes', v);
                // Prefixados
                set('crz_parcelas', v);
                set('crz_q_vezes', v);
              }}
              options={Array.from({ length: 24 }, (_, i) => `${i + 2}x`)}
              placeholder="Selecione..."
              readOnly={true}
            />
          </Field>

          {/* Valor da Parcela */}
          <Field label="Valor da Parcela *">
            <input
              type="text"
              value={(fields.valorparcela as string) || ''}
              onChange={(e) => set('valorparcela', e.target.value)}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                set('valorparcela', f.formatted || e.target.value);
                set('valorint', f.valorint);
                set('valdec', f.valdec);
                // Prefixados para isolamento entre forms
                set('crz_valorparcela', f.formatted || e.target.value);
                set('crz_valorint', f.valorint);
                set('crz_valdec', f.valdec);
              }}
              placeholder="0,00"
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/* Valor Total */}
        <Field label="Valor Total *">
          <input
            type="text"
            value={(fields.valortotal as string) || ''}
            onChange={(e) => set('valortotal', e.target.value)}
            onBlur={(e) => {
              const f = applyPriceMask(e.target.value);
              set('valortotal', f.formatted || e.target.value);
              set('valor_total', f.formatted || e.target.value);
              set('cruzeiro_total', textoTotalCabine(f.formatted));
              set('valortotal_cruzeiro', textoTotalCabine(f.formatted));
              set('valor_total_texto', textoTotalCabine(f.formatted));
              // Prefixados para isolamento entre forms
              set('crz_valortotal', f.formatted || e.target.value);
              set('crz_valor_total', f.formatted || e.target.value);
              set('crz_cruzeiro_total', textoTotalCabine(f.formatted));
              set('crz_valortotal_cruzeiro', textoTotalCabine(f.formatted));
              set('crz_valor_total_texto', textoTotalCabine(f.formatted));
            }}
            placeholder="0,00"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <LegendaPostSection
        fields={fields}
        set={set}
        formato={formato}
        nomeLoja={nomeLoja}
        tipoArte="cruzeiro"
        destino={(fields.navio as string) || (fields.itinerario as string) || 'Cruzeiro'}
      />
    </>
  );
}

/* ── PassagemForm ───────────────────────────────────── */

export function PassagemForm({
  fields, set, today, binds, formato, nomeLoja, loadDestinos, onImgFundo,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
  loadDestinos?: () => Promise<string[]>;
  onImgFundo?: (url: string) => void;
}) {
  const [destinoOpts, setDestinoOpts] = useState<string[]>([]);
  const selectedFromListRef = useRef(false);

  useEffect(() => {
    loadDestinos?.().then(setDestinoOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers com formatação especial (máscara moeda brasileira)
  const onValorParcelaChange = (raw: string) => {
    const f = applyPriceMask(raw);
    set('valorparcela', f.formatted);
    set('valorint', f.valorint);
    set('valdec', f.valdec);
  };

  const showDestino = hasBind(binds, "destino");
  const showSaida = hasBind(binds, "saida", "aeroporto", "origem");
  const showVoo = hasBind(binds, "voo", "tipovoo");
  const showIda = hasBind(binds, "ida");
  const showVolta = hasBind(binds, "volta");
  const showIncluso = hasBind(binds, "incluso");
  const showValorParcela = hasBind(binds, "valorparcela", "valorint", "valdec");
  const showParcelas = hasBind(binds, "parcelas");
  const showValorTotal = hasBind(binds, "valortotal", "valor_total");
  const showFormaPgto = hasBind(binds, "formapagamento");
  const showEntrada = fields.formapagamento === "Boleto";

  // ═══ BIND: forma_pgto / forma_de_pagamento (derivados) ═══
  useEffect(() => {
    const fp = fields.formapagamento as string;
    if (fp === "Cartão") {
      set("forma_pgto", "No Cartão de Crédito Sem Juros");
      set("forma_de_pagamento", "No Cartão de Crédito Sem Juros");
      set("psg_forma_pgto", "No Cartão de Crédito Sem Juros"); // Prefixado
      set("psg_forma_de_pagamento", "No Cartão de Crédito Sem Juros"); // Prefixado
    } else if (fp === "Boleto") {
      const ent = (fields.entrada as string) || "";
      set("forma_pgto", ent ? `Entrada de R$ ${ent} +` : "Boleto");
      set("forma_de_pagamento", ent ? `Entrada de R$ ${ent} +` : "Boleto");
      set("psg_forma_pgto", ent ? `Entrada de R$ ${ent} +` : "Boleto"); // Prefixado
      set("psg_forma_de_pagamento", ent ? `Entrada de R$ ${ent} +` : "Boleto"); // Prefixado
    } else if (fp === "Débito") {
      set("forma_pgto", "No Débito");
      set("forma_de_pagamento", "No Débito");
      set("psg_forma_pgto", "No Débito"); // Prefixado
      set("psg_forma_de_pagamento", "No Débito"); // Prefixado
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.formapagamento, fields.entrada]);

  // ═══ BIND: q_vezes (espelha parcelas) ═══
  useEffect(() => {
    if (fields.parcelas) {
      set("q_vezes", fields.parcelas);
      set("psg_q_vezes", fields.parcelas); // Prefixado
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.parcelas]);

  return (
    <>
      <Section title="✈ Passagem Aérea" icon="">
        {/* Destino */}
        {showDestino && (
          <Field label="Destino / Resort *" asSection>
            <SearchableSelect
              value={(fields.destino as string) || ""}
              onChange={(v) => {
                const upper = v.toUpperCase();
                set("destino", upper);
                // Trigger 1: onSelect (quando escolhe do dropdown)
                selectedFromListRef.current = true;
                if (upper.trim()) onImgFundo?.(upper);
              }}
              onBlur={(v) => {
                // Trigger 2: onBlur (quando digita manual e sai do campo)
                // Anti-double-call: se acabou de selecionar da lista, ignora
                if (selectedFromListRef.current) {
                  selectedFromListRef.current = false;
                  return;
                }
                const upper = v.toUpperCase();
                if (upper.trim() && upper !== (fields.destino as string || "").toUpperCase()) {
                  set("destino", upper);
                  onImgFundo?.(upper);
                }
              }}
              options={destinoOpts}
              placeholder="ex. CANCÚN"
              allowCustom
            />
          </Field>
        )}

        {/* Saída + Tipo de Voo (inline grid) */}
        <div className="grid grid-cols-2 gap-2">
          {showSaida && (
            <Field label="Saída *">
              <input
                type="text"
                value={(fields.saida as string) || ""}
                onChange={(e) => set("saida", e.target.value.toUpperCase())}
                placeholder="ex: GRU"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {showVoo && (
            <Field label="Tipo de Voo *">
              <TipoVooField
                value={(fields.voo as string) || ""}
                onChange={(v) => set("voo", v)}
                variant="buttons"
              />
            </Field>
          )}
        </div>

        {/* Datas Ida + Volta (inline) */}
        {(showIda || showVolta) && (
          <div className="grid grid-cols-2 gap-2">
            {showIda && (
              <Field label="Ida *">
                <input
                  type="date"
                  value={(fields.ida as string) || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("ida", v);
                    const volta = (fields.volta as string) || "";
                    if (v && volta) set("periodo", formatPeriodo(v, volta));
                  }}
                  min={today}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            {showVolta && (
              <Field label="Volta *">
                <input
                  type="date"
                  value={(fields.volta as string) || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("volta", v);
                    const ida = (fields.ida as string) || "";
                    if (ida && v) set("periodo", formatPeriodo(ida, v));
                  }}
                  min={(fields.ida as string) || today}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
        )}

        {/* Incluso */}
        {showIncluso && (
          <Field label="Incluso (opcional)">
            <input
              type="text"
              value={(fields.incluso as string) || ""}
              onChange={(e) => set("incluso", e.target.value)}
              placeholder=""
              className={INPUT_CLASS}
            />
          </Field>
        )}
      </Section>

      {/* Valor e Pagamento */}
      <Section title="💰 Valor" icon="">
        {/* Valor por Pessoa (número grande + centavos pequenos) */}
        {showValorParcela && (
          <Field label="Valor por Pessoa *">
            <input
              type="text"
              inputMode="decimal"
              value={(fields.valorparcela as string) || ""}
              onChange={(e) => set("valorparcela", e.target.value)}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                set("valorparcela", f.formatted || e.target.value);
                set("valorint", f.valorint);
                set("valdec", f.valdec);
                // Prefixados
                set("psg_valorparcela", f.formatted || e.target.value);
                set("psg_valorint", f.valorint);
                set("psg_valdec", f.valdec);
              }}
              placeholder="ex: 890,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}

        {/* Parcelas (dropdown 2x-24x) */}
        {showParcelas && (
          <Field label="Parcelas *">
            <SearchableSelect
              value={(fields.parcelas as string) || ""}
              onChange={(v) => {
                set("parcelas", v);
                set("psg_parcelas", v); // Prefixado
              }}
              options={PARCELAS_OPTS_PASSAGEM}
              placeholder="Selecione..."
              readOnly={true}
            />
          </Field>
        )}

        {/* Valor Total */}
        {showValorTotal && (
          <Field label="Valor Total (por pessoa) *">
            <input
              type="text"
              inputMode="decimal"
              value={(fields.valortotal as string) || ""}
              onChange={(e) => set("valortotal", e.target.value)}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                set("valortotal", f.formatted || e.target.value);
                set("valor_total_texto", textoTotalApto(f.formatted));
                // Prefixados
                set("psg_valortotal", f.formatted || e.target.value);
                set("psg_valor_total_texto", textoTotalApto(f.formatted));
              }}
              placeholder="ex: 841,49"
              className={INPUT_CLASS}
            />
          </Field>
        )}

        {/* Forma de Pagamento */}
        {showFormaPgto && (
          <Field label="Forma de Pagamento *">
            <SearchableSelect
              value={(fields.formapagamento as string) || ""}
              onChange={(v) => { set("formapagamento", v); set("psg_formapagamento", v); }}
              options={["Cartão","Boleto"]}
              placeholder="Selecione"
              readOnly
            />
          </Field>
        )}

        {/* Entrada (condicional - só aparece quando formapagamento === "entrada") */}
        {showEntrada && (
          <Field label="Valor da Entrada (R$) *">
            <input
              type="text"
              inputMode="decimal"
              value={(fields.entrada as string) || ""}
              onChange={(e) => set("entrada", e.target.value)}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                set("entrada", f.formatted || e.target.value);
                set("psg_entrada", f.formatted || e.target.value); // Prefixado
              }}
              placeholder="ex: 1.500,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}
      </Section>

      <LegendaPostSection
        fields={fields}
        set={set}
        formato={formato}
        nomeLoja={nomeLoja}
        tipoArte="pacote"
        destino={(fields.destino as string) || (fields.aeroporto as string) || (fields.saida as string) || "Passagem"}
      />
    </>
  );
}

/* ── AnoiteceuForm ──────────────────────────────────── */

export function AnoiteceuForm({
  fields, set, binds,
}: {
  fields: Fields;
  set: Setter;
  binds?: Set<string>;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // Converter YYYY-MM-DD → DD/MM
  const dateToShort = (isoDate: string): string => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}`;
  };

  // Converter DD/MM → YYYY-MM-DD (assume ano atual)
  const shortToDate = (short: string): string => {
    if (!short || !short.includes("/")) return "";
    const [d, m] = short.split("/");
    const year = new Date().getFullYear();
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };

  // Valores para os inputs (converte DD/MM ↔ YYYY-MM-DD)
  const inicioDate = shortToDate((fields.inicio as string) || "");
  const fimDate = shortToDate((fields.fim as string) || "");

  return (
    <>
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          <div>
            <p className="font-bold text-[var(--txt)]">Anoiteceu</p>
            <p className="text-[11px] text-[var(--txt3)]">Promoção noturna — preencha os campos e publique</p>
          </div>
        </div>
      </div>

      <Section title="Desconto" icon={<Tag size={13} />}>
        <Field label="Desconto">
          <SearchableSelect
            value={(fields.desconto as string) || ""}
            onChange={(v) => set("desconto", v)}
            options={DESCONTO_OPTS}
            placeholder="Selecione..."
          />
        </Field>
      </Section>

      <Section title="Válidade da Promoção" icon="📅">
        <div className="grid grid-cols-2 gap-2">
          <Field label="INÍCIO">
            <input
              type="date"
              value={inicioDate}
              onChange={(e) => set("inicio", dateToShort(e.target.value))}
              min={today}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="FIM">
            <input
              type="date"
              value={fimDate}
              onChange={(e) => set("fim", dateToShort(e.target.value))}
              min={inicioDate || today}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </Section>

      <Section title="Validade" icon="📅">
        <Field label="PARA VIAGENS ATÉ">
          <input
            type="date"
            value={(fields.viagens_ate as string) || ""}
            onChange={(e) => set("viagens_ate", e.target.value)}
            min={today}
            className={INPUT_CLASS}
          />
        </Field>
      </Section>
    </>
  );
}

/* ── CardWhatsAppForm (Card WhatsApp / Lâmina V1) ─────
 * Port fiel do V1 app.aurovista.com.br/lamina (AUROHUB FIRE/lamina.html):
 *   - Globais: lam_titulo1, lam_titulo2, img_fundo, lam_palette
 *   - 4 sub-abas destino → binds lam_d{n}_{campo}
 *   - Paletas (4 cores), fundo aleatório (imgfundo table), upload, IA título
 * Layout no template seedado usa as coords hardcoded do V1 (stories 1080×1920).
 */

const LAM_INCLUSO_OPTS = ["Aéreo + Hotel + Transfer", "Aéreo + Hotel", "Hotel + Transfer", "Só Hotel", "Cruzeiro"];

// 4 paletas do V1 (lamina.html:286-292). Default = índice 0 (Verde).
const LAM_PALETTES = [
  { name: "Verde",       emoji: "🟡", accent: "#D4E600" },
  { name: "Azul",        emoji: "🔵", accent: "#1A56C4", bg: "#E8F0FE", text: "#0B1D3A" },
  { name: "Azul Claro",  emoji: "🩵", accent: "#16b5eb" },
  { name: "Azul Escuro", emoji: "🌑", accent: "#003366", bg: "#D6E4F0", text: "#0B1D3A" },
];

// 20 templates de título (V1 lamina.html:520-543). "{destino}" substituído pelo primeiro destino.
const LAM_TITULO_TEMPLATES = [
  { l1: "Férias dos Sonhos!",     l2: "Voe com a Azul Viagens" },
  { l1: "Seu Paraíso te Espera",  l2: "Pacotes imperdíveis!" },
  { l1: "Hora de Viajar!",        l2: "As melhores ofertas pra você" },
  { l1: "Destinos Incríveis",     l2: "Reserve já sua viagem" },
  { l1: "Viaje com a Azul!",      l2: "Preços que cabem no bolso" },
  { l1: "Embarque Nessa!",        l2: "Ofertas exclusivas Azul" },
  { l1: "Realize Seu Sonho",      l2: "Viaje com a Azul Viagens" },
  { l1: "Promoção Relâmpago!",    l2: "Garanta já seu pacote" },
  { l1: "Vem Pra Azul!",          l2: "Os melhores destinos te esperam" },
  { l1: "Aventura te Chama!",     l2: "Pacotes a partir de 10x" },
  { l1: "Escapada Perfeita",      l2: "Conheça destinos únicos" },
  { l1: "Férias Inesquecíveis",   l2: "Faça suas malas!" },
  { l1: "Oferta Especial!",       l2: "Só na Azul Viagens" },
  { l1: "Próxima Parada:",        l2: "{destino}" },
  { l1: "Bora pra {destino}?",    l2: "Pacotes com a Azul Viagens" },
  { l1: "{destino} te Espera!",   l2: "Reserve com a Azul" },
  { l1: "Partiu {destino}!",      l2: "As melhores condições" },
  { l1: "Sonhe. Planeje. Viaje.", l2: "Azul Viagens te leva!" },
  { l1: "Seu Destino é Aqui!",    l2: "Confira as ofertas" },
  { l1: "Viaje Mais, Pague Menos", l2: "Ofertas Azul Viagens" },
];

interface LamDest {
  destino: string; saida: string; voo: string;
  ida: string; volta: string;
  hotel: string; incluso: string;
  pgto: string;
  entrada: string; parc: string;
  valor: string; total: string;
}

function emptyLamDest(): LamDest {
  return {
    destino: "", saida: "", voo: "Voo Direto",
    ida: "", volta: "",
    hotel: "", incluso: "Aéreo + Hotel + Transfer",
    pgto: "cartao", entrada: "", parc: "",
    valor: "", total: "",
  };
}

export function CardWhatsAppForm({
  fields, set, today,
  loadDestinos, loadHoteis, binds,
  formato, nomeLoja, onImgFundo,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
  onImgFundo?: (nome: string) => Promise<void>;
}) {
  void formato; void nomeLoja; void onImgFundo;
  void binds;
  const [cab, setCab] = useState({
    titulo1: String(fields.lam_titulo1 ?? ""),
    titulo2: String(fields.lam_titulo2 ?? ""),
  });
  const [dests, setDests] = useState<LamDest[]>(() => [
    emptyLamDest(), emptyLamDest(), emptyLamDest(), emptyLamDest(),
  ]);
  const [curDest, setCurDest] = useState(0);
  const [destinoOpts, setDestinoOpts] = useState<string[]>([]);
  const [hotelOpts, setHotelOpts] = useState<string[]>([]);
  const [palette, setPalette] = useState(0);
  const [bgLoading, setBgLoading] = useState(false);
  const [legenda, setLegenda] = useState(String(fields.lam_legenda ?? ""));
  const [legLoading, setLegLoading] = useState(false);
  const [legCopied, setLegCopied] = useState(false);
  const [legBriefing, setLegBriefing] = useState("");
  const [semEmojis, setSemEmojis] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loadDestinos) loadDestinos().then(setDestinoOpts).catch(() => {});
    if (loadHoteis) loadHoteis().then(setHotelOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync para binds lam_* e img_fundo/logo_loja/lam_palette
  useEffect(() => {
    set("lam_titulo1", cab.titulo1);
    set("lam_titulo2", cab.titulo2);
    set("lam_palette", String(palette));
    dests.forEach((d, i) => {
      const n = i + 1;
      set(`lam_d${n}_destino`, d.destino ? d.destino.toUpperCase() : "");
      set(`lam_d${n}_saida`, d.saida);
      set(`lam_d${n}_voo`, d.voo);
      set(`lam_d${n}_saida_voo`, `Saída: ${d.saida || "—"}  ${d.voo || ""}`); // concatenado para template
      set(`lam_d${n}_periodo`, formatPeriodo(d.ida, d.volta));
      set(`lam_d${n}_hotel`, d.hotel);
      set(`lam_d${n}_incluso`, d.incluso);
      // pgto: V1 resolution rules
      set(
        `lam_d${n}_pgto`,
        d.pgto === "Cartão"
          ? "No Cartão de Crédito S/ Juros"
          : d.pgto === "Boleto"
            ? (d.entrada ? `Entrada de R$ ${d.entrada} +` : "Boleto")
            : "",
      );
      // parcelas: adiciona "x" se não tiver
      set(`lam_d${n}_parcelas`, d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : "");
      set(`lam_d${n}_parc`, d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : ""); // alias para template
      set(`lam_d${n}_valor`, d.valor);
      // Dividir valor em inteiro + centavos para layout especial do template
      const nums = (d.valor || "").replace(/\D/g, "");
      if (nums) {
        const cents = parseInt(nums, 10);
        set(`lam_d${n}_valorint`, Math.floor(cents / 100).toLocaleString("pt-BR"));
        set(`lam_d${n}_valdec`, "," + String(cents % 100).padStart(2, "0"));
      } else {
        set(`lam_d${n}_valorint`, "");
        set(`lam_d${n}_valdec`, "");
      }
      // total: "ou R$ X à vista por pessoa"
      set(`lam_d${n}_total`, d.total ? `ou R$ ${d.total} à vista por pessoa` : "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cab, dests, palette]);

  const updateDest = (idx: number, patch: Partial<LamDest>) =>
    setDests((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const d = dests[curDest];
  const nts = d.ida && d.volta ? calcularNoites(d.ida, d.volta) : 0;

  /* ── Ações de personalização ──────────────────── */

  async function handleShuffleBg() {
    setBgLoading(true);
    try {
      const { data, error } = await _sb_for_lamina
        .from("imgfundo")
        .select("url")
        .eq("tipo", "card")
        .not("url", "is", null)
        .limit(1000);
      if (error) { console.error("[CardWhatsApp] imgfundo query:", error); alert("Erro ao buscar fundos."); return; }
      const rows = (data ?? []) as { url: string }[];
      if (!rows.length) { alert("Biblioteca de fundos vazia."); return; }
      const pick = rows[Math.floor(Math.random() * rows.length)];
      if (pick?.url) set("imgfundo", pick.url);
    } catch (err) {
      console.error("[CardWhatsApp] shuffle bg:", err);
      alert("Erro ao sortear fundo.");
    } finally {
      setBgLoading(false);
    }
  }

  function handleUploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) set("imgfundo", String(reader.result));
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function handleClearBg() {
    set("imgfundo", "");
  }

  function handleIATitulo() {
    const firstDst = dests.map((x) => x.destino).filter(Boolean)[0] || "seu destino";
    const tmpl = LAM_TITULO_TEMPLATES[Math.floor(Math.random() * LAM_TITULO_TEMPLATES.length)];
    let l1 = tmpl.l1.replace("{destino}", firstDst);
    let l2 = tmpl.l2.replace("{destino}", firstDst);
    if (l1.length > 25) l1 = l1.slice(0, 24) + "…";
    if (l2.length > 30) l2 = l2.slice(0, 29) + "…";
    setCab({ titulo1: l1, titulo2: l2 });
  }

  async function handleIALegenda() {
    setLegLoading(true);
    setLegCopied(false);
    try {
      // Agrega dados dos 4 destinos preenchidos pra montar um contexto rico
      const destFilled = dests.filter((x) => x.destino.trim());
      const destNames = destFilled.map((d) => d.destino.toUpperCase()).join(", ") || "vários destinos";
      const precos = destFilled.map((d) => d.valor).filter(Boolean);
      const menorPreco = precos.length
        ? precos.reduce((a, b) => {
            const na = parseFloat(a.replace(/\./g, "").replace(",", ".")) || Infinity;
            const nb = parseFloat(b.replace(/\./g, "").replace(",", ".")) || Infinity;
            return na <= nb ? a : b;
          })
        : "";
      const payload = {
        destino: destNames,
        hotel: destFilled.map((d) => d.hotel).filter(Boolean).slice(0, 2).join(" / "),
        servicos: destFilled.map((d) => d.incluso).filter(Boolean)[0] ?? "",
        preco: menorPreco ? `a partir de R$ ${menorPreco}` : "",
        parcelas: destFilled.map((d) => d.parc).filter(Boolean)[0] ?? "",
        datas: destFilled.map((d) => formatPeriodo(d.ida, d.volta)).filter(Boolean).slice(0, 2).join(" / "),
        tipo: "Card WhatsApp — 4 destinos (promocional, tom informal para WhatsApp)",
        briefing: legBriefing.trim() || undefined,
        sem_emojis: semEmojis,
      };
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      const txt = (json?.legenda ?? "").toString();
      if (txt) {
        setLegenda(txt);
        set("lam_legenda", txt);
      } else {
        alert("Não consegui gerar a legenda. Tente novamente.");
      }
    } catch (err) {
      console.error("[Lâmina] IA legenda:", err);
      alert("Erro ao gerar legenda.");
    } finally {
      setLegLoading(false);
    }
  }

  async function handleCopyLegenda() {
    if (!legenda) return;
    try {
      await navigator.clipboard.writeText(legenda);
      setLegCopied(true);
      setTimeout(() => setLegCopied(false), 2000);
    } catch {
      /* ignorado */
    }
  }

  return (
    <>
      <Section title="Título da Arte" icon="✦">
        <Field label="Linha 1">
          <div className="flex gap-1.5">
            <input
              value={cab.titulo1}
              onChange={(e) => setCab((p) => ({ ...p, titulo1: e.target.value }))}
              placeholder="Férias dos Sonhos Já!"
              className={`${INPUT_CLASS} flex-1`}
              maxLength={25}
            />
            <button
              type="button"
              onClick={handleIATitulo}
              title="Sugerir com IA (offline)"
              className="shrink-0 rounded-lg border px-2.5 text-[10px] font-bold"
              style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "rgba(255,122,26,0.08)" }}
            >
              ✦ IA
            </button>
          </div>
        </Field>
        <Field label="Linha 2">
          <input
            value={cab.titulo2}
            onChange={(e) => setCab((p) => ({ ...p, titulo2: e.target.value }))}
            placeholder="Voe com a Azul Viagens"
            className={INPUT_CLASS}
            maxLength={30}
          />
        </Field>
      </Section>

      {/* Sub-abas destino */}
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const active = curDest === i;
          const label = dests[i].destino
            ? dests[i].destino.toUpperCase().slice(0, 8)
            : `Dest ${i + 1}`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurDest(i)}
              className="rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={
                active
                  ? { background: "var(--orange)", color: "#FFFFFF", borderColor: "var(--orange)" }
                  : { background: "var(--bg1)", color: "var(--txt3)", borderColor: "var(--bdr)" }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <Section title="Destino & Voo" icon="📍">
        <Field label="Destino">
          <SearchableSelect
            value={d.destino}
            onChange={(v) => updateDest(curDest, { destino: capitalizarDestino(v) })}
            options={destinoOpts}
            placeholder="Buscar destino..."
            allowCustom
          />
        </Field>
        <div className="flex flex-col gap-2">
          <Field label="Saída">
            <input
              value={d.saida}
              onChange={(e) => updateDest(curDest, { saida: e.target.value })}
              placeholder="GRU"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Tipo Voo">
            <SearchableSelect
              value={d.voo || ""}
              onChange={(v) => updateDest(curDest, { voo: v })}
              options={["Voo Direto","Voo Conexão"]}
              placeholder="Selecione"
              readOnly
            />
          </Field>
        </div>
      </Section>

      <Section title="Datas" icon="📅">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ida">
            <input
              type="date"
              min={today}
              value={d.ida}
              onChange={(e) => updateDest(curDest, { ida: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Volta">
            <input
              type="date"
              min={d.ida || today}
              value={d.volta}
              onChange={(e) => updateDest(curDest, { volta: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        {nts > 0 && (
          <p className="text-[10px] text-[var(--txt3)]">
            ✈ {nts} noite{nts === 1 ? "" : "s"} · {formatPeriodo(d.ida, d.volta)}
          </p>
        )}
      </Section>

      <Section title="Hotel & Incluso" icon="🏨">
        <Field label="Hotel">
          <SearchableSelect
            value={d.hotel}
            onChange={(v) => updateDest(curDest, { hotel: v })}
            options={hotelOpts}
            placeholder="Buscar hotel..."
            allowCustom
          />
        </Field>
        <Field label="Incluso">
          <SearchableSelect
            value={d.incluso || ""}
            onChange={(v) => updateDest(curDest, { incluso: v })}
            options={["Aéreo + Hotel","Aéreo + Hotel + Transfer","Só Aéreo","Só Hotel"]}
            placeholder="Selecione ou digite..."
            allowCustom
          />
        </Field>
      </Section>

      <Section title="Pagamento" icon="💰">
        <Field label="Forma de Pagamento">
          <SearchableSelect
            value={d.pgto || ""}
            onChange={(v) => updateDest(curDest, { pgto: v, ...(v === "Cartão" ? { entrada: "" } : {}) })}
            options={["Cartão","Boleto"]}
            placeholder="Selecione"
            readOnly
          />
        </Field>
        {d.pgto === "Boleto" && (
          <Field label="Valor da Entrada (R$)">
            <input
              value={d.entrada}
              onChange={(e) => updateDest(curDest, { entrada: e.target.value })}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                updateDest(curDest, { entrada: f.formatted || e.target.value });
              }}
              placeholder="1.500,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Parcelas">
            <SearchableSelect
              value={d.parc}
              onChange={(v) => updateDest(curDest, { parc: v })}
              options={PARCELAS_OPTS}
              placeholder="12x"
              readOnly
            />
          </Field>
          <Field label="Valor Parcela">
            <input
              value={d.valor}
              onChange={(e) => updateDest(curDest, { valor: e.target.value })}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                updateDest(curDest, { valor: f.formatted || e.target.value });
              }}
              placeholder="890,00"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="À Vista (por pessoa)">
          <input
            value={d.total}
            onChange={(e) => updateDest(curDest, { total: e.target.value })}
            onBlur={(e) => {
              const f = applyPriceMask(e.target.value);
              updateDest(curDest, { total: f.formatted || e.target.value });
            }}
            placeholder="8.900,00"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <Section title="Legenda (IA)" icon="✨">
        <Field label="Sua ideia (opcional)">
          <input
            value={legBriefing}
            onChange={(e) => setLegBriefing(e.target.value)}
            placeholder="Ex: promoção de férias para famílias, tom animado"
            className={INPUT_CLASS}
            maxLength={200}
          />
        </Field>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleIALegenda}
            disabled={legLoading}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50"
            style={{ borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }}
          >
            {legLoading ? "Gerando…" : "✦ Gerar legenda"}
          </button>
          <button
            type="button"
            onClick={() => setSemEmojis(!semEmojis)}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all"
            style={{ borderColor: "var(--bdr)", color: semEmojis ? "var(--orange)" : "var(--txt3)", background: semEmojis ? "rgba(255,122,26,0.08)" : "transparent" }}
          >
            {semEmojis ? "Sem emojis ✓" : "Sem emojis"}
          </button>
          {legenda && (
            <button
              type="button"
              onClick={handleCopyLegenda}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
              style={{ borderColor: "var(--bdr)", color: legCopied ? "var(--green, #10B981)" : "var(--txt2)" }}
            >
              {legCopied ? "✓ Copiado" : "📋 Copiar"}
            </button>
          )}
        </div>
        {legenda && (
          <textarea
            value={legenda}
            onChange={(e) => { setLegenda(e.target.value); set("lam_legenda", e.target.value); }}
            rows={4}
            className={`${INPUT_CLASS} !h-auto py-2 resize-y min-h-[80px] leading-snug`}
            placeholder="Legenda gerada aparecerá aqui…"
          />
        )}
        {!legenda && (
          <p className="text-[10px] text-[var(--txt3)]">Preencha pelo menos 1 destino e clique em &quot;Gerar legenda&quot; para criar uma legenda promocional para WhatsApp.</p>
        )}
      </Section>

      <Section title="Personalização Visual" icon="✦">
        <Field label="Cor tema">
          <div className="grid grid-cols-4 gap-1.5">
            {LAM_PALETTES.map((p, i) => {
              const active = palette === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPalette(i)}
                  title={p.name}
                  className="flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-all"
                  style={
                    active
                      ? { borderColor: "var(--orange)", background: "var(--bg1)" }
                      : { borderColor: "var(--bdr)", background: "transparent" }
                  }
                >
                  <span
                    className="block rounded-md"
                    style={{
                      width: 24, height: 24,
                      background: p.accent,
                      boxShadow: active ? "0 0 0 2px var(--txt) inset" : "none",
                    }}
                  />
                  <span className="text-[9px] font-semibold text-[var(--txt2)] leading-none">
                    {p.emoji} {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Fundo">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleShuffleBg}
              disabled={bgLoading}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
              style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
            >
              {bgLoading ? "Buscando…" : "⟳ Aleatório"}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
              style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
            >
              ↑ Upload
            </button>
            {fields.imgfundo ? (
              <button
                type="button"
                onClick={handleClearBg}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                style={{ borderColor: "var(--bdr)", color: "var(--txt3)" }}
              >
                ✕ Limpar
              </button>
            ) : null}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />
          </div>
        </Field>
      </Section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   LaminaForm — Lâmina 4 Destinos integrada ao fluxo Publicar.
   Idêntica ao CardWhatsAppForm mas:
     • handleShuffleBg filtra pela pasta Cloudinary correta
     • handleUploadBg faz upload real ao Cloudinary
     • Sem seção "Legenda WhatsApp"
   ───────────────────────────────────────────────────────────── */

export function LaminaForm({
  fields, set, today,
  loadDestinos, loadHoteis, binds,
  formato, nomeLoja, onImgFundo,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
  binds?: Set<string>;
  formato?: string;
  nomeLoja?: string;
  onImgFundo?: (nome: string) => Promise<void>;
}) {
  void formato; void nomeLoja; void onImgFundo; void binds;

  const [cab, setCab] = useState({
    titulo1: String(fields.lam_titulo1 ?? ""),
    titulo2: String(fields.lam_titulo2 ?? ""),
  });
  const [dests, setDests] = useState<LamDest[]>(() => [
    emptyLamDest(), emptyLamDest(), emptyLamDest(), emptyLamDest(),
  ]);
  const [curDest, setCurDest] = useState(0);
  const [destinoOpts, setDestinoOpts] = useState<string[]>([]);
  const [hotelOpts, setHotelOpts] = useState<string[]>([]);
  const [palette, setPalette] = useState(0);
  const [bgLoading, setBgLoading] = useState(false);
  const [legenda, setLegenda] = useState(String(fields.lam_legenda ?? ""));
  const [legLoading, setLegLoading] = useState(false);
  const [legCopied, setLegCopied] = useState(false);
  const [legBriefing, setLegBriefing] = useState("");
  const [semEmojis, setSemEmojis] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loadDestinos) loadDestinos().then(setDestinoOpts).catch(() => {});
    if (loadHoteis) loadHoteis().then(setHotelOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    set("lam_titulo1", cab.titulo1);
    set("lam_titulo2", cab.titulo2);
    set("lam_palette", String(palette));
    dests.forEach((d, i) => {
      const n = i + 1;
      set(`lam_d${n}_destino`, d.destino ? d.destino.toUpperCase() : "");
      set(`lam_d${n}_saida`, d.saida);
      set(`lam_d${n}_voo`, d.voo);
      set(`lam_d${n}_saida_voo`, `Saída: ${d.saida || "—"}  ${d.voo || ""}`);
      set(`lam_d${n}_periodo`, formatPeriodo(d.ida, d.volta));
      set(`lam_d${n}_hotel`, d.hotel);
      set(`lam_d${n}_incluso`, d.incluso);
      set(
        `lam_d${n}_pgto`,
        d.pgto === "Cartão"
          ? "No Cartão de Crédito S/ Juros"
          : d.pgto === "Boleto"
            ? (d.entrada ? `Entrada de R$ ${d.entrada} +` : "Boleto")
            : "",
      );
      set(`lam_d${n}_parcelas`, d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : "");
      set(`lam_d${n}_parc`, d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : "");
      set(`lam_d${n}_valor`, d.valor);
      const nums = (d.valor || "").replace(/\D/g, "");
      if (nums) {
        const cents = parseInt(nums, 10);
        set(`lam_d${n}_valorint`, Math.floor(cents / 100).toLocaleString("pt-BR"));
        set(`lam_d${n}_valdec`, "," + String(cents % 100).padStart(2, "0"));
      } else {
        set(`lam_d${n}_valorint`, "");
        set(`lam_d${n}_valdec`, "");
      }
      set(`lam_d${n}_total`, d.total ? `ou R$ ${d.total} à vista por pessoa` : "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cab, dests, palette]);

  const updateDest = (idx: number, patch: Partial<LamDest>) =>
    setDests((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const d = dests[curDest];
  const nts = d.ida && d.volta ? calcularNoites(d.ida, d.volta) : 0;

  async function handleShuffleBg() {
    setBgLoading(true);
    try {
      const { data, error } = await _sb_for_lamina
        .from("imgfundo")
        .select("url")
        .eq("tipo", "card")
        .not("url", "is", null)
        .limit(1000);
      if (error) { console.error("[LaminaForm] imgfundo:", error); return; }
      const rows = (data ?? []) as { url: string }[];
      if (!rows.length) return;
      const pick = rows[Math.floor(Math.random() * rows.length)];
      if (pick?.url) set("imgfundo", pick.url);
    } finally {
      setBgLoading(false);
    }
  }

  async function handleUploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setBgLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
      const res = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, folder: "cea5490a26896dd7b98f9ab8e6127b05c4" }),
      });
      const body = await res.json();
      if (res.ok && body.secure_url) set("imgfundo", body.secure_url);
    } finally {
      setBgLoading(false);
    }
  }

  function handleIATitulo() {
    const firstDst = dests.map((x) => x.destino).filter(Boolean)[0] || "seu destino";
    const tmpl = LAM_TITULO_TEMPLATES[Math.floor(Math.random() * LAM_TITULO_TEMPLATES.length)];
    let l1 = tmpl.l1.replace("{destino}", firstDst);
    let l2 = tmpl.l2.replace("{destino}", firstDst);
    if (l1.length > 25) l1 = l1.slice(0, 24) + "…";
    if (l2.length > 30) l2 = l2.slice(0, 29) + "…";
    setCab({ titulo1: l1, titulo2: l2 });
  }

  async function handleIALegenda() {
    setLegLoading(true);
    setLegCopied(false);
    try {
      const destFilled = dests.filter((x) => x.destino.trim());
      const destNames = destFilled.map((d) => d.destino.toUpperCase()).join(", ") || "vários destinos";
      const precos = destFilled.map((d) => d.valor).filter(Boolean);
      const menorPreco = precos.length
        ? precos.reduce((a, b) => {
            const na = parseFloat(a.replace(/\./g, "").replace(",", ".")) || Infinity;
            const nb = parseFloat(b.replace(/\./g, "").replace(",", ".")) || Infinity;
            return na <= nb ? a : b;
          })
        : "";
      const payload = {
        destino: destNames,
        hotel: destFilled.map((d) => d.hotel).filter(Boolean).slice(0, 2).join(" / "),
        servicos: destFilled.map((d) => d.incluso).filter(Boolean)[0] ?? "",
        preco: menorPreco ? `a partir de R$ ${menorPreco}` : "",
        parcelas: destFilled.map((d) => d.parc).filter(Boolean)[0] ?? "",
        datas: destFilled.map((d) => formatPeriodo(d.ida, d.volta)).filter(Boolean).slice(0, 2).join(" / "),
        tipo: "Lâmina Instagram — 4 destinos (promocional)",
        briefing: legBriefing.trim() || undefined,
        sem_emojis: semEmojis,
      };
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      const txt = (json?.legenda ?? "").toString();
      if (txt) {
        setLegenda(txt);
        set("lam_legenda", txt);
      } else {
        alert("Não consegui gerar a legenda. Tente novamente.");
      }
    } catch (err) {
      console.error("[Lâmina] IA legenda:", err);
      alert("Erro ao gerar legenda.");
    } finally {
      setLegLoading(false);
    }
  }

  async function handleCopyLegenda() {
    if (!legenda) return;
    try {
      await navigator.clipboard.writeText(legenda);
      setLegCopied(true);
      setTimeout(() => setLegCopied(false), 2000);
    } catch {
      /* ignorado */
    }
  }

  return (
    <>
      <Section title="Título da Arte" icon="✦">
        <Field label="Linha 1">
          <div className="flex gap-1.5">
            <input
              value={cab.titulo1}
              onChange={(e) => setCab((p) => ({ ...p, titulo1: e.target.value }))}
              placeholder="Férias dos Sonhos Já!"
              className={`${INPUT_CLASS} flex-1`}
              maxLength={25}
            />
            <button
              type="button"
              onClick={handleIATitulo}
              title="Sugerir com IA (offline)"
              className="shrink-0 rounded-lg border px-2.5 text-[10px] font-bold"
              style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "rgba(255,122,26,0.08)" }}
            >
              ✦ IA
            </button>
          </div>
        </Field>
        <Field label="Linha 2">
          <input
            value={cab.titulo2}
            onChange={(e) => setCab((p) => ({ ...p, titulo2: e.target.value }))}
            placeholder="Voe com a Azul Viagens"
            className={INPUT_CLASS}
            maxLength={30}
          />
        </Field>
      </Section>

      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const active = curDest === i;
          const label = dests[i].destino
            ? dests[i].destino.toUpperCase().slice(0, 8)
            : `Dest ${i + 1}`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurDest(i)}
              className="rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={
                active
                  ? { background: "var(--brand-primary)", color: "#FFFFFF", borderColor: "var(--brand-primary)" }
                  : { background: "var(--bg1)", color: "var(--txt3)", borderColor: "var(--bdr)" }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <Section title="Destino & Voo" icon="📍">
        <Field label="Destino">
          <SearchableSelect
            value={d.destino}
            onChange={(v) => updateDest(curDest, { destino: capitalizarDestino(v) })}
            options={destinoOpts}
            placeholder="Buscar destino..."
            allowCustom
          />
        </Field>
        <div className="flex flex-col gap-2">
          <Field label="Saída">
            <input
              value={d.saida}
              onChange={(e) => updateDest(curDest, { saida: e.target.value })}
              placeholder="GRU"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Tipo Voo">
            <SearchableSelect
              value={d.voo || ""}
              onChange={(v) => updateDest(curDest, { voo: v })}
              options={["Voo Direto", "Voo Conexão"]}
              placeholder="Selecione"
              readOnly
            />
          </Field>
        </div>
      </Section>

      <Section title="Datas" icon="📅">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ida">
            <input
              type="date"
              min={today}
              value={d.ida}
              onChange={(e) => updateDest(curDest, { ida: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Volta">
            <input
              type="date"
              min={d.ida || today}
              value={d.volta}
              onChange={(e) => updateDest(curDest, { volta: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        {nts > 0 && (
          <p className="text-[10px] text-[var(--txt3)]">
            ✈ {nts} noite{nts === 1 ? "" : "s"} · {formatPeriodo(d.ida, d.volta)}
          </p>
        )}
      </Section>

      <Section title="Hotel & Incluso" icon="🏨">
        <Field label="Hotel">
          <SearchableSelect
            value={d.hotel}
            onChange={(v) => updateDest(curDest, { hotel: v })}
            options={hotelOpts}
            placeholder="Buscar hotel..."
            allowCustom
          />
        </Field>
        <Field label="Incluso">
          <SearchableSelect
            value={d.incluso || ""}
            onChange={(v) => updateDest(curDest, { incluso: v })}
            options={["Aéreo + Hotel", "Aéreo + Hotel + Transfer", "Só Aéreo", "Só Hotel"]}
            placeholder="Selecione ou digite..."
            allowCustom
          />
        </Field>
      </Section>

      <Section title="Pagamento" icon="💰">
        <Field label="Forma de Pagamento">
          <SearchableSelect
            value={d.pgto || ""}
            onChange={(v) => updateDest(curDest, { pgto: v, ...(v === "Cartão" ? { entrada: "" } : {}) })}
            options={["Cartão", "Boleto"]}
            placeholder="Selecione"
            readOnly
          />
        </Field>
        {d.pgto === "Boleto" && (
          <Field label="Valor da Entrada (R$)">
            <input
              value={d.entrada}
              onChange={(e) => updateDest(curDest, { entrada: e.target.value })}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                updateDest(curDest, { entrada: f.formatted || e.target.value });
              }}
              placeholder="1.500,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Parcelas">
            <SearchableSelect
              value={d.parc}
              onChange={(v) => updateDest(curDest, { parc: v })}
              options={PARCELAS_OPTS}
              placeholder="12x"
              readOnly
            />
          </Field>
          <Field label="Valor Parcela">
            <input
              value={d.valor}
              onChange={(e) => updateDest(curDest, { valor: e.target.value })}
              onBlur={(e) => {
                const f = applyPriceMask(e.target.value);
                updateDest(curDest, { valor: f.formatted || e.target.value });
              }}
              placeholder="890,00"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="À Vista (por pessoa)">
          <input
            value={d.total}
            onChange={(e) => updateDest(curDest, { total: e.target.value })}
            onBlur={(e) => {
              const f = applyPriceMask(e.target.value);
              updateDest(curDest, { total: f.formatted || e.target.value });
            }}
            placeholder="8.900,00"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <Section title="Legenda (IA)" icon="✨">
        <Field label="Sua ideia (opcional)">
          <input
            value={legBriefing}
            onChange={(e) => setLegBriefing(e.target.value)}
            placeholder="Ex: promoção de férias para famílias, tom animado"
            className={INPUT_CLASS}
            maxLength={200}
          />
        </Field>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleIALegenda}
            disabled={legLoading}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50"
            style={{ borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }}
          >
            {legLoading ? "Gerando…" : "✦ Gerar legenda"}
          </button>
          <button
            type="button"
            onClick={() => setSemEmojis(!semEmojis)}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all"
            style={{ borderColor: "var(--bdr)", color: semEmojis ? "var(--orange)" : "var(--txt3)", background: semEmojis ? "rgba(255,122,26,0.08)" : "transparent" }}
          >
            {semEmojis ? "Sem emojis ✓" : "Sem emojis"}
          </button>
          {legenda && (
            <button
              type="button"
              onClick={handleCopyLegenda}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
              style={{ borderColor: "var(--bdr)", color: legCopied ? "var(--green, #10B981)" : "var(--txt2)" }}
            >
              {legCopied ? "✓ Copiado" : "📋 Copiar"}
            </button>
          )}
        </div>
        {legenda && (
          <textarea
            value={legenda}
            onChange={(e) => { setLegenda(e.target.value); set("lam_legenda", e.target.value); }}
            rows={4}
            className={`${INPUT_CLASS} !h-auto py-2 resize-y min-h-[80px] leading-snug`}
            placeholder="Legenda gerada aparecerá aqui…"
          />
        )}
        {!legenda && (
          <p className="text-[10px] text-[var(--txt3)]">Preencha pelo menos 1 destino e clique em &quot;Gerar legenda&quot; para criar uma legenda promocional para Instagram.</p>
        )}
      </Section>

      <Section title="Personalização Visual" icon="✦">
        <Field label="Cor tema">
          <div className="grid grid-cols-4 gap-1.5">
            {LAM_PALETTES.map((p, i) => {
              const active = palette === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPalette(i)}
                  title={p.name}
                  className="flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-all"
                  style={
                    active
                      ? { borderColor: "var(--brand-primary)", background: "var(--bg1)" }
                      : { borderColor: "var(--bdr)", background: "transparent" }
                  }
                >
                  <span
                    className="block rounded-md"
                    style={{ width: 24, height: 24, background: p.accent, boxShadow: active ? "0 0 0 2px var(--txt) inset" : "none" }}
                  />
                  <span className="text-[9px] font-semibold text-[var(--txt2)] leading-none">
                    {p.emoji} {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Fundo">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleShuffleBg}
              disabled={bgLoading}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
              style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
            >
              {bgLoading ? "…" : "⟳ Aleatório"}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={bgLoading}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
              style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
            >
              ↑ Upload
            </button>
            {fields.imgfundo ? (
              <button
                type="button"
                onClick={() => set("imgfundo", "")}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                style={{ borderColor: "var(--bdr)", color: "var(--txt3)" }}
              >
                ✕ Limpar
              </button>
            ) : null}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />
          </div>
        </Field>
      </Section>
    </>
  );
}

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

/* ── Constantes ──────────────────────────────────────── */

// V1 DESCONTO_VALS = [5,10,15,20,25,30,35,40,45,50]; UI expõe subconjuntos por tipo.
export const DESCONTO_OPTS_FORM = ["10%", "15%", "20%", "25%", "30%", "40%", "50%"];
export const DESCONTO_OPTS_CAMPANHA = ["5%", "10%", "15%", "20%", "25%", "30%"];
export const DESCONTO_OPTS_ANOITECEU = ["5%", "10%", "15%", "20%", "25%", "30%", "40%", "50%"];
export const PARCELAS_OPTS_FORM = Array.from({ length: 20 }, (_, i) => `${i + 1}x`);
// V1 _fParcelasPassagem: 2x..36x
export const PARCELAS_PASSAGEM_OPTS = Array.from({ length: 35 }, (_, i) => `${i + 2}x`);
export const NAVIOS_DEFAULT = [
  "MSC Seashore", "MSC Grandiosa", "MSC Musica", "MSC Armonia",
  "MSC Magnifica", "Costa Fascinosa", "Costa Diadema",
  "Norwegian Jade", "Carnival Jubilee",
];

// V1 CIA_LOGOS exatos (client.js:1708-1717).
const CIA_LOGOS: Record<string, string> = {
  ROYAL:     "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106662/royal_madqky.png",
  CELEBRITY: "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106665/xcruise_blcv45.png",
  PRINCESS:  "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106664/princess_xteony.png",
  OCEANIA:   "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106671/ocean_mccpbc.png",
  NORWEGIAN: "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106667/norwegian_ugg7j9.png",
  MSC:       "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106669/msc_uqiqji.png",
  COSTA:     "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106668/costa_rzno1p.png",
  DISNEY:    "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774106663/disney_ttcdgq.png",
};

function resolveLogoCia(navio: string): string {
  const n = (navio || "").toUpperCase();
  for (const [cia, url] of Object.entries(CIA_LOGOS)) if (n.includes(cia)) return url;
  return "";
}

// V1 costuma vir com "PRINCESS CRUISE - ", "X CELEBRITY CRUISE - ", etc. no começo.
function cleanShipName(navio: string): string {
  return (navio || "")
    .replace(/^(X\s+)?(PRINCESS|CELEBRITY|ROYAL|OCEANIA|NORWEGIAN|MSC|COSTA|DISNEY)\s+CRUISES?\s*-\s*/i, "")
    .trim();
}

/* ── Helpers ─────────────────────────────────────────── */

// Port V1 utils.js:548-592 (Dict.servicos + Dict.ortho + applyServico + isAllInclusive).
const DICT_SERVICOS: [RegExp, string][] = [
  [/^traslado(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^translado(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^transfer(\s+(ida\s+e\s+volta|i\/v))?$/i, "Transfer"],
  [/^caf[eé]\s+da\s+manh[aã]\s+e\s+(almo[cç]o|jan(tar)?)$/i, "Meia Pensão"],
  [/^meia\s+pens[aã]o$/i, "Meia Pensão"],
  [/^(caf[eé]\s+da\s+manh[aã],?\s+almo[cç]o\s+e\s+jantar|pens[aã]o\s+completa)$/i, "Pensão Completa"],
  [/^caf[eé]\s+da\s+manh[aã]$/i, "Café da Manhã"],
  [/^all\s+inclusive$/i, "All Inclusive"],
  [/^tudo\s+inclu[ií]do$/i, "All Inclusive"],
];
const DICT_ORTHO: [RegExp, string][] = [
  [/\bcafe\b/gi, "Café"], [/\bCAFE\b/g, "CAFÉ"],
  [/\bmanha\b/gi, "Manhã"], [/\bMANHA\b/g, "MANHÃ"],
  [/\balmoco\b/gi, "Almoço"], [/\bALMOCO\b/g, "ALMOÇO"],
  [/\bjantar\b/gi, "Jantar"],
  [/\bpensao\b/gi, "Pensão"], [/\bPENSAO\b/g, "PENSÃO"],
  [/\binclusao\b/gi, "Inclusão"],
  [/\bexcursao\b/gi, "Excursão"],
  [/\bnavegacao\b/gi, "Navegação"],
  [/\bcabine\b/gi, "Cabine"],
  [/\baeroporo\b/gi, "Aeroporto"],
  [/\bpassagen\b/gi, "Passagem"],
  [/\bbagagen\b/gi, "Bagagem"],
  [/\bconexao\b/gi, "Conexão"],
  [/\bSao\b/g, "São"], [/\bSAO\b/g, "SÃO"],
];

export function dictApplyServico(val: string): string {
  if (!val) return val;
  const v = val.trim();
  for (const [re, rep] of DICT_SERVICOS) if (re.test(v)) return rep;
  let r = v;
  for (const [re, rep] of DICT_ORTHO) r = r.replace(re, rep);
  return r;
}
export function dictIsAllInclusive(val: string): boolean {
  return /all\s*inclusive|tudo\s*inclu[ií]do/i.test(val || "");
}

function capitalizarDestino(v: string): string {
  return v.toUpperCase();
}

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
  icon?: string;
  color?: string;
  children: ReactNode;
}) {
  void color;
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ background: "var(--bg1)", borderColor: "var(--bdr)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon && <span className="text-[14px]">{icon}</span>}
        <h4 className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--txt2)]">
          {title}
        </h4>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]";

/* ── SearchableSelect ─────────────────────────────────── */

export function SearchableSelect({
  value, onChange, options, placeholder, allowCustom = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [q, options]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className={INPUT_CLASS}
        value={open ? q : value}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQ(value); }}
        onChange={(e) => { setQ(e.target.value); if (allowCustom) onChange(e.target.value); }}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-auto rounded-lg border shadow-lg"
          style={{ background: "var(--bg1)", borderColor: "var(--bdr)" }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-[12px] text-[var(--txt)] hover:bg-[var(--bg2)]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shared sections ────────────────────────────────── */

type Fields = Record<string, string | boolean | number | undefined | null>;
type Setter = (k: string, v: string | boolean | number | null) => void;

export function BadgesSection({
  fields, set, formType, feriadoOpts, binds, descontoOpts,
}: {
  fields: Fields;
  set: Setter;
  formType: "pacote" | "campanha";
  feriadoOpts?: string[];
  binds?: Set<string>;
  descontoOpts?: string[];
}) {
  const toggle = (key: string) => set(key, !fields[key]);
  const Toggle = ({ label, k }: { label: string; k: string }) => (
    <Field label={label}>
      <button
        type="button"
        onClick={() => toggle(k)}
        className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
        style={
          fields[k]
            ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
            : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
        }
      >
        {fields[k] ? "✓ Ativado" : "Desativado"}
      </button>
    </Field>
  );

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
    <Section title="Selos" icon="🏷️">
      {showAll && <Toggle label="All Inclusive"   k="allinclusive" />}
      {showUltCh && <Toggle label="Última Chamada"  k="ultimachamada" />}
      {showUltLug && <Toggle label="Últimos Lugares" k="ultimoslugares" />}
      {showOfertas && <Toggle label="Ofertas" k="ofertas" />}

      {showDesc && (
        <Field label="Desconto">
          <div className="flex flex-wrap gap-1">
            {(descontoOpts ?? DESCONTO_OPTS_CAMPANHA).map((d) => {
              // Guarda apenas número (sem "%") em `numerodesconto` — binds de template só retornam o número.
              const num = d.replace("%", "");
              const selected = fields.numerodesconto === num;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("numerodesconto", selected ? "" : num)}
                  className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all"
                  style={
                    selected
                      ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                      : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
          {fields.numerodesconto ? (
            <p className="mt-1 text-[10px] text-[var(--txt3)]">
              Badge mostrará: <strong>{String(fields.numerodesconto)}%</strong>
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

export function PagamentoSection({
  fields, set, totalLabel, binds,
}: {
  fields: Fields;
  set: Setter;
  totalLabel: string;
  binds?: Set<string>;
}) {
  // V1 client.js:1377 — só Cartão de Crédito / Boleto. Valores batem com o que PreviewStage.resolveBindParam("formapagamento") espera.
  const formas: { value: string; label: string }[] = [
    { value: "Cartão de Crédito", label: "Cartão s/ Juros" },
    { value: "Boleto",            label: "Boleto c/ Entrada" },
  ];

  const showForma = hasBind(binds, "formapagamento");
  const showEntrada = fields.formapagamento === "Boleto" && hasBind(binds, "entrada");
  const showParcelas = hasBind(binds, "parcelas");
  const showValorParc = hasBind(binds, "valorparcela");
  const showTotal = hasBind(binds, "valortotal", "totalduplo");
  if (!showForma && !showEntrada && !showParcelas && !showValorParc && !showTotal) return null;

  return (
    <Section title="Pagamento" icon="💳">
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
                {fields.formapagamento === "Cartão de Crédito"
                  ? "No Cartão de Crédito Sem Juros"
                  : fields.formapagamento === "Boleto"
                    ? `Entrada de R$ ${fields.entrada || "___"} +`
                    : String(fields.formapagamento)}
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
            placeholder="ex. 1.200,00"
            className={INPUT_CLASS}
          />
        </Field>
      )}

      {(showParcelas || showValorParc) && (
        <div className="grid grid-cols-2 gap-2">
          {showParcelas && (
            <Field label="Parcelas *">
              <SearchableSelect
                value={(fields.parcelas as string) || ""}
                onChange={(v) => set("parcelas", v)}
                options={PARCELAS_OPTS_FORM}
                placeholder="Selecionar..."
              />
            </Field>
          )}
          {showValorParc && (
            <Field label="Valor da Parcela (R$) *">
              <input
                type="text"
                value={(fields.valorparcela as string) || ""}
                onChange={(e) => set("valorparcela", e.target.value)}
                placeholder="ex. 890,00"
                className={INPUT_CLASS}
              />
            </Field>
          )}
        </div>
      )}

      {showTotal && (
        <Field label={`Valor Total (R$) — ${totalLabel}`}>
          <input
            type="text"
            value={(fields.valortotal as string) || ""}
            onChange={(e) => set("valortotal", e.target.value)}
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

/* ── CampanhaForm ───────────────────────────────────── */

export function CampanhaForm({
  fields, set, servicos, setServicos, today, feriadoOpts, binds,
}: {
  fields: Fields;
  set: Setter;
  servicos: string[];
  setServicos: (s: string[]) => void;
  today: string;
  feriadoOpts?: string[];
  binds?: Set<string>;
}) {
  const noites = calcularNoites(
    (fields.dataida as string) || "",
    (fields.datavolta as string) || "",
  );

  const showDestino = hasBind(binds, "destino");
  const showSaida = hasBind(binds, "saida");
  const showTipovoo = hasBind(binds, "tipovoo");
  const showIda = hasBind(binds, "dataida");
  const showVolta = hasBind(binds, "datavolta");
  const showHotel = hasBind(binds, "hotel", "imghotel");
  // V1 _fGrpServicos: 6 slots. Sem binds = todos 6.
  const showServicos = !binds || Array.from({ length: 6 }, (_, i) => `servico${i + 1}`).some((k) => binds.has(k));

  return (
    <>
      {(showDestino || showSaida || showTipovoo) && (
        <Section title="Destino" icon="✈️">
          {showDestino && (
            <Field label="Destino *">
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
            <div className="grid grid-cols-2 gap-2">
              {showSaida && (
                <Field label="Saída">
                  <SearchableSelect
                    value={(fields.saida as string) || ""}
                    onChange={(v) => set("saida", v)}
                    options={["GRU", "CGH", "VCP", "BSB", "GIG", "SDU", "SSA", "FOR", "REC", "CWB", "POA", "FLN"]}
                    placeholder="Aeroporto..."
                    allowCustom
                  />
                </Field>
              )}
              {showTipovoo && (
                <Field label="Tipo de Voo">
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
        </Section>
      )}

      {(showIda || showVolta) && (
        <Section title="Datas" icon="📅">
          <div className="grid grid-cols-2 gap-2">
            {showIda && (
              <Field label="Ida *">
                <input
                  type="date"
                  min={today}
                  value={(fields.dataida as string) || ""}
                  onChange={(e) => {
                    set("dataida", e.target.value);
                    set("dataida_fmt", fmtDate(e.target.value));
                  }}
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
                  onChange={(e) => {
                    set("datavolta", e.target.value);
                    set("datavolta_fmt", fmtDate(e.target.value));
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
          {noites > 0 && (
            <p className="text-[11px] text-[var(--txt3)]">🗓️ {noites} noites</p>
          )}
        </Section>
      )}

      {showHotel && (
        <Section title="Hotel" icon="🏨">
          <Field label="Hotel *">
            <input
              value={(fields.hotel as string) || ""}
              onChange={(e) => set("hotel", e.target.value)}
              placeholder="Nome do hotel"
              className={INPUT_CLASS}
            />
          </Field>
        </Section>
      )}

      {showServicos && (
        <Section title="Serviços Inclusos" icon="🎒">
          {Array.from({ length: 6 }, (_, i) => i).map((i) => {
            if (binds && !binds.has(`servico${i + 1}`)) return null;
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
                  // V1: aplica dicionário (traslado→Transfer, café da manhã→Café da Manhã, etc.) e detecta All Inclusive.
                  const raw = e.target.value;
                  const v = dictApplyServico(raw);
                  const n = [...servicos];
                  n[i] = v;
                  setServicos(n);
                  set(`servico${i + 1}`, v);
                  if (dictIsAllInclusive(v)) set("allinclusive", true);
                }}
                placeholder={`Serviço ${i + 1}`}
                className={INPUT_CLASS}
              />
            );
          })}
        </Section>
      )}

      <BadgesSection fields={fields} set={set} formType="campanha" feriadoOpts={feriadoOpts} binds={binds} descontoOpts={DESCONTO_OPTS_CAMPANHA} />
      <PagamentoSection fields={fields} set={set} totalLabel="por pessoa apto. duplo" binds={binds} />
    </>
  );
}

/* ── CruzeiroForm ───────────────────────────────────── */

export function CruzeiroForm({
  fields, set, today, binds,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  binds?: Set<string>;
}) {
  const noites = calcularNoites(
    (fields.dataida as string) || "",
    (fields.datavolta as string) || "",
  );

  // V1 client.js:1727-1756 — lista de navios vem do backend (S.navios); no V2 carrega da tabela navios.
  const [navioOpts, setNavioOpts] = useState<string[]>(NAVIOS_DEFAULT);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await _sb_for_lamina.from("navios").select("nome").order("nome");
        const rows = (data ?? []) as { nome: string | null }[];
        const nomes = rows.map((r) => (r.nome || "").trim()).filter(Boolean);
        if (nomes.length) setNavioOpts(nomes);
      } catch { /* tabela ausente — usa fallback hardcoded */ }
    })();
  }, []);

  // V1 _fNavioField: ao selecionar navio, resolve logo_cia local + busca img_fundo em imgcruise.
  async function onNavioSelect(raw: string) {
    const clean = cleanShipName(raw);
    set("navio", clean);
    const logo = resolveLogoCia(clean);
    set("logo_cia", logo || "");
    try {
      const { data } = await _sb_for_lamina
        .from("imgcruise")
        .select("url")
        .ilike("cia", `%${clean.split(/\s+/)[0] || ""}%`)
        .limit(1)
        .single();
      const url = (data as { url?: string } | null)?.url;
      if (url) set("img_fundo", url);
    } catch { /* silent — mantém img_fundo atual */ }
  }

  const showNavio = hasBind(binds, "navio");
  const showItin = hasBind(binds, "itinerario");
  const showIda = hasBind(binds, "dataida");
  const showVolta = hasBind(binds, "datavolta");
  const showIncluso = hasBind(binds, "incluso");
  const showCruz = showNavio || showItin || showIda || showVolta;

  return (
    <>
      {showCruz && (
        <Section title="Cruzeiro" icon="🚢">
          {showNavio && (
            <Field label="Navio *">
              <SearchableSelect
                value={(fields.navio as string) || ""}
                onChange={onNavioSelect}
                options={navioOpts}
                placeholder="Buscar navio..."
                allowCustom
              />
            </Field>
          )}

          {showItin && (
            <Field label="Itinerário">
              <textarea
                value={(fields.itinerario as string) || ""}
                onChange={(e) => set("itinerario", e.target.value)}
                placeholder="Santos / Navegação / Búzios / Navegação / Santos"
                className={`${INPUT_CLASS} h-auto resize-none py-2`}
                rows={2}
              />
            </Field>
          )}

          {(showIda || showVolta) && (
            <div className="grid grid-cols-2 gap-2">
              {showIda && (
                <Field label="Embarque *">
                  <input
                    type="date"
                    min={today}
                    value={(fields.dataida as string) || ""}
                    onChange={(e) => {
                      set("dataida", e.target.value);
                      set("dataida_fmt", fmtDate(e.target.value));
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
              {showVolta && (
                <Field label="Desembarque *">
                  <input
                    type="date"
                    min={(fields.dataida as string) || today}
                    value={(fields.datavolta as string) || ""}
                    onChange={(e) => {
                      set("datavolta", e.target.value);
                      set("datavolta_fmt", fmtDate(e.target.value));
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
            </div>
          )}

          {noites > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2">
              <span className="text-[14px] text-[var(--orange)]">🌙</span>
              <span className="text-[12px] font-bold text-[var(--txt)]">{noites} noites</span>
              <span className="text-[10px] text-[var(--txt3)]">calculado automaticamente</span>
            </div>
          )}
        </Section>
      )}

      {showIncluso && (
        <Section title="Incluso" icon="🎒">
          <Field label="O que está incluso *">
            <textarea
              value={(fields.incluso as string) || ""}
              onChange={(e) => set("incluso", e.target.value)}
              placeholder="ex. Cabine Interna, Pensão Completa, Bebidas"
              className={`${INPUT_CLASS} h-auto resize-none py-2`}
              rows={3}
            />
          </Field>
        </Section>
      )}

      <PagamentoSection fields={fields} set={set} totalLabel="por pessoa" binds={binds} />
    </>
  );
}

/* ── AnoiteceuForm ──────────────────────────────────── */

export function AnoiteceuForm({
  fields, set, today, binds,
}: {
  fields: Fields;
  set: Setter;
  today?: string;
  binds?: Set<string>;
}) {
  const showDestino = hasBind(binds, "destino");
  const showDesc = hasBind(binds, "numerodesconto", "desconto_anoit");
  // V1 binds: datainicio / datafim / paraviagensate (fallbacks legados: inicio / fim / paraviagens).
  const showInicio = hasBind(binds, "datainicio", "inicio");
  const showFim = hasBind(binds, "datafim", "fim");
  const showPeriodo = showInicio || showFim;
  const showParaviagens = hasBind(binds, "paraviagensate", "paraviagens");

  const descontoLabel = fields.numerodesconto ? `${fields.numerodesconto}%` : "—";

  return (
    <>
      <div className="mb-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          <div>
            <p className="font-bold text-[var(--txt)]">Anoiteceu</p>
            <p className="text-[11px] text-[var(--txt3)]">Promoção noturna — preencha os campos e publique</p>
          </div>
        </div>
      </div>

      {showDestino && (
        <Section title="Destino" icon="📍">
          <Field label="Destino *">
            <input
              value={(fields.destino as string) || ""}
              onChange={(e) => set("destino", e.target.value)}
              onBlur={(e) => set("destino", e.target.value.toUpperCase())}
              placeholder="ex. CANCÚN"
              className={`${INPUT_CLASS} uppercase`}
            />
          </Field>
        </Section>
      )}

      {showDesc && (
        <Section title="Desconto" icon="🏷️">
          <Field label="Porcentagem do Desconto *">
            <div className="mb-2 flex items-center gap-4">
              <div
                className="text-5xl font-black leading-none transition-all"
                style={{ color: fields.numerodesconto ? "var(--orange)" : "var(--txt3)" }}
              >
                {descontoLabel}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {DESCONTO_OPTS_ANOITECEU.map((d) => {
                    const num = d.replace("%", "");
                    const selected = fields.numerodesconto === num;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => set("numerodesconto", selected ? "" : num)}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all"
                        style={
                          selected
                            ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                            : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--txt3)]">
                  <span>Ou digitar:</span>
                  <input
                    type="text"
                    value={(fields.numerodesconto as string) || ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      set("numerodesconto", v);
                    }}
                    placeholder="ex. 35"
                    maxLength={3}
                    className={`${INPUT_CLASS} inline-block h-6 w-14 px-2 text-[11px]`}
                  />
                </div>
              </div>
            </div>
          </Field>
        </Section>
      )}

      {(showPeriodo || showParaviagens) && (
        <Section title="Período da Promoção" icon="📅">
          {showPeriodo && (
            <div className="grid grid-cols-2 gap-2">
              {showInicio && (
                <Field label="Data Início *">
                  <input
                    type="date"
                    min={today}
                    value={(fields.datainicio_iso as string) || ""}
                    onChange={(e) => {
                      set("datainicio_iso", e.target.value);
                      set("datainicio", fmtDataCurta(e.target.value));
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
              {showFim && (
                <Field label="Data Fim *">
                  <input
                    type="date"
                    min={(fields.datainicio_iso as string) || today}
                    value={(fields.datafim_iso as string) || ""}
                    onChange={(e) => {
                      set("datafim_iso", e.target.value);
                      set("datafim", fmtDataCurta(e.target.value));
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
            </div>
          )}

          {showParaviagens && (
            <Field label="Para Viagens Até *">
              <input
                type="date"
                min={today}
                value={(fields.paraviagensate_iso as string) || ""}
                onChange={(e) => {
                  set("paraviagensate_iso", e.target.value);
                  set("paraviagensate", fmtDate(e.target.value));
                }}
                className={INPUT_CLASS}
              />
              <p className="mt-1 text-[10px] text-[var(--txt3)]">Data limite de validade das passagens/pacotes</p>
            </Field>
          )}
        </Section>
      )}
    </>
  );
}

/* ── PassagemForm ──────────────────────────────────── */
/* Port V1 client.js:1239-1274 (_fPassagem + _fParcelasPassagem).
 * Campos: origem (Saída), destino (uppercase), tipovoo (radio),
 * dataida/datavolta (min=hoje/ida), cia (companhia aérea).
 * Pagamento: forma, parcelas (2x–36x), valor parcela, total "por pessoa".
 */
export function PassagemForm({
  fields, set, today, binds,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  binds?: Set<string>;
}) {
  const showOrigem = hasBind(binds, "origem", "saida");
  const showDestino = hasBind(binds, "destino");
  const showTipovoo = hasBind(binds, "tipovoo");
  const showIda = hasBind(binds, "dataida");
  const showVolta = hasBind(binds, "datavolta");
  const showCia = hasBind(binds, "cia");
  const showRotulos = showOrigem || showDestino || showTipovoo;
  const showDatas = showIda || showVolta;

  // V1 valida que volta >= ida (_fDate). Aqui replicamos via min na volta.
  const minVolta = (fields.dataida as string) || today;

  return (
    <>
      {showRotulos && (
        <Section title="Rota" icon="✈️">
          {showOrigem && (
            <Field label="Origem (Saída) *">
              <input
                value={(fields.origem as string) || (fields.saida as string) || ""}
                onChange={(e) => {
                  set("origem", e.target.value);
                  set("saida", e.target.value);
                }}
                onBlur={(e) => {
                  const v = e.target.value.toUpperCase();
                  set("origem", v); set("saida", v);
                }}
                placeholder="ex. GRU"
                className={`${INPUT_CLASS} uppercase`}
              />
            </Field>
          )}
          {showDestino && (
            <Field label="Destino *">
              <input
                value={(fields.destino as string) || ""}
                onChange={(e) => set("destino", capitalizarDestino(e.target.value))}
                onBlur={(e) => set("destino", e.target.value.toUpperCase())}
                placeholder="ex. LISBOA"
                className={`${INPUT_CLASS} uppercase`}
              />
            </Field>
          )}
          {showTipovoo && (
            <Field label="Tipo de Voo">
              <div className="flex gap-1">
                {["Voo Direto", "Voo Conexão"].map((opt) => {
                  const selected = fields.tipovoo === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set("tipovoo", opt)}
                      className="flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
                      style={
                        selected
                          ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
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
        </Section>
      )}

      {showDatas && (
        <Section title="Datas" icon="📅">
          <div className="grid grid-cols-2 gap-2">
            {showIda && (
              <Field label="Ida *">
                <input
                  type="date"
                  min={today}
                  value={(fields.dataida as string) || ""}
                  onChange={(e) => {
                    set("dataida", e.target.value);
                    set("dataida_fmt", fmtDate(e.target.value));
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            {showVolta && (
              <Field label="Volta *">
                <input
                  type="date"
                  min={minVolta}
                  value={(fields.datavolta as string) || ""}
                  onChange={(e) => {
                    set("datavolta", e.target.value);
                    set("datavolta_fmt", fmtDate(e.target.value));
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
        </Section>
      )}

      {showCia && (
        <Section title="Companhia Aérea" icon="🛫">
          <Field label="CIA">
            <input
              value={(fields.cia as string) || ""}
              onChange={(e) => set("cia", e.target.value)}
              placeholder="ex. LATAM, GOL, Azul"
              className={INPUT_CLASS}
            />
          </Field>
        </Section>
      )}

      <PagamentoSection fields={fields} set={set} totalLabel="por pessoa" binds={binds} />
    </>
  );
}

/* ── QuatroDestinosForm ──────────────────────────────
 * Card WhatsApp com 4 sub-abas (destinos 1-4).
 *   - Globais: titulo, subtitulo
 *   - Por destino: d{n}_{destino, saida, voo, ida, volta, hotel, incluso,
 *                        formapagamento, parcelas, valorparcela, avista}
 * Binds antigos `lam_*` foram renomeados via database/rename_lam_to_d_binds.sql.
 */

const D_VOO_OPTS = ["Voo Direto", "Voo Conexão"];
const D_INCLUSO_OPTS = ["Aéreo + Hotel + Transfer", "Aéreo + Hotel", "Hotel + Transfer", "Só Hotel", "Cruzeiro"];
const D_FORMA_PGTO_OPTS = ["Cartão de Crédito", "Boleto"];

type QuatroDestinosFormProps = {
  fields: Fields;
  set: Setter;
  today?: string;
  binds?: Set<string>;
  // Props legado (lâmina V1) — aceitas para compat mas ignoradas.
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
};

export function QuatroDestinosForm({ fields, set, today, binds }: QuatroDestinosFormProps) {
  const [destIdx, setDestIdx] = useState<1 | 2 | 3 | 4>(1);

  const k = (n: number, suffix: string) => `d${n}_${suffix}`;
  const numeric = (v: string) => v.replace(/[^0-9,.]/g, "");
  const upperOnBlur = (key: string) => (e: React.FocusEvent<HTMLInputElement>) =>
    set(key, e.target.value.toUpperCase());

  const showTitulo = hasBind(binds, "titulo");
  const showSubtitulo = hasBind(binds, "subtitulo");

  const n = destIdx;
  const showDestino = hasBind(binds, k(n, "destino"));
  const showSaida = hasBind(binds, k(n, "saida"));
  const showVoo = hasBind(binds, k(n, "voo"));
  const showIda = hasBind(binds, k(n, "ida"));
  const showVolta = hasBind(binds, k(n, "volta"));
  const showHotel = hasBind(binds, k(n, "hotel"));
  const showIncluso = hasBind(binds, k(n, "incluso"));
  const showFormaPgto = hasBind(binds, k(n, "formapagamento"));
  const showParcelas = hasBind(binds, k(n, "parcelas"));
  const showValorParc = hasBind(binds, k(n, "valorparcela"));
  const showAvista = hasBind(binds, k(n, "avista"));

  const anyRotulos = showDestino || showSaida || showVoo;
  const anyDatas = showIda || showVolta;
  const anyHotel = showHotel || showIncluso;
  const anyPgto = showFormaPgto || showParcelas || showValorParc || showAvista;

  return (
    <>
      {(showTitulo || showSubtitulo) && (
        <Section title="Título do Card" icon="✦">
          {showTitulo && (
            <Field label="Linha 1">
              <input
                value={(fields.titulo as string) || ""}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="ex. FÉRIAS DOS SONHOS"
                className={INPUT_CLASS}
                maxLength={30}
              />
            </Field>
          )}
          {showSubtitulo && (
            <Field label="Linha 2">
              <input
                value={(fields.subtitulo as string) || ""}
                onChange={(e) => set("subtitulo", e.target.value)}
                placeholder="ex. Pacotes com a Azul Viagens"
                className={INPUT_CLASS}
                maxLength={40}
              />
            </Field>
          )}
        </Section>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => {
          const active = destIdx === i;
          const label = (fields[k(i, "destino")] as string)?.toUpperCase().slice(0, 8) || `Dest ${i}`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setDestIdx(i as 1 | 2 | 3 | 4)}
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

      {anyRotulos && (
        <Section title={`Destino ${n} — Voo`} icon="📍">
          {showDestino && (
            <Field label="Destino *">
              <input
                value={(fields[k(n, "destino")] as string) || ""}
                onChange={(e) => set(k(n, "destino"), e.target.value)}
                onBlur={upperOnBlur(k(n, "destino"))}
                placeholder="ex. CANCÚN"
                className={`${INPUT_CLASS} uppercase`}
              />
            </Field>
          )}
          {(showSaida || showVoo) && (
            <div className="grid grid-cols-2 gap-2">
              {showSaida && (
                <Field label="Saída">
                  <input
                    value={(fields[k(n, "saida")] as string) || ""}
                    onChange={(e) => set(k(n, "saida"), e.target.value)}
                    onBlur={upperOnBlur(k(n, "saida"))}
                    placeholder="ex. GRU"
                    className={`${INPUT_CLASS} uppercase`}
                  />
                </Field>
              )}
              {showVoo && (
                <Field label="Tipo de Voo">
                  <select
                    value={(fields[k(n, "voo")] as string) || "Voo Direto"}
                    onChange={(e) => set(k(n, "voo"), e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {D_VOO_OPTS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              )}
            </div>
          )}
        </Section>
      )}

      {anyDatas && (
        <Section title="Datas" icon="📅">
          <div className="grid grid-cols-2 gap-2">
            {showIda && (
              <Field label="Ida">
                <input
                  type="date"
                  min={today}
                  value={(fields[k(n, "ida")] as string) || ""}
                  onChange={(e) => set(k(n, "ida"), e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            {showVolta && (
              <Field label="Volta">
                <input
                  type="date"
                  min={(fields[k(n, "ida")] as string) || today}
                  value={(fields[k(n, "volta")] as string) || ""}
                  onChange={(e) => set(k(n, "volta"), e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
          </div>
        </Section>
      )}

      {anyHotel && (
        <Section title="Hotel & Incluso" icon="🏨">
          {showHotel && (
            <Field label="Hotel">
              <input
                value={(fields[k(n, "hotel")] as string) || ""}
                onChange={(e) => set(k(n, "hotel"), e.target.value)}
                placeholder="Nome do hotel"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {showIncluso && (
            <Field label="Incluso">
              <select
                value={(fields[k(n, "incluso")] as string) || ""}
                onChange={(e) => set(k(n, "incluso"), e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">—</option>
                {D_INCLUSO_OPTS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          )}
        </Section>
      )}

      {anyPgto && (
        <Section title="Pagamento" icon="💰">
          {showFormaPgto && (
            <Field label="Forma de Pagamento">
              <select
                value={(fields[k(n, "formapagamento")] as string) || ""}
                onChange={(e) => set(k(n, "formapagamento"), e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">—</option>
                {D_FORMA_PGTO_OPTS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          )}
          {(showParcelas || showValorParc) && (
            <div className="grid grid-cols-2 gap-2">
              {showParcelas && (
                <Field label="Parcelas">
                  <select
                    value={(fields[k(n, "parcelas")] as string) || ""}
                    onChange={(e) => set(k(n, "parcelas"), e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">—</option>
                    {PARCELAS_OPTS_FORM.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              )}
              {showValorParc && (
                <Field label="Valor da Parcela (R$)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(fields[k(n, "valorparcela")] as string) || ""}
                    onChange={(e) => set(k(n, "valorparcela"), numeric(e.target.value))}
                    placeholder="ex. 890,00"
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
            </div>
          )}
          {showAvista && (
            <Field label="À Vista (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={(fields[k(n, "avista")] as string) || ""}
                onChange={(e) => set(k(n, "avista"), numeric(e.target.value))}
                placeholder="ex. 8.900,00"
                className={INPUT_CLASS}
              />
            </Field>
          )}
        </Section>
      )}
    </>
  );
}


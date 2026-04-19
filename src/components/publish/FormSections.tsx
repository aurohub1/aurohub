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

/* ── Constantes ──────────────────────────────────────── */

export const DESCONTO_OPTS_FORM = ["10%", "15%", "20%", "25%", "30%", "40%", "50%"];
export const PARCELAS_OPTS_FORM = Array.from({ length: 20 }, (_, i) => `${i + 1}x`);
export const NAVIOS_DEFAULT = [
  "MSC Seashore", "MSC Grandiosa", "MSC Musica", "MSC Armonia",
  "MSC Magnifica", "Costa Fascinosa", "Costa Diadema",
  "Norwegian Jade", "Carnival Jubilee",
];

/* ── Helpers ─────────────────────────────────────────── */

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
  fields, set, formType, feriadoOpts, binds,
}: {
  fields: Fields;
  set: Setter;
  formType: "pacote" | "campanha";
  feriadoOpts?: string[];
  binds?: Set<string>;
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
            {DESCONTO_OPTS_FORM.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("numerodesconto", fields.numerodesconto === d ? "" : d)}
                className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all"
                style={
                  fields.numerodesconto === d
                    ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                    : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                }
              >
                {d}
              </button>
            ))}
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
    { value: "debito",  label: "Débito" },
  ];

  const showForma = hasBind(binds, "formapagamento");
  const showEntrada = fields.formapagamento === "entrada" && hasBind(binds, "entrada");
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
  // Serviços — mostra se qualquer servico1..N estiver presente (sem binds = todos).
  const showServicos = !binds || Array.from({ length: 8 }, (_, i) => `servico${i + 1}`).some((k) => binds.has(k));

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
          {servicos.map((s, i) => {
            if (binds && !binds.has(`servico${i + 1}`)) return null;
            return (
              <input
                key={i}
                value={s}
                onChange={(e) => {
                  const n = [...servicos];
                  n[i] = e.target.value;
                  setServicos(n);
                }}
                onBlur={() => {
                  if (servicos.some((sv) => sv.toLowerCase().includes("all inclusive"))) {
                    set("allinclusive", true);
                  }
                }}
                placeholder={`Serviço ${i + 1}`}
                className={INPUT_CLASS}
              />
            );
          })}
        </Section>
      )}

      <BadgesSection fields={fields} set={set} formType="campanha" feriadoOpts={feriadoOpts} binds={binds} />
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
                onChange={(v) => set("navio", v)}
                options={NAVIOS_DEFAULT}
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
  fields, set, binds,
}: {
  fields: Fields;
  set: Setter;
  binds?: Set<string>;
}) {
  const showDesc = hasBind(binds, "desconto_anoit");
  const showInicio = hasBind(binds, "inicio");
  const showFim = hasBind(binds, "fim");
  const showPeriodo = showInicio || showFim;
  const showParaviagens = hasBind(binds, "paraviagens");

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

      {showDesc && (
        <Section title="Desconto" icon="🏷️">
          <Field label="Porcentagem do Desconto *">
            <div className="mb-2 flex items-center gap-4">
              <div
                className="text-5xl font-black leading-none transition-all"
                style={{ color: fields.desconto_anoit ? "var(--orange)" : "var(--txt3)" }}
              >
                {(fields.desconto_anoit as string) || "—"}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {DESCONTO_OPTS_FORM.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("desconto_anoit", fields.desconto_anoit === d ? "" : d)}
                      className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all"
                      style={
                        fields.desconto_anoit === d
                          ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                          : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--txt3)]">
                  <span>Ou digitar:</span>
                  <input
                    type="text"
                    value={(fields.desconto_anoit as string) || ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      set("desconto_anoit", v ? `${v}%` : "");
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
                    value={(fields.inicio_iso as string) || ""}
                    onChange={(e) => {
                      set("inicio_iso", e.target.value);
                      set("inicio", fmtDataCurta(e.target.value));
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
              {showFim && (
                <Field label="Data Fim *">
                  <input
                    type="date"
                    min={(fields.inicio_iso as string) || ""}
                    value={(fields.fim_iso as string) || ""}
                    onChange={(e) => {
                      set("fim_iso", e.target.value);
                      set("fim", fmtDataCurta(e.target.value));
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
                value={(fields.paraviagens_iso as string) || ""}
                onChange={(e) => {
                  set("paraviagens_iso", e.target.value);
                  set("paraviagens", fmtDate(e.target.value));
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

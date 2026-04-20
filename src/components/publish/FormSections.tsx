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

/* ── QuatroDestinosForm (Card WhatsApp / Transmissão V1) ─────
 * Port do agencia-form.tsx do V1 (tab === "transmissao"):
 *   - Cabeçalho global: trans_titulo + trans_subtitulo
 *   - 4 sub-abas de destino, cada uma com 12 campos
 *   - Sync para binds trans_{campo}{n} via useEffect
 * Layout bate com tmpl_base_quatro_destinos_* seedado em system_config.
 */

const TRANS_INCLUSO_OPTS = ["Aéreo + Hotel + Transfer", "Aéreo + Hotel", "Hotel + Transfer", "Só Hotel", "Cruzeiro"];
const TRANS_VOO_OPTS = ["Voo Direto", "Voo Conexão"];
const TRANS_PARCELAS_OPTS = Array.from({ length: 35 }, (_, i) => `${i + 2}x`);

interface TransDest {
  destino: string; saida: string; voo: string;
  ida: string; volta: string;
  hotel: string; incluso: string;
  pgto: "cartao" | "boleto" | "";
  entrada: string; parcelas: string;
  preco: string; precoAvista: string;
}

function emptyDest(): TransDest {
  return {
    destino: "", saida: "", voo: "Voo Direto",
    ida: "", volta: "",
    hotel: "", incluso: "Aéreo + Hotel + Transfer",
    pgto: "cartao", entrada: "", parcelas: "",
    preco: "", precoAvista: "",
  };
}

export function QuatroDestinosForm({
  fields, set, today,
  loadDestinos, loadHoteis,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
}) {
  const [cab, setCab] = useState({
    titulo: String(fields.trans_titulo ?? ""),
    subtitulo: String(fields.trans_subtitulo ?? ""),
  });
  const [dests, setDests] = useState<TransDest[]>(() => [
    emptyDest(), emptyDest(), emptyDest(), emptyDest(),
  ]);
  const [curDest, setCurDest] = useState(0);
  const [destinoOpts, setDestinoOpts] = useState<string[]>([]);
  const [hotelOpts, setHotelOpts] = useState<string[]>([]);

  useEffect(() => {
    if (loadDestinos) loadDestinos().then(setDestinoOpts).catch(() => {});
    if (loadHoteis) loadHoteis().then(setHotelOpts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync cabeçalho + dests → binds trans_*
  useEffect(() => {
    set("trans_titulo", cab.titulo);
    set("trans_subtitulo", cab.subtitulo);
    dests.forEach((d, i) => {
      const n = i + 1;
      set(`trans_destino${n}`, d.destino ? d.destino.toUpperCase() : "");
      set(`trans_saida${n}`, d.saida);
      set(`trans_voo${n}`, d.voo);
      if (d.ida && d.volta) {
        const nts = calcularNoites(d.ida, d.volta);
        const idaF = fmtDataCurta(d.ida);
        const voltaF = fmtDate(d.volta);
        set(`trans_periodo${n}`, `${idaF} a ${voltaF}`);
        set(`trans_noites${n}`, nts > 0 ? String(nts) : "");
      } else {
        set(`trans_periodo${n}`, "");
        set(`trans_noites${n}`, "");
      }
      set(`trans_hotel${n}`, d.hotel);
      set(`trans_incluso${n}`, d.incluso);
      set(
        `trans_pgto${n}`,
        d.pgto === "cartao"
          ? "No Cartão de Crédito S/ Juros"
          : d.pgto === "boleto" && d.entrada
            ? `Entrada de R$ ${d.entrada} +`
            : "",
      );
      set(`trans_parcelas${n}`, d.parcelas);
      set(`trans_preco${n}`, d.preco);
      set(`trans_avista${n}`, d.precoAvista ? `ou R$ ${d.precoAvista} à vista por pessoa` : "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cab, dests]);

  const updateDest = (idx: number, patch: Partial<TransDest>) =>
    setDests((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const d = dests[curDest];
  const nts = d.ida && d.volta ? calcularNoites(d.ida, d.volta) : 0;

  return (
    <>
      <Section title="Cabeçalho" icon="✦">
        <Field label="Linha 1 (título)">
          <input
            value={cab.titulo}
            onChange={(e) => setCab((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Férias dos Sonhos Já!"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Linha 2 (subtítulo)">
          <input
            value={cab.subtitulo}
            onChange={(e) => setCab((p) => ({ ...p, subtitulo: e.target.value }))}
            placeholder="Voe com a Azul Viagens"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      {/* Sub-abas de destino */}
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
        <div className="grid grid-cols-2 gap-2">
          <Field label="Saída">
            <input
              value={d.saida}
              onChange={(e) => updateDest(curDest, { saida: e.target.value })}
              placeholder="GRU"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Tipo Voo">
            <select
              value={d.voo}
              onChange={(e) => updateDest(curDest, { voo: e.target.value })}
              className={INPUT_CLASS}
            >
              {TRANS_VOO_OPTS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
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
            ✈ {nts} noite{nts === 1 ? "" : "s"} · {fmtDataCurta(d.ida)} a {fmtDate(d.volta)}
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
          <select
            value={d.incluso}
            onChange={(e) => updateDest(curDest, { incluso: e.target.value })}
            className={INPUT_CLASS}
          >
            {TRANS_INCLUSO_OPTS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Pagamento" icon="💰">
        <div className="grid grid-cols-2 gap-2">
          {(["cartao", "boleto"] as const).map((v) => {
            const active = d.pgto === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => updateDest(curDest, { pgto: v, ...(v === "cartao" ? { entrada: "" } : {}) })}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all"
                style={
                  active
                    ? { background: "var(--orange)", color: "#FFFFFF", borderColor: "var(--orange)" }
                    : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                }
              >
                {v === "cartao" ? "Cartão" : "Boleto"}
              </button>
            );
          })}
        </div>
        {d.pgto === "boleto" && (
          <Field label="Valor da Entrada (R$)">
            <input
              value={d.entrada}
              onChange={(e) => updateDest(curDest, { entrada: e.target.value })}
              placeholder="1.500,00"
              className={INPUT_CLASS}
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Parcelas">
            <SearchableSelect
              value={d.parcelas}
              onChange={(v) => updateDest(curDest, { parcelas: v })}
              options={TRANS_PARCELAS_OPTS}
              placeholder="12x"
            />
          </Field>
          <Field label="Valor Parcela">
            <input
              value={d.preco}
              onChange={(e) => updateDest(curDest, { preco: e.target.value })}
              placeholder="890,00"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="À Vista (por pessoa)">
          <input
            value={d.precoAvista}
            onChange={(e) => updateDest(curDest, { precoAvista: e.target.value })}
            placeholder="8.900,00"
            className={INPUT_CLASS}
          />
        </Field>
        {(d.pgto || d.precoAvista) && (
          <div
            className="rounded-lg border px-3 py-2 text-[10px] font-medium leading-relaxed"
            style={{ background: "rgba(212,168,67,0.1)", borderColor: "rgba(212,168,67,0.3)", color: "var(--orange)" }}
          >
            {d.pgto === "cartao" && <div>No Cartão de Crédito S/ Juros</div>}
            {d.pgto === "boleto" && d.entrada && <div>Entrada de R$ {d.entrada} +</div>}
            {d.precoAvista && <div>ou R$ {d.precoAvista} à vista por pessoa</div>}
          </div>
        )}
      </Section>
    </>
  );
}

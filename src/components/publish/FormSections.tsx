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
      className="px-3 py-2 border-b last:border-b-0"
      style={{ borderColor: "var(--bdr)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-[13px]">{icon}</span>}
        <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--txt3)]">
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
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-700 uppercase tracking-[0.08em] text-[var(--txt3)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const INPUT_CLASS =
  "h-[34px] w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--brand-primary,var(--orange))]";

/* ── SearchableSelect ─────────────────────────────────── */

export function SearchableSelect({
  value, onChange, onBlur, options, placeholder, allowCustom = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
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
        onBlur={(e) => {
          // Se o foco foi pra dentro do componente (clique em opção), ignora.
          if (ref.current?.contains(e.relatedTarget as Node)) return;
          setOpen(false);
          onBlur?.(allowCustom ? (q || value) : value);
        }}
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false); onBlur?.(opt); }}
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
  const showEntrada = fields.formapagamento === "entrada";
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

/* ── PacoteForm (port V1 _fPacote + _fGrpPreco) ───────────
 * Binds específicos do Pacote — destino, saida, tipovoo, dataida/datavolta,
 * dataperiodo (derivado), feriado, hotel, servico1..6, servicoslista (derivado),
 * allinclusive/ultimachamada/ultimoslugares/ofertas, formapagamento, entrada,
 * parcelas, valorparcela, valorint/valdec (derivados), numerodesconto,
 * valortotal, valortotalfmt/totalduplo (derivados). Não toca PagamentoSection
 * compartilhado — mantém os valores V1 exatos ("Cartão de Crédito" / "Boleto"). */

// Dicionário (subset V1 utils.js:548-592) aplicado no blur dos serviços.
function pacoteApplyServicoDict(v: string): string {
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
function pacoteIsAllInclusive(v: string): boolean {
  return /all\s*inclusive|tudo\s*inclu[ií]do/i.test(v || "");
}

// Período "DD/MM a DD/MM/AAAA" — regras V1 (mesmo mês, mesmo ano, cross-ano).
function pacoteFormatPeriodo(ida: string, volta: string): string {
  if (!ida || !volta) return "";
  const [yi, mi, di] = ida.split("-");
  const [yv, mv, dv] = volta.split("-");
  if (!yi || !yv) return "";
  const p = (n: string) => n.padStart(2, "0");
  if (yi === yv && mi === mv) return `${p(di)} a ${p(dv)}/${p(mi)}/${yi}`;
  if (yi === yv) return `${p(di)}/${p(mi)} a ${p(dv)}/${p(mv)}/${yi}`;
  return `${p(di)}/${p(mi)}/${yi} a ${p(dv)}/${p(mv)}/${yv}`;
}

// "12345678" (cents) → "123.456,78"
function pacoteFormatReal(raw: string): string {
  const nums = (raw || "").replace(/\D/g, "");
  if (!nums) return "";
  const n = parseInt(nums, 10);
  return Math.floor(n / 100).toLocaleString("pt-BR") + "," + String(n % 100).padStart(2, "0");
}

const PACOTE_PARCELAS_OPTS = Array.from({ length: 35 }, (_, i) => `${i + 2}x`); // 2x..36x V1
const PACOTE_DESCONTO_OPTS = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"]; // V1 DESCONTO_VALS
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
  function computeNoites(ida: string, volta: string): number {
    if (!ida || !volta) return 0;
    const d1 = new Date(ida + "T00:00:00");
    const d2 = new Date(volta + "T00:00:00");
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86_400_000));
  }
  const onIdaChange = (v: string) => {
    set("dataida", v);
    const volta = (fields.datavolta as string) || "";
    set("dataperiodo", volta ? pacoteFormatPeriodo(v, volta) : "");
    const n = computeNoites(v, volta);
    set("noites", n > 0 ? String(n) : "");
  };
  const onVoltaChange = (v: string) => {
    set("datavolta", v);
    const ida = (fields.dataida as string) || "";
    set("dataperiodo", ida ? pacoteFormatPeriodo(ida, v) : "");
    const n = computeNoites(ida, v);
    set("noites", n > 0 ? String(n) : "");
  };
  const onValorParcelaChange = (raw: string) => {
    const clean = raw.replace(/[^\d,.]/g, "");
    set("valorparcela", clean);
    const nums = clean.replace(/\D/g, "");
    if (nums) {
      const n = parseInt(nums, 10);
      set("valorint", Math.floor(n / 100).toLocaleString("pt-BR"));
      set("valdec", "," + String(n % 100).padStart(2, "0"));
    } else {
      set("valorint", "");
      set("valdec", "");
    }
  };
  const onValorTotalChange = (raw: string) => {
    const clean = raw.replace(/[^\d,.]/g, "");
    set("valortotal", clean);
    set("totalduplo", clean); // compat com PreviewStage.resolveBindParam("valortotalfmt")
    const fmt = pacoteFormatReal(clean);
    set("valortotalfmt", fmt ? `ou R$ ${fmt} por pessoa apto. duplo` : "");
  };
  const onEntradaChange = (raw: string) => {
    set("entrada", raw.replace(/[^\d,.]/g, ""));
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
  const showFeriado = hasBind(binds, "feriado");
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

  return (
    <div className="flex flex-col gap-2">
      {(showDestino || showSaida || showTipovoo) && (
        <Section title="Destino & Saída">
          {showDestino && (
            <Field label="Destino *">
              <SearchableSelect
                value={(fields.destino as string) || ""}
                onChange={(v) => set("destino", v.toUpperCase())}
                onBlur={(v) => {
                  const up = v.toUpperCase();
                  set("destino", up);
                  if (up.trim() && !fields.imgfundo) fetchImgFundo(up);
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
                <Field label="Saída">
                  <input
                    value={(fields.saida as string) || ""}
                    onChange={(e) => set("saida", e.target.value)}
                    placeholder="ex. GRU"
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
              {showTipovoo && (
                <Field label="Tipo de Voo">
                  {/* V1 .radio-group + .radio-btn.on — botões inline, altura 32px, font 12px, gap 8px. */}
                  <div
                    className="flex rounded-lg border p-0.5"
                    style={{ background: "var(--bg2)", borderColor: "var(--bdr)", gap: "8px", flexWrap: "nowrap" }}
                  >
                    {["( Voo Direto )", "( Voo Conexão )"].map((opt) => {
                      const sel = fields.tipovoo === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set("tipovoo", opt)}
                          className="flex-1 whitespace-nowrap rounded-md px-3 font-semibold transition-all"
                          style={
                            sel
                              ? { background: "var(--brand-primary)", color: "#FFFFFF", boxShadow: "0 1px 6px color-mix(in srgb, var(--brand-primary) 40%, transparent)", height: "32px", fontSize: "12px" }
                              : { background: "transparent", color: "var(--txt3)", height: "32px", fontSize: "12px" }
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
        </Section>
      )}

      {(showIda || showVolta || showFeriado) && (
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
          {showFeriado && (
            <Field label="Feriado">
              <SearchableSelect
                value={(fields.feriado as string) || ""}
                onChange={(v) => set("feriado", v)}
                options={feriadoOpts ?? []}
                placeholder="Selecionar feriado..."
                allowCustom
              />
            </Field>
          )}
        </Section>
      )}

      {showHotel && (
        <Section title="Hotel">
          <Field label="Hotel *">
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
        </Section>
      )}

      {showServicos && (
        <Section title="Serviços Inclusos">
          {Array.from({ length: 6 }, (_, i) => {
            if (binds && !binds.has(`servico${i + 1}`) && !binds.has("servicoslista")) return null;
            const val = servicos[i] ?? "";
            return (
              <input
                key={i}
                value={val}
                onChange={(e) => {
                  const n = [...servicos];
                  n[i] = e.target.value;
                  updateServicos(n);
                }}
                onBlur={(e) => {
                  const v = pacoteApplyServicoDict(e.target.value);
                  if (v !== e.target.value) {
                    const n = [...servicos];
                    n[i] = v;
                    updateServicos(n);
                  }
                  if (pacoteIsAllInclusive(v)) set("allinclusive", true);
                }}
                placeholder={`Serviço ${i + 1}`}
                className={INPUT_CLASS}
              />
            );
          })}
        </Section>
      )}

      {showBadges && (
        <Section title="Selos & Destaques" icon="🏷️">
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
                  style={
                    on
                      ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                      : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                  }
                >
                  {on ? "✓ " : ""}{b.label}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {showPgtoBlock && (
        <Section title="Pagamento" icon="💳">
          {showForma && (
            <Field label="Forma de Pagamento *">
              <div className="flex gap-1">
                {PACOTE_FORMA_PGTO_OPTS.map((opt) => {
                  const sel = fields.formapagamento === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("formapagamento", opt.value)}
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
                onChange={(e) => onEntradaChange(e.target.value)}
                placeholder="ex. 1.500,00"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {(showParcelas || showValorParc) && (
            <div className="grid grid-cols-2 gap-2">
              {showParcelas && (
                <Field label="Parcelas *">
                  <select
                    value={(fields.parcelas as string) || ""}
                    onChange={(e) => set("parcelas", e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">— nenhum —</option>
                    {PACOTE_PARCELAS_OPTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              )}
              {showValorParc && (
                <Field label="Valor da Parcela (R$)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(fields.valorparcela as string) || ""}
                    onChange={(e) => onValorParcelaChange(e.target.value)}
                    placeholder="ex. 890,00"
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
            </div>
          )}
          {showDesconto && (
            <Field label="% Desconto">
              <select
                value={(fields.numerodesconto as string) || ""}
                onChange={(e) => set("numerodesconto", e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">– nenhum –</option>
                {PACOTE_DESCONTO_OPTS.map((d) => (
                  <option key={d} value={d.replace("%", "")}>{d}</option>
                ))}
              </select>
            </Field>
          )}
          {showValorTotal && (
            <Field label="Valor Total (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={(fields.valortotal as string) || ""}
                onChange={(e) => onValorTotalChange(e.target.value)}
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
    </div>
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
            <div className="flex flex-col gap-2">
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
  const descontoOpts = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

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

      <Section title="Desconto" icon="🏷️">
        <Field label="Desconto">
          <select
            value={(fields.desconto as string) || ""}
            onChange={(e) => set("desconto", e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione...</option>
            {descontoOpts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Válidade da Promoção" icon="📅">
        <div className="grid grid-cols-2 gap-2">
          <Field label="INÍCIO">
            <input
              type="text"
              value={(fields.inicio as string) || ""}
              onChange={(e) => set("inicio", e.target.value)}
              placeholder="DD/MM"
              maxLength={5}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="FIM">
            <input
              type="text"
              value={(fields.fim as string) || ""}
              onChange={(e) => set("fim", e.target.value)}
              placeholder="DD/MM"
              maxLength={5}
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
const LAM_VOO_OPTS = ["Voo Direto", "Voo Conexão"];
const LAM_PARCELAS_OPTS = Array.from({ length: 35 }, (_, i) => `${i + 2}x`);

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
  pgto: "cartao" | "boleto" | "";
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

/** V1 lamina.html:623-631 — formato do período por período ida/volta. */
function lamFormatPeriodo(ida: string, volta: string): string {
  if (!ida || !volta) return "";
  const [yi, mi, di] = ida.split("-");
  const [yv, mv, dv] = volta.split("-");
  const p = (n: string) => n.padStart(2, "0");
  if (yi === yv && mi === mv) return `${p(di)} a ${p(dv)}/${p(mi)}/${yi}`;
  if (yi === yv) return `${p(di)}/${p(mi)} a ${p(dv)}/${p(mv)}/${yi}`;
  return `${p(di)}/${p(mi)}/${yi} a ${p(dv)}/${p(mv)}/${yv}`;
}

export function CardWhatsAppForm({
  fields, set, today,
  loadDestinos, loadHoteis, binds,
}: {
  fields: Fields;
  set: Setter;
  today: string;
  loadDestinos?: () => Promise<string[]>;
  loadHoteis?: () => Promise<string[]>;
  binds?: Set<string>;
}) {
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
      set(`lam_d${n}_periodo`, lamFormatPeriodo(d.ida, d.volta));
      set(`lam_d${n}_hotel`, d.hotel);
      set(`lam_d${n}_incluso`, d.incluso);
      // pgto: V1 resolution rules
      set(
        `lam_d${n}_pgto`,
        d.pgto === "cartao"
          ? "No Cartão de Crédito S/ Juros"
          : d.pgto === "boleto"
            ? (d.entrada ? `Entrada de R$ ${d.entrada} +` : "Boleto")
            : "",
      );
      // parcelas: adiciona "x" se não tiver
      set(`lam_d${n}_parcelas`, d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : "");
      set(`lam_d${n}_valor`, d.valor);
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
      // Biblioteca de fundos do V2 = tabela `imgfundo` (confirmado via information_schema).
      const { data, error } = await _sb_for_lamina
        .from("imgfundo")
        .select("url")
        .not("url", "is", null)
        .limit(1000);
      if (error) { console.error("[Lâmina] imgfundo query:", error); alert("Erro ao buscar fundos."); return; }
      const rows = (data ?? []) as { url: string }[];
      if (!rows.length) { alert("Biblioteca de fundos vazia."); return; }
      const pick = rows[Math.floor(Math.random() * rows.length)];
      if (pick?.url) set("img_fundo", pick.url);
    } catch (err) {
      console.error("[Lâmina] shuffle bg:", err);
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
      if (reader.result) set("img_fundo", String(reader.result));
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function handleClearBg() {
    set("img_fundo", "");
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
        datas: destFilled.map((d) => lamFormatPeriodo(d.ida, d.volta)).filter(Boolean).slice(0, 2).join(" / "),
        tipo: "Card WhatsApp — 4 destinos (promocional, tom informal para WhatsApp)",
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
            <select
              value={d.voo}
              onChange={(e) => updateDest(curDest, { voo: e.target.value })}
              className={INPUT_CLASS}
            >
              {LAM_VOO_OPTS.map((v) => (
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
            ✈ {nts} noite{nts === 1 ? "" : "s"} · {lamFormatPeriodo(d.ida, d.volta)}
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
            {LAM_INCLUSO_OPTS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Pagamento" icon="💰">
        <Field label="Forma de Pagamento">
          <select
            value={d.pgto}
            onChange={(e) => {
              const v = e.target.value as LamDest["pgto"];
              updateDest(curDest, { pgto: v, ...(v === "cartao" ? { entrada: "" } : {}) });
            }}
            className={INPUT_CLASS}
          >
            <option value="">– selecione –</option>
            <option value="cartao">Cartão de Crédito</option>
            <option value="boleto">Boleto</option>
          </select>
        </Field>
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
              value={d.parc}
              onChange={(v) => updateDest(curDest, { parc: v })}
              options={LAM_PARCELAS_OPTS}
              placeholder="12x"
            />
          </Field>
          <Field label="Valor Parcela">
            <input
              value={d.valor}
              onChange={(e) => updateDest(curDest, { valor: e.target.value })}
              placeholder="890,00"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="À Vista (por pessoa)">
          <input
            value={d.total}
            onChange={(e) => updateDest(curDest, { total: e.target.value })}
            placeholder="8.900,00"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <Section title="Legenda WhatsApp (IA)" icon="✨">
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
          <p className="text-[10px] text-[var(--txt3)]">Preencha pelo menos 1 destino e clique em &quot;Gerar legenda&quot; — Claude Haiku cria uma legenda promocional pra WhatsApp.</p>
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
            {fields.img_fundo ? (
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

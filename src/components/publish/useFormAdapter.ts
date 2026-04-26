"use client";

import { useCallback, useMemo } from "react";

/**
 * Adapter bidirecional entre o estado legado dos publicar/page.tsx
 * (values: strings + badges: booleans nas chaves *_badge) e o contrato
 * "fields/set" esperado pelos componentes em @/components/publish/FormSections.
 *
 * Objetivo: não renomear nenhuma chave do estado — apenas traduzir.
 * Templates existentes continuam lendo chaves legadas (ultima_chamada_badge,
 * totalduplo, formapagamento "Cartão de Crédito", etc.).
 */

export interface AdapterValues {
  [k: string]: string;
}
export interface AdapterBadges {
  [k: string]: boolean | undefined;
}

interface AdapterArgs {
  tab: string;
  values: AdapterValues;
  badges: AdapterBadges;
  setField: (k: string, v: string) => void;
  setBadge: (k: string, v: boolean) => void;
}

type FieldValue = string | boolean | number | null | undefined;

export interface Fields {
  [k: string]: FieldValue;
}

export type Setter = (k: string, v: FieldValue) => void;

/** chave nova → chave de badge legada */
const BADGE_MAP: Record<string, string> = {
  allinclusive:   "all_inclusive_badge",
  ultimachamada:  "ultima_chamada_badge",
  ultimoslugares: "ultimos_lugares_badge",
  ofertas:        "ofertas_azul_badge",
};

/** forma pagamento: spec ↔ legacy */
function formaPgtoSpecToLegacy(spec: string): string {
  if (spec === "cartao")  return "Cartão de Crédito";
  if (spec === "entrada") return "Boleto";
  if (spec === "debito")  return "Débito";
  return spec;
}
function formaPgtoLegacyToSpec(legacy: string): string {
  if (legacy === "Cartão de Crédito") return "cartao";
  if (legacy === "Boleto")            return "entrada";
  if (legacy === "Débito")            return "debito";
  return "";
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** datetime-local "YYYY-MM-DDThh:mm" → date-only "YYYY-MM-DD" */
function dtToDate(dt: string): string {
  if (!dt) return "";
  return dt.split("T")[0];
}

/** date-only → datetime-local sem perder hora se já existir */
function dateToDt(date: string, currentDt?: string): string {
  if (!date) return "";
  const currentTime = currentDt?.split("T")[1] || "00:00";
  return `${date}T${currentTime}`;
}

/** Hook. Retorna { fields, set, servicos, setServicos } pronto pra passar pros forms. */
export function useFormAdapter({ tab, values, badges, setField, setBadge }: AdapterArgs) {
  const fields: Fields = useMemo(() => {
    const f: Fields = { ...(values ?? {}) };
      if (!badges) return f as Fields;
    // Badges legadas → nomes novos
    for (const [newKey, badgeKey] of Object.entries(BADGE_MAP)) {
      f[newKey] = !!badges[badgeKey];
    }
    // Desconto % — spec usa "numerodesconto" (pacote/campanha) e "desconto_anoit" (anoiteceu)
    f.numerodesconto = values.desconto || "";
    f.desconto_anoit = values.desconto || "";
    // Valor total (spec) ← legacy totalduplo/totalcruzeiro
    f.valortotal = values.totalduplo || values.totalcruzeiro || "";
    // Datas formatadas (read-only derivado de dataida/datavolta)
    f.dataida_fmt   = values.dataida   ? fmtDate(values.dataida)   : "";
    f.datavolta_fmt = values.datavolta ? fmtDate(values.datavolta) : "";
    // Anoiteceu — converte datetime-local ↔ date-only
    f.inicio_iso      = dtToDate(values.inicio || "");
    f.fim_iso         = dtToDate(values.fim || "");
    f.paraviagens_iso = values.paraviagens || "";
    // Forma pagamento legacy → spec
    f.formapagamento = formaPgtoLegacyToSpec(values.formapagamento || "");
    return f;
  }, [values, badges]);

  const set: Setter = useCallback((k, v) => {
    // Boolean → badge legada
    if (typeof v === "boolean") {
      const badgeKey = BADGE_MAP[k];
      if (badgeKey) { setBadge(badgeKey, v); return; }
      setField(k, v ? "1" : "");
      return;
    }
    const s = v == null ? "" : String(v);

    switch (k) {
      case "numerodesconto":
        setField("desconto", s);
        return;
      case "desconto_anoit":
        setField("desconto", s);
        return;
      case "valortotal":
        // cruzeiro escreve em totalcruzeiro; demais em totalduplo
        if (tab === "cruzeiro") setField("totalcruzeiro", s);
        else setField("totalduplo", s);
        return;
      case "dataida_fmt":
      case "datavolta_fmt":
        // derivados de dataida/datavolta — ignora set (CampanhaForm pede para setar junto
        // de dataida/datavolta, mas nosso adapter produz os _fmt no read automaticamente)
        return;
      case "inicio_iso":
        setField("inicio", dateToDt(s, values.inicio));
        return;
      case "fim_iso":
        setField("fim", dateToDt(s, values.fim));
        return;
      case "paraviagens_iso":
        setField("paraviagens", s);
        return;
      case "inicio":
        setField("inicio", s);
        return;
      case "fim":
        setField("fim", s);
        return;
      case "paraviagens":
        setField("paraviagens", s);
        return;
      case "formapagamento":
        setField("formapagamento", formaPgtoSpecToLegacy(s));
        return;
      default:
        setField(k, s);
    }
  }, [tab, values, setField, setBadge]);

  // Serviços como array (CampanhaForm espera servicos/setServicos)
  const servicos = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((i) => values?.[`servico${i}`] || "");
  }, [values]);

  const setServicos = useCallback((next: string[]) => {
    // Detectar "all inclusive" (case insensitive) em qualquer serviço
    const hasAllInclusive = next.some((s) =>
      s.toLowerCase().includes("all inclusive")
    );

    // Atualizar serviços
    for (let i = 0; i < 6; i++) {
      const key = `servico${i + 1}`;
      const val = next[i] || "";
      if ((values?.[key] || "") !== val) setField(key, val);
    }

    // Ativar badge All Inclusive automaticamente
    if (hasAllInclusive && !badges?.all_inclusive_badge) {
      setBadge("all_inclusive_badge", true);
    }
  }, [values, badges, setField, setBadge]);

  return { fields, set, servicos, setServicos };
}

export { pad as padAdapter };

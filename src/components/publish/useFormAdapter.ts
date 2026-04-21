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
    const f: Fields = { ...values };
    // Badges legadas → nomes "curtos" usados pelas toggles (allinclusive, ultimachamada, ...)
    for (const [newKey, badgeKey] of Object.entries(BADGE_MAP)) {
      f[newKey] = !!badges[badgeKey];
    }
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
    setField(k, s);
  }, [setField, setBadge]);

  // Serviços como array — V1 usa servico_1..servico_6 (snake_case)
  const servicos = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((i) => values[`servico_${i}`] || "");
  }, [values]);

  const setServicos = useCallback((next: string[]) => {
    for (let i = 0; i < 6; i++) {
      const key = `servico_${i + 1}`;
      const val = next[i] || "";
      if ((values[key] || "") !== val) setField(key, val);
    }
  }, [values, setField]);

  // silence unused helpers (kept for reference / possible re-use)
  void tab; void fmtDate; void dtToDate; void dateToDt; void formaPgtoLegacyToSpec; void formaPgtoSpecToLegacy;

  return { fields, set, servicos, setServicos };
}

export { pad as padAdapter };

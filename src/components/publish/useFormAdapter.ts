"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";

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
    // Valor total (spec) — prioriza valortotal, fallback para legacy totalduplo/totalcruzeiro
    f.valortotal = values.valortotal || values.totalduplo || values.totalcruzeiro || "";
    // Datas formatadas (read-only derivado de dataida/datavolta)
    f.dataida_fmt   = values.dataida   ? fmtDate(values.dataida)   : "";
    f.datavolta_fmt = values.datavolta ? fmtDate(values.datavolta) : "";
    // Anoiteceu — converte datetime-local ↔ date-only
    f.inicio_iso      = dtToDate(values.inicio || "");
    f.fim_iso         = dtToDate(values.fim || "");
    f.paraviagens_iso = values.paraviagens || "";
    // Forma pagamento legacy → spec
    f.formapagamento = formaPgtoLegacyToSpec(values.formapagamento || "");
    f.forma_pgto = values.forma_pgto || "";
    // Forma de pagamento derivado: "Entrada de R$ {valor} +" quando Boleto, senão "Cartão de Crédito"
    const formaSpec = formaPgtoLegacyToSpec(values.formapagamento || "");
    if (formaSpec === "entrada" && values.entrada) {
      f.forma_de_pagamento = `Entrada de R$ ${values.entrada} +`;
    } else if (formaSpec === "cartao") {
      f.forma_de_pagamento = "Cartão de Crédito";
    } else {
      f.forma_de_pagamento = values.forma_de_pagamento || values.forma_pgto || "";
    }
    // Bind inteiro → valorparcela (para templates Cruzeiro)
    f.inteiro = values.inteiro || values.valorparcela || "";
    return f;
  }, [values, badges]);

  // Fix closure stale: usar ref para garantir setField sempre atualizado
  const setFieldRef = useRef(setField);
  useEffect(() => {
    setFieldRef.current = setField;
  }, [setField]);

  const set: Setter = useCallback((k, v) => {
    // Boolean → badge legada
    if (typeof v === "boolean") {
      const badgeKey = BADGE_MAP[k];
      if (badgeKey) { setBadge(badgeKey, v); return; }
      setFieldRef.current(k, v ? "1" : "");
      return;
    }
    const s = v == null ? "" : String(v);

    switch (k) {
      case "numerodesconto":
        setFieldRef.current("desconto", s);
        return;
      case "desconto_anoit":
        setFieldRef.current("desconto", s);
        return;
      case "dataida_fmt":
      case "datavolta_fmt":
        // derivados de dataida/datavolta — ignora set (CampanhaForm pede para setar junto
        // de dataida/datavolta, mas nosso adapter produz os _fmt no read automaticamente)
        return;
      case "inicio_iso":
        setFieldRef.current("inicio", dateToDt(s, values.inicio));
        return;
      case "fim_iso":
        setFieldRef.current("fim", dateToDt(s, values.fim));
        return;
      case "paraviagens_iso":
        setFieldRef.current("paraviagens", s);
        return;
      case "inicio":
        setFieldRef.current("inicio", s);
        return;
      case "fim":
        setFieldRef.current("fim", s);
        return;
      case "paraviagens":
        setFieldRef.current("paraviagens", s);
        return;
      case "formapagamento":
        setFieldRef.current("formapagamento", formaPgtoSpecToLegacy(s));
        return;
      case "img_fundo":
        console.log('[useFormAdapter] Setando img_fundo:', s);
        setFieldRef.current("img_fundo", s);
        return;
      case "logo_cia":
        console.log('[useFormAdapter] Setando logo_cia:', s);
        setFieldRef.current("logo_cia", s);
        return;
      case "forma_pgto":
        console.log('[SET forma_pgto]', s);
        setFieldRef.current("forma_pgto", s);
        return;
      case "entrada":
        setFieldRef.current("entrada", s);
        // Atualizar forma_de_pagamento derivado
        if (s) {
          setFieldRef.current("forma_de_pagamento", `Entrada de R$ ${s} +`);
        }
        return;
      case "valorparcela":
        setFieldRef.current("valorparcela", s);
        // Atualizar bind inteiro (usado em templates Cruzeiro)
        setFieldRef.current("inteiro", s);
        return;
      default:
        console.log('[useFormAdapter default]', { k, s });
        setFieldRef.current(k, s);
    }
  }, [tab, setBadge, values]);

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

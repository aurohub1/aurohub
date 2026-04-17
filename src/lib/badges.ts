// Lookup dinâmico de badges portado de AUROHUB FIRE/js/client.js (linhas 875-974).
// Regras de match e aliases preservados byte-a-byte do v1.

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function findBadgeUrl(
  urls: Record<string, string>,
  keys: string[],
): string | null {
  if (!urls || !keys?.length) return null;

  // 1) Match exato
  for (const k of keys) {
    if (urls[k]) return urls[k];
  }
  // 2) Case-insensitive
  for (const k of keys) {
    const kl = k.toLowerCase();
    for (const uk of Object.keys(urls)) {
      if (uk.toLowerCase() === kl) return urls[uk];
    }
  }
  // 3) Normalizado (sem acento)
  for (const k of keys) {
    const kn = normalize(k);
    for (const uk of Object.keys(urls)) {
      if (normalize(uk) === kn) return urls[uk];
    }
  }
  return null;
}

/**
 * Decide se um badge deve renderizar, espelhando as condições do v1
 * (client.js:909-973). Os outros bindParams são tratados fora desta função.
 *
 * all_inclusive_badge: o form faz a detecção "all inclusive" no onBlur dos
 * serviços (page.tsx) e seta o flag values.all_inclusive_badge="true" via
 * badgeCache → previewValues. Aqui só consumimos o flag — idem v1
 * (S.badges.all_inclusive_badge, client.js:915-919).
 */
export function shouldRenderBadge(paramID: string, values: Record<string, string>): boolean {
  switch (paramID) {
    // toggles on/off — valor esperado "true" (inclui all_inclusive setado pelo form)
    case "all_inclusive_badge":
    case "ultima_chamada_badge":
    case "ultimos_lugares_badge":
    case "ofertas_azul_badge":
      return values[paramID] === "true";
    // condicional pelo campo `desconto`
    case "desconto_badge": {
      const d = values.desconto;
      return !!(d && d !== "– nenhum –");
    }
    // condicional pelo campo `feriado`
    case "feriado_badge": {
      const f = values.feriado;
      return !!(f && f !== "– nenhum –");
    }
    default:
      return false;
  }
}

// Aliases — v1 client.js:915-933
export const BADGE_ALIASES: Record<string, string[]> = {
  all_inclusive_badge:   ["ALL INCLUSIVE", "All Inclusive", "allinclusive", "all_inclusive"],
  ultima_chamada_badge:  ["ÚLTIMA CHAMADA", "ULTIMA CHAMADA", "Última Chamada", "ultimachamada", "chamada"],
  ultimos_lugares_badge: ["ÚLTIMOS LUGARES", "ULTIMOS LUGARES", "Últimos Lugares", "ultimoslugares"],
  ofertas_azul_badge:    ["OFERTAS", "OFERTAS AZUL", "Ofertas Azul", "ofertas azul", "ofertas"],
};

/**
 * Resolve a URL de um badge a partir do paramID, espelhando _resolveParam do v1
 * (client.js:913-973). Retorna null quando alias não bate ou toggle está off.
 */
export function resolveBadgeUrl(
  paramID: string,
  badgeUrls: Record<string, string>,
  feriadoUrls: Record<string, string>,
  values: Record<string, string>,
): string | null {
  // Badges simples on/off: match direto por aliases
  if (BADGE_ALIASES[paramID]) {
    return findBadgeUrl(badgeUrls, BADGE_ALIASES[paramID]);
  }

  // desconto_badge — v1 client.js:935-945
  if (paramID === "desconto_badge") {
    const desc = values.desconto;
    if (!desc || desc === "– nenhum –") return null;
    const matches = Object.entries(badgeUrls)
      .filter(([k]) => {
        const kl = k.toLowerCase();
        return kl.includes("porcentagem") || kl.includes("desconto");
      })
      .map(([, v]) => v)
      .filter(Boolean);
    if (!matches.length) {
      return findBadgeUrl(badgeUrls, ["DESCONTO", "desconto", "porcentagem", "PORCENTAGEM"]);
    }
    return matches[Math.floor(Math.random() * matches.length)];
  }

  // feriado_badge — v1 client.js:965-973
  if (paramID === "feriado_badge") {
    const feriado = values.feriado;
    if (!feriado || feriado === "– nenhum –") return null;
    return findBadgeUrl(feriadoUrls, [feriado, feriado.toUpperCase(), feriado.toLowerCase()]);
  }

  return null;
}

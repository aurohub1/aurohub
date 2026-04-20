#!/usr/bin/env node
/**
 * Seed isolado do template "Cards" — port fiel do V1 lamina.html (stories 1080×1920).
 * NÃO toca nos outros templates (pacote/campanha/cruzeiro/anoiteceu/quatro_destinos).
 *
 * Key: tmpl_cards_stories
 * Run: node --env-file=.env.local scripts/seed-template-cards.mjs
 *
 * Layout extraído de AUROHUB FIRE/lamina.html:
 *   _renderFallback (linha 898) → títulos + logo
 *   _cardFallback   (linha 925) → elementos do card (destino/período/ícones/incluso/saída/hotel/pgto/parcelas/valor/total)
 * Canvas V1: CW=1080, CH=1920; textBaseline='alphabetic' → Konva top-baseline:
 *   top_y = baseline_y - round(fontSize * 0.82)
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const CW = 1080, CH = 1920;
const BG = "#0B1D3A";         // V1 default
const TXT = "#FFFFFF";
const ACCENT = "#D4E600";     // V1 verde (swapped pelo colorMap se lam_palette != 0)
const BORDER = "rgba(255,255,255,0.6)";
const IC_L = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png";
const IC_M = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png";
const IC_R = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png";
const LOGO = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774116248/PERFIL_34_pw0feq.png";
const FONT = "Helvetica Neue";

const ASC = (fs) => Math.round(fs * 0.82);
let seq = 0;
const nid = (p) => `${p}_${++seq}`;

function buildElements() {
  const els = [];

  // Imagem de fundo (upload/shuffle via bind). `schema.background` = #0B1D3A atrás.
  els.push({ id: nid("bg_img"), type: "image", name: "Imagem de fundo", x: 0, y: 0, width: CW, height: CH, bindParam: "img_fundo", imageFit: "cover", opacity: 1 });

  // Títulos V1 linhas 911-914
  const FS_T1 = 47, FS_T2 = 54;
  els.push({ id: nid("tit1"), type: "text", name: "Título 1", x: 0, y: 200 - ASC(FS_T1), width: CW, height: FS_T1 + 8, text: "[lam_titulo1]", fontSize: FS_T1, fontFamily: FONT, fontStyle: "bold", fill: TXT, align: "center", bindParam: "lam_titulo1", opacity: 1 });
  els.push({ id: nid("tit2"), type: "text", name: "Título 2", x: 0, y: 268 - ASC(FS_T2), width: CW, height: FS_T2 + 8, text: "[lam_titulo2]", fontSize: FS_T2, fontFamily: FONT, fill: TXT, align: "center", bindParam: "lam_titulo2", opacity: 1 });

  // 4 cards em grid 2×2 — V1 linha 916
  const positions = [
    { x: 55, y: 420 }, { x: 560, y: 420 },
    { x: 55, y: 820 }, { x: 560, y: 820 },
  ];
  const FS_PILL = 20, FS_PER = 36, FS_INC = 18, FS_SV = 17, FS_HOT = 17;
  const FS_PGTO = 15, FS_PAR = 20, FS_VAL = 44, FS_TOT = 15;

  positions.forEach((pos, i) => {
    const n = i + 1;
    const x = pos.x, y = pos.y;

    // Pill destino — V1 linhas 931-937: stroke-only w=min(text+40,420), h=36, r=18, lineWidth=1.5
    els.push({ id: nid(`d${n}_pill`), type: "rect", name: `D${n} Pill`, x, y, width: 420, height: 36, fill: "", stroke: BORDER, strokeWidth: 2, cornerRadius: 18, opacity: 1 });
    els.push({ id: nid(`d${n}_dst`), type: "text", name: `D${n} Destino`, x: x + 18, y, width: 420 - 36, height: 36, text: `[lam_d${n}_destino]`, fontSize: FS_PILL, fontFamily: FONT, fontStyle: "bold", fill: ACCENT, align: "left", verticalAlign: "middle", bindParam: `lam_d${n}_destino`, textTransform: "uppercase", opacity: 1 });

    // Período — 700 36px txtColor at (x+4, y+80 alphabetic) V1 linhas 941-942
    els.push({ id: nid(`d${n}_per`), type: "text", name: `D${n} Período`, x: x + 4, y: y + 80 - ASC(FS_PER), width: 500, height: FS_PER + 8, text: `[lam_d${n}_periodo]`, fontSize: FS_PER, fontFamily: FONT, fontStyle: "bold", fill: TXT, align: "left", bindParam: `lam_d${n}_periodo`, opacity: 1 });

    // 3 ícones 26×26 at (x+4, y+90), (x+38, y+90), (x+72, y+90) V1 linhas 944-947
    els.push({ id: nid(`d${n}_ic1`), type: "image", name: `D${n} Ícone 1`, x: x + 4,  y: y + 90, width: 26, height: 26, src: IC_L, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic2`), type: "image", name: `D${n} Ícone 2`, x: x + 38, y: y + 90, width: 26, height: 26, src: IC_M, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic3`), type: "image", name: `D${n} Ícone 3`, x: x + 72, y: y + 90, width: 26, height: 26, src: IC_R, imageFit: "contain", opacity: 1 });

    // Incluso — 400 18px accent at (x+4, y+138) V1 linhas 949-950
    els.push({ id: nid(`d${n}_inc`), type: "text", name: `D${n} Incluso`, x: x + 4, y: y + 138 - ASC(FS_INC), width: 500, height: FS_INC + 4, text: `[lam_d${n}_incluso]`, fontSize: FS_INC, fontFamily: FONT, fill: ACCENT, align: "left", bindParam: `lam_d${n}_incluso`, opacity: 1 });
    // Saída + Voo — 400 17px white at (x+4, y+162) V1 linhas 952-953
    els.push({ id: nid(`d${n}_sv`), type: "text", name: `D${n} Saída+Voo`, x: x + 4, y: y + 162 - ASC(FS_SV), width: 500, height: FS_SV + 4, text: `Saída: [lam_d${n}_saida]  [lam_d${n}_voo]`, fontSize: FS_SV, fontFamily: FONT, fill: TXT, align: "left", opacity: 1 });
    // Hotel — 400 17px white at (x+4, y+184) V1 linha 954
    els.push({ id: nid(`d${n}_hot`), type: "text", name: `D${n} Hotel`, x: x + 4, y: y + 184 - ASC(FS_HOT), width: 500, height: FS_HOT + 4, text: `Hotel: [lam_d${n}_hotel]`, fontSize: FS_HOT, fontFamily: FONT, fill: TXT, align: "left", opacity: 1 });
    // Pgto — 700 15px subColor uppercase at (x+4, y+210) V1 linhas 956-957
    els.push({ id: nid(`d${n}_pgto`), type: "text", name: `D${n} Pgto`, x: x + 4, y: y + 210 - ASC(FS_PGTO), width: 500, height: FS_PGTO + 4, text: `[lam_d${n}_pgto]`, fontSize: FS_PGTO, fontFamily: FONT, fontStyle: "bold", fill: TXT, align: "left", bindParam: `lam_d${n}_pgto`, textTransform: "uppercase", opacity: 0.7 });
    // Parcelas — 400 20px white at (x+4, y+236) V1 linhas 959-960
    els.push({ id: nid(`d${n}_par`), type: "text", name: `D${n} Parcelas`, x: x + 4, y: y + 236 - ASC(FS_PAR), width: 500, height: FS_PAR + 4, text: `[lam_d${n}_parcelas]`, fontSize: FS_PAR, fontFamily: FONT, fill: TXT, align: "left", bindParam: `lam_d${n}_parcelas`, opacity: 1 });
    // Valor composto (priceDisplay = R$ pequeno + inteiro grande + ,dec pequeno) at (x+4, y+288) V1 linhas 962-968
    els.push({ id: nid(`d${n}_val`), type: "text", name: `D${n} Valor`, x: x + 4, y: y + 288 - ASC(FS_VAL), width: 500, height: FS_VAL + 8, text: `[lam_d${n}_valor]`, fontSize: FS_VAL, fontFamily: FONT, fontStyle: "bold", fill: ACCENT, align: "left", bindParam: `lam_d${n}_valor`, priceDisplay: true, opacity: 1 });
    // Total à vista — 400 15px subColor at (x+4, y+312) V1 linhas 970-971
    els.push({ id: nid(`d${n}_tot`), type: "text", name: `D${n} Total`, x: x + 4, y: y + 312 - ASC(FS_TOT), width: 500, height: FS_TOT + 4, text: `[lam_d${n}_total]`, fontSize: FS_TOT, fontFamily: FONT, fill: TXT, align: "left", bindParam: `lam_d${n}_total`, opacity: 0.7 });
  });

  // Logo — V1 linhas 919-922: w=160, at (CW-lw-40, CH-lh-40) = (880, 1720), globalAlpha=0.95
  els.push({ id: nid("logo"), type: "image", name: "Logo", x: 880, y: 1720, width: 160, height: 160, src: LOGO, bindParam: "logo_loja", imageFit: "contain", opacity: 0.95 });

  return els;
}

async function main() {
  seq = 0;
  const key = "tmpl_cards_stories";
  const payload = {
    elements: buildElements(),
    background: BG,
    duration: 5,
    width: CW, height: CH,
    format: "stories",
    formType: "lamina",
    qtdDestinos: 4,
    nome: "Cards",
    licenseeId: null, lojaId: null,
    licenseeNome: "Templates Base", lojaNome: "—",
    thumbnail: null,
    is_base: true,
  };

  console.log(`[seed cards] upsertando ${key}…`);
  const { data, error } = await sb
    .from("system_config")
    .upsert({ key, value: JSON.stringify(payload), updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("key");
  if (error) { console.error("[seed cards] erro:", error); process.exit(1); }
  console.log(`[seed cards] OK: ${data.length} linha gravada (${data[0].key})`);
  console.log(`[seed cards] ${payload.elements.length} elementos no schema`);
}

main().catch((e) => { console.error(e); process.exit(1); });

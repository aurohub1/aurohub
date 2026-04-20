#!/usr/bin/env node
/**
 * Seed de 16 templates base do editor (canvas) em system_config.
 * Chaves: tmpl_base_{tipo}_{formato}
 * Tipos: campanha, cruzeiro, anoiteceu, quatro_destinos (= formType lamina, qtd 4)
 * Formatos: stories (1080×1920), reels (1080×1920), feed (1080×1350), tv (1920×1080)
 *
 * Run: node --env-file=.env.local scripts/seed-editor-templates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const DIMS = {
  stories: [1080, 1920],
  reels:   [1080, 1920],
  feed:    [1080, 1350],
  tv:      [1920, 1080],
};

const BG = "#1E3A6E", WHITE = "#FFFFFF", CARDBG = "#1B3A6B", GOLD = "#D4A843";
const FONT = "DM Sans";

let seq = 0;
const nid = (p) => `${p}_${++seq}`;

/* ══ Layout helpers ══════════════════════════════════ */

function portraitCampanha(w, h, { mainBind = "destino", mainLabel = "Destino", subField2 = "[hotel]", subField2Bind, extraTextBind = "servicoslista", pricePrimary = "valorparcela", showParcelas = true } = {}) {
  seq = 0;
  const pad = 40;
  const cardTop = 180;
  const cardH = h - cardTop - 240;
  const prBoxY = cardTop + cardH - 210;
  const titSize = Math.max(32, Math.round(w * 0.033));
  const mainSize = Math.max(60, Math.round(w * 0.083));
  const txtSize = Math.max(20, Math.round(w * 0.024));
  const parSize = Math.max(24, Math.round(w * 0.030));
  const preSize = Math.max(56, Math.round(w * 0.074));
  const els = [
    { id: nid("bg"), type: "image", name: "Fundo", x: 0, y: 0, width: w, height: h, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
    { id: nid("tit"), type: "text", name: "Chamada", x: pad, y: 80, width: w - pad*2, height: 60, text: "[titulo]", fontSize: titSize, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "center", bindParam: "titulo", opacity: 1 },
    { id: nid("card"), type: "rect", name: "Card", x: pad, y: cardTop, width: w - pad*2, height: cardH, fill: CARDBG, opacity: 0.88, cornerRadius: 28 },
    { id: nid("main"), type: "text", name: mainLabel, x: pad + 20, y: cardTop + 40, width: w - pad*2 - 40, height: 120, text: `[${mainBind}]`, fontSize: mainSize, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "left", bindParam: mainBind, opacity: 1 },
    { id: nid("per"), type: "text", name: "Período", x: pad + 20, y: cardTop + 180, width: w - pad*2 - 40, height: 40, text: "[dataperiodo]", fontSize: txtSize + 4, fontFamily: FONT, fill: WHITE, align: "left", opacity: 1 },
    { id: nid("sub2"), type: "text", name: "Sub info", x: pad + 20, y: cardTop + 240, width: w - pad*2 - 40, height: 40, text: subField2, fontSize: txtSize + 4, fontFamily: FONT, fill: WHITE, align: "left", ...(subField2Bind ? { bindParam: subField2Bind } : {}), opacity: 1 },
    { id: nid("srv"), type: "text", name: "Serviços", x: pad + 20, y: cardTop + 320, width: w - pad*2 - 40, height: cardH - 540, text: `[${extraTextBind}]`, fontSize: txtSize, fontFamily: FONT, fill: WHITE, align: "left", lineHeight: 1.6, bindParam: extraTextBind, opacity: 1 },
    { id: nid("prbox"), type: "rect", name: "Caixa preço", x: pad + 20, y: prBoxY, width: w - pad*2 - 40, height: 200, fill: WHITE, cornerRadius: 16, opacity: 1 },
  ];
  if (showParcelas) {
    els.push({ id: nid("par"), type: "text", name: "Parcelas", x: pad + 40, y: prBoxY + 20, width: 180, height: 48, text: "[parcelas]x R$", fontSize: parSize, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "left", opacity: 1 });
    els.push({ id: nid("pre"), type: "text", name: "Preço", x: pad + 220, y: prBoxY + 10, width: w - pad*2 - 260, height: 110, text: `[${pricePrimary}]`, fontSize: preSize, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "left", bindParam: pricePrimary, opacity: 1 });
    els.push({ id: nid("obs"), type: "text", name: "Observação", x: pad + 40, y: prBoxY + 130, width: w - pad*2 - 60, height: 40, text: "ou R$ [totalduplo] por pessoa apto duplo", fontSize: Math.max(16, txtSize - 4), fontFamily: FONT, fill: BG, align: "left", opacity: 1 });
  } else {
    els.push({ id: nid("pre"), type: "text", name: "Destaque", x: pad + 40, y: prBoxY + 30, width: w - pad*2 - 80, height: 140, text: `[${pricePrimary}]`, fontSize: preSize, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "center", bindParam: pricePrimary, opacity: 1 });
  }
  els.push({ id: nid("ilj"), type: "image", name: "Logo Loja", x: pad + 20, y: h - 140, width: 200, height: 80, bindParam: "imgloja", imageFit: "contain", opacity: 1 });
  els.push({ id: nid("lj"), type: "text", name: "Loja", x: pad + 240, y: h - 120, width: w - pad*2 - 280, height: 40, text: "[loja]", fontSize: txtSize + 4, fontFamily: FONT, fill: WHITE, align: "left", bindParam: "loja", opacity: 1 });
  return els;
}

function landscapeCampanha(w, h, { mainBind = "destino", subField2 = "[hotel]", extraTextBind = "servicoslista", pricePrimary = "valorparcela", showParcelas = true } = {}) {
  seq = 0;
  return [
    { id: nid("bg"), type: "image", name: "Fundo", x: 0, y: 0, width: w, height: h, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
    { id: nid("card"), type: "rect", name: "Card", x: w/2, y: 0, width: w/2, height: h, fill: CARDBG, opacity: 0.92 },
    { id: nid("tit"), type: "text", name: "Chamada", x: w/2 + 40, y: 60, width: w/2 - 80, height: 50, text: "[titulo]", fontSize: 34, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "left", bindParam: "titulo", opacity: 1 },
    { id: nid("main"), type: "text", name: "Principal", x: w/2 + 40, y: 130, width: w/2 - 80, height: 110, text: `[${mainBind}]`, fontSize: 72, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "left", bindParam: mainBind, opacity: 1 },
    { id: nid("per"), type: "text", name: "Período", x: w/2 + 40, y: 260, width: w/2 - 80, height: 32, text: "[dataperiodo]", fontSize: 24, fontFamily: FONT, fill: WHITE, align: "left", opacity: 1 },
    { id: nid("sub2"), type: "text", name: "Sub info", x: w/2 + 40, y: 310, width: w/2 - 80, height: 32, text: subField2, fontSize: 24, fontFamily: FONT, fill: WHITE, align: "left", opacity: 1 },
    { id: nid("srv"), type: "text", name: "Detalhes", x: w/2 + 40, y: 360, width: w/2 - 80, height: 320, text: `[${extraTextBind}]`, fontSize: 20, fontFamily: FONT, fill: WHITE, align: "left", lineHeight: 1.5, bindParam: extraTextBind, opacity: 1 },
    { id: nid("prbox"), type: "rect", name: "Caixa preço", x: w/2 + 40, y: h - 280, width: w/2 - 80, height: 140, fill: WHITE, cornerRadius: 16, opacity: 1 },
    ...(showParcelas
      ? [
        { id: nid("par"), type: "text", name: "Parcelas", x: w/2 + 60, y: h - 270, width: 180, height: 40, text: "[parcelas]x R$", fontSize: 28, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "left", opacity: 1 },
        { id: nid("pre"), type: "text", name: "Preço", x: w/2 + 260, y: h - 280, width: w/2 - 300, height: 90, text: `[${pricePrimary}]`, fontSize: 60, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "left", bindParam: pricePrimary, opacity: 1 },
        { id: nid("obs"), type: "text", name: "Obs", x: w/2 + 60, y: h - 180, width: w/2 - 100, height: 32, text: "ou R$ [totalduplo] apto duplo", fontSize: 18, fontFamily: FONT, fill: BG, align: "left", opacity: 1 },
      ]
      : [
        { id: nid("pre"), type: "text", name: "Destaque", x: w/2 + 60, y: h - 260, width: w/2 - 120, height: 110, text: `[${pricePrimary}]`, fontSize: 60, fontFamily: FONT, fontStyle: "bold", fill: BG, align: "center", bindParam: pricePrimary, opacity: 1 },
      ]
    ),
    { id: nid("ilj"), type: "image", name: "Logo Loja", x: w/2 + 40, y: h - 100, width: 180, height: 70, bindParam: "imgloja", imageFit: "contain", opacity: 1 },
    { id: nid("lj"), type: "text", name: "Loja", x: w/2 + 240, y: h - 80, width: w/2 - 280, height: 32, text: "[loja]", fontSize: 22, fontFamily: FONT, fill: WHITE, align: "left", bindParam: "loja", opacity: 1 },
  ];
}

/* ══ Builders por tipo ═══════════════════════════════ */

const CAMPANHA = (w, h) => (w > h
  ? landscapeCampanha(w, h, { mainBind: "destino", subField2: "Hotel: [hotel]", extraTextBind: "servicoslista", pricePrimary: "valorparcela", showParcelas: true })
  : portraitCampanha(w, h, { mainBind: "destino", mainLabel: "Destino", subField2: "Hotel: [hotel]", extraTextBind: "servicoslista", pricePrimary: "valorparcela", showParcelas: true })
);

const CRUZEIRO = (w, h) => (w > h
  ? landscapeCampanha(w, h, { mainBind: "navio", subField2: "Categoria: [categoria]", extraTextBind: "itinerario", pricePrimary: "valorparcela", showParcelas: true })
  : portraitCampanha(w, h, { mainBind: "navio", mainLabel: "Navio", subField2: "Categoria: [categoria]", extraTextBind: "itinerario", pricePrimary: "valorparcela", showParcelas: true })
);

const ANOITECEU = (w, h) => (w > h
  ? landscapeCampanha(w, h, { mainBind: "destino", subField2: "De [inicio] a [fim]", extraTextBind: "paraviagens", pricePrimary: "desconto", showParcelas: false })
  : portraitCampanha(w, h, { mainBind: "destino", mainLabel: "Destino", subField2: "De [inicio] a [fim]", extraTextBind: "paraviagens", pricePrimary: "desconto", showParcelas: false })
);

/* ══ Card WhatsApp — Lâmina 4 Destinos — cópia fiel do V1 ══
 * Extraído de AUROHUB FIRE/lamina.html:
 *   _renderFallback (linha 898) — titles + logo
 *   _cardFallback   (linha 925) — elementos de cada card
 * Canvas 1080×1920 fixo no V1. Feed/TV escalonados via sx=w/1080, sy=h/1920.
 * Coordenadas V1 usam textBaseline='alphabetic'; Konva usa top-baseline.
 * Conversão: top_y = baseline_y - round(fontSize * 0.82).
 */
const LAM_V1_BG = "#0B1D3A";
const LAM_V1_TXT = "#FFFFFF";
const LAM_V1_ACCENT = "#D4E600";
const LAM_V1_BORDER = "rgba(255,255,255,0.6)";
const LAM_IC_L = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png";
const LAM_IC_M = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png";
const LAM_IC_R = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png";
const LAM_LOGO_DEFAULT = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774116248/PERFIL_34_pw0feq.png";
const LAM_FONT = "Helvetica Neue";
const ASC = (fs) => Math.round(fs * 0.82);

function quatroDestinos(w, h) {
  seq = 0;
  const sx = w / 1080;
  const sy = h / 1920;
  const sf = Math.min(sx, sy);
  const X = (n) => Math.round(n * sx);
  const Y = (n) => Math.round(n * sy);
  const F = (n) => Math.round(n * sf);

  const els = [
    // Imagem de fundo (upload/shuffle). `schema.background` = #0B1D3A preenche atrás.
    { id: nid("bg_img"), type: "image", name: "Imagem de fundo", x: 0, y: 0, width: w, height: h, bindParam: "img_fundo", imageFit: "cover", opacity: 1 },
  ];

  // Títulos V1 linhas 911-914 — textAlign='center', baseline='alphabetic'
  // titulo1: 700 47px txtColor at y=200; titulo2: 400 54px txtColor at y=268
  const FS_T1 = 47, FS_T2 = 54;
  els.push({ id: nid("tit1"), type: "text", name: "Título 1", x: 0, y: Y(200 - ASC(FS_T1)), width: w, height: Y(FS_T1 + 8), text: "[lam_titulo1]", fontSize: F(FS_T1), fontFamily: LAM_FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "center", bindParam: "lam_titulo1", opacity: 1 });
  els.push({ id: nid("tit2"), type: "text", name: "Título 2", x: 0, y: Y(268 - ASC(FS_T2)), width: w, height: Y(FS_T2 + 8), text: "[lam_titulo2]", fontSize: F(FS_T2), fontFamily: LAM_FONT, fill: LAM_V1_TXT, align: "center", bindParam: "lam_titulo2", opacity: 1 });

  // V1 linha 916
  const positions = [
    { x: 55, y: 420 }, { x: 560, y: 420 },
    { x: 55, y: 820 }, { x: 560, y: 820 },
  ];

  // Fontes do _cardFallback (V1 linhas 932-971)
  const FS_PILL = 20, FS_PER = 36, FS_INC = 18, FS_SV = 17, FS_HOT = 17;
  const FS_PGTO = 15, FS_PAR = 20, FS_VAL = 44, FS_TOT = 15;

  positions.forEach((pos, i) => {
    const n = i + 1;
    const cx = X(pos.x);
    const cy = Y(pos.y);

    // Pill destino — V1 linhas 931-937: stroke-only, w=min(text+40,420), h=36, radius=18, lineWidth=1.5
    // Texto no pill: 700 20px accent, baseline='middle' at (x+18, y+bh/2)
    const pillW = X(420);
    const pillH = Y(36);
    els.push({ id: nid(`d${n}_pill`), type: "rect", name: `D${n} Pill`, x: cx, y: cy, width: pillW, height: pillH, fill: "", stroke: LAM_V1_BORDER, strokeWidth: Math.max(1, Math.round(1.5 * sf)), cornerRadius: F(18), opacity: 1 });
    els.push({ id: nid(`d${n}_dst`), type: "text", name: `D${n} Destino`, x: cx + X(18), y: cy, width: pillW - X(36), height: pillH, text: `[lam_d${n}_destino]`, fontSize: F(FS_PILL), fontFamily: LAM_FONT, fontStyle: "bold", fill: LAM_V1_ACCENT, align: "left", verticalAlign: "middle", bindParam: `lam_d${n}_destino`, textTransform: "uppercase", opacity: 1 });

    // Período V1 linha 941-942: 700 36px txtColor at (x+4, y+80 alphabetic)
    els.push({ id: nid(`d${n}_per`), type: "text", name: `D${n} Período`, x: cx + X(4), y: cy + Y(80 - ASC(FS_PER)), width: X(500), height: Y(FS_PER + 8), text: `[lam_d${n}_periodo]`, fontSize: F(FS_PER), fontFamily: LAM_FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_periodo`, opacity: 1 });

    // Ícones V1 linhas 944-947: 26×26 at (x+4, y+90), (x+4+34, y+90), (x+4+68, y+90)
    const icSz = F(26);
    els.push({ id: nid(`d${n}_ic1`), type: "image", name: `D${n} Ícone 1`, x: cx + X(4), y: cy + Y(90), width: icSz, height: icSz, src: LAM_IC_L, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic2`), type: "image", name: `D${n} Ícone 2`, x: cx + X(4 + 34), y: cy + Y(90), width: icSz, height: icSz, src: LAM_IC_M, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic3`), type: "image", name: `D${n} Ícone 3`, x: cx + X(4 + 68), y: cy + Y(90), width: icSz, height: icSz, src: LAM_IC_R, imageFit: "contain", opacity: 1 });

    // Incluso V1 linhas 949-950: 400 18px accent at (x+4, y+138 alphabetic)
    els.push({ id: nid(`d${n}_inc`), type: "text", name: `D${n} Incluso`, x: cx + X(4), y: cy + Y(138 - ASC(FS_INC)), width: X(500), height: Y(FS_INC + 4), text: `[lam_d${n}_incluso]`, fontSize: F(FS_INC), fontFamily: LAM_FONT, fill: LAM_V1_ACCENT, align: "left", bindParam: `lam_d${n}_incluso`, opacity: 1 });
    // Saída+Voo V1 linhas 952-953: 400 17px txtColor 'Saída: X  voo' at (x+4, y+162)
    els.push({ id: nid(`d${n}_sv`), type: "text", name: `D${n} Saída+Voo`, x: cx + X(4), y: cy + Y(162 - ASC(FS_SV)), width: X(500), height: Y(FS_SV + 4), text: `Saída: [lam_d${n}_saida]  [lam_d${n}_voo]`, fontSize: F(FS_SV), fontFamily: LAM_FONT, fill: LAM_V1_TXT, align: "left", opacity: 1 });
    // Hotel V1 linha 954: 400 17px txtColor 'Hotel: X' at (x+4, y+184)
    els.push({ id: nid(`d${n}_hot`), type: "text", name: `D${n} Hotel`, x: cx + X(4), y: cy + Y(184 - ASC(FS_HOT)), width: X(500), height: Y(FS_HOT + 4), text: `Hotel: [lam_d${n}_hotel]`, fontSize: F(FS_HOT), fontFamily: LAM_FONT, fill: LAM_V1_TXT, align: "left", opacity: 1 });

    // Pgto V1 linhas 956-957: 700 15px subColor uppercase at (x+4, y+210)
    els.push({ id: nid(`d${n}_pgto`), type: "text", name: `D${n} Pgto`, x: cx + X(4), y: cy + Y(210 - ASC(FS_PGTO)), width: X(500), height: Y(FS_PGTO + 4), text: `[lam_d${n}_pgto]`, fontSize: F(FS_PGTO), fontFamily: LAM_FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_pgto`, textTransform: "uppercase", opacity: 0.7 });
    // Parcelas V1 linhas 959-960: 400 20px txtColor 'Xx' at (x+4, y+236)
    els.push({ id: nid(`d${n}_par`), type: "text", name: `D${n} Parcelas`, x: cx + X(4), y: cy + Y(236 - ASC(FS_PAR)), width: X(500), height: Y(FS_PAR + 4), text: `[lam_d${n}_parcelas]`, fontSize: F(FS_PAR), fontFamily: LAM_FONT, fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_parcelas`, opacity: 1 });

    // Valor composto V1 linhas 962-968:
    //   'R$ ' + inteiro — 700 44px accent at (x+4, y+288 alphabetic)
    //   ,dec           — 400 26px txtColor at (x+4+wR+wI+2, y+274 alphabetic)
    // priceDisplay: true → PreviewStage renderiza 3 partes com measureText em runtime.
    els.push({ id: nid(`d${n}_val`), type: "text", name: `D${n} Valor`, x: cx + X(4), y: cy + Y(288 - ASC(FS_VAL)), width: X(500), height: Y(FS_VAL + 8), text: `[lam_d${n}_valor]`, fontSize: F(FS_VAL), fontFamily: LAM_FONT, fontStyle: "bold", fill: LAM_V1_ACCENT, align: "left", bindParam: `lam_d${n}_valor`, priceDisplay: true, opacity: 1 });

    // Total V1 linhas 970-971: 400 15px subColor 'ou R$ X à vista por pessoa' ou 'À VISTA' at (x+4, y+312)
    els.push({ id: nid(`d${n}_tot`), type: "text", name: `D${n} Total`, x: cx + X(4), y: cy + Y(312 - ASC(FS_TOT)), width: X(500), height: Y(FS_TOT + 4), text: `[lam_d${n}_total]`, fontSize: F(FS_TOT), fontFamily: LAM_FONT, fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_total`, opacity: 0.7 });
  });

  // Logo V1 linhas 919-922: w=160, at (CW-lw-40, CH-lh-40) = (880, 1720), globalAlpha=0.95
  els.push({ id: nid("logo"), type: "image", name: "Logo", x: X(880), y: Y(1720), width: X(160), height: X(160), src: LAM_LOGO_DEFAULT, bindParam: "logo_loja", imageFit: "contain", opacity: 0.95 });

  return els;
}

/* ══ Matriz de seed ══════════════════════════════════ */

const BUILDERS = {
  campanha:        { fn: CAMPANHA,      formType: "campanha",  nomeBase: "Campanha" },
  cruzeiro:        { fn: CRUZEIRO,      formType: "cruzeiro",  nomeBase: "Cruzeiro" },
  anoiteceu:       { fn: ANOITECEU,     formType: "anoiteceu", nomeBase: "Anoiteceu" },
  quatro_destinos: { fn: quatroDestinos, formType: "lamina",   nomeBase: "Card WhatsApp" },
};

const FORMAT_LABEL = { stories: "Stories", reels: "Reels", feed: "Feed", tv: "TV" };

async function main() {
  const rows = [];
  for (const [tipoKey, { fn, formType, nomeBase }] of Object.entries(BUILDERS)) {
    for (const [fmt, [w, h]] of Object.entries(DIMS)) {
      const key = `tmpl_base_${tipoKey}_${fmt}`;
      const elements = fn(w, h);
      const payload = {
        elements,
        // Card WhatsApp usa o azul V1 #0B1D3A; demais mantêm o azul campanha BG.
        background: tipoKey === "quatro_destinos" ? LAM_V1_BG : BG,
        duration: 5,
        width: w, height: h,
        format: fmt,
        formType,
        ...(tipoKey === "quatro_destinos" ? { qtdDestinos: 4 } : {}),
        nome: `${nomeBase} — ${FORMAT_LABEL[fmt]}`,
        licenseeId: null, lojaId: null,
        licenseeNome: "Templates Base", lojaNome: "—",
        thumbnail: null,
        is_base: true,
      };
      rows.push({ key, value: JSON.stringify(payload), updated_at: new Date().toISOString() });
    }
  }

  console.log(`[seed] Upsertando ${rows.length} templates base…`);
  const { data, error } = await sb.from("system_config").upsert(rows, { onConflict: "key" }).select("key");
  if (error) { console.error("[seed] erro:", error); process.exit(1); }
  console.log(`[seed] OK: ${data.length} linhas gravadas.`);
  for (const r of data) console.log("  ✓", r.key);
}

main().catch((e) => { console.error(e); process.exit(1); });

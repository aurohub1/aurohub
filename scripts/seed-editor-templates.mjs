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

/* ══ Card WhatsApp — Lâmina 4 Destinos (fiel ao V1 app.aurovista.com.br/lamina) ══
 * Coordenadas hardcoded do V1 (canvas 1080×1920 stories). Feed/TV escalonados.
 * Ícones fixos do Cloudinary dxgj4bcch. Binds lam_d{n}_*.
 */
const LAM_V1_BG = "#0B1D3A";      // fundo default V1
const LAM_V1_TXT = "#FFFFFF";     // texto default V1
const LAM_V1_ACCENT = "#D4E600";  // accent verde V1 (será trocado por paleta no render)
const LAM_V1_SUB = "rgba(255,255,255,0.7)";
const LAM_V1_BORDER = "rgba(255,255,255,0.6)";
const LAM_IC_L = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png";
const LAM_IC_M = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png";
const LAM_IC_R = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png";
const LAM_LOGO_DEFAULT = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774116248/PERFIL_34_pw0feq.png";

function quatroDestinos(w, h) {
  seq = 0;
  // Coordenadas base são do V1 para 1080×1920.
  // Para outros formatos escalamos X por w/1080 e Y por h/1920.
  const sx = w / 1080;
  const sy = h / 1920;
  // Média pra tamanhos de fonte (evita fontes gigantes no TV landscape)
  const sf = Math.min(sx, sy);

  // Fundo: `schema.background` do payload fica #0B1D3A (sólido da paleta V1 default).
  // Imagem de fundo opcional (upload/aleatório) desenhada por cima do background do stage.
  const els = [
    { id: nid("bg_img"), type: "image", name: "Imagem de fundo", x: 0, y: 0, width: w, height: h, bindParam: "img_fundo", imageFit: "cover", opacity: 1 },
  ];

  // Títulos — V1: titulo1 em y=200 font 700 47px; titulo2 em y=268 font 400 54px
  els.push({ id: nid("tit1"), type: "text", name: "Título 1", x: 40 * sx, y: 160 * sy, width: (1080 - 80) * sx, height: 60 * sy, text: "[lam_titulo1]", fontSize: Math.round(47 * sf), fontFamily: FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "center", bindParam: "lam_titulo1", opacity: 1 });
  els.push({ id: nid("tit2"), type: "text", name: "Título 2", x: 40 * sx, y: 234 * sy, width: (1080 - 80) * sx, height: 70 * sy, text: "[lam_titulo2]", fontSize: Math.round(54 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "center", bindParam: "lam_titulo2", opacity: 1 });

  // 4 cards grid 2×2 — V1 positions hardcoded
  const positions = [
    { x: 55, y: 420 }, { x: 560, y: 420 },
    { x: 55, y: 820 }, { x: 560, y: 820 },
  ];
  const cardW = 460, cardH = 370;
  const iconSz = 26, iconGap = 34, iconInset = 4;

  positions.forEach((pos, i) => {
    const n = i + 1;
    const cx = pos.x * sx;
    const cy = pos.y * sy;
    const cw = cardW * sx;
    // Pill de destino — V1 usa stroke 1.5, sem fill, largura = measureText(destino)+40 min 420
    els.push({ id: nid(`d${n}_pill`), type: "rect", name: `D${n} Pill destino`, x: cx, y: cy, width: cw * 0.92, height: 36 * sy, fill: "", stroke: LAM_V1_BORDER, strokeWidth: Math.max(1, Math.round(1.5 * sf)), cornerRadius: Math.round(18 * sf), opacity: 1 });
    els.push({ id: nid(`d${n}_dst`), type: "text", name: `D${n} Destino`, x: cx + 18 * sx, y: cy + 6 * sy, width: cw * 0.88, height: 28 * sy, text: `[lam_d${n}_destino]`, fontSize: Math.round(20 * sf), fontFamily: FONT, fontStyle: "bold", fill: LAM_V1_ACCENT, align: "left", verticalAlign: "middle", bindParam: `lam_d${n}_destino`, textTransform: "uppercase", opacity: 1 });

    // Período (y+80 V1)
    els.push({ id: nid(`d${n}_per`), type: "text", name: `D${n} Período`, x: cx + iconInset * sx, y: cy + 76 * sy, width: cw - 10 * sx, height: 44 * sy, text: `[lam_d${n}_periodo]`, fontSize: Math.round(36 * sf), fontFamily: FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_periodo`, opacity: 1 });

    // 3 ícones (y+90 V1, 26×26, gap 34)
    els.push({ id: nid(`d${n}_ic1`), type: "image", name: `D${n} Ícone 1`, x: cx + iconInset * sx, y: cy + 130 * sy, width: iconSz * sf, height: iconSz * sf, src: LAM_IC_L, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic2`), type: "image", name: `D${n} Ícone 2`, x: cx + (iconInset + iconGap) * sx, y: cy + 130 * sy, width: iconSz * sf, height: iconSz * sf, src: LAM_IC_M, imageFit: "contain", opacity: 1 });
    els.push({ id: nid(`d${n}_ic3`), type: "image", name: `D${n} Ícone 3`, x: cx + (iconInset + iconGap * 2) * sx, y: cy + 130 * sy, width: iconSz * sf, height: iconSz * sf, src: LAM_IC_R, imageFit: "contain", opacity: 1 });

    // Incluso (y+138 V1, 400 18px accent)
    els.push({ id: nid(`d${n}_inc`), type: "text", name: `D${n} Incluso`, x: cx + iconInset * sx, y: cy + 170 * sy, width: cw - 10 * sx, height: 24 * sy, text: `[lam_d${n}_incluso]`, fontSize: Math.round(18 * sf), fontFamily: FONT, fill: LAM_V1_ACCENT, align: "left", bindParam: `lam_d${n}_incluso`, opacity: 1 });
    // Saída + Voo (y+162 V1, 400 17px branco)
    els.push({ id: nid(`d${n}_sv`), type: "text", name: `D${n} Saída/Voo`, x: cx + iconInset * sx, y: cy + 196 * sy, width: cw - 10 * sx, height: 22 * sy, text: `Saída: [lam_d${n}_saida]  [lam_d${n}_voo]`, fontSize: Math.round(17 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "left", opacity: 1 });
    // Hotel (y+184 V1)
    els.push({ id: nid(`d${n}_hot`), type: "text", name: `D${n} Hotel`, x: cx + iconInset * sx, y: cy + 220 * sy, width: cw - 10 * sx, height: 22 * sy, text: `Hotel: [lam_d${n}_hotel]`, fontSize: Math.round(17 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_hotel`, opacity: 1 });

    // Pgto (y+210 V1, 700 15px subColor uppercase)
    els.push({ id: nid(`d${n}_pgto`), type: "text", name: `D${n} Pgto`, x: cx + iconInset * sx, y: cy + 250 * sy, width: cw - 10 * sx, height: 22 * sy, text: `[lam_d${n}_pgto]`, fontSize: Math.round(15 * sf), fontFamily: FONT, fontStyle: "bold", fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_pgto`, textTransform: "uppercase", opacity: 0.75 });
    // Parcelas (y+236 V1, 400 20px branco)
    els.push({ id: nid(`d${n}_par`), type: "text", name: `D${n} Parcelas`, x: cx + iconInset * sx, y: cy + 276 * sy, width: cw - 10 * sx, height: 28 * sy, text: `[lam_d${n}_parcelas]`, fontSize: Math.round(20 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_parcelas`, opacity: 1 });
    // Valor (y+288 V1, 700 44px accent — usa priceDisplay para R$/centavos split)
    els.push({ id: nid(`d${n}_val`), type: "text", name: `D${n} Valor`, x: cx + iconInset * sx, y: cy + 310 * sy, width: cw - 10 * sx, height: 56 * sy, text: `R$ [lam_d${n}_valor]`, fontSize: Math.round(44 * sf), fontFamily: FONT, fontStyle: "bold", fill: LAM_V1_ACCENT, align: "left", bindParam: `lam_d${n}_valor`, priceDisplay: true, opacity: 1 });
    // Total à vista (y+312 V1 — no V1 é "À VISTA" ou "ou R$ X à vista por pessoa")
    els.push({ id: nid(`d${n}_tot`), type: "text", name: `D${n} Total`, x: cx + iconInset * sx, y: cy + 348 * sy, width: cw - 10 * sx, height: 20 * sy, text: `[lam_d${n}_total]`, fontSize: Math.round(15 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "left", bindParam: `lam_d${n}_total`, opacity: 0.7 });
  });

  // Logo — V1: bottom-right, w=160, margin 40
  els.push({ id: nid("logo"), type: "image", name: "Logo", x: 880 * sx, y: 1720 * sy, width: 160 * sx, height: 160 * sy, src: LAM_LOGO_DEFAULT, bindParam: "logo_loja", imageFit: "contain", opacity: 0.95 });

  // Nome da loja — V1 não exibe, mas mantemos para branding. Opcional (hidden if empty).
  els.push({ id: nid("lj"), type: "text", name: "Loja", x: 40 * sx, y: 1840 * sy, width: (1080 - 240) * sx, height: 30 * sy, text: "[loja]", fontSize: Math.round(16 * sf), fontFamily: FONT, fill: LAM_V1_TXT, align: "left", bindParam: "loja", opacity: 0.6 });

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

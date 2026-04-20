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

function quatroDestinos(w, h) {
  seq = 0;
  const isTv = w > h;
  const pad = 30;
  const titH = 100;
  const ljH = 90;
  const gridTop = titH + pad;
  const gridH = h - gridTop - ljH - pad;
  const cellGap = 18;
  const cellW = (w - pad * 2 - cellGap) / 2;
  const cellH = (gridH - cellGap) / 2;

  const els = [
    { id: nid("bg"), type: "image", name: "Fundo", x: 0, y: 0, width: w, height: h, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
    { id: nid("ovl"), type: "rect", name: "Overlay", x: 0, y: 0, width: w, height: h, fill: BG, opacity: 0.62 },
    { id: nid("tit"), type: "text", name: "Linha 1 (título)", x: pad, y: 20, width: w - pad * 2, height: 46, text: "[trans_titulo]", fontSize: isTv ? 32 : 38, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "center", bindParam: "trans_titulo", opacity: 1 },
    { id: nid("sub"), type: "text", name: "Linha 2 (subtítulo)", x: pad, y: 70, width: w - pad * 2, height: 28, text: "[trans_subtitulo]", fontSize: isTv ? 18 : 22, fontFamily: FONT, fill: GOLD, align: "center", bindParam: "trans_subtitulo", opacity: 1 },
  ];

  for (let n = 1; n <= 4; n++) {
    const col = (n - 1) % 2;
    const row = Math.floor((n - 1) / 2);
    const cx = pad + col * (cellW + cellGap);
    const cy = gridTop + row * (cellH + cellGap);
    const dstSz = isTv ? 26 : 32;
    const txtSz = isTv ? 13 : 15;
    const parSz = isTv ? 18 : 22;
    const preSz = isTv ? 22 : 26;
    els.push({ id: nid(`d${n}_card`), type: "rect", name: `Destino ${n}`, x: cx, y: cy, width: cellW, height: cellH, fill: CARDBG, opacity: 0.94, cornerRadius: 20 });
    els.push({ id: nid(`d${n}_dst`), type: "text", name: `D${n} destino`, x: cx + 14, y: cy + 14, width: cellW - 28, height: 44, text: `[trans_destino${n}]`, fontSize: dstSz, fontFamily: FONT, fontStyle: "bold", fill: WHITE, align: "left", bindParam: `trans_destino${n}`, opacity: 1 });
    els.push({ id: nid(`d${n}_per`), type: "text", name: `D${n} período`, x: cx + 14, y: cy + 62, width: cellW - 28, height: 24, text: `[trans_periodo${n}]`, fontSize: txtSz, fontFamily: FONT, fill: WHITE, align: "left", bindParam: `trans_periodo${n}`, opacity: 1 });
    els.push({ id: nid(`d${n}_hot`), type: "text", name: `D${n} hotel`, x: cx + 14, y: cy + 90, width: cellW - 28, height: 24, text: `[trans_hotel${n}]`, fontSize: txtSz, fontFamily: FONT, fill: WHITE, align: "left", bindParam: `trans_hotel${n}`, opacity: 0.88 });
    els.push({ id: nid(`d${n}_inc`), type: "text", name: `D${n} incluso`, x: cx + 14, y: cy + 118, width: cellW - 28, height: 22, text: `[trans_incluso${n}]`, fontSize: txtSz - 1, fontFamily: FONT, fill: WHITE, align: "left", bindParam: `trans_incluso${n}`, opacity: 0.72 });

    // Bloco de preço no rodapé do card
    const priceY = cy + cellH - 96;
    els.push({ id: nid(`d${n}_pgto`), type: "text", name: `D${n} forma pgto`, x: cx + 14, y: priceY, width: cellW - 28, height: 22, text: `[trans_pgto${n}]`, fontSize: txtSz - 1, fontFamily: FONT, fill: GOLD, align: "left", bindParam: `trans_pgto${n}`, opacity: 1 });
    els.push({ id: nid(`d${n}_par`), type: "text", name: `D${n} parcelas`, x: cx + 14, y: priceY + 24, width: 96, height: 32, text: `[trans_parcelas${n}]`, fontSize: parSz, fontFamily: FONT, fontStyle: "bold", fill: GOLD, align: "left", bindParam: `trans_parcelas${n}`, opacity: 1 });
    els.push({ id: nid(`d${n}_pre`), type: "text", name: `D${n} preço`, x: cx + 116, y: priceY + 22, width: cellW - 132, height: 34, text: `R$ [trans_preco${n}]`, fontSize: preSz, fontFamily: FONT, fontStyle: "bold", fill: GOLD, align: "left", bindParam: `trans_preco${n}`, opacity: 1 });
    els.push({ id: nid(`d${n}_av`), type: "text", name: `D${n} à vista`, x: cx + 14, y: priceY + 62, width: cellW - 28, height: 22, text: `[trans_avista${n}]`, fontSize: txtSz - 2, fontFamily: FONT, fill: WHITE, align: "left", bindParam: `trans_avista${n}`, opacity: 0.85 });
  }

  els.push({ id: nid("ilj"), type: "image", name: "Logo Loja", x: pad, y: h - ljH, width: 160, height: ljH - 20, bindParam: "imgloja", imageFit: "contain", opacity: 1 });
  els.push({ id: nid("lj"), type: "text", name: "Loja", x: pad + 180, y: h - ljH + 14, width: w - pad * 2 - 200, height: 32, text: "[loja]", fontSize: isTv ? 18 : 22, fontFamily: FONT, fill: WHITE, align: "left", bindParam: "loja", opacity: 1 });
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
        background: BG,
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

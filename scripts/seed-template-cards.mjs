#!/usr/bin/env node
/**
 * Seed do template "Cards" (tmpl_cards_stories) — schema Konva com coords exatas
 * da spec validada visualmente. Canvas 1080×1920, fundo #0B1D3A.
 * Cards em {55,310}, {538,310}, {55,698}, {538,698} — cada 465×370.
 *
 * Run: node --env-file=.env.local scripts/seed-template-cards.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

/* ══ Constantes da spec ════════════════════════════ */
const CW = 1080;
const CH = 1920;
const BG = "#0B1D3A";
const CARD_BG = "#1a3a6e";
const CARD_STROKE = "#2d5a9e";
const ACCENT = "#D4E600";
const TXT = "#FFFFFF";
const TXT_DARK = "#0B1D3A";
const SUB = "rgba(255,255,255,0.65)";
const FONT = "Helvetica Neue";

const IC_L = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png";
const IC_M = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png";
const IC_R = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png";
const LOGO_DEFAULT = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774116248/PERFIL_34_pw0feq.png";

let seq = 0;
const nid = (p) => `${p}_${++seq}`;

function buildElements() {
  const els = [];

  // 1. rect fundo #0B1D3A 1080×1920
  els.push({
    id: nid("bg_rect"), type: "rect", name: "Fundo",
    x: 0, y: 0, width: CW, height: CH,
    fill: BG, opacity: 1,
  });

  // 2. imageBind img_fundo 1080×1920 (upload/shuffle do form)
  els.push({
    id: nid("bg_img"), type: "image", name: "Imagem de fundo",
    x: 0, y: 0, width: CW, height: CH,
    bindParam: "img_fundo", imageFit: "cover", opacity: 1,
  });

  // 3. titulo1 centralizado x=540 (canvas center) y=161 fs=47 bold white
  els.push({
    id: nid("tit1"), type: "text", name: "Título 1",
    x: 0, y: 161, width: CW, height: 60,
    text: "[lam_titulo1]", fontSize: 47, fontFamily: FONT, fontStyle: "bold",
    fill: TXT, align: "center", bindParam: "lam_titulo1", opacity: 1,
  });

  // 4. titulo2 x=540 y=224 fs=50 regular white
  els.push({
    id: nid("tit2"), type: "text", name: "Título 2",
    x: 0, y: 224, width: CW, height: 60,
    text: "[lam_titulo2]", fontSize: 50, fontFamily: FONT,
    fill: TXT, align: "center", bindParam: "lam_titulo2", opacity: 1,
  });

  // ── 4 cards ──────────────────────────────────────
  const CARD_W = 465, CARD_H = 370;
  const positions = [
    { x: 55,  y: 310 },
    { x: 538, y: 310 },
    { x: 55,  y: 698 },
    { x: 538, y: 698 },
  ];

  positions.forEach((pos, i) => {
    const n = i + 1;
    const cx = pos.x, cy = pos.y;

    // 5a. rect fundo do card
    els.push({
      id: nid(`d${n}_card`), type: "rect", name: `D${n} Card`,
      x: cx, y: cy, width: CARD_W, height: CARD_H,
      fill: CARD_BG, stroke: CARD_STROKE, strokeWidth: 1.5,
      cornerRadius: 18, opacity: 1,
    });

    // 5b. pill accent #D4E600 (y=14, x=16, w=300, h=32, radius 16)
    els.push({
      id: nid(`d${n}_pill`), type: "rect", name: `D${n} Pill`,
      x: cx + 16, y: cy + 14, width: 300, height: 32,
      fill: ACCENT, cornerRadius: 16, opacity: 1,
    });

    // 5c. destino x=30 y=30 fs=19 bold #0B1D3A uppercase (sobre a pill)
    els.push({
      id: nid(`d${n}_dst`), type: "text", name: `D${n} Destino`,
      x: cx + 30, y: cy + 30, width: 270, height: 24,
      text: `[lam_d${n}_destino]`, fontSize: 19, fontFamily: FONT, fontStyle: "bold",
      fill: TXT_DARK, align: "left", bindParam: `lam_d${n}_destino`,
      textTransform: "uppercase", opacity: 1,
    });

    // 5d. periodo x=16 y=88 fs=33 bold white
    els.push({
      id: nid(`d${n}_per`), type: "text", name: `D${n} Período`,
      x: cx + 16, y: cy + 88, width: 440, height: 42,
      text: `[lam_d${n}_periodo]`, fontSize: 33, fontFamily: FONT, fontStyle: "bold",
      fill: TXT, align: "left", bindParam: `lam_d${n}_periodo`, opacity: 1,
    });

    // 5e-g. 3 ícones 22×22 at (x+16, y+96), (x+46, y+96), (x+76, y+96)
    els.push({
      id: nid(`d${n}_ic1`), type: "image", name: `D${n} Ícone 1`,
      x: cx + 16, y: cy + 96, width: 22, height: 22,
      src: IC_L, imageFit: "contain", opacity: 1,
    });
    els.push({
      id: nid(`d${n}_ic2`), type: "image", name: `D${n} Ícone 2`,
      x: cx + 46, y: cy + 96, width: 22, height: 22,
      src: IC_M, imageFit: "contain", opacity: 1,
    });
    els.push({
      id: nid(`d${n}_ic3`), type: "image", name: `D${n} Ícone 3`,
      x: cx + 76, y: cy + 96, width: 22, height: 22,
      src: IC_R, imageFit: "contain", opacity: 1,
    });

    // 5h. incluso x=16 y=138 fs=16 accent
    els.push({
      id: nid(`d${n}_inc`), type: "text", name: `D${n} Incluso`,
      x: cx + 16, y: cy + 138, width: 440, height: 20,
      text: `[lam_d${n}_incluso]`, fontSize: 16, fontFamily: FONT,
      fill: ACCENT, align: "left", bindParam: `lam_d${n}_incluso`, opacity: 1,
    });

    // 5i. saida x=16 y=160 fs=15 white — texto inline "Saída: X  Voo"
    els.push({
      id: nid(`d${n}_sv`), type: "text", name: `D${n} Saída+Voo`,
      x: cx + 16, y: cy + 160, width: 440, height: 18,
      text: `Saída: [lam_d${n}_saida]  [lam_d${n}_voo]`, fontSize: 15, fontFamily: FONT,
      fill: TXT, align: "left", opacity: 1,
    });

    // 5j. hotel x=16 y=180 fs=15 white — texto inline "Hotel: X"
    els.push({
      id: nid(`d${n}_hot`), type: "text", name: `D${n} Hotel`,
      x: cx + 16, y: cy + 180, width: 440, height: 18,
      text: `Hotel: [lam_d${n}_hotel]`, fontSize: 15, fontFamily: FONT,
      fill: TXT, align: "left", opacity: 1,
    });

    // 5k. pgto x=16 y=206 fs=13 bold subColor uppercase
    els.push({
      id: nid(`d${n}_pgto`), type: "text", name: `D${n} Pgto`,
      x: cx + 16, y: cy + 206, width: 440, height: 16,
      text: `[lam_d${n}_pgto]`, fontSize: 13, fontFamily: FONT, fontStyle: "bold",
      fill: SUB, align: "left", bindParam: `lam_d${n}_pgto`,
      textTransform: "uppercase", opacity: 1,
    });

    // 5l. parcelas x=16 y=229 fs=18 white
    els.push({
      id: nid(`d${n}_par`), type: "text", name: `D${n} Parcelas`,
      x: cx + 16, y: cy + 229, width: 440, height: 22,
      text: `[lam_d${n}_parcelas]`, fontSize: 18, fontFamily: FONT,
      fill: TXT, align: "left", bindParam: `lam_d${n}_parcelas`, opacity: 1,
    });

    // 5m. valor x=16 y=240 fs=42 weight 900 accent — priceDisplay
    els.push({
      id: nid(`d${n}_val`), type: "text", name: `D${n} Valor`,
      x: cx + 16, y: cy + 240, width: 440, height: 52,
      text: `[lam_d${n}_valor]`, fontSize: 42, fontFamily: FONT, fontStyle: "900",
      fill: ACCENT, align: "left", bindParam: `lam_d${n}_valor`,
      priceDisplay: true, opacity: 1,
    });

    // 5n. total x=16 y=314 fs=13 subColor
    els.push({
      id: nid(`d${n}_tot`), type: "text", name: `D${n} Total`,
      x: cx + 16, y: cy + 314, width: 440, height: 16,
      text: `[lam_d${n}_total]`, fontSize: 13, fontFamily: FONT,
      fill: SUB, align: "left", bindParam: `lam_d${n}_total`, opacity: 1,
    });
  });

  // Logo — x=880 y=1760 w=160 opacity=0.95 bindParam=logo_loja com fallback src
  els.push({
    id: nid("logo"), type: "image", name: "Logo",
    x: 880, y: 1760, width: 160, height: 160,
    src: LOGO_DEFAULT, bindParam: "logo_loja",
    imageFit: "contain", opacity: 0.95,
  });

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

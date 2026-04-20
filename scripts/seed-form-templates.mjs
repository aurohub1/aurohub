#!/usr/bin/env node
/**
 * Seed dos 16 form_templates base (4 tipos × 4 formatos).
 * Gera os elementos Konva, insere na tabela form_templates (is_base=true, licensee_id=null),
 * e emite um arquivo SQL em database/seed_form_templates.sql para histórico.
 *
 * Run:  node --env-file=.env.local scripts/seed-form-templates.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY);

/* ── Dimensões por formato ──────────────────────────── */
const DIMS = {
  stories: [1080, 1920],
  reels:   [1080, 1920],
  feed:    [1080, 1350],
  tv:      [1920, 1080],
};

/* ── Helpers de elemento ────────────────────────────── */
let _id = 0;
const uid = (p) => `${p}_${++_id}`;

const bgFull = (w, h) => ({
  id: uid("bg"), type: "image", name: "Fundo", bindParam: "imgfundo",
  x: 0, y: 0, width: w, height: h, imageFit: "cover", opacity: 1,
});

const text = (opts) => ({
  id: uid("t"), type: "text", opacity: 1, fontFamily: "DM Sans", fill: "#FFFFFF",
  align: "left", ...opts,
});

const imageBind = (opts) => ({
  id: uid("ib"), type: "imageBind", opacity: 1, imageFit: "contain", ...opts,
});

const rect = (opts) => ({
  id: uid("r"), type: "rect", opacity: 1, fill: "#000000", ...opts,
});

/* ── Layouts por tipo/formato ───────────────────────── */
/** Retorna elementos Konva para (tipo, formato). */
function buildElements(formType, format) {
  _id = 0;
  const [W, H] = DIMS[format];
  const isHoriz = format === "tv";
  const pad = isHoriz ? 60 : 40;

  const els = [bgFull(W, H)];

  // Caixa escura translúcida (gradiente simulado) para legibilidade — stories/reels/feed
  if (!isHoriz) {
    els.push(rect({
      name: "Overlay rodapé", x: 0, y: H - Math.round(H * 0.32), width: W, height: Math.round(H * 0.32),
      fill: "#000000", opacity: 0.35, cornerRadius: 0,
    }));
  }

  if (formType === "campanha") {
    if (isHoriz) {
      // TV: esquerda = destino+datas, direita = detalhes+preço
      els.push(text({ name: "Destino", bindParam: "destino", text: "[destino]",
        x: pad, y: 120, width: W / 2 - pad * 2, height: 180,
        fontSize: 100, fontStyle: "bold", textTransform: "uppercase", align: "left" }));
      els.push(text({ name: "Período", bindParam: "dataida_fmt", text: "[dataida_fmt]",
        x: pad, y: 320, width: 400, height: 60, fontSize: 34, align: "left" }));
      els.push(text({ name: "Até", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
        x: pad + 260, y: 320, width: 520, height: 60, fontSize: 34, align: "left" }));
      els.push(text({ name: "Hotel", bindParam: "hotel", text: "[hotel]",
        x: pad, y: 420, width: W / 2 - pad * 2, height: 70, fontSize: 40, fontStyle: "bold" }));
      // Serviços
      [0, 1, 2].forEach((i) => els.push(text({
        name: `Serviço ${i + 1}`, bindParam: `servico${i + 1}`, text: `[servico${i + 1}]`,
        x: pad, y: 520 + i * 54, width: W / 2 - pad * 2, height: 50, fontSize: 28,
      })));
      // Preço direita
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
        x: W / 2 + pad, y: 240, width: W / 2 - pad * 2, height: 60, fontSize: 36, align: "center" }));
      els.push(text({ name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
        x: W / 2 + pad, y: 320, width: W / 2 - pad * 2, height: 200,
        fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
        x: W / 2 + pad, y: 560, width: W / 2 - pad * 2, height: 54, fontSize: 28, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    } else {
      // Stories / Reels / Feed
      const topY = format === "feed" ? 80 : 160;
      els.push(text({ name: "Destino", bindParam: "destino", text: "[destino]",
        x: pad, y: topY, width: W - pad * 2, height: 180,
        fontSize: format === "feed" ? 84 : 100, fontStyle: "bold",
        textTransform: "uppercase", align: "center" }));
      els.push(text({ name: "Data ida", bindParam: "dataida_fmt", text: "[dataida_fmt]",
        x: pad, y: topY + 210, width: (W - pad * 2) / 2, height: 50, fontSize: 32, align: "right" }));
      els.push(text({ name: "Data volta", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
        x: W / 2, y: topY + 210, width: (W - pad * 2) / 2, height: 50, fontSize: 32, align: "left" }));
      els.push(text({ name: "Hotel", bindParam: "hotel", text: "[hotel]",
        x: pad, y: topY + 300, width: W - pad * 2, height: 70, fontSize: 40,
        fontStyle: "bold", align: "center" }));
      [0, 1, 2].forEach((i) => els.push(text({
        name: `Serviço ${i + 1}`, bindParam: `servico${i + 1}`, text: `[servico${i + 1}]`,
        x: pad, y: topY + 400 + i * 50, width: W - pad * 2, height: 48, fontSize: 28, align: "center",
      })));
      const priceY = H - (format === "feed" ? 420 : 580);
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
        x: pad, y: priceY, width: W - pad * 2, height: 50, fontSize: 32, align: "center" }));
      els.push(text({ name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
        x: pad, y: priceY + 60, width: W - pad * 2, height: 180,
        fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
        x: pad, y: priceY + 250, width: W - pad * 2, height: 50, fontSize: 28, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    }
  }

  else if (formType === "cruzeiro") {
    if (isHoriz) {
      els.push(imageBind({ name: "Logo Cia Marítima", bindParam: "imgciamaritima",
        x: pad, y: 60, width: 180, height: 80 }));
      els.push(text({ name: "Navio", bindParam: "navio", text: "[navio]",
        x: pad, y: 180, width: W / 2 - pad * 2, height: 160,
        fontSize: 90, fontStyle: "bold", textTransform: "uppercase" }));
      els.push(text({ name: "Itinerário", bindParam: "itinerario", text: "[itinerario]",
        x: pad, y: 360, width: W / 2 - pad * 2, height: 150, fontSize: 30, lineHeight: 1.4 }));
      els.push(text({ name: "Embarque", bindParam: "dataida_fmt", text: "Embarque: [dataida_fmt]",
        x: pad, y: 540, width: W / 2 - pad * 2, height: 50, fontSize: 30 }));
      els.push(text({ name: "Desembarque", bindParam: "datavolta_fmt", text: "Desembarque: [datavolta_fmt]",
        x: pad, y: 600, width: W / 2 - pad * 2, height: 50, fontSize: 30 }));
      els.push(text({ name: "Noites", bindParam: "noites", text: "[noites] noites",
        x: pad, y: 660, width: W / 2 - pad * 2, height: 50, fontSize: 30, fontStyle: "bold" }));
      els.push(text({ name: "Incluso", bindParam: "incluso", text: "[incluso]",
        x: pad, y: 740, width: W / 2 - pad * 2, height: 160, fontSize: 26, lineHeight: 1.4 }));
      // Preço direita
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
        x: W / 2 + pad, y: 260, width: W / 2 - pad * 2, height: 60, fontSize: 36, align: "center" }));
      els.push(text({ name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
        x: W / 2 + pad, y: 340, width: W / 2 - pad * 2, height: 200,
        fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
        x: W / 2 + pad, y: 580, width: W / 2 - pad * 2, height: 54, fontSize: 28, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    } else {
      const topY = format === "feed" ? 60 : 140;
      els.push(imageBind({ name: "Logo Cia Marítima", bindParam: "imgciamaritima",
        x: W - 220, y: topY - 20, width: 180, height: 80 }));
      els.push(text({ name: "Navio", bindParam: "navio", text: "[navio]",
        x: pad, y: topY, width: W - pad * 2 - 180, height: 160,
        fontSize: format === "feed" ? 72 : 86, fontStyle: "bold", textTransform: "uppercase" }));
      els.push(text({ name: "Itinerário", bindParam: "itinerario", text: "[itinerario]",
        x: pad, y: topY + 180, width: W - pad * 2, height: 120, fontSize: 28, lineHeight: 1.4, align: "center" }));
      els.push(text({ name: "Embarque", bindParam: "dataida_fmt", text: "Embarque: [dataida_fmt]",
        x: pad, y: topY + 320, width: (W - pad * 2) / 2, height: 50, fontSize: 28 }));
      els.push(text({ name: "Desembarque", bindParam: "datavolta_fmt", text: "Desembarque: [datavolta_fmt]",
        x: W / 2, y: topY + 320, width: (W - pad * 2) / 2, height: 50, fontSize: 28 }));
      els.push(text({ name: "Noites", bindParam: "noites", text: "[noites] noites",
        x: pad, y: topY + 380, width: W - pad * 2, height: 60, fontSize: 34, fontStyle: "bold", align: "center" }));
      els.push(text({ name: "Incluso", bindParam: "incluso", text: "[incluso]",
        x: pad, y: topY + 460, width: W - pad * 2, height: 150, fontSize: 26, lineHeight: 1.4, align: "center" }));
      const priceY = H - (format === "feed" ? 420 : 580);
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
        x: pad, y: priceY, width: W - pad * 2, height: 50, fontSize: 32, align: "center" }));
      els.push(text({ name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
        x: pad, y: priceY + 60, width: W - pad * 2, height: 180,
        fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
        x: pad, y: priceY + 250, width: W - pad * 2, height: 50, fontSize: 28, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    }
  }

  else if (formType === "anoiteceu") {
    // Desconto gigante ao centro
    const cx = W / 2;
    const cy = H / 2;
    if (isHoriz) {
      els.push(text({ name: "Desconto", bindParam: "desconto_anoit", text: "[desconto_anoit]",
        x: 0, y: cy - 220, width: W, height: 340,
        fontSize: 340, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Período", bindParam: "inicio", text: "De [inicio]",
        x: pad, y: cy + 140, width: W / 2 - pad, height: 50, fontSize: 34, align: "right" }));
      els.push(text({ name: "Até", bindParam: "fim", text: "a [fim]",
        x: cx, y: cy + 140, width: W / 2 - pad, height: 50, fontSize: 34, align: "left" }));
      els.push(text({ name: "Para viagens", bindParam: "paraviagens", text: "Para viagens até [paraviagens]",
        x: pad, y: cy + 210, width: W - pad * 2, height: 50, fontSize: 28, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    } else {
      const bigFont = format === "feed" ? 280 : 360;
      els.push(text({ name: "Desconto", bindParam: "desconto_anoit", text: "[desconto_anoit]",
        x: 0, y: cy - bigFont / 2 - 20, width: W, height: bigFont + 40,
        fontSize: bigFont, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      els.push(text({ name: "Período", bindParam: "inicio", text: "De [inicio]",
        x: pad, y: cy + bigFont / 2 + 20, width: (W - pad * 2) / 2, height: 50, fontSize: 34, align: "right" }));
      els.push(text({ name: "Até", bindParam: "fim", text: "a [fim]",
        x: W / 2, y: cy + bigFont / 2 + 20, width: (W - pad * 2) / 2, height: 50, fontSize: 34, align: "left" }));
      els.push(text({ name: "Para viagens", bindParam: "paraviagens", text: "Para viagens até [paraviagens]",
        x: pad, y: cy + bigFont / 2 + 100, width: W - pad * 2, height: 50, fontSize: 26, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    }
  }

  else if (formType === "quatro_destinos") {
    // Grid 2x2: stories/reels/feed vertical (2 cols × 2 rows); tv horizontal (4 cols × 1 row)
    if (isHoriz) {
      const cellW = W / 4;
      const cellH = H - 160;
      [1, 2, 3, 4].forEach((n) => {
        const cx = (n - 1) * cellW;
        els.push(text({ name: `Destino ${n}`, bindParam: `destino${n}`, text: `[destino${n}]`,
          x: cx + 20, y: 60, width: cellW - 40, height: 90,
          fontSize: 46, fontStyle: "bold", textTransform: "uppercase", align: "center" }));
        els.push(text({ name: `Valor parcela ${n}`, bindParam: `valorparcela${n}`, text: `R$ [valorparcela${n}]`,
          x: cx + 20, y: 180, width: cellW - 40, height: 100,
          fontSize: 60, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      });
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] sem juros",
        x: pad, y: H - 150, width: W - pad * 2, height: 54, fontSize: 32, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    } else {
      const topY = format === "feed" ? 60 : 140;
      const cellW = (W - pad * 2) / 2 - 20;
      const cellH = format === "feed" ? 420 : 600;
      const positions = [
        [pad, topY], [pad + cellW + 40, topY],
        [pad, topY + cellH + 20], [pad + cellW + 40, topY + cellH + 20],
      ];
      [1, 2, 3, 4].forEach((n) => {
        const [cx, cy] = positions[n - 1];
        els.push(text({ name: `Destino ${n}`, bindParam: `destino${n}`, text: `[destino${n}]`,
          x: cx, y: cy, width: cellW, height: 100,
          fontSize: 54, fontStyle: "bold", textTransform: "uppercase", align: "center" }));
        els.push(text({ name: `Valor parcela ${n}`, bindParam: `valorparcela${n}`, text: `R$ [valorparcela${n}]`,
          x: cx, y: cy + 120, width: cellW, height: 120,
          fontSize: 80, fontStyle: "bold", fill: "#FFD166", align: "center" }));
      });
      els.push(text({ name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] sem juros",
        x: pad, y: H - 150, width: W - pad * 2, height: 54, fontSize: 32, align: "center" }));
      els.push(text({ name: "Loja", bindParam: "loja", text: "[loja]",
        x: pad, y: H - 80, width: W - pad * 2, height: 56, fontSize: 32, align: "center" }));
    }
  }

  return els;
}

/* ── Monta os 16 templates ──────────────────────────── */
// `quatro_destinos` é o valor canônico usado no app (FormType em publicar/page.tsx).
const TYPES = ["campanha", "cruzeiro", "anoiteceu", "quatro_destinos"];
const FORMATS = ["stories", "reels", "feed", "tv"];
const TYPE_LABEL = { campanha: "Campanha", cruzeiro: "Cruzeiro", anoiteceu: "Anoiteceu", quatro_destinos: "Card WhatsApp" };
const FORMAT_LABEL = { stories: "Stories", reels: "Reels", feed: "Feed", tv: "TV" };

const templates = [];
for (const t of TYPES) {
  for (const f of FORMATS) {
    const [w, h] = DIMS[f];
    templates.push({
      name: `Base — ${TYPE_LABEL[t]} ${FORMAT_LABEL[f]}`,
      form_type: t,
      format: f,
      width: w,
      height: h,
      schema: {
        elements: buildElements(t, f),
        background: "#1E3A6E",
        duration: 5,
        formType: t,
      },
      is_base: true,
      licensee_id: null,
      thumbnail_url: null,
    });
  }
}

/* ── Grava o SQL de histórico ───────────────────────── */
const sqlParts = [
  "-- Seed dos 16 form_templates base (4 tipos × 4 formatos).",
  "-- Gerado por scripts/seed-form-templates.mjs",
  "-- Regra: is_base=true, licensee_id=null. Aparecem para todos os clientes.",
  "",
  "DELETE FROM form_templates WHERE is_base = true;",
  "",
];
for (const tpl of templates) {
  const schemaLit = "'" + JSON.stringify(tpl.schema).replace(/'/g, "''") + "'::jsonb";
  sqlParts.push(
    `INSERT INTO form_templates (name, form_type, format, width, height, schema, is_base, licensee_id, thumbnail_url) VALUES (`
    + `'${tpl.name.replace(/'/g, "''")}', `
    + `'${tpl.form_type}', `
    + `'${tpl.format}', `
    + `${tpl.width}, ${tpl.height}, `
    + schemaLit + ", "
    + `true, NULL, NULL);`
  );
}
const seedPath = resolve(ROOT, "database/seed_form_templates.sql");
mkdirSync(dirname(seedPath), { recursive: true });
writeFileSync(seedPath, sqlParts.join("\n") + "\n", "utf8");
console.log("→ SQL gravado em", seedPath);

/* ── Executa no Supabase ────────────────────────────── */
// Apaga bases antigos (idempotente)
const { error: delErr } = await sb.from("form_templates").delete().eq("is_base", true);
if (delErr) { console.error("Erro ao limpar bases antigos:", delErr); process.exit(1); }

// Insere todos de uma vez
const { data: inserted, error: insErr } = await sb.from("form_templates").insert(templates).select("id, form_type, format, name");
if (insErr) { console.error("Erro no insert:", insErr); process.exit(1); }
console.log(`→ ${inserted.length} templates inseridos`);

/* ── Verificação ────────────────────────────────────── */
const { data: check } = await sb.from("form_templates")
  .select("form_type, format, name")
  .eq("is_base", true)
  .order("form_type").order("format");
console.log("\n--- form_type, format, name ---");
for (const r of check ?? []) console.log(`${r.form_type.padEnd(10)} | ${r.format.padEnd(8)} | ${r.name}`);

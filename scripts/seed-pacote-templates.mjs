#!/usr/bin/env node
/**
 * Seed dos 4 form_templates base de Pacote (stories/reels/feed/tv).
 * Layout baseado no Campanha (seed-form-templates.mjs).
 *
 * Binds cobertos (18): imgfundo, imghotel, imgloja, destino, saida, tipovoo,
 * dataida_fmt, datavolta_fmt, hotel, servico1, servico2, servico3,
 * numerodesconto, formapagamento, parcelas, valorparcela, totalduplo, loja.
 *
 * Também remove o registro legado form_type='lamina' do form_templates
 * (duplicidade Cards — a base canônica é quatro_destinos; o CardsCanvas
 * em /publicar/cards continua separado).
 *
 * Run:  node --env-file=.env.local scripts/seed-pacote-templates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SB_URL, SB_KEY);

/* ── Dimensões ──────────────────────────────────────── */
const DIMS = {
  stories: [1080, 1920],
  reels:   [1080, 1920],
  feed:    [1080, 1350],
  tv:      [1920, 1080],
};

/* ── Helpers de elemento (padrão seed-form-templates) ── */
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

/* ── Layout Pacote (baseado no Campanha, com extras) ── */
function buildPacoteElements(format) {
  _id = 0;
  const [W, H] = DIMS[format];
  const isHoriz = format === "tv";
  const pad = isHoriz ? 60 : 40;
  const els = [bgFull(W, H)];

  // Overlay rodapé — só pra verticais, legibilidade
  if (!isHoriz) {
    els.push(rect({
      name: "Overlay rodapé", x: 0, y: H - Math.round(H * 0.32), width: W, height: Math.round(H * 0.32),
      fill: "#000000", opacity: 0.35, cornerRadius: 0,
    }));
  }

  if (isHoriz) {
    // TV (1920×1080): 2 colunas — info à esquerda, preço à direita
    // Número desconto — canto superior direito
    els.push(text({
      name: "Número desconto", bindParam: "numerodesconto", text: "-[numerodesconto]",
      x: W - 340, y: 40, width: 300, height: 100,
      fontSize: 72, fontStyle: "bold", fill: "#FFD166", align: "right",
    }));

    // DESTINO topo esquerda
    els.push(text({
      name: "Destino", bindParam: "destino", text: "[destino]",
      x: pad, y: 120, width: W / 2 - pad * 2, height: 180,
      fontSize: 100, fontStyle: "bold", textTransform: "uppercase", align: "left",
    }));

    // Saída + tipo de voo
    els.push(text({
      name: "Saída", bindParam: "saida", text: "Saída: [saida]",
      x: pad, y: 300, width: (W / 2 - pad * 2) / 2, height: 46, fontSize: 30, align: "left",
    }));
    els.push(text({
      name: "Tipo de voo", bindParam: "tipovoo", text: "[tipovoo]",
      x: pad + (W / 2 - pad * 2) / 2, y: 300, width: (W / 2 - pad * 2) / 2, height: 46,
      fontSize: 30, align: "left",
    }));

    // Datas
    els.push(text({
      name: "Data ida", bindParam: "dataida_fmt", text: "[dataida_fmt]",
      x: pad, y: 360, width: 400, height: 60, fontSize: 34, align: "left",
    }));
    els.push(text({
      name: "Data volta", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
      x: pad + 260, y: 360, width: 520, height: 60, fontSize: 34, align: "left",
    }));

    // Hotel + miniatura
    els.push(imageBind({
      name: "Imagem hotel", bindParam: "imghotel",
      x: pad, y: 440, width: 140, height: 140, imageFit: "cover",
    }));
    els.push(text({
      name: "Hotel", bindParam: "hotel", text: "[hotel]",
      x: pad + 160, y: 450, width: W / 2 - pad * 2 - 160, height: 70,
      fontSize: 40, fontStyle: "bold", align: "left",
    }));

    // Serviços
    [1, 2, 3].forEach((i) => els.push(text({
      name: `Serviço ${i}`, bindParam: `servico${i}`, text: `[servico${i}]`,
      x: pad + 160, y: 530 + (i - 1) * 44, width: W / 2 - pad * 2 - 160, height: 40,
      fontSize: 24, align: "left",
    })));

    // Bloco preço — direita
    els.push(text({
      name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
      x: W / 2 + pad, y: 260, width: W / 2 - pad * 2, height: 60, fontSize: 36, align: "center",
    }));
    els.push(text({
      name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
      x: W / 2 + pad, y: 340, width: W / 2 - pad * 2, height: 200,
      fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Total duplo", bindParam: "totalduplo", text: "Total casal: R$ [totalduplo]",
      x: W / 2 + pad, y: 560, width: W / 2 - pad * 2, height: 46, fontSize: 26, align: "center",
    }));
    els.push(text({
      name: "Forma de pagamento", bindParam: "formapagamento", text: "[formapagamento]",
      x: W / 2 + pad, y: 620, width: W / 2 - pad * 2, height: 42, fontSize: 24, align: "center",
    }));

    // Rodapé — imgloja + loja
    els.push(imageBind({
      name: "Logo loja", bindParam: "imgloja",
      x: pad, y: H - 110, width: 90, height: 90, imageFit: "contain",
    }));
    els.push(text({
      name: "Loja", bindParam: "loja", text: "[loja]",
      x: pad + 110, y: H - 86, width: W - pad * 2 - 110, height: 46,
      fontSize: 30, fontStyle: "bold", align: "left",
    }));
  } else {
    // Stories / Reels / Feed
    const feed = format === "feed";
    const topY = feed ? 80 : 160;

    // Número desconto — canto superior direito
    els.push(text({
      name: "Número desconto", bindParam: "numerodesconto", text: "-[numerodesconto]",
      x: W - 280, y: topY - 20, width: 240, height: 90,
      fontSize: feed ? 56 : 68, fontStyle: "bold", fill: "#FFD166", align: "right",
    }));

    // DESTINO topo centralizado
    els.push(text({
      name: "Destino", bindParam: "destino", text: "[destino]",
      x: pad, y: topY, width: W - pad * 2, height: 180,
      fontSize: feed ? 84 : 100, fontStyle: "bold", textTransform: "uppercase", align: "center",
    }));

    // Saída + tipo de voo
    els.push(text({
      name: "Saída", bindParam: "saida", text: "Saída: [saida]",
      x: pad, y: topY + 210, width: (W - pad * 2) / 2, height: 46,
      fontSize: 30, align: "right",
    }));
    els.push(text({
      name: "Tipo de voo", bindParam: "tipovoo", text: "[tipovoo]",
      x: W / 2, y: topY + 210, width: (W - pad * 2) / 2, height: 46,
      fontSize: 30, align: "left",
    }));

    // Datas
    els.push(text({
      name: "Data ida", bindParam: "dataida_fmt", text: "[dataida_fmt]",
      x: pad, y: topY + 270, width: (W - pad * 2) / 2, height: 50,
      fontSize: 32, align: "right",
    }));
    els.push(text({
      name: "Data volta", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
      x: W / 2, y: topY + 270, width: (W - pad * 2) / 2, height: 50,
      fontSize: 32, align: "left",
    }));

    // Hotel + miniatura (hotel como bloco em destaque)
    els.push(imageBind({
      name: "Imagem hotel", bindParam: "imghotel",
      x: pad, y: topY + 360, width: 140, height: 140, imageFit: "cover",
    }));
    els.push(text({
      name: "Hotel", bindParam: "hotel", text: "[hotel]",
      x: pad + 160, y: topY + 380, width: W - pad * 2 - 160, height: 70,
      fontSize: 40, fontStyle: "bold", align: "left",
    }));

    // Serviços (3 linhas centralizadas)
    [1, 2, 3].forEach((i) => els.push(text({
      name: `Serviço ${i}`, bindParam: `servico${i}`, text: `[servico${i}]`,
      x: pad, y: topY + 540 + (i - 1) * 50, width: W - pad * 2, height: 48,
      fontSize: 28, align: "center",
    })));

    // Bloco preço em destaque
    const priceY = H - (feed ? 420 : 580);
    els.push(text({
      name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
      x: pad, y: priceY, width: W - pad * 2, height: 50, fontSize: 32, align: "center",
    }));
    els.push(text({
      name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
      x: pad, y: priceY + 60, width: W - pad * 2, height: 180,
      fontSize: 140, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Total duplo", bindParam: "totalduplo", text: "Total casal: R$ [totalduplo]",
      x: pad, y: priceY + 250, width: W - pad * 2, height: 50, fontSize: 26, align: "center",
    }));
    els.push(text({
      name: "Forma de pagamento", bindParam: "formapagamento", text: "[formapagamento]",
      x: pad, y: priceY + 310, width: W - pad * 2, height: 44, fontSize: 24, align: "center",
    }));

    // Rodapé — imgloja + loja
    els.push(imageBind({
      name: "Logo loja", bindParam: "imgloja",
      x: pad, y: H - 110, width: 90, height: 90, imageFit: "contain",
    }));
    els.push(text({
      name: "Loja", bindParam: "loja", text: "[loja]",
      x: pad + 110, y: H - 86, width: W - pad * 2 - 110, height: 46,
      fontSize: 30, fontStyle: "bold", align: "left",
    }));
  }

  return els;
}

/* ── Monta os 4 templates Pacote ─────────────────────── */
const FORMAT_LABEL = { stories: "Stories", reels: "Reels", feed: "Feed", tv: "TV" };

const templates = ["stories", "reels", "feed", "tv"].map((f) => {
  const [w, h] = DIMS[f];
  return {
    name: `Base — Pacote ${FORMAT_LABEL[f]}`,
    form_type: "pacote",
    format: f,
    width: w,
    height: h,
    schema: {
      elements: buildPacoteElements(f),
      background: "#1E3A6E",
      duration: 5,
      formType: "pacote",
    },
    is_base: true,
    licensee_id: null,
    thumbnail_url: null,
  };
});

/* ── Execução ───────────────────────────────────────── */
async function main() {
  console.log("[seed pacote] removendo form_type='lamina' (duplicidade Cards)…");
  const { error: delLaminaErr } = await sb
    .from("form_templates")
    .delete()
    .eq("form_type", "lamina");
  if (delLaminaErr) { console.error("delete lamina:", delLaminaErr); process.exit(1); }

  console.log("[seed pacote] limpando bases antigos de form_type='pacote'…");
  const { error: delErr } = await sb
    .from("form_templates")
    .delete()
    .eq("form_type", "pacote")
    .eq("is_base", true);
  if (delErr) { console.error("delete pacote:", delErr); process.exit(1); }

  console.log(`[seed pacote] inserindo ${templates.length} templates base…`);
  const { data: inserted, error: insErr } = await sb
    .from("form_templates")
    .insert(templates)
    .select("id, name, form_type, format");
  if (insErr) { console.error("insert pacote:", insErr); process.exit(1); }
  console.log(`[seed pacote] ok — ${inserted.length} linha(s) inserida(s)`);

  // Confirmação: SELECT form_type, format, name FROM form_templates WHERE is_base = true ORDER BY form_type, format;
  console.log("\n[seed pacote] SELECT pos-seed (is_base=true):");
  const { data: rows, error: selErr } = await sb
    .from("form_templates")
    .select("form_type, format, name")
    .eq("is_base", true)
    .order("form_type")
    .order("format");
  if (selErr) { console.error("select:", selErr); process.exit(1); }
  console.table(rows);
}

main().catch((e) => { console.error(e); process.exit(1); });

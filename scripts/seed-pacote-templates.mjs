#!/usr/bin/env node
/**
 * Seed dos 4 form_templates base de Pacote (stories/reels/feed/tv).
 * Aplica is_base=true, licensee_id=null.
 *
 * Binds cobertos: imgfundo, imghotel, imgloja, destino, saida, tipovoo,
 * dataida_fmt, datavolta_fmt, noites, feriado, hotel, servico1, servico2,
 * servico3, allinclusive, ultimachamada, ultimoslugares, ofertas,
 * numerodesconto, formapagamento, entrada, parcelas, valorparcela,
 * valortotal, totalduplo, loja.
 *
 * Também remove o registro legado form_type='lamina' do form_templates
 * (a base canônica pra Cards é quatro_destinos — o CardsCanvas do publicar
 * /publicar/cards continua separado).
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

/* ── Helpers de elemento (mesmo padrão de seed-form-templates) ─ */
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

/* ── Layout Pacote ──────────────────────────────────── */
function buildPacoteElements(format) {
  _id = 0;
  const [W, H] = DIMS[format];
  const isHoriz = format === "tv";
  const pad = isHoriz ? 60 : 40;
  const els = [bgFull(W, H)];

  // Overlay rodapé (legibilidade) — stories/reels/feed
  if (!isHoriz) {
    els.push(rect({
      name: "Overlay rodapé", x: 0, y: H - Math.round(H * 0.35), width: W, height: Math.round(H * 0.35),
      fill: "#000000", opacity: 0.40, cornerRadius: 0,
    }));
  }

  if (!isHoriz) {
    /* ── Vertical (stories/reels/feed) ──────────────── */
    const feed = format === "feed";
    const topY = feed ? 70 : 140;

    // DESTINO — topo, MAIÚSCULO bold centralizado
    els.push(text({
      name: "Destino", bindParam: "destino", text: "[destino]",
      x: pad, y: topY, width: W - pad * 2, height: 180,
      fontSize: feed ? 96 : 118, fontStyle: "bold", textTransform: "uppercase", align: "center",
    }));

    // Linha saída + tipo de voo
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

    // Linha de datas + noites
    els.push(text({
      name: "Data ida", bindParam: "dataida_fmt", text: "[dataida_fmt]",
      x: pad, y: topY + 270, width: 280, height: 46, fontSize: 30, align: "right",
    }));
    els.push(text({
      name: "Data volta", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
      x: pad + 300, y: topY + 270, width: 360, height: 46, fontSize: 30, align: "left",
    }));
    els.push(text({
      name: "Noites", bindParam: "noites", text: "· [noites] noites",
      x: pad + 680, y: topY + 270, width: W - pad * 2 - 680, height: 46,
      fontSize: 30, fontStyle: "bold", align: "left",
    }));

    // Feriado (badge)
    els.push(text({
      name: "Feriado", bindParam: "feriado", text: "[feriado]",
      x: pad, y: topY + 330, width: W - pad * 2, height: 42,
      fontSize: 26, fontStyle: "italic", fill: "#FFD166", align: "center",
    }));

    // Hotel + miniatura
    els.push(imageBind({
      name: "Imagem hotel", bindParam: "imghotel",
      x: pad, y: topY + 400, width: 160, height: 160, imageFit: "cover",
    }));
    els.push(text({
      name: "Hotel", bindParam: "hotel", text: "[hotel]",
      x: pad + 180, y: topY + 420, width: W - pad * 2 - 180, height: 72,
      fontSize: 42, fontStyle: "bold", align: "left",
    }));

    // Serviços (3 linhas)
    const svcY = topY + 600;
    [1, 2, 3].forEach((i) => {
      els.push(text({
        name: `Serviço ${i}`, bindParam: `servico${i}`, text: `[servico${i}]`,
        x: pad, y: svcY + (i - 1) * 48, width: W - pad * 2, height: 44,
        fontSize: 26, align: "center",
      }));
    });

    // All inclusive + selos (mesma linha)
    const badgeY = svcY + 170;
    els.push(text({
      name: "All inclusive", bindParam: "allinclusive", text: "[allinclusive]",
      x: pad, y: badgeY, width: (W - pad * 2) / 4, height: 38,
      fontSize: 20, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Última chamada", bindParam: "ultimachamada", text: "[ultimachamada]",
      x: pad + (W - pad * 2) / 4, y: badgeY, width: (W - pad * 2) / 4, height: 38,
      fontSize: 20, fontStyle: "bold", fill: "#FF6B6B", align: "center",
    }));
    els.push(text({
      name: "Últimos lugares", bindParam: "ultimoslugares", text: "[ultimoslugares]",
      x: pad + ((W - pad * 2) / 4) * 2, y: badgeY, width: (W - pad * 2) / 4, height: 38,
      fontSize: 20, fontStyle: "bold", fill: "#FF6B6B", align: "center",
    }));
    els.push(text({
      name: "Ofertas", bindParam: "ofertas", text: "[ofertas]",
      x: pad + ((W - pad * 2) / 4) * 3, y: badgeY, width: (W - pad * 2) / 4, height: 38,
      fontSize: 20, fontStyle: "bold", fill: "#4ADE80", align: "center",
    }));

    // Número do desconto (em destaque, canto)
    els.push(text({
      name: "Número desconto", bindParam: "numerodesconto", text: "-[numerodesconto]",
      x: W - 260, y: topY, width: 220, height: 90,
      fontSize: 64, fontStyle: "bold", fill: "#FFD166", align: "right",
    }));

    // Bloco preço — parte inferior em destaque
    const priceY = H - (feed ? 500 : 640);
    els.push(text({
      name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
      x: pad, y: priceY, width: W - pad * 2, height: 50, fontSize: 32, align: "center",
    }));
    els.push(text({
      name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
      x: pad, y: priceY + 60, width: W - pad * 2, height: 180,
      fontSize: feed ? 120 : 144, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
      x: pad, y: priceY + 250, width: W - pad * 2, height: 46, fontSize: 26, align: "center",
    }));
    els.push(text({
      name: "Total duplo", bindParam: "totalduplo", text: "Total casal: R$ [totalduplo]",
      x: pad, y: priceY + 300, width: W - pad * 2, height: 42, fontSize: 22, align: "center",
    }));
    els.push(text({
      name: "Entrada", bindParam: "entrada", text: "Entrada R$ [entrada]",
      x: pad, y: priceY + 348, width: (W - pad * 2) / 2, height: 42,
      fontSize: 22, align: "right",
    }));
    els.push(text({
      name: "Forma de pagamento", bindParam: "formapagamento", text: "[formapagamento]",
      x: W / 2, y: priceY + 348, width: (W - pad * 2) / 2, height: 42,
      fontSize: 22, align: "left",
    }));

    // Rodapé — loja + imgloja
    els.push(imageBind({
      name: "Logo loja", bindParam: "imgloja",
      x: pad, y: H - 110, width: 90, height: 90, imageFit: "contain",
    }));
    els.push(text({
      name: "Loja", bindParam: "loja", text: "[loja]",
      x: pad + 110, y: H - 86, width: W - pad * 2 - 110, height: 46,
      fontSize: 28, fontStyle: "bold", align: "left",
    }));
  } else {
    /* ── TV (horizontal, 1920×1080) ─────────────────── */
    // Esquerda: info, direita: preço, rodapé: loja
    const leftW = W / 2 - pad * 2;

    // Número desconto canto superior direito
    els.push(text({
      name: "Número desconto", bindParam: "numerodesconto", text: "-[numerodesconto]",
      x: W - 340, y: 40, width: 300, height: 100,
      fontSize: 72, fontStyle: "bold", fill: "#FFD166", align: "right",
    }));

    // DESTINO topo esquerda (uppercase bold)
    els.push(text({
      name: "Destino", bindParam: "destino", text: "[destino]",
      x: pad, y: 80, width: leftW, height: 160,
      fontSize: 108, fontStyle: "bold", textTransform: "uppercase", align: "left",
    }));

    // Saída + tipo de voo
    els.push(text({
      name: "Saída", bindParam: "saida", text: "Saída: [saida]",
      x: pad, y: 250, width: leftW / 2, height: 46, fontSize: 30, align: "left",
    }));
    els.push(text({
      name: "Tipo de voo", bindParam: "tipovoo", text: "[tipovoo]",
      x: pad + leftW / 2, y: 250, width: leftW / 2, height: 46, fontSize: 30, align: "left",
    }));

    // Datas + noites
    els.push(text({
      name: "Data ida", bindParam: "dataida_fmt", text: "[dataida_fmt]",
      x: pad, y: 310, width: 260, height: 46, fontSize: 30, align: "left",
    }));
    els.push(text({
      name: "Data volta", bindParam: "datavolta_fmt", text: "a [datavolta_fmt]",
      x: pad + 280, y: 310, width: 340, height: 46, fontSize: 30, align: "left",
    }));
    els.push(text({
      name: "Noites", bindParam: "noites", text: "· [noites] noites",
      x: pad + 640, y: 310, width: leftW - 640, height: 46,
      fontSize: 30, fontStyle: "bold", align: "left",
    }));
    els.push(text({
      name: "Feriado", bindParam: "feriado", text: "[feriado]",
      x: pad, y: 370, width: leftW, height: 42,
      fontSize: 24, fontStyle: "italic", fill: "#FFD166", align: "left",
    }));

    // Hotel + miniatura
    els.push(imageBind({
      name: "Imagem hotel", bindParam: "imghotel",
      x: pad, y: 440, width: 140, height: 140, imageFit: "cover",
    }));
    els.push(text({
      name: "Hotel", bindParam: "hotel", text: "[hotel]",
      x: pad + 160, y: 450, width: leftW - 160, height: 60,
      fontSize: 38, fontStyle: "bold", align: "left",
    }));

    // Serviços
    [1, 2, 3].forEach((i) => {
      els.push(text({
        name: `Serviço ${i}`, bindParam: `servico${i}`, text: `[servico${i}]`,
        x: pad + 160, y: 520 + (i - 1) * 40, width: leftW - 160, height: 36,
        fontSize: 22, align: "left",
      }));
    });

    // Selos (linha horizontal na parte inferior esquerda)
    const badgeY = 740;
    const badgeW = leftW / 4;
    els.push(text({
      name: "All inclusive", bindParam: "allinclusive", text: "[allinclusive]",
      x: pad, y: badgeY, width: badgeW, height: 36,
      fontSize: 18, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Última chamada", bindParam: "ultimachamada", text: "[ultimachamada]",
      x: pad + badgeW, y: badgeY, width: badgeW, height: 36,
      fontSize: 18, fontStyle: "bold", fill: "#FF6B6B", align: "center",
    }));
    els.push(text({
      name: "Últimos lugares", bindParam: "ultimoslugares", text: "[ultimoslugares]",
      x: pad + badgeW * 2, y: badgeY, width: badgeW, height: 36,
      fontSize: 18, fontStyle: "bold", fill: "#FF6B6B", align: "center",
    }));
    els.push(text({
      name: "Ofertas", bindParam: "ofertas", text: "[ofertas]",
      x: pad + badgeW * 3, y: badgeY, width: badgeW, height: 36,
      fontSize: 18, fontStyle: "bold", fill: "#4ADE80", align: "center",
    }));

    // Bloco preço — direita
    els.push(text({
      name: "Parcelas", bindParam: "parcelas", text: "Em [parcelas] de",
      x: W / 2 + pad, y: 260, width: W / 2 - pad * 2, height: 54, fontSize: 32, align: "center",
    }));
    els.push(text({
      name: "Valor parcela", bindParam: "valorparcela", text: "R$ [valorparcela]",
      x: W / 2 + pad, y: 330, width: W / 2 - pad * 2, height: 200,
      fontSize: 150, fontStyle: "bold", fill: "#FFD166", align: "center",
    }));
    els.push(text({
      name: "Valor total", bindParam: "valortotal", text: "ou R$ [valortotal] à vista",
      x: W / 2 + pad, y: 560, width: W / 2 - pad * 2, height: 46, fontSize: 26, align: "center",
    }));
    els.push(text({
      name: "Total duplo", bindParam: "totalduplo", text: "Total casal: R$ [totalduplo]",
      x: W / 2 + pad, y: 610, width: W / 2 - pad * 2, height: 42, fontSize: 22, align: "center",
    }));
    els.push(text({
      name: "Entrada", bindParam: "entrada", text: "Entrada R$ [entrada]",
      x: W / 2 + pad, y: 660, width: (W / 2 - pad * 2) / 2, height: 42,
      fontSize: 22, align: "right",
    }));
    els.push(text({
      name: "Forma de pagamento", bindParam: "formapagamento", text: "[formapagamento]",
      x: W / 2 + pad + (W / 2 - pad * 2) / 2, y: 660, width: (W / 2 - pad * 2) / 2, height: 42,
      fontSize: 22, align: "left",
    }));

    // Rodapé loja + imgloja
    els.push(imageBind({
      name: "Logo loja", bindParam: "imgloja",
      x: pad, y: H - 110, width: 90, height: 90, imageFit: "contain",
    }));
    els.push(text({
      name: "Loja", bindParam: "loja", text: "[loja]",
      x: pad + 110, y: H - 86, width: W - pad * 2 - 110, height: 46,
      fontSize: 28, fontStyle: "bold", align: "left",
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

  // Confirmação: SELECT id, name, form_type, format FROM form_templates WHERE form_type IN ('pacote', 'lamina');
  console.log("\n[seed pacote] SELECT pos-seed (form_type IN ('pacote','lamina')):");
  const { data: rows, error: selErr } = await sb
    .from("form_templates")
    .select("id, name, form_type, format")
    .in("form_type", ["pacote", "lamina"])
    .order("form_type")
    .order("format");
  if (selErr) { console.error("select:", selErr); process.exit(1); }
  console.table(rows);

  console.log("\n[seed pacote] contagem por form_type (bases):");
  const { data: allBases } = await sb
    .from("form_templates")
    .select("form_type")
    .eq("is_base", true);
  const counts = {};
  for (const r of allBases ?? []) counts[r.form_type] = (counts[r.form_type] ?? 0) + 1;
  console.table(counts);
}

main().catch((e) => { console.error(e); process.exit(1); });

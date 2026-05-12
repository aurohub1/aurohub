#!/usr/bin/env node
/**
 * Cria os 2 templates base de Lâmina 4 Destinos clonando o canvas de Card WhatsApp.
 * Insere em system_config (fonte de verdade do editor) e sincroniza form_templates.
 * Também libera acesso e feature para o licensee de teste.
 *
 * Run:  node --env-file=.env.local scripts/seed-lamina-templates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SB_URL, SB_KEY);

const LIC        = "2acbabe7-e8e5-4964-a65c-1ba524149b77";
const KEY_STORIES = "tmpl_base_lamina_stories";
const KEY_REELS   = "tmpl_base_lamina_reels";

/* ── 1. Busca todos os system_config tmpl_* e acha card_whatsapp ── */
console.log("Buscando templates card_whatsapp em system_config…");
const { data: scAll, error: scErr } = await sb
  .from("system_config")
  .select("key,value")
  .like("key", "tmpl_%");

if (scErr) { console.error("Erro ao ler system_config:", scErr.message); process.exit(1); }

const cwTemplates = (scAll ?? [])
  .map(r => {
    try { return { key: r.key, parsed: JSON.parse(r.value) }; } catch { return null; }
  })
  .filter(r => r && r.parsed?.formType === "card_whatsapp");

console.log(`  card_whatsapp encontrados: ${cwTemplates.length} (${cwTemplates.map(r => r.key).join(", ") || "nenhum"})`);

if (cwTemplates.length === 0) {
  console.error("Nenhum template card_whatsapp em system_config — impossível clonar.");
  process.exit(1);
}

// Prefere templates base (is_base = true ou chave tmpl_base_*)
const baseCw = cwTemplates.filter(r => r.parsed.is_base === true || r.key.startsWith("tmpl_base_"));
const pool   = baseCw.length > 0 ? baseCw : cwTemplates;

const storiesSrc = pool.find(r => r.parsed.format === "stories") ?? pool[0];
const reelsSrc   = pool.find(r => r.parsed.format === "reels")   ?? storiesSrc;

if (!reelsSrc || reelsSrc === storiesSrc) {
  console.warn("⚠  Sem source reels — usando cópia do stories.");
}

console.log(`  → stories: ${storiesSrc.key}`);
console.log(`  → reels:   ${reelsSrc.key}`);

/* ── 2. Monta payloads para system_config ── */
function buildPayload(src, format, nome) {
  return {
    ...src.parsed,           // copia todos os elementos canvas
    formType:    "lamina",
    format,
    nome,
    is_base:     true,
    licenseeId:  null,
    lojaId:      null,
    licenseeNome: null,
    lojaNome:    null,
    thumbnail:   null,
  };
}

const payloads = [
  { key: KEY_STORIES, payload: buildPayload(storiesSrc, "stories", "Base — Lâmina 4 Destinos Stories") },
  { key: KEY_REELS,   payload: buildPayload(reelsSrc,   "reels",   "Base — Lâmina 4 Destinos Reels")   },
];

/* ── 3. Upsert em system_config ── */
console.log("\nInserindo em system_config…");
for (const { key, payload } of payloads) {
  const { error } = await sb.from("system_config").upsert(
    { key, value: JSON.stringify(payload), updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) { console.error(`  ✗ ${key}:`, error.message); process.exit(1); }
  console.log(`  ✓ ${key}`);
}

/* ── 4. Sincroniza form_templates (config_key = system_config.key) ── */
//   O canvas editor salva form_type = "card_whatsapp" para lâmina (linha 490 de editor/page.tsx)
console.log("\nSincronizando form_templates…");

// Remove entradas antigas com chave errada (sem prefixo tmpl_)
await sb.from("form_templates")
  .delete()
  .in("config_key", ["lamina_base_stories", "lamina_base_reels"]);

for (const { key, payload } of payloads) {
  const ftData = {
    config_key:  key,
    name:        payload.nome,
    form_type:   "lamina",
    format:      payload.format,
    is_base:     true,
    active:      true,
    licensee_id: null,
    schema: {
      elements:   payload.elements  ?? [],
      background: payload.background ?? "#0E1520",
      formType:   "lamina",
      width:      payload.width  ?? 1080,
      height:     payload.height ?? 1920,
    },
    width:  payload.width  ?? 1080,
    height: payload.height ?? 1920,
  };
  const { error } = await sb.from("form_templates").upsert(ftData, { onConflict: "config_key" });
  if (error) { console.error(`  ✗ form_templates ${key}:`, error.message); }
  else console.log(`  ✓ form_templates → ${key}`);
}

/* ── 5. template_access para licensee de teste ── */
console.log("\nConfigurando template_access…");
await sb.from("template_access")
  .delete()
  .eq("licensee_id", LIC)
  .in("template_key", [KEY_STORIES, KEY_REELS, "lamina_base_stories", "lamina_base_reels"]);

const { error: taErr } = await sb.from("template_access").insert([
  { template_key: KEY_STORIES, licensee_id: LIC },
  { template_key: KEY_REELS,   licensee_id: LIC },
]);
if (taErr) console.error("  ✗ template_access:", taErr.message);
else console.log("  ✓ template_access configurado");

/* ── 6. Feature override (lamina = enabled) ── */
console.log("\nHabilitando feature 'lamina'…");
const { error: foErr } = await sb.from("licensee_feature_overrides").upsert(
  { licensee_id: LIC, feature_key: "lamina", enabled: true },
  { onConflict: "licensee_id,feature_key" },
);
if (foErr) console.error("  ✗ feature_overrides:", foErr.message);
else console.log(`  ✓ feature 'lamina' habilitada para licensee ${LIC}`);

console.log("\nPronto.");

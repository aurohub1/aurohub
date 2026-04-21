#!/usr/bin/env node
/**
 * Copia o template Cards (tmpl_cards_stories) de system_config para form_templates.
 * O publicar/page.tsx lê de form_templates; o template estava apenas em system_config.
 *
 * Equivalente SQL:
 *   INSERT INTO form_templates (name, form_type, format, width, height, schema, is_base, licensee_id)
 *   SELECT 'Cards Stories — Base', 'lamina', 'stories', 1080, 1920, value::jsonb, true, null
 *   FROM system_config WHERE key = 'tmpl_cards_stories';
 *
 * Run:  node --env-file=.env.local scripts/seed-form-templates-cards.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SB_URL, SB_KEY);

const TARGET_NAME = "Cards Stories — Base";
const SOURCE_KEY = "tmpl_cards_stories";

async function main() {
  console.log(`[seed cards→form_templates] lendo ${SOURCE_KEY} de system_config…`);
  const { data: src, error: srcErr } = await sb
    .from("system_config")
    .select("value")
    .eq("key", SOURCE_KEY)
    .single();

  if (srcErr || !src?.value) {
    console.error(`[seed cards→form_templates] não achei ${SOURCE_KEY} em system_config:`, srcErr);
    process.exit(1);
  }

  const schema = typeof src.value === "string" ? JSON.parse(src.value) : src.value;

  // Evita duplicata — procura por name igual, form_type=lamina, is_base=true
  const { data: existing } = await sb
    .from("form_templates")
    .select("id, name")
    .eq("name", TARGET_NAME)
    .eq("form_type", "lamina")
    .eq("is_base", true)
    .maybeSingle();

  if (existing?.id) {
    console.log(`[seed cards→form_templates] já existe (id=${existing.id}) — atualizando schema…`);
    const { error: upErr } = await sb
      .from("form_templates")
      .update({
        format: "stories",
        width: 1080,
        height: 1920,
        schema,
        active: true,
      })
      .eq("id", existing.id);
    if (upErr) { console.error("[seed cards→form_templates] erro no update:", upErr); process.exit(1); }
  } else {
    console.log(`[seed cards→form_templates] inserindo novo registro…`);
    const { data: ins, error: insErr } = await sb
      .from("form_templates")
      .insert({
        name: TARGET_NAME,
        form_type: "lamina",
        format: "stories",
        width: 1080,
        height: 1920,
        schema,
        is_base: true,
        licensee_id: null,
        active: true,
      })
      .select("id")
      .single();
    if (insErr) { console.error("[seed cards→form_templates] erro no insert:", insErr); process.exit(1); }
    console.log(`[seed cards→form_templates] inserido id=${ins.id}`);
  }

  // Confirmação: SELECT id, name, form_type, format FROM form_templates WHERE form_type = 'lamina';
  console.log(`[seed cards→form_templates] confirmando form_type='lamina'…`);
  const { data: rows, error: selErr } = await sb
    .from("form_templates")
    .select("id, name, form_type, format")
    .eq("form_type", "lamina");
  if (selErr) { console.error("[seed cards→form_templates] erro no select:", selErr); process.exit(1); }
  console.table(rows);
  console.log(`[seed cards→form_templates] OK — ${rows?.length ?? 0} registro(s) com form_type='lamina'`);
}

main().catch((e) => { console.error(e); process.exit(1); });

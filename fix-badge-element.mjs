// Fix badge elements in form_templates (and system_config):
//   1. Change type:"image" → "imageBind" for _badge bindParams
//   2. Remove duplicate badge elements (same bindParam): keep Cloudinary URL, remove base64
//
// Run: node fix-badge-element.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l && !l.startsWith("#"))
    .map(l => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function fixSchema(schema, rowId, table) {
  let changed = false;
  if (!schema?.elements) return { schema, changed };

  // Group elements by bindParam ending in _badge
  const badgeMap = new Map();
  for (const el of schema.elements) {
    const bp = el.bindParam;
    if (!bp?.endsWith("_badge")) continue;
    if (!badgeMap.has(bp)) badgeMap.set(bp, []);
    badgeMap.get(bp).push(el);
  }

  const toRemove = new Set();

  for (const [bp, els] of badgeMap) {
    // Fix type for all badge elements
    for (const el of els) {
      if (el.type !== "imageBind") {
        console.log(`  [${table}/${rowId}] ${bp} id=${el.id}: type ${el.type} → imageBind`);
        el.type = "imageBind";
        changed = true;
      }
    }

    // Remove duplicates: if >1 element for same bindParam, keep best src
    if (els.length > 1) {
      // Prefer Cloudinary URL over base64 over empty
      els.sort((a, b) => {
        const scoreA = /^https?:\/\//i.test(a.src || "") ? 2 : a.src?.startsWith("data:") ? 0 : 1;
        const scoreB = /^https?:\/\//i.test(b.src || "") ? 2 : b.src?.startsWith("data:") ? 0 : 1;
        return scoreB - scoreA;
      });
      for (let i = 1; i < els.length; i++) {
        console.log(`  [${table}/${rowId}] ${bp} DUPLICADO removido: id=${els[i].id} src=${(els[i].src || "").slice(0, 60)}`);
        toRemove.add(els[i].id);
        changed = true;
      }
    }

    // Clear base64 src from remaining element
    const keeper = els[0];
    if (keeper.src?.startsWith("data:")) {
      console.log(`  [${table}/${rowId}] ${bp} id=${keeper.id}: limpando base64 src`);
      keeper.src = "";
      changed = true;
    }
  }

  if (toRemove.size > 0) {
    schema.elements = schema.elements.filter(el => !toRemove.has(el.id));
  }

  return { schema, changed };
}

async function fixTable(table, idCol) {
  console.log(`\n=== ${table} ===`);
  const { data: rows, error } = await supabase
    .from(table)
    .select(`${idCol}, schema`)
    .not(idCol, "is", null);

  if (error) { console.error(`erro ao buscar:`, error.message); return; }

  let fixed = 0;
  for (const row of rows) {
    const { schema, changed } = fixSchema(row.schema, row[idCol], table);
    if (!changed) continue;

    const { error: upErr } = await supabase
      .from(table)
      .update({ schema })
      .eq(idCol, row[idCol]);

    if (upErr) console.error(`  ERRO ao atualizar ${row[idCol]}:`, upErr.message);
    else { fixed++; console.log(`  ✓ ${row[idCol]} atualizado`); }
  }
  console.log(`${fixed} linha(s) corrigida(s) de ${rows.length}`);
}

await fixTable("form_templates", "id");
await fixTable("system_config", "licensee_id");

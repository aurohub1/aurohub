// One-off: limpa migração anterior e re-insere com schema correto (elements wrapped).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const AZV = "2acbabe7-e8e5-4964-a65c-1ba524149b77";

// 1) DELETE
const { data: deleted, error: delErr } = await sb
  .from("form_templates")
  .delete()
  .in("name", ["Cards", "Pacote"])
  .eq("licensee_id", AZV)
  .select("id, name, form_type, format");
if (delErr) { console.error("delete:", delErr); process.exit(1); }
console.log(`deletadas ${deleted.length} linhas`);
for (const r of deleted) console.log(`  - ${r.form_type}/${r.format}  "${r.name}"`);

// 2) Read source
const { data: rows, error: readErr } = await sb
  .from("system_config")
  .select("key, value")
  .in("key", ["tmpl_cards_stories", "tmpl_teste_1775869438496"]);
if (readErr) { console.error("read:", readErr); process.exit(1); }
console.log(`encontradas ${rows.length} linhas em system_config`);

// 3) Build cleaner payload + INSERT
const payload = [];
for (const r of rows) {
  try {
    const p = JSON.parse(r.value);
    payload.push({
      name: p.nome || r.key,
      form_type: p.formType || "pacote",
      format: p.format || "stories",
      width: Number(p.width) || 1080,
      height: Number(p.height) || 1920,
      schema: {
        elements: p.elements ?? [],
        background: p.background || "#1A3A6E",
        formType: p.formType || "pacote",
        duration: Number(p.duration) || 5,
      },
      is_base: false,
      licensee_id: p.licenseeId || null,
      active: true,
    });
  } catch (e) { console.error("parse fail:", r.key, e); }
}

const { data: inserted, error: insErr } = await sb
  .from("form_templates")
  .insert(payload)
  .select("id, name, form_type, format, is_base, licensee_id");
if (insErr) { console.error("insert:", insErr); process.exit(1); }

console.log(`inseridas ${inserted.length} linhas em form_templates`);
for (const r of inserted) {
  console.log(`  ${r.form_type}/${r.format}  ${r.is_base ? "BASE" : r.licensee_id?.slice(0, 8)}  "${r.name}"`);
}

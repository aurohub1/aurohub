import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await sb.from("system_config").select("value").eq("key", "tmpl_teste_1775869438496").single();
if (error) { console.error(error); process.exit(1); }
const parsed = JSON.parse(data.value);
const els = parsed.elements || parsed.schema?.elements || [];
console.log("total elements:", els.length);
console.log("formType:", parsed.formType);
console.log("format:", parsed.format);
console.log("---");
const binds = new Set();
for (const e of els) if (e.bindParam) binds.add(e.bindParam);
console.log("unique bindParams:", [...binds].sort().join("\n  "));
console.log("---");
console.log(JSON.stringify(els.map(e => ({ id: e.id, type: e.type, bindParam: e.bindParam, name: e.name, text: e.text?.slice(0, 40) })), null, 2));

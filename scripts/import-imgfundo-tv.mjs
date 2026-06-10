/**
 * import-imgfundo-tv.mjs
 *
 * Importa imagens de duas pastas Cloudinary para a tabela imgfundo com tipo='tv'.
 *
 * Uso:
 *   node scripts/import-imgfundo-tv.mjs            # grava no Supabase
 *   node scripts/import-imgfundo-tv.mjs --dry-run  # só mostra preview
 *
 * Lê credenciais de .env.local na raiz do projeto.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ─── Pastas a importar ─────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = "dxgj4bcch";
const MAX_PER_PAGE     = 500;

const SOURCES = [
  {
    folder:    "aurohub v2/img_fundo/tv_fundo/destino horizontal",
    tipo:      "tv",
    form_type: "todos",
  },
  {
    folder:    "aurohub v2/img_fundo/tv_fundo/cruzeiro horizontal",
    tipo:      "tv",
    form_type: "cruzeiro",
  },
];
// ───────────────────────────────────────────────────────────────────────────

// ── Lê .env.local ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Não encontrou ${filePath}. Rode o script na raiz do projeto.`);
  }
  const env = {};
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv(".env.local");

const CLOUDINARY_API_KEY    = env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = env.CLOUDINARY_API_SECRET;
const SUPABASE_URL          = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY          = env.SUPABASE_SERVICE_ROLE_KEY;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)
  throw new Error("CLOUDINARY_API_KEY ou CLOUDINARY_API_SECRET ausentes no .env.local");
if (!SUPABASE_URL || !SUPABASE_KEY)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converte public_id em nome legível:
 *   "pasta/CANCUN_ifn9ws"        → "CANCUN"
 *   "pasta/RIO_DE_JANEIRO_n3ofz3" → "RIO DE JANEIRO"
 *
 * Regra:
 *  1. Último segmento após /
 *  2. Remove extensão
 *  3. Remove sufixo Cloudinary: _[a-zA-Z0-9]{6,8} no final
 *  4. Underscores → espaços
 *  5. UPPERCASE
 */
function publicIdToNome(publicId) {
  const filename   = publicId.split("/").pop() ?? publicId;
  const semExt     = filename.replace(/\.[^.]+$/, "");
  const semSufixo  = semExt.replace(/_[a-zA-Z0-9]{6,8}$/, "");
  const comEspacos = semSufixo.replace(/_/g, " ").trim();
  return comEspacos.toUpperCase();
}

// ── Cloudinary Admin API ───────────────────────────────────────────────────

function authHeader() {
  return "Basic " + Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64");
}

/**
 * Usa a Search API com expressão asset_folder para listar imagens em pastas
 * que usam Dynamic Folders (onde o public_id não contém o path da pasta).
 */
async function fetchAllFromFolder(folder) {
  const all = [];
  let cursor = undefined;
  let page   = 1;

  const searchUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/search`;

  do {
    process.stdout.write(`\r  Página ${page}… (${all.length} imagens)`);

    const body = {
      expression:  `asset_folder:"${folder}"`,
      max_results: MAX_PER_PAGE,
    };
    if (cursor) body.next_cursor = cursor;

    const res = await fetch(searchUrl, {
      method:  "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary Search API ${res.status}: ${text}`);
    }

    const data = await res.json();
    all.push(...(data.resources ?? []));
    cursor = data.next_cursor;
    page++;
  } while (cursor);

  process.stdout.write(`\r  ${all.length} imagens encontradas.               \n`);
  return all;
}

// ── Supabase upsert ────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const { error } = await supabase
    .from("imgfundo")
    .upsert(rows, { onConflict: "public_id" });
  return error;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`\n☁️  Cloud: ${CLOUDINARY_CLOUD}  |  🗄️  Supabase: ${SUPABASE_URL}`);
  console.log(isDryRun ? "🔍 MODO DRY-RUN — nenhuma linha será gravada\n" : "✏️  MODO GRAVAÇÃO\n");

  const allRows = [];

  for (const src of SOURCES) {
    console.log(`📂 Pasta: "${src.folder}"`);
    console.log(`   form_type: ${src.form_type}  |  tipo: ${src.tipo}`);

    const resources = await fetchAllFromFolder(src.folder);

    if (!resources.length) {
      console.log("   ⚠️  Nenhuma imagem encontrada nesta pasta.\n");
      continue;
    }

    const rows = resources.map((r) => ({
      nome:      publicIdToNome(r.public_id),
      url:       r.secure_url,
      tipo:      src.tipo,
      formato:   "tv",
      form_type: src.form_type,
      public_id: r.public_id,
    }));

    // Preview das primeiras 20
    console.log(`\n   Preview (primeiros ${Math.min(20, rows.length)} de ${rows.length}):`);
    console.log("   " + "─".repeat(64));
    for (const row of rows.slice(0, 20)) {
      const pid   = row.public_id.split("/").pop();
      const linha = `${pid.padEnd(40).slice(0, 40)}  →  ${row.nome}`;
      console.log(`   ${linha}`);
    }
    console.log("   " + "─".repeat(64) + "\n");

    allRows.push(...rows);
  }

  if (!allRows.length) {
    console.log("Nenhuma imagem encontrada em nenhuma pasta. Verifique os nomes das pastas.");
    return;
  }

  console.log(`Total de linhas a gravar: ${allRows.length}`);

  if (isDryRun) {
    console.log("\n[DRY RUN] Nenhuma linha gravada. Remova --dry-run para gravar.");
    return;
  }

  // Upsert em lotes de 100
  const BATCH = 100;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const error = await upsertBatch(batch);
    if (error) {
      console.error(`\n  ✗ Erro no lote ${i}–${i + batch.length - 1}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  ${inserted}/${allRows.length} gravados…`);
    }
  }

  console.log(`\n\n✅ Concluído: ${inserted} inseridos/atualizados, ${errors} erros.`);
}

main().catch((err) => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});

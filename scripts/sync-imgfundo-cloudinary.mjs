/**
 * Sincroniza imagens da pasta IMG/áleatorio no Cloudinary → tabela imgfundo no Supabase.
 * Novas imagens são inseridas com tipo='card' via UPSERT.
 *
 * Run: NODE_OPTIONS=--use-system-ca node --env-file=.env.local scripts/sync-imgfundo-cloudinary.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

const CLOUD    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "dxgj4bcch";
const API_KEY  = process.env.CLOUDINARY_API_KEY;
const API_SEC  = process.env.CLOUDINARY_API_SECRET;
const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FOLDER   = "IMG/áleatorio";
const PROJ_REF = "emcafedppvwparimvtob";

for (const [k, v] of [
  ["CLOUDINARY_API_KEY", API_KEY], ["CLOUDINARY_API_SECRET", API_SEC],
  ["NEXT_PUBLIC_SUPABASE_URL", SB_URL], ["SUPABASE_SERVICE_ROLE_KEY", SB_KEY],
]) {
  if (!v) { console.error(`Falta variável: ${k}`); process.exit(1); }
}

const sb      = createClient(SB_URL, SB_KEY);
const cldAuth = Buffer.from(`${API_KEY}:${API_SEC}`).toString("base64");

/* ── Verifica se coluna tipo existe ──────────────────────── */
async function hasTipoColumn() {
  const res = await fetch(`${SB_URL}/rest/v1/imgfundo?select=tipo&limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  return res.ok;
}

/* ── Adiciona coluna via Supabase CLI (se disponível) ────── */
function addColumnViaCLI() {
  const sql = "ALTER TABLE imgfundo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'destino';";
  try {
    execSync(
      `npx supabase db execute --project-ref ${PROJ_REF} --sql "${sql}"`,
      { stdio: "pipe" }
    );
    return true;
  } catch {
    return false;
  }
}

/* ── Busca imagens via Cloudinary Search API ─────────────── */
async function fetchCloudinaryImages() {
  const resources = [];
  let cursor;

  do {
    const body = {
      expression: `folder:"${FOLDER}"`,
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    };

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD}/resources/search`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${cldAuth}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`Cloudinary Search ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.error) throw new Error(`Cloudinary Search error: ${json.error.message}`);
    resources.push(...(json.resources ?? []));
    cursor = json.next_cursor;
  } while (cursor);

  return resources;
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  // 1. Garantir coluna tipo
  const hasCol = await hasTipoColumn();
  if (!hasCol) {
    console.log("Coluna 'tipo' não existe. Tentando adicionar via Supabase CLI...");
    if (addColumnViaCLI()) {
      console.log("  Coluna adicionada com sucesso.");
    } else {
      console.error("\n⚠️  Não foi possível adicionar a coluna automaticamente.");
      console.error("Execute no Supabase SQL Editor e rode o script novamente:");
      console.error("  https://supabase.com/dashboard/project/emcafedppvwparimvtob/sql/new\n");
      console.error("  ALTER TABLE imgfundo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'destino';\n");
      process.exit(1);
    }
  } else {
    console.log(`Coluna 'tipo' confirmada.`);
  }

  // 2. Buscar imagens no Cloudinary
  console.log(`\nBuscando imagens no Cloudinary (pasta: ${FOLDER})...`);
  const cloudResources = await fetchCloudinaryImages();
  console.log(`  Encontradas: ${cloudResources.length} imagens`);

  if (!cloudResources.length) {
    console.log("Nenhuma imagem na pasta.");
    return;
  }

  // 3. URLs já no Supabase
  const { data: existing, error: fetchErr } = await sb
    .from("imgfundo").select("url").limit(10000);
  if (fetchErr) throw fetchErr;
  const existingSet = new Set((existing ?? []).map((r) => r.url));
  console.log(`  Já no Supabase: ${existingSet.size} registros`);

  const newResources = cloudResources.filter((r) => !existingSet.has(r.secure_url));
  console.log(`  Novas para inserir: ${newResources.length}`);

  if (!newResources.length) {
    console.log("\nTabela já está sincronizada.");
    return;
  }

  // 4. Insert em lotes de 100
  let inserted = 0;
  for (let i = 0; i < newResources.length; i += 100) {
    const batch = newResources.slice(i, i + 100).map((r) => {
      const filename = r.public_id.split("/").pop() ?? r.public_id;
      return {
        url: r.secure_url,
        public_id: r.public_id,
        nome: filename.toUpperCase(),
        tipo: "card",
        formato: "stories",
        form_type: "todos",
      };
    });
    const { error } = await sb.from("imgfundo").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r  Inseridos: ${inserted}/${newResources.length}`);
  }

  console.log(`\n\nSincronização concluída! ${inserted} imagens adicionadas com tipo='card'.`);
}

main().catch((err) => {
  console.error("\nErro:", err.message);
  process.exit(1);
});

#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * migrate-images.js
 * ------------------------------------------------------------
 * Migra as tabelas `imgfundo` e `imghotel` do Aurohub Estável (v1)
 * para o Aurohub Next (v2).
 *
 * Uso:
 *   node --env-file=.env.local scripts/migrate-images.js           # executa
 *   node --env-file=.env.local scripts/migrate-images.js --dry     # só conta / inspeciona
 *   node --env-file=.env.local scripts/migrate-images.js --table=imghotel  # só uma tabela
 *
 * Requisitos:
 *   - Node 20+ (pelo flag --env-file)
 *   - @supabase/supabase-js já instalado no projeto
 *   - SUPABASE_SERVICE_ROLE_KEY preenchido no .env.local (senão RLS pode bloquear os inserts)
 *
 * V1 (origem):
 *   https://wwwpuqjdpecnixvbqigq.supabase.co
 *   Anon key está hardcoded abaixo (é a mesma pública do client.js do Estável).
 *
 * V2 (destino):
 *   Lido de process.env.NEXT_PUBLIC_SUPABASE_URL
 *   Write key: SUPABASE_SERVICE_ROLE_KEY (preferido) ou NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Schema esperado em V2 (crie se não existir):
 *
 *   CREATE TABLE IF NOT EXISTS imgfundo (
 *     id          bigserial PRIMARY KEY,
 *     nome        text NOT NULL,
 *     url         text NOT NULL,
 *     created_at  timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_imgfundo_nome ON imgfundo(nome);
 *
 *   CREATE TABLE IF NOT EXISTS imghotel (
 *     id          bigserial PRIMARY KEY,
 *     nome        text NOT NULL,
 *     url         text NOT NULL,
 *     created_at  timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_imghotel_nome ON imghotel(nome);
 *
 * Estratégia:
 *   - Pagina o V1 em batches de 1000 (limite default do PostgREST)
 *   - Insere no V2 em batches de 500 — `id` é regenerado pelo destino
 *   - Não tenta dedup: se rodar 2×, duplica. Rode após TRUNCATE se necessário.
 *   - Em `--dry`, só conta origem e destino e imprime as 3 primeiras linhas da V1.
 * ------------------------------------------------------------ */

const { createClient } = require("@supabase/supabase-js");

/* ── Config ─────────────────────────────────────── */

// V1 — Aurohub Estável (hardcoded; é a anon key pública já exposta em client.js)
const V1_URL = "https://wwwpuqjdpecnixvbqigq.supabase.co";
const V1_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g";

// V2 — Aurohub Next (do .env.local)
const V2_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const V2_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!V2_URL || !V2_KEY) {
  console.error(
    "[migrate-images] V2 credentials ausentes. Rode com: node --env-file=.env.local scripts/migrate-images.js"
  );
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[migrate-images] ⚠  SUPABASE_SERVICE_ROLE_KEY vazia — usando anon key. RLS pode bloquear os INSERTs no V2."
  );
}

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const tableArg = argv.find((a) => a.startsWith("--table="));
const ONLY_TABLE = tableArg ? tableArg.split("=")[1] : null;

const TABLES = ONLY_TABLE ? [ONLY_TABLE] : ["imgfundo", "imghotel"];
const PAGE_SIZE = 1000;
const INSERT_BATCH = 500;

/* ── Clients ────────────────────────────────────── */

const v1 = createClient(V1_URL, V1_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const v2 = createClient(V2_URL, V2_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Helpers ────────────────────────────────────── */

async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await v1
      .from(table)
      .select("id, nome, url, created_at")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`fetch ${table} [${from}-${to}]: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    console.log(
      `  ← ${table} page [${from}-${from + data.length - 1}] · total ${rows.length}`
    );
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function insertBatches(table, rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH).map((r) => ({
      // id é regenerado pelo destino — NÃO preservar
      nome: r.nome,
      url: r.url,
      created_at: r.created_at, // preserva timestamp original
    }));
    const { error } = await v2.from(table).insert(slice);
    if (error) throw new Error(`insert ${table} batch ${i}: ${error.message}`);
    inserted += slice.length;
    console.log(
      `  → ${table} batch [${i}-${i + slice.length - 1}] · inseridos ${inserted}/${rows.length}`
    );
  }
  return inserted;
}

/* ── Main ───────────────────────────────────────── */

(async () => {
  console.log(`\n══ Aurohub · migrate-images ${DRY ? "(DRY RUN)" : ""} ══`);
  console.log(`V1 origem: ${V1_URL}`);
  console.log(`V2 destino: ${V2_URL}`);
  console.log(`Tabelas:   ${TABLES.join(", ")}\n`);

  for (const table of TABLES) {
    console.log(`── ${table} ────────────────────────────`);
    try {
      const [cV1, cV2] = await Promise.all([
        countRows(v1, table),
        countRows(v2, table),
      ]);
      console.log(`  V1: ${cV1} registros`);
      console.log(`  V2: ${cV2} registros (antes)`);

      if (cV1 === 0) {
        console.log(`  ⚠  V1 vazio — nada a migrar.\n`);
        continue;
      }

      const rows = await fetchAll(table);
      console.log(`  Carregados da V1: ${rows.length} linhas`);
      console.log(
        `  Amostra:`,
        rows.slice(0, 3).map((r) => ({
          nome: r.nome,
          url: r.url?.slice(0, 60) + "...",
        }))
      );

      if (DRY) {
        console.log(`  (dry) pularia o insert de ${rows.length} linhas.\n`);
        continue;
      }

      const inserted = await insertBatches(table, rows);
      const cV2After = await countRows(v2, table);
      console.log(`  ✓ Inseridos: ${inserted}`);
      console.log(`  V2: ${cV2After} registros (depois)`);
      console.log(`  Delta: +${cV2After - cV2}\n`);
    } catch (err) {
      console.error(`  ✗ Erro em ${table}:`, err.message, "\n");
    }
  }

  console.log("══ Fim ══\n");
})().catch((err) => {
  console.error("[migrate-images] erro fatal:", err);
  process.exit(1);
});

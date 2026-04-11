#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * migrate-images.js
 * ------------------------------------------------------------
 * Migra as tabelas de recursos do Aurohub Estável (v1) → Next (v2).
 *
 * Uso:
 *   node --env-file=.env.local scripts/migrate-images.js           # executa tudo
 *   node --env-file=.env.local scripts/migrate-images.js --dry     # só conta / inspeciona
 *   node --env-file=.env.local scripts/migrate-images.js --force   # ignora dedup (tabela já populada)
 *   node --env-file=.env.local scripts/migrate-images.js --table=imghotel  # só uma tabela
 *
 * Requisitos:
 *   - Node 20+ (pelo flag --env-file)
 *   - @supabase/supabase-js instalado
 *   - SUPABASE_SERVICE_ROLE_KEY no .env.local (write bypass RLS)
 *   - Tabelas criadas no V2 via `database/imagens.sql` — se alguma faltar,
 *     o script avisa e pula (não tenta DDL porque PostgREST não expõe).
 *
 * V1 (origem):
 *   https://wwwpuqjdpecnixvbqigq.supabase.co  (anon key pública já do Estável)
 *
 * V2 (destino):
 *   Lido de process.env.NEXT_PUBLIC_SUPABASE_URL
 *   Write key: SUPABASE_SERVICE_ROLE_KEY (preferido) ou anon
 *
 * Tabelas migradas (ver `TABLES` abaixo):
 *   imgfundo   { nome, url }
 *   imghotel   { nome, url }
 *   imgaviao   { url }                    -- sem nome
 *   imgcruise  { nome, url, cia }
 *   icocruise  { nome, url }
 *   badges     { nome, url }
 *   simbol     { nome, url }
 *   feriados   { nome, url, loja }
 * ------------------------------------------------------------ */

const { createClient } = require("@supabase/supabase-js");

/* ── Config ─────────────────────────────────────── */

const V1_URL = "https://wwwpuqjdpecnixvbqigq.supabase.co";
const V1_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g";

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

/**
 * Definição das tabelas a migrar.
 * `columns` = colunas a ler do V1 e re-inserir no V2 (sem id, que é regenerado).
 * `preserveCreatedAt` = preserva timestamp original se a coluna existir.
 */
const TABLES = [
  { name: "imgfundo",  columns: ["nome", "url"] },
  { name: "imghotel",  columns: ["nome", "url"] },
  { name: "imgaviao",  columns: ["url"] },
  { name: "imgcruise", columns: ["nome", "url", "cia"] },
  { name: "icocruise", columns: ["nome", "url"] },
  { name: "badges",    columns: ["nome", "url"] },
  { name: "simbol",    columns: ["nome", "url"] },
  // feriados: coluna `loja` não existe no V1 (apesar do schema do migration_v1_tables.sql)
  { name: "feriados",  columns: ["nome", "url"] },
];

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const FORCE = argv.includes("--force");
const tableArg = argv.find((a) => a.startsWith("--table="));
const ONLY_TABLE = tableArg ? tableArg.split("=")[1] : null;

const RUN_TABLES = ONLY_TABLE
  ? TABLES.filter((t) => t.name === ONLY_TABLE)
  : TABLES;

if (ONLY_TABLE && RUN_TABLES.length === 0) {
  console.error(
    `[migrate-images] tabela "${ONLY_TABLE}" não está no array. Opções: ${TABLES.map((t) => t.name).join(", ")}`
  );
  process.exit(1);
}

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

/**
 * Conta linhas. Retorna null se a tabela não existe no destino (code 42P01).
 */
async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) {
      return null; // tabela ausente
    }
    throw new Error(`count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function fetchAll(table, columns) {
  const selectCols = ["id", ...columns, "created_at"].join(", ");
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await v1
      .from(table)
      .select(selectCols)
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

async function insertBatches(table, columns, rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH).map((r) => {
      const out = {};
      for (const col of columns) out[col] = r[col];
      // Preserva timestamp original
      if (r.created_at) out.created_at = r.created_at;
      return out;
    });
    const { error } = await v2.from(table).insert(slice);
    if (error) throw new Error(`insert ${table} batch ${i}: ${error.message}`);
    inserted += slice.length;
    console.log(
      `  → ${table} batch [${i}-${i + slice.length - 1}] · inseridos ${inserted}/${rows.length}`
    );
  }
  return inserted;
}

function summarizeAmostra(rows, columns) {
  return rows.slice(0, 3).map((r) => {
    const o = {};
    for (const col of columns) {
      const v = r[col];
      if (typeof v === "string" && v.length > 60) o[col] = v.slice(0, 60) + "...";
      else o[col] = v;
    }
    return o;
  });
}

/* ── Main ───────────────────────────────────────── */

(async () => {
  console.log(`\n══ Aurohub · migrate-images ${DRY ? "(DRY RUN)" : ""} ══`);
  console.log(`V1 origem:  ${V1_URL}`);
  console.log(`V2 destino: ${V2_URL}`);
  console.log(`Tabelas:    ${RUN_TABLES.map((t) => t.name).join(", ")}\n`);

  const missing = [];
  const summary = [];

  for (const { name, columns } of RUN_TABLES) {
    console.log(`── ${name} ────────────────────────────`);
    try {
      const cV1 = await countRows(v1, name);
      if (cV1 === null) {
        console.log(`  ✗ ${name} não existe no V1.\n`);
        summary.push({ table: name, v1: "—", v2: "—", status: "não existe V1" });
        continue;
      }
      const cV2 = await countRows(v2, name);
      if (cV2 === null) {
        console.log(
          `  ⚠  ${name} NÃO EXISTE no V2. Rode database/imagens.sql antes de migrar.`
        );
        missing.push(name);
        summary.push({ table: name, v1: cV1, v2: "—", status: "V2 ausente" });
        console.log();
        continue;
      }

      console.log(`  V1: ${cV1} registros`);
      console.log(`  V2: ${cV2} registros (antes)`);

      if (cV1 === 0) {
        console.log(`  ⚠  V1 vazio — nada a migrar.\n`);
        summary.push({ table: name, v1: 0, v2: cV2, status: "V1 vazio" });
        continue;
      }

      // Guard de dedup: se V2 já tem algo, pula (a menos que --force)
      if (cV2 > 0 && !FORCE) {
        console.log(
          `  ⚠  V2 já tem ${cV2} registros — pulando pra evitar duplicação. Use --force pra sobrescrever.\n`
        );
        summary.push({ table: name, v1: cV1, v2: cV2, status: "já populado (skip)" });
        continue;
      }

      const rows = await fetchAll(name, columns);
      console.log(`  Carregados da V1: ${rows.length} linhas`);
      console.log(`  Amostra:`, summarizeAmostra(rows, columns));

      if (DRY) {
        console.log(`  (dry) pularia o insert de ${rows.length} linhas.\n`);
        summary.push({ table: name, v1: cV1, v2: cV2, status: `dry (+${rows.length})` });
        continue;
      }

      const inserted = await insertBatches(name, columns, rows);
      const cV2After = await countRows(v2, name);
      console.log(`  ✓ Inseridos: ${inserted}`);
      console.log(`  V2: ${cV2After} registros (depois)`);
      console.log(`  Delta: +${(cV2After ?? 0) - cV2}\n`);
      summary.push({ table: name, v1: cV1, v2: cV2After, status: `migrado (+${inserted})` });
    } catch (err) {
      console.error(`  ✗ Erro em ${name}:`, err.message, "\n");
      summary.push({ table: name, v1: "?", v2: "?", status: `erro: ${err.message}` });
    }
  }

  console.log("══ Resumo ══");
  console.table(summary);

  if (missing.length > 0) {
    console.log(
      `\n⚠  Tabelas ausentes no V2: ${missing.join(", ")}\n` +
        `   Rode o SQL em database/imagens.sql no Supabase Dashboard → SQL Editor.\n`
    );
  }

  console.log("══ Fim ══\n");
})().catch((err) => {
  console.error("[migrate-images] erro fatal:", err);
  process.exit(1);
});

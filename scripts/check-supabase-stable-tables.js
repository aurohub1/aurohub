#!/usr/bin/env node

/**
 * Lista tabelas no Supabase Estável (wwwpuqjdpecnixvbqigq)
 * Para verificar se existe tabela de imagens de navios
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwwpuqjdpecnixvbqigq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_STABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYyNTA4NSwiZXhwIjoyMDQ4MjAxMDg1fQ.tJN5ixpObQ_uxe_X9J-rQM5r2LfmS0RCuZEe7i7Ry6E';

async function main() {
  console.log('🔗 Conectando ao Supabase Estável (wwwpuqjdpecnixvbqigq)...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Query para listar todas as tabelas públicas
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  });

  if (error) {
    // Se RPC não funcionar, tentar abordagem alternativa
    console.log('⚠️  RPC não disponível, listando tabelas conhecidas...\n');

    const knownTables = [
      'cruzeiros',
      'navios',
      'cruise_ships',
      'ship_images',
      'brand_assets',
      'imagens',
      'images',
      'media',
      'cloudinary_assets',
      'form_data',
      'forms',
      'templates',
      'form_templates',
    ];

    console.log('📋 Testando tabelas comuns:\n');
    console.log('┌────────────────────────┬─────────┐');
    console.log('│ Tabela                 │ Existe? │');
    console.log('├────────────────────────┼─────────┤');

    for (const table of knownTables) {
      const { data: test, error: testError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      const exists = !testError;
      const status = exists ? '✅' : '❌';
      const tableName = table.padEnd(22);

      console.log(`│ ${tableName} │ ${status}     │`);

      if (exists && data && data.length > 0) {
        console.log(`│   → ${data.length} registro(s) encontrado(s)`.padEnd(39) + '│');
      }
    }

    console.log('└────────────────────────┴─────────┘');
    return;
  }

  console.log('✅ Tabelas públicas no Supabase Estável:\n');
  console.log('┌────────────────────────────────────┐');
  console.log('│ Tabela                             │');
  console.log('├────────────────────────────────────┤');

  for (const row of data) {
    const tableName = row.table_name.padEnd(34);
    console.log(`│ ${tableName} │`);
  }

  console.log('└────────────────────────────────────┘');
  console.log(`\nTotal: ${data.length} tabelas\n`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

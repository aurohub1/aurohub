#!/usr/bin/env node

/**
 * Verificação mais profunda do Supabase Estável
 * Tenta acessar diretamente via REST API
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwwpuqjdpecnixvbqigq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_STABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYyNTA4NSwiZXhwIjoyMDQ4MjAxMDg1fQ.tJN5ixpObQ_uxe_X9J-rQM5r2LfmS0RCuZEe7i7Ry6E';

async function main() {
  console.log('🔗 Verificando Supabase Estável (wwwpuqjdpecnixvbqigq)...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Tentar listar todas as tabelas via REST API
  console.log('📊 Método 1: Tentando buscar schema via REST...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      const text = await response.text();
      console.log('✅ REST API acessível');
      console.log('Resposta:', text.substring(0, 500));
    } else {
      console.log('❌ REST API retornou:', response.status);
    }
  } catch (err) {
    console.log('❌ Erro ao acessar REST:', err.message);
  }

  console.log('\n📊 Método 2: Tentando buscar metadata via PostgREST...\n');

  // Tentar usar a query direta do postgres
  try {
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) {
      console.log('❌ Erro:', error.message);
    } else {
      console.log('✅ Tabelas encontradas:', data);
    }
  } catch (err) {
    console.log('❌ Erro:', err.message);
  }

  console.log('\n📊 Método 3: Verificando se projeto tem dados...\n');

  // Tentar alguns nomes de tabelas que podem existir em projetos Aurohub
  const possibleTables = [
    'users',
    'profiles',
    'accounts',
    'licensees',
    'agencies',
    'posts',
    'campaigns',
    'settings',
  ];

  for (const table of possibleTables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`✅ ${table}: existe (${count || 0} registros)`);
    }
  }

  console.log('\n💡 Se nenhuma tabela foi encontrada, este projeto pode estar vazio ou usar outro schema.');
  console.log('');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

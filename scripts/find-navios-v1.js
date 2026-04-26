// Busca lista completa de navios no Supabase V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function findNavios() {
  try {
    console.log('\n=== PROBLEMA 1: LISTA DE NAVIOS ===\n');

    // Tentar buscar de tabelas de configuração
    const configTables = ['config', 'navios', 'ships', 'cruzeiros'];

    for (const table of configTables) {
      try {
        const { data, error } = await supabaseV1
          .from(table)
          .select('*')
          .limit(100);

        if (!error && data && data.length > 0) {
          console.log(`✅ Tabela "${table}" encontrada:\n`);
          console.log(JSON.stringify(data, null, 2));
          console.log('\n' + '='.repeat(80) + '\n');
        }
      } catch (e) {
        // tabela não existe
      }
    }

    console.log('\n=== PROBLEMA 2: IMGFUNDO ===\n');

    // Verificar se imgfundo tem registros de navios
    console.log('🔍 Buscando registros de navios na tabela imgfundo:\n');

    const { data: navioImgs, error: navioError } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .or('nome.ilike.%MSC%,nome.ilike.%Costa%,nome.ilike.%Norwegian%,nome.ilike.%Carnival%,nome.ilike.%cruzeiro%')
      .limit(20);

    if (!navioError && navioImgs && navioImgs.length > 0) {
      console.log(`✅ Encontrados ${navioImgs.length} registros de navios/cruzeiro:\n`);
      navioImgs.forEach((row, i) => {
        console.log(`${i + 1}. ${row.nome}`);
        console.log(`   ${row.url}`);
        console.log('');
      });
    } else {
      console.log('❌ NENHUM registro de navio encontrado na imgfundo');
      console.log('   A busca por navio NÃO VAI FUNCIONAR.\n');
    }

    // Buscar registros de portos (alternativa)
    console.log('🔍 Buscando registros de portos na tabela imgfundo:\n');

    const { data: portoImgs, error: portoError } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .or('nome.ilike.%Santos%,nome.ilike.%Rio de Janeiro%,nome.ilike.%porto%')
      .limit(20);

    if (!portoError && portoImgs && portoImgs.length > 0) {
      console.log(`✅ Encontrados ${portoImgs.length} registros de portos:\n`);
      portoImgs.forEach((row, i) => {
        console.log(`${i + 1}. ${row.nome}`);
        console.log(`   ${row.url}`);
        console.log('');
      });
    }

    // Mostrar TODOS os registros de imgfundo para entender o padrão
    console.log('\n🔍 Amostra de TODOS os tipos de imgfundo (primeiros 30):\n');

    const { data: allImgs } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .order('nome')
      .limit(30);

    if (allImgs && allImgs.length > 0) {
      allImgs.forEach((row, i) => {
        console.log(`${i + 1}. ${row.nome}`);
      });
      console.log(`\n   Total na amostra: ${allImgs.length}`);
    }

    console.log('\n\n=== DIAGNÓSTICO ===\n');
    console.log('Problema 1 - Lista de navios:');
    console.log('   Verificar output acima para lista completa do V1\n');

    console.log('Problema 2 - Imgfundo:');
    if (navioImgs && navioImgs.length > 0) {
      console.log('   ✓ Tabela tem registros de navios - busca atual pode funcionar');
    } else {
      console.log('   ✗ Tabela NÃO tem registros de navios');
      console.log('   → Solução: buscar por porto de embarque (campo do form)');
      console.log('   → OU usar imagem default de cruzeiro sempre');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

findNavios();

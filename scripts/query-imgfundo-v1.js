// Query na tabela imgfundo do Supabase V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function queryImgFundo() {
  try {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('QUERY 1: Buscar registros de cruzeiro/navio/MSC/Costa');
    console.log('════════════════════════════════════════════════════════\n');

    const { data: cruzeiro, error: cruzeiroError } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .or('nome.ilike.%cruzeiro%,nome.ilike.%navio%,nome.ilike.%MSC%,nome.ilike.%Costa%')
      .limit(20);

    if (cruzeiroError) throw cruzeiroError;

    if (cruzeiro && cruzeiro.length > 0) {
      console.log(`✅ Encontrados ${cruzeiro.length} registros:\n`);
      cruzeiro.forEach((row, i) => {
        console.log(`${i + 1}. ${row.nome}`);
        console.log(`   ${row.url}`);
        console.log('');
      });
    } else {
      console.log('❌ NENHUM registro encontrado com esses termos\n');
    }

    console.log('\n════════════════════════════════════════════════════════');
    console.log('QUERY 2: Estatísticas da tabela imgfundo');
    console.log('════════════════════════════════════════════════════════\n');

    // Contar total
    const { count, error: countError } = await supabaseV1
      .from('imgfundo')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`📊 Total de registros: ${count}\n`);

    // Pegar alguns registros para ver o padrão
    const { data: sample, error: sampleError } = await supabaseV1
      .from('imgfundo')
      .select('nome')
      .order('nome')
      .limit(10);

    if (sampleError) throw sampleError;

    console.log('📋 Primeiros 10 registros (ordem alfabética):\n');
    sample.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.nome}`);
    });

    // Pegar últimos registros
    const { data: sampleLast, error: sampleLastError } = await supabaseV1
      .from('imgfundo')
      .select('nome')
      .order('nome', { ascending: false })
      .limit(10);

    if (sampleLastError) throw sampleLastError;

    console.log('\n📋 Últimos 10 registros (ordem alfabética inversa):\n');
    sampleLast.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.nome}`);
    });

    console.log('\n════════════════════════════════════════════════════════');
    console.log('CONCLUSÃO');
    console.log('════════════════════════════════════════════════════════\n');

    if (!cruzeiro || cruzeiro.length === 0) {
      console.log('⚠️  Tabela imgfundo NÃO contém imagens específicas de cruzeiro/navios');
      console.log('   Apenas destinos turísticos (cidades, praias, etc.)');
      console.log('\n💡 Solução atual (usar overlay default) está CORRETA');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

queryImgFundo();

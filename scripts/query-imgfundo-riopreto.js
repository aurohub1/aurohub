// Buscar imagens da loja Rio Preto na tabela imgfundo do V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function queryRioPreto() {
  try {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Buscando imagens da loja Rio Preto na tabela imgfundo');
    console.log('════════════════════════════════════════════════════════\n');

    // Primeiro, verificar estrutura da tabela
    const { data: sample, error: sampleError } = await supabaseV1
      .from('imgfundo')
      .select('*')
      .limit(1);

    if (sampleError) throw sampleError;

    console.log('📋 Estrutura da tabela (colunas disponíveis):\n');
    if (sample && sample.length > 0) {
      console.log(Object.keys(sample[0]).join(', '));
      console.log('\n' + '─'.repeat(60) + '\n');
    }

    // Buscar por Rio Preto se a coluna loja existir
    const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];

    if (columns.includes('loja')) {
      const { data: riopreto, error: riopretoError } = await supabaseV1
        .from('imgfundo')
        .select('nome, url, loja')
        .or('loja.ilike.%rio preto%,loja.ilike.%riopreto%')
        .limit(5);

      if (riopretoError) throw riopretoError;

      if (riopreto && riopreto.length > 0) {
        console.log(`✅ Encontradas ${riopreto.length} imagens da loja Rio Preto:\n`);
        riopreto.forEach((row, i) => {
          console.log(`${i + 1}. ${row.nome} (Loja: ${row.loja || 'N/A'})`);
          console.log(`   ${row.url}`);
          console.log('');
        });
      } else {
        console.log('❌ Nenhuma imagem encontrada para loja Rio Preto\n');
      }
    } else {
      console.log('⚠️  Tabela imgfundo NÃO tem coluna "loja"\n');
      console.log('Mostrando algumas imagens aleatórias para referência:\n');

      const { data: random, error: randomError } = await supabaseV1
        .from('imgfundo')
        .select('nome, url')
        .limit(5);

      if (randomError) throw randomError;

      if (random && random.length > 0) {
        random.forEach((row, i) => {
          console.log(`${i + 1}. ${row.nome}`);
          console.log(`   ${row.url}`);
          console.log('');
        });
      }
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

queryRioPreto();

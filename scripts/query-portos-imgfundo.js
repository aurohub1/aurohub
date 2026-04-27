// Buscar imagens de portos de embarque de cruzeiro no V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function queryPortos() {
  try {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Buscando imagens de portos de embarque de cruzeiro');
    console.log('════════════════════════════════════════════════════════\n');

    const { data, error } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .or('nome.ilike.%santos%,nome.ilike.%rio de janeiro%,nome.ilike.%buenos%')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`✅ Encontradas ${data.length} imagens de portos:\n`);
      data.forEach((row, i) => {
        console.log(`${i + 1}. ${row.nome}`);
        console.log(`   ${row.url}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma imagem encontrada\n');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

queryPortos();

// Verificar se imgfundo tem registros de cruzeiro/navios
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function check() {
  try {
    console.log('\n🔍 Buscando imagens de cruzeiro/navios na tabela imgfundo do V1...\n');

    const companhias = ['MSC', 'Costa', 'Norwegian', 'Carnival', 'Royal', 'Celebrity', 'Princess', 'Oceania', 'Disney', 'Cruzeiro', 'Cruise', 'Navio', 'Ship'];

    for (const cia of companhias) {
      const { data, error } = await supabaseV1
        .from('imgfundo')
        .select('nome, url')
        .ilike('nome', `%${cia}%`)
        .limit(5);

      if (!error && data && data.length > 0) {
        console.log(`✅ "${cia}": ${data.length} imagem(ns)`);
        data.forEach(img => console.log(`   - ${img.nome}: ${img.url.substring(0, 80)}...`));
      } else {
        console.log(`❌ "${cia}": nenhuma imagem`);
      }
    }

    console.log('\n💡 CONCLUSÃO:');
    console.log('   Se não há imagens de navios/cruzeiro na tabela imgfundo,');
    console.log('   usar imagem default do Cloudinary para todos os cruzeiros.');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

check();

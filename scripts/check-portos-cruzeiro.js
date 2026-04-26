// Verifica quais registros de imgfundo podem servir para cruzeiros
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function checkPortos() {
  try {
    console.log('\n=== PORTOS DE EMBARQUE COMUNS NO BRASIL ===\n');

    const portosComuns = [
      'Santos',
      'Rio de Janeiro',
      'Salvador',
      'Recife',
      'Fortaleza',
      'Buenos Aires',
      'Montevidéu',
    ];

    console.log('🔍 Verificando quais portos existem na tabela imgfundo:\n');

    for (const porto of portosComuns) {
      const { data, error } = await supabaseV1
        .from('imgfundo')
        .select('nome, url')
        .ilike('nome', `%${porto}%`)
        .limit(3);

      if (!error && data && data.length > 0) {
        console.log(`✅ ${porto}: ${data.length} imagem(ns)`);
        data.forEach(img => {
          console.log(`   - ${img.nome}`);
        });
      } else {
        console.log(`❌ ${porto}: nenhuma imagem`);
      }
    }

    // Buscar se existe algum registro genérico de "cruzeiro" ou "navio"
    console.log('\n🔍 Buscando registros genéricos de cruzeiro:\n');

    const { data: genericos } = await supabaseV1
      .from('imgfundo')
      .select('nome, url')
      .or('nome.ilike.%cruzeiro%,nome.ilike.%navio%,nome.ilike.%ship%,nome.ilike.%cruise%')
      .limit(10);

    if (genericos && genericos.length > 0) {
      console.log(`✅ Encontrados ${genericos.length} registros genéricos:\n`);
      genericos.forEach((img, i) => {
        console.log(`${i + 1}. ${img.nome}`);
        console.log(`   ${img.url}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhum registro genérico de cruzeiro encontrado');
    }

    console.log('\n=== RECOMENDAÇÕES ===\n');
    console.log('Para imgfundo de cruzeiros:');
    console.log('1. Extrair primeiro porto do itinerário (ex: "Santos / Búzios" → "Santos")');
    console.log('2. Buscar imgfundo por esse porto');
    console.log('3. Se não encontrar, usar URL default de cruzeiro');
    console.log('\nOu simplesmente: sempre usar imagem default de cruzeiro');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

checkPortos();

// Busca logos de companhias marítimas no Supabase V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function findLogos() {
  try {
    console.log('\n🔍 Buscando logos de companhias marítimas no V1...\n');

    // Possíveis tabelas onde os logos podem estar
    const tablesToSearch = [
      'logos', 'logo', 'assets', 'images', 'companhias',
      'companies', 'config', 'settings', 'templates'
    ];

    for (const table of tablesToSearch) {
      try {
        const { data, error } = await supabaseV1
          .from(table)
          .select('*')
          .limit(100);

        if (!error && data && data.length > 0) {
          console.log(`\n✅ Tabela "${table}" encontrada (${data.length} registros)\n`);

          // Filtrar registros que contenham logo, msc, costa, carnival, norwegian
          const relevant = data.filter(row => {
            const str = JSON.stringify(row).toLowerCase();
            return str.includes('logo') ||
                   str.includes('msc') ||
                   str.includes('costa') ||
                   str.includes('carnival') ||
                   str.includes('norwegian');
          });

          if (relevant.length > 0) {
            console.log(`   📋 ${relevant.length} registros relevantes:\n`);
            relevant.forEach((row, i) => {
              console.log(`   ${i + 1}. ${JSON.stringify(row, null, 2)}`);
              console.log('');
            });
          }
        }
      } catch (e) {
        // Tabela não existe, continuar
      }
    }

    // Buscar no template Cruzeiro se tem logo_cia estático
    console.log('\n📦 Verificando template Cruzeiro V1 (id=22)...\n');
    const { data: template } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', 22)
      .single();

    if (template) {
      const fabricJson = JSON.parse(template.json);
      const logoElements = fabricJson.objects.filter(obj =>
        obj.bindParam === 'logo_cia' ||
        obj.name?.toLowerCase().includes('logo') ||
        obj.src?.toLowerCase().includes('logo')
      );

      if (logoElements.length > 0) {
        console.log('   🎨 Elementos de logo encontrados:\n');
        logoElements.forEach((el, i) => {
          console.log(`   ${i + 1}. ${el.type} - ${el.name || 'sem nome'}`);
          console.log(`      bindParam: ${el.bindParam || 'N/A'}`);
          if (el.src) console.log(`      src: ${el.src}`);
          console.log('');
        });
      }
    }

    console.log('\n💡 Se não encontrou URLs, os logos podem estar:');
    console.log('   1. Hardcoded no código do client.js do V1');
    console.log('   2. No Cloudinary com padrão de URL previsível');
    console.log('   3. Em variáveis de ambiente ou config.js');
    console.log('\n🔗 URLs padrão sugeridas (Cloudinary AuroCreator):');
    console.log('   MSC:       https://res.cloudinary.com/dzjr5ulcy/image/upload/v1/logos/msc-logo.png');
    console.log('   Costa:     https://res.cloudinary.com/dzjr5ulcy/image/upload/v1/logos/costa-logo.png');
    console.log('   Norwegian: https://res.cloudinary.com/dzjr5ulcy/image/upload/v1/logos/norwegian-logo.png');
    console.log('   Carnival:  https://res.cloudinary.com/dzjr5ulcy/image/upload/v1/logos/carnival-logo.png');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

findLogos();

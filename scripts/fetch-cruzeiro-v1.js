// Busca template Cruzeiro do Supabase V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function fetchCruzeiroTemplate() {
  // Tentar várias tabelas possíveis
  const tables = ['templates', 'artes', 'arte', 'canvas_templates', 'form_templates'];

  for (const table of tables) {
    try {
      console.log(`\n📍 Tentando tabela: ${table}...`);

      const { data, error } = await supabaseV1
        .from(table)
        .select('*')
        .eq('form', 'cruzeiro')
        .limit(5);

      if (error) {
        console.log(`   ❌ ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`\n✅ ENCONTRADO em "${table}" - ${data.length} registro(s)\n`);
        console.log('='.repeat(80));

        data.forEach((row, index) => {
          console.log(`\n--- Registro ${index + 1} ---`);
          console.log(JSON.stringify(row, null, 2));

          // Se tiver schema ou elements, mostrar detalhado
          if (row.schema && typeof row.schema === 'object') {
            console.log('\n=== SCHEMA ===');
            console.log(JSON.stringify(row.schema, null, 2));

            if (row.schema.elements && Array.isArray(row.schema.elements)) {
              console.log(`\n=== ELEMENTS (${row.schema.elements.length} objetos) ===`);
              row.schema.elements.forEach((el, i) => {
                console.log(`\n--- Elemento ${i + 1} ---`);
                console.log(JSON.stringify(el, null, 2));
              });
            }
          }
        });

        return; // Encontrou, não precisa continuar
      } else {
        console.log(`   ⚠️  Vazio`);
      }

    } catch (err) {
      console.log(`   ❌ Erro: ${err.message}`);
    }
  }

  console.log('\n❌ Nenhum template Cruzeiro encontrado em nenhuma tabela conhecida');
}

fetchCruzeiroTemplate();

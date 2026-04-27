// Buscar JSON completo do template Cruzeiro (#22) no V1
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function fetch() {
  try {
    console.log('\n📥 Buscando template Cruzeiro (#22) no V1...\n');

    const { data, error } = await supabaseV1
      .from('templates')
      .select('json')
      .eq('id', 22)
      .single();

    if (error) throw error;
    if (!data?.json) throw new Error('JSON não encontrado');

    const template = data.json;

    console.log('✅ Template encontrado\n');
    console.log('════════════════════════════════════════════════════════');
    console.log('ESTRUTURA COMPLETA DO JSON:');
    console.log('════════════════════════════════════════════════════════\n');
    console.log(JSON.stringify(template, null, 2));

    // Salvar em arquivo
    writeFileSync('scripts/cruzeiro-v1-template.json', JSON.stringify(template, null, 2));
    console.log('\n✅ Salvo em scripts/cruzeiro-v1-template.json\n');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

fetch();

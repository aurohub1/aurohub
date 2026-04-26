// Busca templates Cruzeiro do Supabase V2
import { createClient } from '@supabase/supabase-js';

const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function fetchCruzeiroV2() {
  try {
    const { data, error } = await supabaseV2
      .from('form_templates')
      .select('*')
      .eq('form_type', 'cruzeiro');

    if (error) throw error;

    console.log('\n=== TEMPLATES CRUZEIRO V2 (form_templates) ===\n');
    console.log(`Total de registros: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
      data.forEach((row, index) => {
        console.log(`\n--- Template ${index + 1} ---`);
        console.log('ID:', row.id);
        console.log('NAME:', row.name);
        console.log('FORM_TYPE:', row.form_type);
        console.log('FORMAT:', row.format);
        console.log('IS_BASE:', row.is_base);
        console.log('LICENSEE_ID:', row.licensee_id);
        console.log('ACTIVE:', row.active);
        console.log('WIDTH:', row.width);
        console.log('HEIGHT:', row.height);
        console.log('CREATED_AT:', row.created_at);
        console.log('\nSCHEMA:');
        console.log(JSON.stringify(row.schema, null, 2));
      });
    } else {
      console.log('⚠️  Nenhum template cruzeiro encontrado');
    }

  } catch (err) {
    console.error('Erro ao buscar templates:', err);
  }
}

fetchCruzeiroV2();

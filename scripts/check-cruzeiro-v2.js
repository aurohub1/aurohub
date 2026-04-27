// Verificar template Cruzeiro criado no V2
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function check() {
  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, width, height, schema')
    .eq('form_type', 'cruzeiro')
    .single();

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('\n✅ Template Cruzeiro encontrado:\n');
  console.log(`ID: ${data.id}`);
  console.log(`Nome: ${data.name}`);
  console.log(`Formato: ${data.format}`);
  console.log(`Dimensões: ${data.width}x${data.height}`);
  console.log(`Elementos: ${data.schema.elements.length}`);
  console.log(`\n🎨 Abrir no editor:`);
  console.log(`   http://localhost:3000/editor?id=${data.id}\n`);
}

check();

// Listar todas as layers do template Cruzeiro
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function listLayers() {
  const { data, error } = await supabase
    .from('form_templates')
    .select('schema')
    .eq('form_type', 'cruzeiro')
    .single();

  if (error) throw error;

  console.log('\n════════════════════════════════════════════════════════');
  console.log('TEMPLATE CRUZEIRO — LAYERS NO EDITOR');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`Total: ${data.schema.elements.length} elementos\n`);

  data.schema.elements.forEach((el, i) => {
    const num = String(i + 1).padStart(2, '0');
    console.log(`${num}. ${el.type.toUpperCase().padEnd(6)} | ${el.name || '(sem nome)'}`.padEnd(50));

    if (el.bindParam) {
      console.log(`    └─ bindParam: "${el.bindParam}"`);
    } else if (el.imageBind) {
      console.log(`    └─ imageBind: "${el.imageBind}"`);
    }

    if (el.type === 'text') {
      console.log(`    └─ fontSize: ${el.fontSize}, color: ${el.color}, align: ${el.align}`);
    }

    if (el.type === 'image' && el.src) {
      const shortSrc = el.src.split('/').pop();
      console.log(`    └─ src: ${shortSrc}`);
    }

    console.log('');
  });

  console.log('════════════════════════════════════════════════════════');
  console.log('VERIFICAÇÃO FINAL:');
  console.log('════════════════════════════════════════════════════════\n');

  const binds = data.schema.elements
    .map(el => el.bindParam || el.imageBind)
    .filter(Boolean);

  console.log('BindParams/ImageBinds encontrados:');
  binds.forEach(b => console.log(`  ✓ ${b}`));
  console.log('');

  const expected = ['imgfundo', 'navio', 'valorparcela', 'logo_cia', 'logo_loja',
                    'dataperiodo', 'itinerario', 'incluso', 'forma_pgto',
                    'valortotaltexto', 'parcelas'];

  console.log('BindParams esperados:');
  expected.forEach(e => {
    const found = binds.includes(e);
    console.log(`  ${found ? '✅' : '❌'} ${e}`);
  });
  console.log('');
}

listLayers().catch(console.error);

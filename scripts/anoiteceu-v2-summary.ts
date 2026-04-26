import { createClient } from '@supabase/supabase-js';

async function main() {
  const s = createClient(
    'https://emcafedppvwparimvtob.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
  );

  const { data } = await s.from('form_templates').select('id,name,format,is_base,licensee_id,schema').eq('form_type', 'anoiteceu');

  console.log('\n📋 RESUMO ANOITECEU V2\n');
  console.log('='.repeat(100));

  for (const t of data || []) {
    console.log(`\n📄 ${t.name} (${t.format})`);
    console.log(`   ID: ${t.id}`);
    console.log(`   is_base: ${t.is_base}`);
    console.log(`   licensee_id: ${t.licensee_id || '(null)'}`);
    console.log(`   Elementos: ${t.schema.elements.length}\n`);

    t.schema.elements.forEach((e: any, i: number) => {
      const bind = e.bindParam ? ` → bindParam: "${e.bindParam}"` : '';
      const txt = e.text ? ` text="${e.text.length > 30 ? e.text.substring(0, 30) + '...' : e.text}"` : '';
      const src = e.src
        ? e.src.startsWith('data:')
          ? ' (data:image base64)'
          : ` src="${e.src.substring(0, 70)}..."`
        : '';
      console.log(`   [${i + 1}] ${e.type} @ (${Math.round(e.x)}, ${Math.round(e.y)}) ${e.width}x${e.height}${bind}${txt}${src}`);
    });
  }

  console.log('\n' + '='.repeat(100) + '\n');
}

main().catch(console.error);

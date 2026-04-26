/**
 * Verificar schema do template Anoiteceu Stories no Supabase V2
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function checkAnoiteceuSchema() {
  console.log('\n🔍 VERIFICANDO SCHEMA ANOITECEU STORIES NO V2\n');
  console.log('='.repeat(100));

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, schema, is_base, licensee_id')
    .eq('form_type', 'anoiteceu')
    .eq('format', 'stories');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  Template Anoiteceu Stories não encontrado.\n');
    return;
  }

  console.log(`\n✅ ${data.length} template(s) encontrado(s)\n`);

  for (const tmpl of data) {
    console.log('─'.repeat(100));
    console.log(`\n📄 ${tmpl.name} (ID: ${tmpl.id})`);
    console.log(`   is_base: ${tmpl.is_base}, licensee_id: ${tmpl.licensee_id || '(null)'}\n`);

    const schema = tmpl.schema;
    const elements = schema.elements || [];

    console.log(`Total de elementos: ${elements.length}\n`);
    console.log('ELEMENTOS COM BINDPARAM:\n');

    let count = 0;
    for (const el of elements) {
      if (el.bindParam) {
        count++;
        console.log(`[${count}] bindParam: "${el.bindParam}"`);
        console.log(`    type: ${el.type}`);
        console.log(`    name: ${el.name || '(sem nome)'}`);
        console.log(`    x: ${Math.round(el.x)}, y: ${Math.round(el.y)}`);
        console.log(`    width: ${Math.round(el.width)}, height: ${Math.round(el.height)}`);
        if (el.fontSize) console.log(`    fontSize: ${el.fontSize}`);
        if (el.fontFamily) console.log(`    fontFamily: ${el.fontFamily}`);
        if (el.align) console.log(`    align: ${el.align}`);
        console.log('');
      }
    }

    console.log(`Resumo: ${count} elementos com bindParam\n`);

    // Verificação específica
    const dataInicio = elements.find((e: any) => e.bindParam === 'data_inicio');
    const dataFim = elements.find((e: any) => e.bindParam === 'data_fim');
    const paraViagensAte = elements.find((e: any) => e.bindParam === 'para_viagens_ate');
    const descontoAnoit = elements.find((e: any) => e.bindParam === 'desconto_anoit_valor');

    console.log('VERIFICAÇÃO DE BINDS CRÍTICOS:\n');
    console.log(`  data_inicio: ${dataInicio ? `✓ EXISTE (type: ${dataInicio.type})` : '❌ NÃO ENCONTRADO'}`);
    console.log(`  data_fim: ${dataFim ? `✓ EXISTE (type: ${dataFim.type})` : '❌ NÃO ENCONTRADO'}`);
    console.log(`  para_viagens_ate: ${paraViagensAte ? `✓ EXISTE (type: ${paraViagensAte.type})` : '❌ NÃO ENCONTRADO'}`);
    console.log(`  desconto_anoit_valor: ${descontoAnoit ? `✓ EXISTE (type: ${descontoAnoit.type})` : '❌ NÃO ENCONTRADO'}`);
  }

  console.log('\n' + '='.repeat(100) + '\n');
}

checkAnoiteceuSchema().catch(console.error);

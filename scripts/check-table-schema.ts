/**
 * Script para verificar estrutura da tabela form_templates no V2
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function checkSchema() {
  console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA form_templates\n');
  console.log('='.repeat(80));

  // Tentar inserir um template mínimo para ver quais campos são aceitos
  const testTemplate = {
    name: 'TEST_DELETE_ME',
    form_type: 'pacote',
    format: 'stories',
    variant: '1',
    is_base: true,
    schema: { version: '1.0.0', width: 1080, height: 1920, background: '#000', elements: [] },
    width: 1080,
    height: 1920,
    active: true,
  };

  const { data, error } = await supabase
    .from('form_templates')
    .insert([testTemplate])
    .select();

  if (error) {
    console.error('❌ Erro ao inserir template de teste:', error);
  } else {
    console.log('✅ Template de teste inserido com sucesso!');
    console.log('\n📋 Estrutura retornada:\n');
    console.log(JSON.stringify(data[0], null, 2));

    // Deletar o template de teste
    const { error: deleteError } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', data[0].id);

    if (deleteError) {
      console.error('\n⚠️  Erro ao deletar template de teste:', deleteError);
    } else {
      console.log('\n🗑️  Template de teste deletado.');
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkSchema().catch(console.error);

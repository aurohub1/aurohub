/**
 * Deletar todos os templates Anoiteceu do V2
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function deleteAnoiteceuV2() {
  console.log('\n🗑️  DELETANDO TEMPLATES ANOITECEU DO V2\n');
  console.log('='.repeat(80));

  // Primeiro, listar o que será deletado
  const { data: existing, error: listError } = await supabase
    .from('form_templates')
    .select('id, name, format, is_base, licensee_id')
    .eq('form_type', 'anoiteceu');

  if (listError) {
    console.error('❌ Erro ao listar templates:', listError);
    return;
  }

  if (!existing || existing.length === 0) {
    console.log('✅ Nenhum template Anoiteceu encontrado. Nada a deletar.\n');
    return;
  }

  console.log(`\n📋 Templates a serem deletados (${existing.length}):\n`);
  for (const t of existing) {
    console.log(`   • ID ${t.id}: ${t.name} (${t.format}) — is_base:${t.is_base}, licensee:${t.licensee_id || 'null'}`);
  }

  // Deletar
  const { error: deleteError } = await supabase
    .from('form_templates')
    .delete()
    .eq('form_type', 'anoiteceu');

  if (deleteError) {
    console.error('\n❌ Erro ao deletar:', deleteError);
    return;
  }

  console.log(`\n✅ ${existing.length} template(s) Anoiteceu deletado(s) com sucesso.\n`);
  console.log('='.repeat(80) + '\n');
}

deleteAnoiteceuV2().catch(console.error);

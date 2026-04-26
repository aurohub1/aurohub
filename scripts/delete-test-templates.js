#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://emcafedppvwparimvtob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTemplates() {
  console.log('\n=== TEMPLATES QUE SERÃO DELETADOS ===\n');

  // Buscar templates com nome contendo 'cópia' ou 'copia'
  const { data: copiaTemplates, error: error1 } = await supabase
    .from('form_templates')
    .select('id, name')
    .or('name.ilike.%cópia%,name.ilike.%copia%');

  if (error1) {
    console.error('Erro ao buscar templates com "cópia":', error1);
    return null;
  }

  // Buscar templates com nome = 'stetste'
  const { data: stetsteTemplates, error: error2 } = await supabase
    .from('form_templates')
    .select('id, name')
    .eq('name', 'stetste');

  if (error2) {
    console.error('Erro ao buscar templates "stetste":', error2);
    return null;
  }

  // Buscar templates com nome = 'tetetete'
  const { data: teteteteTemplates, error: error3 } = await supabase
    .from('form_templates')
    .select('id, name')
    .eq('name', 'tetetete');

  if (error3) {
    console.error('Erro ao buscar templates "tetetete":', error3);
    return null;
  }

  const allTemplates = [...(copiaTemplates || []), ...(stetsteTemplates || []), ...(teteteteTemplates || [])];

  // Remover duplicatas (caso algum template seja pego por múltiplos critérios)
  const uniqueTemplates = Array.from(
    new Map(allTemplates.map(t => [t.id, t])).values()
  );

  if (uniqueTemplates.length === 0) {
    console.log('Nenhum template encontrado para deletar.');
    return [];
  }

  console.log(`Total de templates encontrados: ${uniqueTemplates.length}\n`);
  uniqueTemplates.forEach(t => {
    console.log(`ID: ${t.id} | Nome: ${t.name}`);
  });

  return uniqueTemplates;
}

async function deleteTemplates(templates) {
  if (!templates || templates.length === 0) {
    console.log('\nNada para deletar.');
    return;
  }

  const ids = templates.map(t => t.id);

  console.log(`\n=== DELETANDO ${ids.length} TEMPLATES ===\n`);

  const { data, error } = await supabase
    .from('form_templates')
    .delete()
    .in('id', ids)
    .select();

  if (error) {
    console.error('Erro ao deletar:', error);
    process.exit(1);
  }

  console.log(`✅ ${data.length} templates deletados com sucesso!`);
}

async function main() {
  const action = process.argv[2];

  if (action === 'delete') {
    const templates = await listTemplates();
    await deleteTemplates(templates);
  } else {
    await listTemplates();
    console.log('\n⚠️  Para confirmar a deleção, execute:');
    console.log('node scripts/delete-test-templates.js delete\n');
  }
}

main();

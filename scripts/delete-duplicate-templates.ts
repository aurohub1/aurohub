/**
 * Script para deletar templates duplicados do Supabase V2
 * Mantém apenas 1 template por (tipo + formato)
 * Prioridade: licensee_id > base (is_base) > id menor (mais antigo)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function deleteDuplicates() {
  console.log('\n🗑️  DELETAR TEMPLATES DUPLICADOS DO SUPABASE V2\n');
  console.log('='.repeat(100));

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, licensee_id, created_at')
    .order('form_type')
    .order('format')
    .order('id');

  if (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return;
  }

  console.log(`\n✅ Total de templates: ${data.length}\n`);

  // Agrupar por (tipo + formato)
  const groups = new Map<string, any[]>();
  for (const t of data) {
    const key = `${t.form_type}:${t.format}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  console.log('📊 ANÁLISE DE DUPLICATAS:\n');

  const toDelete: string[] = [];
  let keptCount = 0;

  for (const [key, templates] of groups.entries()) {
    if (templates.length === 1) {
      keptCount++;
      continue; // Sem duplicatas
    }

    const [tipo, formato] = key.split(':');
    console.log(`\n🔴 ${tipo} / ${formato} → ${templates.length} template(s)`);

    // Ordenar por prioridade:
    // 1. Templates com licensee_id (customizados) primeiro
    // 2. Entre os de mesmo tipo, id menor (mais antigo)
    const sorted = [...templates].sort((a, b) => {
      // Prioriza licensee_id sobre base
      if (a.licensee_id && !b.licensee_id) return -1;
      if (!a.licensee_id && b.licensee_id) return 1;
      // Se ambos têm ou ambos não têm licensee_id, ordena por id (menor = mais antigo)
      return a.id < b.id ? -1 : 1;
    });

    const keep = sorted[0];
    const remove = sorted.slice(1);

    console.log(`   ✅ MANTER: ${keep.name} (ID: ${keep.id.slice(0, 13)}..., ${keep.licensee_id ? 'licensee' : 'base'})`);

    for (const t of remove) {
      console.log(`   ❌ DELETAR: ${t.name} (ID: ${t.id.slice(0, 13)}..., ${t.licensee_id ? 'licensee' : 'base'})`);
      toDelete.push(t.id);
    }

    keptCount++;
  }

  console.log('\n' + '='.repeat(100));
  console.log(`\n📊 RESUMO:\n`);
  console.log(`   Templates únicos (mantidos): ${keptCount}`);
  console.log(`   Templates duplicados (deletar): ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('\n✅ Nenhuma duplicata encontrada.\n');
    return;
  }

  console.log('\n' + '─'.repeat(100));
  console.log('\n⚠️  DELETANDO templates duplicados do Supabase V2...\n');

  for (const id of toDelete) {
    const { error: delError } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', id);

    if (delError) {
      console.error(`   ❌ Erro ao deletar ${id.slice(0, 13)}...: ${delError.message}`);
    } else {
      console.log(`   ✅ Deletado: ${id.slice(0, 13)}...`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n🎉 LIMPEZA CONCLUÍDA!\n');
}

deleteDuplicates().catch(console.error);

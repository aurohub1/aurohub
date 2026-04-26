/**
 * Script para verificar templates duplicados no Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function checkDuplicates() {
  console.log('\n🔍 VERIFICANDO TEMPLATES DUPLICADOS NO SUPABASE\n');
  console.log('='.repeat(80));

  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('active', true)
    .order('form_type')
    .order('format')
    .order('name');

  if (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  Nenhum template encontrado na tabela form_templates.\n');
    return;
  }

  console.log(`\n✅ Total de templates ativos: ${data.length}\n`);

  // Agrupar por tipo
  const byType = new Map<string, any[]>();
  for (const t of data) {
    const type = t.form_type || 'unknown';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(t);
  }

  console.log('📊 Templates por tipo:\n');
  for (const [type, templates] of byType.entries()) {
    console.log(`   ${type}: ${templates.length}`);
  }

  // Verificar duplicatas por (form_type + format + name)
  const keyMap = new Map<string, any[]>();
  for (const t of data) {
    const key = `${t.form_type}:${t.format}:${t.name}`;
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key)!.push(t);
  }

  const duplicates = Array.from(keyMap.entries()).filter(([_, templates]) => templates.length > 1);

  console.log('\n' + '─'.repeat(80));

  if (duplicates.length === 0) {
    console.log('\n✅ Nenhuma duplicata encontrada.\n');
  } else {
    console.log(`\n⚠️  ENCONTRADAS ${duplicates.length} DUPLICATAS:\n`);

    for (const [key, templates] of duplicates) {
      const [form_type, format, name] = key.split(':');
      console.log('─'.repeat(80));
      console.log(`\n🔴 Duplicata: ${form_type} / ${format} / ${name}`);
      console.log(`   Total de cópias: ${templates.length}\n`);

      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        console.log(`   ${i + 1}. ID: ${t.id}`);
        console.log(`      is_base: ${t.is_base || false}`);
        console.log(`      licensee_id: ${t.licensee_id || '(null)'}`);
        console.log(`      created_at: ${t.created_at}`);
        console.log(`      updated_at: ${t.updated_at}`);
        console.log('');
      }

      // Recomendar qual deletar
      const bases = templates.filter(t => t.is_base);
      const customs = templates.filter(t => t.licensee_id);

      console.log('   💡 Recomendação:');
      if (customs.length > 0 && bases.length > 0) {
        console.log('      - MANTER: Templates com licensee_id (customizados)');
        console.log('      - DELETAR: Templates com is_base=true (base)');
        for (const t of bases) {
          console.log(`        DELETE: ${t.id}`);
        }
      } else if (templates.length > 1) {
        // Ordenar por data de criação (manter o mais recente)
        const sorted = [...templates].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        console.log('      - MANTER: Template mais recente');
        console.log(`        KEEP: ${sorted[0].id} (${sorted[0].created_at})`);
        console.log('      - DELETAR: Templates mais antigos');
        for (let i = 1; i < sorted.length; i++) {
          console.log(`        DELETE: ${sorted[i].id} (${sorted[i].created_at})`);
        }
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n⚠️  IMPORTANTE: Não delete templates automaticamente!');
    console.log('   Verifique manualmente cada duplicata antes de deletar.\n');

    // Gerar queries de DELETE
    console.log('\n📝 Queries SQL para deletar duplicatas (REVISAR ANTES DE EXECUTAR):\n');
    for (const [key, templates] of duplicates) {
      const [form_type, format, name] = key.split(':');
      const bases = templates.filter(t => t.is_base);
      const customs = templates.filter(t => t.licensee_id);

      let toDelete: any[] = [];

      if (customs.length > 0 && bases.length > 0) {
        toDelete = bases;
      } else if (templates.length > 1) {
        const sorted = [...templates].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        toDelete = sorted.slice(1);
      }

      for (const t of toDelete) {
        console.log(`-- ${form_type} / ${format} / ${name}`);
        console.log(`DELETE FROM form_templates WHERE id = '${t.id}';`);
        console.log('');
      }
    }
  }

  console.log('='.repeat(80));
  console.log('\n✅ Verificação concluída.\n');
}

checkDuplicates().catch(console.error);

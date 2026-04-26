/**
 * Script para verificar TODOS os templates no Supabase V2
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function checkAllTemplates() {
  console.log('\n🔍 TODOS OS TEMPLATES NO SUPABASE V2\n');
  console.log('='.repeat(120));

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, licensee_id, active, created_at')
    .order('form_type')
    .order('format')
    .order('name');

  if (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  Nenhum template encontrado.\n');
    return;
  }

  console.log(`\n✅ Total de templates: ${data.length}\n`);

  // Tabela completa
  console.table(
    data.map((t: any) => ({
      ID: t.id.slice(0, 8) + '...',
      Nome: t.name,
      Tipo: t.form_type,
      Formato: t.format,
      Base: t.is_base ? 'SIM' : 'não',
      Licensee: t.licensee_id ? t.licensee_id.slice(0, 8) + '...' : '(null)',
      Ativo: t.active ? 'SIM' : 'não',
      Criado: new Date(t.created_at).toLocaleDateString('pt-BR'),
    }))
  );

  // Verificar duplicatas por (form_type + format + name)
  const keyMap = new Map<string, any[]>();
  for (const t of data) {
    const key = `${t.form_type}:${t.format}:${t.name}`;
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key)!.push(t);
  }

  const duplicates = Array.from(keyMap.entries()).filter(([_, templates]) => templates.length > 1);

  console.log('\n' + '─'.repeat(120));

  if (duplicates.length === 0) {
    console.log('\n✅ Nenhuma duplicata encontrada.\n');
  } else {
    console.log(`\n⚠️  ENCONTRADAS ${duplicates.length} DUPLICATAS:\n`);

    for (const [key, templates] of duplicates) {
      const [form_type, format, name] = key.split(':');
      console.log('─'.repeat(120));
      console.log(`\n🔴 Duplicata: ${form_type} / ${format} / ${name}`);
      console.log(`   Total de cópias: ${templates.length}\n`);

      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        console.log(`   ${i + 1}. ID: ${t.id}`);
        console.log(`      is_base: ${t.is_base || false}`);
        console.log(`      licensee_id: ${t.licensee_id || '(null)'}`);
        console.log(`      active: ${t.active}`);
        console.log(`      created_at: ${t.created_at}`);
        console.log('');
      }
    }
  }

  // Contar por tipo
  const byType = new Map<string, number>();
  for (const t of data) {
    byType.set(t.form_type, (byType.get(t.form_type) || 0) + 1);
  }

  console.log('\n' + '─'.repeat(120));
  console.log('\n📊 Templates por tipo:\n');
  for (const [type, count] of byType.entries()) {
    console.log(`   ${type}: ${count}`);
  }

  console.log('\n' + '='.repeat(120));
}

checkAllTemplates().catch(console.error);

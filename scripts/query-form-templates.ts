/**
 * Query direta no Supabase V2 - form_templates
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function queryFormTemplates() {
  console.log('\n📋 SELECT DIRETO NO SUPABASE V2 - form_templates\n');
  console.log('='.repeat(140));

  // Verificar se existe coluna "nome", "tipo", "marca_id"
  // (a tabela real tem "name", "form_type", "licensee_id")

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, licensee_id, active, created_at')
    .order('form_type')
    .order('format');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`\n✅ Total de registros: ${data.length}\n`);
  console.log('Query SQL equivalente:');
  console.log('SELECT id, name AS nome, form_type AS tipo, format AS formato, is_base, licensee_id, active');
  console.log('FROM form_templates');
  console.log('ORDER BY form_type, format;\n');
  console.log('─'.repeat(140));

  // Tabela completa
  console.table(
    data.map((r: any, idx: number) => ({
      '#': idx + 1,
      ID: r.id.slice(0, 13) + '...',
      Nome: r.name.length > 30 ? r.name.slice(0, 30) + '...' : r.name,
      Tipo: r.form_type,
      Formato: r.format,
      Base: r.is_base ? 'SIM' : 'não',
      'Licensee_ID': r.licensee_id ? r.licensee_id.slice(0, 13) + '...' : '(null)',
      Ativo: r.active ? 'SIM' : 'não',
    }))
  );

  console.log('\n' + '='.repeat(140));

  // Análise de duplicatas por tipo/formato
  const byTypeFormat = new Map<string, any[]>();
  for (const r of data) {
    const key = `${r.form_type}:${r.format}`;
    if (!byTypeFormat.has(key)) byTypeFormat.set(key, []);
    byTypeFormat.get(key)!.push(r);
  }

  console.log('\n📊 AGRUPAMENTO POR (tipo + formato):\n');
  for (const [key, templates] of byTypeFormat.entries()) {
    const [tipo, formato] = key.split(':');
    console.log(`\n${tipo} / ${formato} → ${templates.length} template(s)`);
    for (const t of templates) {
      const baseLabel = t.is_base ? '[BASE]' : `[licensee: ${t.licensee_id?.slice(0, 8)}...]`;
      console.log(`   - ${baseLabel} ${t.name} (ID: ${t.id.slice(0, 8)}...)`);
    }
  }

  console.log('\n' + '='.repeat(140) + '\n');
}

queryFormTemplates().catch(console.error);

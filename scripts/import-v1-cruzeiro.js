#!/usr/bin/env node

/**
 * Importa template V1 de cruzeiro para form_templates
 * ATENÇÃO: Não deleta templates existentes, apenas insere o novo
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://emcafedppvwparimvtob.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM';

async function main() {
  console.log('🚀 IMPORTANDO TEMPLATE V1 CRUZEIRO PARA SUPABASE');
  console.log('═'.repeat(80) + '\n');

  // Ler template preparado
  const templateData = JSON.parse(
    fs.readFileSync('cruzeiro-v1-for-import.json', 'utf8')
  );

  console.log('📦 Template carregado:');
  console.log(`   Nome: "${templateData.name}"`);
  console.log(`   Tipo: ${templateData.form_type}`);
  console.log(`   Formato: ${templateData.format} (${templateData.width}×${templateData.height})`);
  console.log(`   Elementos: ${templateData.schema.elements.length}`);

  const boundElements = templateData.schema.elements.filter(el => el.bindParam);
  console.log(`   Elementos com bind: ${boundElements.length}`);
  console.log('');

  // Conectar ao Supabase
  console.log('🔗 Conectando ao Supabase (emcafedppvwparimvtob)...\n');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Inserir template
  console.log('💾 Inserindo template na tabela form_templates...\n');

  const { data, error } = await supabase
    .from('form_templates')
    .insert([templateData])
    .select();

  if (error) {
    console.error('❌ ERRO ao inserir template:');
    console.error(error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ Nenhum dado retornado após inserção');
    process.exit(1);
  }

  const inserted = data[0];

  console.log('✅ TEMPLATE INSERIDO COM SUCESSO!\n');
  console.log('📋 Detalhes do template inserido:');
  console.log(`   ID: ${inserted.id}`);
  console.log(`   Nome: ${inserted.name}`);
  console.log(`   Tipo: ${inserted.form_type}`);
  console.log(`   Formato: ${inserted.format}`);
  console.log(`   Base: ${inserted.is_base}`);
  console.log(`   Criado em: ${inserted.created_at}`);
  console.log('');

  // Verificar templates de cruzeiro existentes
  console.log('📊 Templates de cruzeiro na base:\n');

  const { data: allCruzeiro, error: listError } = await supabase
    .from('form_templates')
    .select('id, name, created_at, format')
    .eq('form_type', 'cruzeiro')
    .order('created_at', { ascending: false });

  if (listError) {
    console.error('⚠️  Erro ao listar templates:', listError.message);
  } else {
    console.log('┌──────────────────────────────────────┬────────────────────────────────┬─────────────────────┬──────────┐');
    console.log('│ ID                                   │ Nome                           │ Criado em           │ Formato  │');
    console.log('├──────────────────────────────────────┼────────────────────────────────┼─────────────────────┼──────────┤');

    for (const t of allCruzeiro) {
      const id = t.id.padEnd(36);
      const name = (t.name || '').substring(0, 30).padEnd(30);
      const created = new Date(t.created_at).toISOString().substring(0, 19).replace('T', ' ');
      const format = (t.format || '').padEnd(8);
      const marker = t.id === inserted.id ? ' 🆕' : '';

      console.log(`│ ${id} │ ${name} │ ${created} │ ${format} │${marker}`);
    }

    console.log('└──────────────────────────────────────┴────────────────────────────────┴─────────────────────┴──────────┘');
    console.log(`\nTotal: ${allCruzeiro.length} templates de cruzeiro`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Importação concluída com sucesso!');
  console.log('\n💡 O template está disponível no editor em: /editor?form=cruzeiro');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err);
  process.exit(1);
});

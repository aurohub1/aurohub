#!/usr/bin/env node

/**
 * Script para buscar binds de cruzeiro do Aurohub v1 (Supabase hiawjrfdotlpssypbcjd)
 *
 * Usage:
 *   node scripts/check-v1-cruzeiro-binds.js
 *
 * Ou se tiver as credenciais como env vars:
 *   SUPABASE_V1_URL=https://hiawjrfdotlpssypbcjd.supabase.co \
 *   SUPABASE_V1_KEY=seu_service_role_key \
 *   node scripts/check-v1-cruzeiro-binds.js
 */

const { createClient } = require('@supabase/supabase-js');

// ═══ CREDENCIAIS AUROHUB V1 ═══
// Substitua com as credenciais reais do projeto hiawjrfdotlpssypbcjd
const SUPABASE_URL = process.env.SUPABASE_V1_URL || 'https://hiawjrfdotlpssypbcjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_V1_KEY || 'INSIRA_SERVICE_ROLE_KEY_AQUI';

async function main() {
  console.log('🔗 Conectando ao Aurohub v1...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Buscar templates de cruzeiro
  console.log('📦 Buscando templates de cruzeiro...\n');

  const { data: templates, error } = await supabase
    .from('templates')
    .select('id, nome, schema')
    .eq('formType', 'cruzeiro')
    .limit(10);

  if (error) {
    console.error('❌ Erro ao buscar templates:', error.message);
    console.log('\n💡 Certifique-se de que:');
    console.log('   1. A URL está correta (hiawjrfdotlpssypbcjd.supabase.co)');
    console.log('   2. A service role key está correta');
    console.log('   3. A tabela "templates" existe e tem a coluna "formType"');
    return;
  }

  if (!templates || templates.length === 0) {
    console.log('⚠️  Nenhum template de cruzeiro encontrado.');
    console.log('    Talvez o campo seja "tipo" ao invés de "formType"?');
    console.log('    Ou os templates usam outra convenção?');
    return;
  }

  console.log(`✅ Encontrados ${templates.length} template(s) de cruzeiro\n`);
  console.log('═'.repeat(80));

  // Extrair binds únicos
  const allBinds = new Map(); // { bindParam: { count, labels, types } }

  for (const template of templates) {
    console.log(`\n📄 Template: ${template.nome} (ID: ${template.id})`);

    if (!template.schema || !template.schema.elements) {
      console.log('   ⚠️  Schema vazio ou sem elements');
      continue;
    }

    const elements = template.schema.elements;
    console.log(`   ${elements.length} elementos no schema`);

    // Elementos com bindParam
    const boundElements = elements.filter(el => el.bindParam);
    console.log(`   ${boundElements.length} elementos com bindParam\n`);

    for (const el of boundElements) {
      const bp = el.bindParam;
      const name = el.name || el.type;
      const type = el.type;

      if (!allBinds.has(bp)) {
        allBinds.set(bp, { count: 0, labels: new Set(), types: new Set() });
      }

      const entry = allBinds.get(bp);
      entry.count++;
      entry.labels.add(name);
      entry.types.add(type);

      console.log(`   • ${bp.padEnd(25)} → ${name.padEnd(20)} (${type})`);
    }
  }

  // Resumo consolidado
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RESUMO - TODOS OS BINDS DE CRUZEIRO (ordenado alfabeticamente):\n');

  const sortedBinds = Array.from(allBinds.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [bindParam, info] of sortedBinds) {
    const labels = Array.from(info.labels).join(', ');
    const types = Array.from(info.types).join(', ');
    console.log(`${bindParam.padEnd(30)} → usado ${info.count}x → ${types.padEnd(15)} → "${labels}"`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Total: ${allBinds.size} binds únicos\n`);

  // Output para copiar/colar
  console.log('📋 LISTA DE BINDS (para copiar):\n');
  console.log(sortedBinds.map(([bp]) => `  '${bp}',`).join('\n'));
  console.log('');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

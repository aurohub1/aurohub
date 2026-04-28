#!/usr/bin/env node

/**
 * Investigar templates de cruzeiro no Supabase V2 (emcafedppvwparimvtob)
 * Para entender como foram migrados e quais bindParams estão usando
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Credenciais do V2 (do .env.local)
const SUPABASE_URL = 'https://emcafedppvwparimvtob.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM';

// Binds corretos do V1 (referência)
const V1_BINDS = [
  'data_periodo',
  'forma_pgto',
  'img_fundo',
  'incluso',
  'itinerario',
  'logo_cia',
  'navio',
  'nome_loja',
  'parcelas',
  'valor_preco',
  'valor_total_texto',
];

async function main() {
  console.log('🔗 Conectando ao Aurohub V2 (emcafedppvwparimvtob)...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Descobrir estrutura da tabela
  console.log('📊 Verificando estrutura da tabela templates...\n');

  const { data: sample, error: sampleError } = await supabase
    .from('templates')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('❌ Erro ao buscar sample:', sampleError.message);
    return;
  }

  console.log('📋 Colunas disponíveis:', Object.keys(sample).join(', '));
  console.log('');

  // 2. Buscar templates de cruzeiro
  console.log('🚢 Buscando templates de cruzeiro...\n');

  // Tentar várias colunas possíveis
  const queries = [
    { field: 'formType', value: 'cruzeiro' },
    { field: 'form_type', value: 'cruzeiro' },
    { field: 'tipo', value: 'cruzeiro' },
    { field: 'categoria', value: 'cruzeiro' },
  ];

  let templates = [];

  for (const q of queries) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq(q.field, q.value)
      .limit(5);

    if (!error && data && data.length > 0) {
      console.log(`✅ Encontrados ${data.length} templates via ${q.field} = '${q.value}'`);
      templates = data;
      break;
    }
  }

  if (templates.length === 0) {
    // Tentar busca por nome
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .ilike('nome', '%cruzeiro%')
      .limit(5);

    if (!error && data && data.length > 0) {
      console.log(`✅ Encontrados ${data.length} templates via nome ILIKE '%cruzeiro%'`);
      templates = data;
    }
  }

  if (templates.length === 0) {
    console.log('❌ Nenhum template de cruzeiro encontrado.');
    console.log('💡 Listando todos os templates para debug:\n');

    const { data: all } = await supabase
      .from('templates')
      .select('id, nome, formType, form_type, tipo, categoria')
      .limit(20);

    console.table(all);
    return;
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  // 3. Analisar cada template
  for (const [idx, template] of templates.entries()) {
    console.log(`\n📄 TEMPLATE ${idx + 1}: ${template.nome || template.id}`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Tipo: ${template.formType || template.form_type || template.tipo || 'N/A'}`);

    // Identificar qual campo tem o schema
    let schema = null;
    let schemaField = null;

    for (const field of ['schema', 'data', 'elements', 'template_data', 'json_data']) {
      if (template[field]) {
        schema = template[field];
        schemaField = field;
        break;
      }
    }

    if (!schema) {
      console.log('   ⚠️  Nenhum campo de schema encontrado');
      console.log('   Campos disponíveis:', Object.keys(template).join(', '));
      continue;
    }

    console.log(`   Campo schema: '${schemaField}'\n`);

    // Extrair elements
    let elements = [];

    if (Array.isArray(schema)) {
      elements = schema;
    } else if (schema.elements && Array.isArray(schema.elements)) {
      elements = schema.elements;
    } else if (typeof schema === 'string') {
      try {
        const parsed = JSON.parse(schema);
        elements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
      } catch (err) {
        console.log('   ⚠️  Erro ao parsear schema:', err.message);
        continue;
      }
    }

    console.log(`   Total elementos: ${elements.length}`);

    // Elementos com bindParam
    const boundElements = elements.filter(el => el.bindParam);
    console.log(`   Elementos com bindParam: ${boundElements.length}\n`);

    if (boundElements.length === 0) {
      console.log('   ⚠️  Nenhum elemento com bindParam encontrado');
      continue;
    }

    // Tabela de binds
    console.log('   ┌─────────────────────────────┬─────────────────────────┬──────────┬────────┐');
    console.log('   │ bindParam                   │ name                    │ type     │ Status │');
    console.log('   ├─────────────────────────────┼─────────────────────────┼──────────┼────────┤');

    const foundBinds = new Set();

    for (const el of boundElements) {
      const bp = el.bindParam.padEnd(27);
      const name = (el.name || '').padEnd(23);
      const type = (el.type || '').padEnd(8);
      const isCorrect = V1_BINDS.includes(el.bindParam);
      const status = isCorrect ? '✅' : '❌';

      foundBinds.add(el.bindParam);

      console.log(`   │ ${bp} │ ${name} │ ${type} │ ${status}    │`);
    }

    console.log('   └─────────────────────────────┴─────────────────────────┴──────────┴────────┘');

    // Comparação com V1
    console.log('\n   📊 COMPARAÇÃO COM V1:');
    console.log(`   Binds corretos do V1: ${V1_BINDS.length}`);
    console.log(`   Binds encontrados no V2: ${foundBinds.size}`);

    const missing = V1_BINDS.filter(b => !foundBinds.has(b));
    const extra = Array.from(foundBinds).filter(b => !V1_BINDS.includes(b));

    if (missing.length > 0) {
      console.log(`\n   ⚠️  FALTANDO no V2 (existem no V1):`);
      missing.forEach(b => console.log(`      - ${b}`));
    }

    if (extra.length > 0) {
      console.log(`\n   ⚠️  EXTRAS no V2 (NÃO existem no V1):`);
      extra.forEach(b => console.log(`      - ${b}`));
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log('\n   ✅ Binds IDÊNTICOS ao V1!');
    }

    // Salvar JSON para análise
    const filename = `v2-cruzeiro-${idx + 1}-${template.id.substring(0, 8)}.json`;
    fs.writeFileSync(filename, JSON.stringify({ template, elements: boundElements }, null, 2));
    console.log(`\n   💾 Salvo em: scripts/${filename}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Análise completa!\n');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

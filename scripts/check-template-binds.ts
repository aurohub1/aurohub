/**
 * Script para verificar bindParam dos templates de Passagem
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'sb_publishable_n9oSOiMIXr4fKqtU3YZCPw_efhCxN6N'
);

async function checkTemplateBinds() {
  console.log('\n🔍 VERIFICANDO BINDPARAM DOS TEMPLATES DE PASSAGEM\n');
  console.log('='.repeat(80));

  // Primeiro, verificar todas as tabelas de templates possíveis
  console.log('\n📋 Verificando tabelas disponíveis...\n');

  const { data: allTemplates, error: allError } = await supabase
    .from('form_templates')
    .select('*')
    .eq('active', true);

  if (allTemplates && allTemplates.length > 0) {
    console.log(`✅ form_templates: ${allTemplates.length} template(s) ativo(s)`);
    const types = [...new Set(allTemplates.map((t: any) => t.form_type))];
    console.log(`   Tipos disponíveis: ${types.join(', ')}\n`);
  }

  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('form_type', 'passagem')
    .eq('active', true);

  if (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Nenhum template de passagem encontrado.\n');
    return;
  }

  console.log(`\n✅ Encontrados ${data.length} template(s) de Passagem:\n`);

  for (const tmpl of data) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📄 Template: ${tmpl.name} (ID: ${tmpl.id})`);
    console.log(`   Formato: ${tmpl.format}`);
    console.log(`   Dimensões: ${tmpl.width}x${tmpl.height}`);
    console.log('─'.repeat(80));

    const schema = tmpl.schema;

    if (!schema || !schema.elements) {
      console.log('⚠️  Template sem schema ou elementos');
      continue;
    }

    console.log(`\n📊 Total de elementos: ${schema.elements.length}\n`);

    // Agrupar por tipo
    const byType: Record<string, any[]> = {};
    for (const el of schema.elements) {
      const type = el.type || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(el);
    }

    console.log('Elementos por tipo:');
    for (const [type, els] of Object.entries(byType)) {
      console.log(`  ${type}: ${els.length}`);
    }

    // Listar elementos com bindParam
    const withBind = schema.elements.filter((el: any) => el.bindParam);

    console.log(`\n🔗 Elementos com bindParam (${withBind.length}):\n`);

    if (withBind.length === 0) {
      console.log('   (nenhum)');
    } else {
      const table: any[] = [];

      for (const el of withBind) {
        table.push({
          ID: el.id || el.name || '(sem id)',
          Tipo: el.type,
          bindParam: el.bindParam,
          Texto: el.text ?
            (el.text.length > 30 ? el.text.substring(0, 30) + '...' : el.text) :
            el.src ? '(imagem)' : '(n/a)',
        });
      }

      console.table(table);
    }

    // Verificar duplicações no bindParam
    const bindCounts = new Map<string, number>();
    for (const el of withBind) {
      const count = bindCounts.get(el.bindParam) || 0;
      bindCounts.set(el.bindParam, count + 1);
    }

    const duplicated = Array.from(bindCounts.entries()).filter(([_, count]) => count > 1);

    if (duplicated.length > 0) {
      console.log('\n⚠️  BINDPARAM DUPLICADOS (isso causa o bug "Saíd Saída:"):\n');
      for (const [bind, count] of duplicated) {
        console.log(`   ❌ "${bind}" aparece ${count}x`);
        const elements = withBind.filter((el: any) => el.bindParam === bind);
        for (const el of elements) {
          console.log(`      - ${el.id || el.name}: tipo=${el.type}, texto="${el.text || '(vazio)'}"`);
        }
      }
    } else {
      console.log('\n✅ Nenhum bindParam duplicado.\n');
    }

    // Listar elementos com texto fixo que podem causar duplicação visual
    const textElements = schema.elements.filter((el: any) =>
      el.type === 'text' && el.text && !el.bindParam
    );

    if (textElements.length > 0) {
      console.log(`\n📝 Elementos de texto fixo (${textElements.length}):\n`);
      for (const el of textElements) {
        console.log(`   - ${el.id || el.name}: "${el.text}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Verificação concluída.\n');
}

checkTemplateBinds().catch(console.error);

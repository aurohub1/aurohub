/**
 * Ler template Anoiteceu do Supabase V2
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function readAnoiteceuV2() {
  console.log('\n📋 TEMPLATE ANOITECEU DO V2 (form_templates)\n');
  console.log('='.repeat(120));

  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('form_type', 'anoiteceu')
    .order('id');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  Nenhum template Anoiteceu encontrado no V2.\n');
    return;
  }

  console.log(`\n✅ Encontrados ${data.length} template(s) Anoiteceu no V2:\n`);

  for (const tmpl of data) {
    console.log('─'.repeat(120));
    console.log(`\n📄 Template ID: ${tmpl.id}`);
    console.log(`   Name: ${tmpl.name}`);
    console.log(`   Form Type: ${tmpl.form_type}`);
    console.log(`   Format: ${tmpl.format}`);
    console.log(`   Is Base: ${tmpl.is_base}`);
    console.log(`   Licensee ID: ${tmpl.licensee_id || '(null)'}`);
    console.log(`   Width: ${tmpl.width}`);
    console.log(`   Height: ${tmpl.height}`);
    console.log(`   Active: ${tmpl.active}`);
    console.log(`   Created: ${tmpl.created_at}`);

    const schema = tmpl.schema;

    if (!schema || !schema.elements) {
      console.log('\n   ⚠️  Schema vazio ou sem elementos\n');
      continue;
    }

    console.log(`\n   Schema version: ${schema.version || '(null)'}`);
    console.log(`   Background: ${schema.background || '(null)'}`);
    console.log(`   Total de elementos: ${schema.elements.length}\n`);

    console.log('   ELEMENTOS V2:\n');

    for (let i = 0; i < schema.elements.length; i++) {
      const el = schema.elements[i];
      console.log(`   [${i + 1}] ───────────────────────────────────────`);
      console.log(`      id: ${el.id || '(null)'}`);
      console.log(`      type: ${el.type}`);

      // Posição e tamanho
      if (el.x !== undefined) console.log(`      x: ${el.x}`);
      if (el.y !== undefined) console.log(`      y: ${el.y}`);
      if (el.width !== undefined) console.log(`      width: ${el.width}`);
      if (el.height !== undefined) console.log(`      height: ${el.height}`);

      // Bind
      if (el.bindParam !== undefined) console.log(`      ✦ bindParam: "${el.bindParam}"`);

      // Texto
      if (el.text !== undefined) {
        const displayText = el.text.length > 100
          ? el.text.substring(0, 100) + '...'
          : el.text;
        console.log(`      text: "${displayText}"`);
      }
      if (el.fontSize !== undefined) console.log(`      fontSize: ${el.fontSize}`);
      if (el.fontFamily !== undefined) console.log(`      fontFamily: ${el.fontFamily}`);
      if (el.fontWeight !== undefined) console.log(`      fontWeight: ${el.fontWeight}`);
      if (el.color !== undefined) console.log(`      color: ${el.color}`);
      if (el.textAlign !== undefined) console.log(`      textAlign: ${el.textAlign}`);
      if (el.lineHeight !== undefined) console.log(`      lineHeight: ${el.lineHeight}`);

      // Imagem
      if (el.src !== undefined) {
        const displaySrc = el.src.length > 80
          ? el.src.substring(0, 80) + '...'
          : el.src;
        console.log(`      src: ${displaySrc}`);
      }

      // Forma
      if (el.fill !== undefined) console.log(`      fill: ${el.fill}`);
      if (el.stroke !== undefined) console.log(`      stroke: ${el.stroke}`);
      if (el.strokeWidth !== undefined) console.log(`      strokeWidth: ${el.strokeWidth}`);
      if (el.rx !== undefined) console.log(`      rx: ${el.rx}`);
      if (el.ry !== undefined) console.log(`      ry: ${el.ry}`);

      // Opacidade
      if (el.opacity !== undefined) console.log(`      opacity: ${el.opacity}`);

      // Shadow
      if (el.shadow) {
        console.log(`      shadow: {`);
        console.log(`        color: ${el.shadow.color}`);
        console.log(`        blur: ${el.shadow.blur}`);
        console.log(`        offsetX: ${el.shadow.offsetX}`);
        console.log(`        offsetY: ${el.shadow.offsetY}`);
        console.log(`      }`);
      }

      console.log('');
    }

    // JSON completo (compacto)
    console.log('\n   SCHEMA JSON COMPLETO:');
    console.log('   ' + JSON.stringify(schema, null, 2).split('\n').join('\n   '));
  }

  console.log('\n' + '='.repeat(120) + '\n');
}

readAnoiteceuV2().catch(console.error);

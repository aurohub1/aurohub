/**
 * Ler template Anoiteceu do Supabase V1
 */

import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function readAnoiteceuV1() {
  console.log('\n📋 TEMPLATE ANOITECEU DO V1 (FABRIC.JS)\n');
  console.log('='.repeat(120));

  const { data, error } = await supabaseV1
    .from('templates')
    .select('*')
    .eq('form', 'anoiteceu')
    .order('id');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  Nenhum template Anoiteceu encontrado no V1.\n');
    return;
  }

  console.log(`\n✅ Encontrados ${data.length} template(s) Anoiteceu no V1:\n`);

  for (const tmpl of data) {
    console.log('─'.repeat(120));
    console.log(`\n📄 Template #${tmpl.id}`);
    console.log(`   Form: ${tmpl.form}`);
    console.log(`   Format: ${tmpl.format}`);
    console.log(`   Variant: ${tmpl.variant || '(null)'}`);
    console.log(`   Grupo: ${tmpl.grupo || '(null)'}`);
    console.log(`   Marca_ID: ${tmpl.marca_id || '(null)'}`);
    console.log(`   Updated: ${tmpl.updated_at}`);

    try {
      const fabricData = JSON.parse(tmpl.json);
      const objects = fabricData.objects || [];

      console.log(`\n   Canvas: ${fabricData.width || '?'}x${fabricData.height || '?'}`);
      console.log(`   Background: ${fabricData.background || '(null)'}`);
      console.log(`   Total de objetos: ${objects.length}\n`);

      console.log('   OBJETOS FABRIC.JS:\n');

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        console.log(`   [${i + 1}] ───────────────────────────────────────`);
        console.log(`      type: ${obj.type}`);
        console.log(`      name: ${obj.name || '(null)'}`);

        // Posição e tamanho
        if (obj.left !== undefined) console.log(`      left: ${obj.left}`);
        if (obj.top !== undefined) console.log(`      top: ${obj.top}`);
        if (obj.width !== undefined) console.log(`      width: ${obj.width}`);
        if (obj.height !== undefined) console.log(`      height: ${obj.height}`);
        if (obj.scaleX !== undefined) console.log(`      scaleX: ${obj.scaleX}`);
        if (obj.scaleY !== undefined) console.log(`      scaleY: ${obj.scaleY}`);

        // Texto
        if (obj.text !== undefined) {
          const displayText = obj.text.length > 100
            ? obj.text.substring(0, 100) + '...'
            : obj.text;
          console.log(`      text: "${displayText}"`);
        }
        if (obj.fontSize !== undefined) console.log(`      fontSize: ${obj.fontSize}`);
        if (obj.fontFamily !== undefined) console.log(`      fontFamily: ${obj.fontFamily}`);
        if (obj.fontWeight !== undefined) console.log(`      fontWeight: ${obj.fontWeight}`);
        if (obj.fill !== undefined) console.log(`      fill: ${obj.fill}`);
        if (obj.textAlign !== undefined) console.log(`      textAlign: ${obj.textAlign}`);
        if (obj.lineHeight !== undefined) console.log(`      lineHeight: ${obj.lineHeight}`);

        // Bind
        if (obj.bindParam !== undefined) console.log(`      ✦ bindParam: "${obj.bindParam}"`);

        // Imagem
        if (obj.src !== undefined) {
          const displaySrc = obj.src.length > 80
            ? obj.src.substring(0, 80) + '...'
            : obj.src;
          console.log(`      src: ${displaySrc}`);
        }

        // Forma
        if (obj.stroke !== undefined) console.log(`      stroke: ${obj.stroke}`);
        if (obj.strokeWidth !== undefined) console.log(`      strokeWidth: ${obj.strokeWidth}`);
        if (obj.rx !== undefined) console.log(`      rx: ${obj.rx}`);
        if (obj.ry !== undefined) console.log(`      ry: ${obj.ry}`);
        if (obj.radius !== undefined) console.log(`      radius: ${obj.radius}`);

        // Opacidade
        if (obj.opacity !== undefined) console.log(`      opacity: ${obj.opacity}`);

        // Shadow
        if (obj.shadow) {
          console.log(`      shadow: {`);
          console.log(`        color: ${obj.shadow.color}`);
          console.log(`        blur: ${obj.shadow.blur}`);
          console.log(`        offsetX: ${obj.shadow.offsetX}`);
          console.log(`        offsetY: ${obj.shadow.offsetY}`);
          console.log(`      }`);
        }

        console.log('');
      }

      // JSON completo (compacto)
      console.log('\n   JSON COMPLETO (compacto):');
      console.log('   ' + JSON.stringify(objects, null, 2).split('\n').join('\n   '));

    } catch (err: any) {
      console.error(`   ❌ Erro ao parsear JSON: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(120) + '\n');
}

readAnoiteceuV1().catch(console.error);

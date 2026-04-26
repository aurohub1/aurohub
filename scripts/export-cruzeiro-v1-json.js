// Exporta JSON bruto do template Cruzeiro V1
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

async function exportCruzeiroV1() {
  try {
    console.log('📦 Buscando template Cruzeiro Stories do V1...\n');

    // Buscar template da tabela templates
    const { data: template, error } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', 22)
      .single();

    if (error) throw error;
    if (!template) throw new Error('Template não encontrado');

    console.log('✅ Template encontrado');
    console.log(`   ID: ${template.id}`);
    console.log(`   Form: ${template.form}`);
    console.log(`   Format: ${template.format}`);
    console.log(`   Variant: ${template.variant}`);
    console.log('');

    // Parse do JSON
    const fabricJson = JSON.parse(template.json);

    console.log('='.repeat(80));
    console.log('JSON COMPLETO DO TEMPLATE CRUZEIRO V1 (Fabric.js):');
    console.log('='.repeat(80));
    console.log('');
    console.log(JSON.stringify(fabricJson, null, 2));
    console.log('');
    console.log('='.repeat(80));

    // Salvar em arquivo
    const outputPath = './scripts/cruzeiro-v1-raw.json';
    fs.writeFileSync(outputPath, JSON.stringify(fabricJson, null, 2));
    console.log(`\n✅ JSON salvo em: ${outputPath}`);

    // Mostrar resumo dos elementos
    console.log('\n📊 RESUMO DOS ELEMENTOS:\n');
    fabricJson.objects.forEach((obj, i) => {
      const bind = obj.bindParam ? `→ ${obj.bindParam}` : '';
      const name = obj.name || 'sem nome';
      const pos = `x:${Math.round(obj.left)}, y:${Math.round(obj.top)}`;
      const size = `w:${Math.round(obj.width * (obj.scaleX || 1))}, h:${Math.round(obj.height * (obj.scaleY || 1))}`;

      console.log(`${i + 1}. [${obj.type}] ${name}`);
      console.log(`   ${pos}, ${size}`);
      if (bind) console.log(`   ${bind}`);
      if (obj.fontSize) console.log(`   fontSize: ${obj.fontSize}`);
      if (obj.fill) console.log(`   fill: ${obj.fill}`);
      console.log('');
    });

    console.log(`Total de elementos: ${fabricJson.objects.length}`);
    console.log(`Background: ${fabricJson.background}`);
    console.log(`Version: ${fabricJson.version}`);

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

exportCruzeiroV1();

// Atualiza imagens estáticas do template Cruzeiro V2 com URLs do V1
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

const TEMPLATE_ID_V2 = '25691183-eb57-4eb2-b5fa-ec96081b9dc8';

async function updateStaticImages() {
  try {
    // 1. Buscar template V1
    console.log('📦 Buscando template Cruzeiro do V1...\n');
    const { data: v1Template, error: v1Error } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', 22)
      .single();

    if (v1Error) throw v1Error;
    if (!v1Template) throw new Error('Template V1 não encontrado');

    const v1Json = JSON.parse(v1Template.json);
    const objects = v1Json.objects;

    console.log('✅ Template V1 encontrado');
    console.log(`   Total de objetos: ${objects.length}\n`);

    // 2. Extrair URLs das imagens estáticas
    // Elemento #2 (overlay, y=-54)
    const overlayElement = objects.find(obj => obj.top === -54.34 || obj.top === -54);
    const overlayUrl = overlayElement?.src || '';

    // Elemento #5 (logoazv, x=667)
    const logoElement = objects.find(obj => Math.abs(obj.left - 666.84) < 1 || Math.abs(obj.left - 667) < 1);
    const logoUrl = logoElement?.src || '';

    console.log('🖼️  URLs das imagens estáticas do V1:\n');
    console.log(`Elemento #2 (overlay, y=${overlayElement?.top}):`);
    console.log(`   ${overlayUrl}\n`);
    console.log(`Elemento #5 (logoazv, x=${logoElement?.left}):`);
    console.log(`   ${logoUrl}\n`);

    if (!overlayUrl || !logoUrl) {
      throw new Error('URLs das imagens não encontradas no V1');
    }

    // 3. Buscar template V2
    console.log('📦 Buscando template Cruzeiro do V2...\n');
    const { data: v2Template, error: v2Error } = await supabaseV2
      .from('form_templates')
      .select('*')
      .eq('id', TEMPLATE_ID_V2)
      .single();

    if (v2Error) throw v2Error;
    if (!v2Template) throw new Error('Template V2 não encontrado');

    console.log('✅ Template V2 encontrado\n');

    // 4. Atualizar elementos no schema
    const schema = v2Template.schema;

    // Elemento #2 (overlay) - index 1
    if (schema.elements[1]) {
      schema.elements[1].src = overlayUrl;
      console.log(`✅ Elemento #2 (overlay) atualizado com URL`);
    }

    // Elemento #5 (logoazv) - index 4
    if (schema.elements[4]) {
      schema.elements[4].src = logoUrl;
      console.log(`✅ Elemento #5 (logoazv) atualizado com URL\n`);
    }

    // 5. Atualizar em form_templates
    console.log('💾 Atualizando form_templates...');
    const { error: updateFtError } = await supabaseV2
      .from('form_templates')
      .update({ schema })
      .eq('id', TEMPLATE_ID_V2);

    if (updateFtError) throw updateFtError;
    console.log('✅ form_templates atualizado\n');

    // 6. Atualizar em system_config
    console.log('💾 Atualizando system_config...');
    const { data: configRow, error: configError } = await supabaseV2
      .from('system_config')
      .select('value')
      .eq('key', 'tmpl_base_cruzeiro_stories')
      .single();

    if (configError) throw configError;

    const configValue = JSON.parse(configRow.value);
    configValue.elements = schema.elements;

    const { error: updateConfigError } = await supabaseV2
      .from('system_config')
      .update({
        value: JSON.stringify(configValue),
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'tmpl_base_cruzeiro_stories');

    if (updateConfigError) throw updateConfigError;
    console.log('✅ system_config atualizado\n');

    // 7. Verificar
    console.log('🔍 Verificando elementos atualizados:\n');
    console.log(`Elemento #2 (overlay):`);
    console.log(`   id: ${schema.elements[1].id}`);
    console.log(`   name: ${schema.elements[1].name}`);
    console.log(`   src: ${schema.elements[1].src}\n`);

    console.log(`Elemento #5 (logoazv):`);
    console.log(`   id: ${schema.elements[4].id}`);
    console.log(`   name: ${schema.elements[4].name}`);
    console.log(`   src: ${schema.elements[4].src}\n`);

    console.log('✅ Imagens estáticas atualizadas com sucesso!');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

updateStaticImages();

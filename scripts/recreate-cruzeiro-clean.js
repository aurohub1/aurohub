// Recriar template Cruzeiro do zero seguindo processo do Anoiteceu
import { createClient } from '@supabase/supabase-js';

const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function recreateCruzeiro() {
  try {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('PASSO 1: DELETAR REGISTROS EXISTENTES');
    console.log('════════════════════════════════════════════════════════\n');

    // Deletar de form_templates
    const { data: existing, error: fetchError } = await supabaseV2
      .from('form_templates')
      .select('id, name')
      .eq('form_type', 'cruzeiro');

    if (fetchError) throw fetchError;

    console.log(`📋 Encontrados ${existing?.length || 0} templates de cruzeiro:`);
    existing?.forEach(t => console.log(`   - ${t.name} (${t.id})`));

    if (existing && existing.length > 0) {
      const { error: deleteError } = await supabaseV2
        .from('form_templates')
        .delete()
        .eq('form_type', 'cruzeiro');

      if (deleteError) throw deleteError;
      console.log(`✅ ${existing.length} templates deletados de form_templates\n`);
    } else {
      console.log('✅ Nenhum template para deletar\n');
    }

    // Deletar de system_config
    const { error: configDeleteError } = await supabaseV2
      .from('system_config')
      .delete()
      .eq('key', 'tmpl_base_cruzeiro_stories');

    if (configDeleteError && configDeleteError.code !== 'PGRST116') throw configDeleteError;
    console.log('✅ Chave tmpl_base_cruzeiro_stories deletada de system_config\n');

    console.log('\n════════════════════════════════════════════════════════');
    console.log('PASSO 2: BUSCAR TEMPLATE #22 DO V1');
    console.log('════════════════════════════════════════════════════════\n');

    const { data: v1Template, error: v1Error } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', 22)
      .single();

    if (v1Error) throw v1Error;
    if (!v1Template) throw new Error('Template #22 não encontrado no V1');

    const fabricJson = JSON.parse(v1Template.json);
    console.log(`✅ Template encontrado: ${v1Template.form} ${v1Template.format} v${v1Template.variant}`);
    console.log(`   Total de objetos: ${fabricJson.objects.length}\n`);

    console.log('═══ TODOS OS 14 OBJETOS DO V1 ═══\n');

    fabricJson.objects.forEach((obj, i) => {
      console.log(`${i + 1}. [${obj.type}] ${obj.name || 'sem nome'}`);
      console.log(`   bindParam: ${obj.bindParam || 'NENHUM'}`);
      console.log(`   x: ${obj.left}, y: ${obj.top}`);
      console.log(`   width: ${Math.round(obj.width * (obj.scaleX || 1))}, height: ${Math.round(obj.height * (obj.scaleY || 1))}`);
      if (obj.fontSize) console.log(`   fontSize: ${obj.fontSize}`);
      if (obj.fontFamily) console.log(`   fontFamily: ${obj.fontFamily}`);
      if (obj.fontWeight) console.log(`   fontWeight: ${obj.fontWeight}`);
      if (obj.fill) console.log(`   fill: ${obj.fill}`);
      if (obj.text) console.log(`   text: "${obj.text}"`);
      if (obj.src) console.log(`   src: ${obj.src.substring(0, 80)}...`);
      console.log('');
    });

    console.log('\n════════════════════════════════════════════════════════');
    console.log('PASSO 3: CRIAR MAPEAMENTO DE BINDS');
    console.log('════════════════════════════════════════════════════════\n');

    const bindMap = {
      'img_fundo': 'imgfundo',
      'navio': 'navio',
      'valor_preco': 'valorparcela',
      'logo_cia': 'logo_cia',
      'nome_loja': 'logo_loja',
      'data_periodo': 'dataperiodo',
      'itinerario': 'itinerario',
      'incluso': 'incluso',
      'forma_pgto': 'forma_pgto',
      'valor_total_texto': 'valortotaltexto',
      'parcelas': 'parcelas',
    };

    console.log('📋 Mapa de bindParams V1 → V2:');
    Object.entries(bindMap).forEach(([v1, v2]) => {
      console.log(`   ${v1} → ${v2}`);
    });

    console.log('\n════════════════════════════════════════════════════════');
    console.log('MAPEAMENTO COMPLETO DOS ELEMENTOS');
    console.log('════════════════════════════════════════════════════════\n');

    const elements = fabricJson.objects.map((obj, idx) => {
      const v1Bind = obj.bindParam || null;
      const v2Bind = v1Bind ? (bindMap[v1Bind] || v1Bind) : null;
      const isImage = obj.type === 'image';
      const isText = obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox';

      const element = {
        id: `el-${idx + 1}`,
        type: isImage ? 'image' : 'text',
        x: obj.left,
        y: obj.top,
        width: obj.width * (obj.scaleX || 1),
        height: obj.height * (obj.scaleY || 1),
      };

      // Text properties
      if (isText) {
        element.text = obj.text || '';
        element.fontSize = obj.fontSize || 20;
        element.fontFamily = obj.fontFamily || 'Arial';
        element.fontWeight = obj.fontWeight || 'normal';
        element.color = obj.fill || '#000000';
        element.align = obj.textAlign || 'left';
      }

      // Bind parameter
      if (v2Bind) {
        if (isImage) {
          element.imageBind = v2Bind;
        } else {
          element.bindParam = v2Bind;
        }
      }

      // Static image URL
      if (isImage && obj.src && !v2Bind) {
        element.src = obj.src;
      }

      console.log(`${idx + 1}. ${obj.name || 'sem nome'}`);
      console.log(`   V1 bind: ${v1Bind || 'NENHUM'} → V2: ${v2Bind || 'ESTÁTICO'}`);
      console.log(`   Elemento: ${JSON.stringify(element, null, 2)}`);
      console.log('');

      return element;
    });

    console.log(`\n✅ ${elements.length} elementos mapeados\n`);

    // Pausar para revisão manual
    console.log('════════════════════════════════════════════════════════');
    console.log('⚠️  REVISÃO NECESSÁRIA');
    console.log('════════════════════════════════════════════════════════');
    console.log('Verifique os mapeamentos acima antes de continuar.');
    console.log('Os elementos estão prontos para serem inseridos.');
    console.log('\nJSON completo dos elementos:');
    console.log(JSON.stringify(elements, null, 2));

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

recreateCruzeiro();

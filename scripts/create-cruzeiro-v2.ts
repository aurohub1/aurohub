/**
 * Criar template Cruzeiro Stories no V2
 * Baseado no template #22 do V1 (Fabric.js)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

function genId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

async function createCruzeiroV2() {
  console.log('\n✨ CRIANDO TEMPLATE CRUZEIRO STORIES NO V2\n');
  console.log('='.repeat(80));

  const schema = {
    version: '2.0',
    background: '#0B1D3A',
    elements: [
      // 1. Imagem de fundo (bindParam: img_fundo → imgfundo)
      {
        id: genId(),
        type: 'image',
        name: 'Fundo',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        imageBind: 'imgfundo',
        opacity: 1,
      },

      // 2. Overlay do template (sem bindParam)
      {
        id: genId(),
        type: 'image',
        name: 'Overlay',
        x: 0,
        y: -54.34,
        width: 1080,
        height: 1920,
        src: 'https://res.cloudinary.com/dxgj4bcch/image/upload/BARRETOS_-_BULK_CRUZEIRO_1_s6xcdn.png',
        opacity: 1,
      },

      // 3. Nome do navio (bindParam: navio)
      {
        id: genId(),
        type: 'text',
        name: '[navio]',
        x: 126.16,
        y: 459.28,
        width: 458.04,
        height: 75.71,
        text: '',
        fontSize: 67,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#55d1f8',
        align: 'left',
        bindParam: 'navio',
        opacity: 1,
      },

      // 4. Valor da parcela (bindParam: valor_preco → valorparcela)
      {
        id: genId(),
        type: 'text',
        name: '[valorparcela]',
        x: 291.86,
        y: 1035.41,
        width: 507.24,
        height: 138.99,
        text: '0.000,00',
        fontSize: 123,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 800,
        color: '#132449',
        align: 'left',
        bindParam: 'valorparcela',
        opacity: 1,
      },

      // 5. Logo AZV (sem bindParam)
      {
        id: genId(),
        type: 'image',
        name: 'Logo AZV',
        x: 666.84,
        y: 1512.31,
        width: 294,
        height: 294,
        src: 'https://res.cloudinary.com/dxgj4bcch/image/upload/upload/csyosh8knt1h8kv0v7io.png',
        opacity: 1,
      },

      // 6. Logo da companhia (bindParam: logo_cia)
      {
        id: genId(),
        type: 'image',
        name: '[logo_cia]',
        x: 473.92,
        y: 453.37,
        width: 268.2,
        height: 76.14,
        imageBind: 'logo_cia',
        opacity: 1,
      },

      // 7. Logo da loja (bindParam: nome_loja → logo_loja)
      {
        id: genId(),
        type: 'image',
        name: '[logo_loja]',
        x: 736.84,
        y: 1712.73,
        width: 171.16,
        height: 30.14,
        imageBind: 'logo_loja',
        opacity: 1,
      },

      // 8. Data período (bindParam: data_periodo → dataperiodo)
      {
        id: genId(),
        type: 'text',
        name: '[dataperiodo]',
        x: 217.04,
        y: 649.16,
        width: 317.6784,
        height: 32.544,
        text: 'Texto',
        fontSize: 60,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#ffffff',
        align: 'left',
        bindParam: 'dataperiodo',
        opacity: 1,
      },

      // 9. Itinerário (bindParam: itinerario)
      {
        id: genId(),
        type: 'text',
        name: '[itinerario]',
        x: 219.41,
        y: 757.33,
        width: 520.584,
        height: 32.544,
        text: 'Texto',
        fontSize: 60,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#ffffff',
        align: 'left',
        bindParam: 'itinerario',
        opacity: 1,
      },

      // 10. Incluso (bindParam: incluso)
      {
        id: genId(),
        type: 'text',
        name: '[incluso]',
        x: 219.42,
        y: 854.33,
        width: 520.584,
        height: 32.544,
        text: 'Texto',
        fontSize: 60,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#ffffff',
        align: 'left',
        bindParam: 'incluso',
        opacity: 1,
      },

      // 11. Forma de pagamento (bindParam: forma_pgto)
      {
        id: genId(),
        type: 'text',
        name: '[forma_pgto]',
        x: 206.75,
        y: 1000.61,
        width: 454.74,
        height: 28.25,
        text: 'Texto',
        fontSize: 25,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#38bdf8',
        align: 'center',
        bindParam: 'forma_pgto',
        opacity: 1,
      },

      // 12. Valor total texto (bindParam: valor_total_texto → valortotaltexto)
      {
        id: genId(),
        type: 'text',
        name: '[valortotaltexto]',
        x: 203.52,
        y: 1195.37,
        width: 471.3,
        height: 28.25,
        text: 'Texto',
        fontSize: 25,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#38bdf8',
        align: 'center',
        bindParam: 'valortotaltexto',
        opacity: 1,
      },

      // 13. "R$" (sem bindParam)
      {
        id: genId(),
        type: 'text',
        name: 'R$',
        x: 177.73,
        y: 1110.25,
        width: 104.99,
        height: 33.9,
        text: 'R$',
        fontSize: 30,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#38bdf8',
        align: 'right',
        opacity: 1,
      },

      // 14. Parcelas "12x" (bindParam: parcelas)
      {
        id: genId(),
        type: 'text',
        name: '[parcelas]',
        x: 178.95,
        y: 1078.54,
        width: 104.99,
        height: 33.9,
        text: '12x',
        fontSize: 30,
        fontFamily: 'HN,\'Helvetica Neue\',Helvetica,Arial,sans-serif',
        fontWeight: 700,
        color: '#38bdf8',
        align: 'right',
        bindParam: 'parcelas',
        opacity: 1,
      },
    ],
  };

  console.log(`\n📦 Schema criado com ${schema.elements.length} elementos\n`);

  const templateData = {
    name: 'Cruzeiro — Stories',
    form_type: 'cruzeiro',
    format: 'stories',
    width: 1080,
    height: 1920,
    is_base: true,
    licensee_id: null,
    schema,
  };

  console.log('Inserindo em form_templates...');
  const { data: inserted, error: insertError } = await supabase
    .from('form_templates')
    .insert(templateData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Erro ao inserir:', insertError);
    process.exit(1);
  }

  console.log(`✅ Template inserido — ID: ${inserted.id}, Key: ${inserted.key}\n`);

  console.log('Inserindo em system_config...');
  const { error: configError } = await supabase
    .from('system_config')
    .insert({
      key: 'tmpl_base_cruzeiro_stories',
      value: JSON.stringify(schema),
    });

  if (configError) {
    console.error('❌ Erro ao inserir config:', configError);
    process.exit(1);
  }

  console.log('✅ Configuração inserida\n');
  console.log('='.repeat(80));
  console.log('✅ TEMPLATE CRUZEIRO CRIADO COM SUCESSO');
  console.log('='.repeat(80));
  console.log(`\nTemplate ID: ${inserted.id}`);
  console.log(`Template Key: ${inserted.key}`);
  console.log(`\n🎨 Abrir no editor:`);
  console.log(`   http://localhost:3000/editor?id=${inserted.key}\n`);
}

createCruzeiroV2().catch(console.error);

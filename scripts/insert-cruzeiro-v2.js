// Inserir template Cruzeiro no V2 com elementos do V1
import { createClient } from '@supabase/supabase-js';

const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

const elements = [
  {
    "id": "el-1",
    "type": "image",
    "x": 0,
    "y": 0,
    "width": 1080,
    "height": 1920,
    "imageBind": "imgfundo"
  },
  {
    "id": "el-2",
    "type": "image",
    "x": 0,
    "y": -54.34,
    "width": 1080,
    "height": 1920,
    "src": "https://res.cloudinary.com/dxgj4bcch/image/upload/BARRETOS_-_BULK_CRUZEIRO_1_s6xcdn.png"
  },
  {
    "id": "el-3",
    "type": "text",
    "x": 126.16,
    "y": 459.28,
    "width": 458.04,
    "height": 75.71,
    "text": "",
    "fontSize": 67,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#55d1f8",
    "align": "left",
    "bindParam": "navio"
  },
  {
    "id": "el-4",
    "type": "text",
    "x": 291.86,
    "y": 1035.41,
    "width": 507.24,
    "height": 138.99,
    "text": "0.000,00",
    "fontSize": 123,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 800,
    "color": "#132449",
    "align": "left",
    "bindParam": "valorparcela"
  },
  {
    "id": "el-5",
    "type": "image",
    "x": 666.84,
    "y": 1512.31,
    "width": 294,
    "height": 294,
    "src": "https://res.cloudinary.com/dxgj4bcch/image/upload/upload/csyosh8knt1h8kv0v7io.png"
  },
  {
    "id": "el-6",
    "type": "image",
    "x": 473.92,
    "y": 453.37,
    "width": 268.2,
    "height": 76.14,
    "imageBind": "logo_cia"
  },
  {
    "id": "el-7",
    "type": "image",
    "x": 736.84,
    "y": 1712.73,
    "width": 171.16,
    "height": 30.14,
    "imageBind": "logo_loja"
  },
  {
    "id": "el-8",
    "type": "text",
    "x": 217.04,
    "y": 649.16,
    "width": 317.6784,
    "height": 32.544,
    "text": "Texto",
    "fontSize": 60,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#ffffff",
    "align": "left",
    "bindParam": "dataperiodo"
  },
  {
    "id": "el-9",
    "type": "text",
    "x": 219.41,
    "y": 757.33,
    "width": 520.584,
    "height": 32.544,
    "text": "Texto",
    "fontSize": 60,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#ffffff",
    "align": "left",
    "bindParam": "itinerario"
  },
  {
    "id": "el-10",
    "type": "text",
    "x": 219.42,
    "y": 854.33,
    "width": 520.584,
    "height": 32.544,
    "text": "Texto",
    "fontSize": 60,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#ffffff",
    "align": "left",
    "bindParam": "incluso"
  },
  {
    "id": "el-11",
    "type": "text",
    "x": 206.75,
    "y": 1000.61,
    "width": 454.74,
    "height": 28.25,
    "text": "Texto",
    "fontSize": 25,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#38bdf8",
    "align": "center",
    "bindParam": "forma_pgto"
  },
  {
    "id": "el-12",
    "type": "text",
    "x": 203.52,
    "y": 1195.37,
    "width": 471.3,
    "height": 28.25,
    "text": "Texto",
    "fontSize": 25,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#38bdf8",
    "align": "center",
    "bindParam": "valortotaltexto"
  },
  {
    "id": "el-13",
    "type": "text",
    "x": 177.73,
    "y": 1110.25,
    "width": 104.99,
    "height": 33.9,
    "text": "R$",
    "fontSize": 30,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#38bdf8",
    "align": "right"
  },
  {
    "id": "el-14",
    "type": "text",
    "x": 178.95,
    "y": 1078.54,
    "width": 104.99,
    "height": 33.9,
    "text": "12x",
    "fontSize": 30,
    "fontFamily": "HN,'Helvetica Neue',Helvetica,Arial,sans-serif",
    "fontWeight": 700,
    "color": "#38bdf8",
    "align": "right",
    "bindParam": "parcelas"
  }
];

async function insertCruzeiro() {
  try {
    console.log('\n════════════════════════════════════════════════════════');
    console.log('INSERINDO TEMPLATE CRUZEIRO NO V2');
    console.log('════════════════════════════════════════════════════════\n');

    const templateData = {
      name: 'Cruzeiro — Stories',
      form_type: 'cruzeiro',
      format: 'stories',
      width: 1080,
      height: 1920,
      is_base: true,
      licensee_id: null,
      schema: {
        background: '#ffffff',
        elements: elements
      }
    };

    console.log('📦 Dados do template:');
    console.log(`   name: ${templateData.name}`);
    console.log(`   form_type: ${templateData.form_type}`);
    console.log(`   format: ${templateData.format}`);
    console.log(`   width: ${templateData.width}`);
    console.log(`   height: ${templateData.height}`);
    console.log(`   is_base: ${templateData.is_base}`);
    console.log(`   licensee_id: ${templateData.licensee_id}`);
    console.log(`   elementos: ${templateData.schema.elements.length}`);
    console.log('');

    // Inserir em form_templates
    const { data: inserted, error: insertError } = await supabaseV2
      .from('form_templates')
      .insert(templateData)
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Template inserido em form_templates`);
    console.log(`   ID: ${inserted.id}`);
    console.log(`   Key: ${inserted.key}`);
    console.log('');

    // Inserir em system_config
    const configData = {
      key: 'tmpl_base_cruzeiro_stories',
      value: JSON.stringify({
        width: templateData.width,
        height: templateData.height,
        background: templateData.schema.background,
        elements: templateData.schema.elements
      })
    };

    const { error: configError } = await supabaseV2
      .from('system_config')
      .insert(configData);

    if (configError) throw configError;

    console.log(`✅ Template inserido em system_config`);
    console.log(`   Key: tmpl_base_cruzeiro_stories`);
    console.log('');

    console.log('════════════════════════════════════════════════════════');
    console.log('✅ TEMPLATE CRUZEIRO CRIADO COM SUCESSO');
    console.log('════════════════════════════════════════════════════════');
    console.log(`\nTemplate ID: ${inserted.id}`);
    console.log(`URL para testar: http://localhost:3000/cliente/publicar`);

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

insertCruzeiro();

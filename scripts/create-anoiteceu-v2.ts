/**
 * Criar template Anoiteceu Stories no V2
 * Baseado no template #24 do V1 (Fabric.js)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

function genId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

async function createAnoiteceuV2() {
  console.log('\n✨ CRIANDO TEMPLATE ANOITECEU STORIES NO V2\n');
  console.log('='.repeat(80));

  const schema = {
    version: '2.0',
    background: '#0B1D3A',
    elements: [
      // 1. Imagem de fundo
      {
        id: genId(),
        type: 'image',
        name: 'Fundo Anoiteceu',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        src: 'https://res.cloudinary.com/dxgj4bcch/image/upload/upload/e6rm9rfjeilkfhwpap4s.png',
        opacity: 1,
      },

      // 2. desconto_anoit_valor — fontSize 328, Bebas Neue, right align
      {
        id: genId(),
        type: 'text',
        name: '[desconto_anoit_valor]',
        x: 296.31,
        y: 456.04,
        width: 350.73,
        height: 370.64,
        text: '50',
        fontSize: 328,
        fontFamily: 'Bebas Neue',
        fontStyle: '700',
        fill: '#ffffff',
        align: 'right',
        lineHeight: 1.16,
        bindParam: 'desconto_anoit_valor',
        opacity: 1,
      },

      // 3. data_inicio — fontSize 35, Helvetica Neue Bold
      {
        id: genId(),
        type: 'text',
        name: '[data_inicio]',
        x: 735.67,
        y: 1118.26,
        width: 262.58,
        height: 39.55,
        text: '',
        fontSize: 35,
        fontFamily: 'Helvetica Neue',
        fontStyle: '700',
        fill: '#ffffff',
        align: 'left',
        lineHeight: 1.16,
        bindParam: 'data_inicio',
        opacity: 1,
      },

      // 4. data_fim — fontSize 35, Helvetica Neue Bold
      {
        id: genId(),
        type: 'text',
        name: '[data_fim]',
        x: 823.74,
        y: 1171.12,
        width: 219.11,
        height: 39.55,
        text: '',
        fontSize: 35,
        fontFamily: 'Helvetica Neue',
        fontStyle: '700',
        fill: '#ffffff',
        align: 'left',
        lineHeight: 1.16,
        bindParam: 'data_fim',
        opacity: 1,
      },

      // 5. para_viagens_ate — fontSize 50, Helvetica Neue Bold, center
      {
        id: genId(),
        type: 'text',
        name: '[para_viagens_ate]',
        x: 340,
        y: 1401.27,
        width: 400,
        height: 56.5,
        text: '',
        fontSize: 50,
        fontFamily: 'Helvetica Neue',
        fontStyle: '700',
        fill: '#ffffff',
        align: 'center',
        lineHeight: 1.16,
        bindParam: 'para_viagens_ate',
        opacity: 1,
      },

      // 6. Texto estático "%" — fontSize 186, Bebas Neue
      {
        id: genId(),
        type: 'text',
        name: 'Texto %',
        x: 657.28,
        y: 481.94,
        width: 186,
        height: 210.18,
        text: '%',
        fontSize: 186,
        fontFamily: 'Bebas Neue',
        fontStyle: 'normal',
        fill: '#ffffff',
        align: 'left',
        lineHeight: 1.16,
        opacity: 1,
      },

      // 7. Texto estático "off" — fontSize 113, Bebas Neue
      {
        id: genId(),
        type: 'text',
        name: 'Texto off',
        x: 651.36,
        y: 649.04,
        width: 202.37,
        height: 127.69,
        text: 'off',
        fontSize: 113,
        fontFamily: 'Bebas Neue',
        fontStyle: 'normal',
        fill: '#ffffff',
        align: 'left',
        lineHeight: 1.16,
        opacity: 1,
      },

      // 8. Imagem logo — 2048x2048 com scale 0.21 = 430x430px efetivo
      {
        id: genId(),
        type: 'image',
        name: 'Logo',
        x: 127.21,
        y: 952.22,
        width: 430,  // 2048 * 0.21 ≈ 430
        height: 430,
        src: 'https://res.cloudinary.com/dxgj4bcch/image/upload/upload/m8boac13bpxqt0z7hgdd.png',
        opacity: 1,
      },
    ],
  };

  const templateData = {
    name: 'Anoiteceu — Stories',
    form_type: 'anoiteceu',
    format: 'stories',
    is_base: true,
    licensee_id: null,
    width: 1080,
    height: 1920,
    active: true,
    schema,
  };

  console.log('\n📄 Criando template com:');
  console.log(`   Name: ${templateData.name}`);
  console.log(`   Format: ${templateData.format}`);
  console.log(`   Elementos: ${schema.elements.length}`);
  console.log(`   Binds: desconto_anoit_valor, data_inicio, data_fim, para_viagens_ate\n`);

  const { data, error } = await supabase
    .from('form_templates')
    .insert(templateData)
    .select();

  if (error) {
    console.error('❌ Erro ao criar template:', error);
    return;
  }

  console.log('✅ Template criado com sucesso!\n');
  console.log('Detalhes:', data);
  console.log('\n' + '='.repeat(80) + '\n');
}

createAnoiteceuV2().catch(console.error);

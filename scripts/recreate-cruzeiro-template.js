// Recria template Cruzeiro do zero no V2
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function recreateCruzeiroTemplate() {
  try {
    // 1. Deletar todos os registros de cruzeiro
    console.log('🗑️  Deletando templates cruzeiro existentes...');
    const { error: deleteError } = await supabase
      .from('form_templates')
      .delete()
      .eq('form_type', 'cruzeiro');

    if (deleteError) throw deleteError;
    console.log('✅ Templates deletados');

    // 2. Criar schema com os 14 elementos do V1
    const schema = {
      width: 1080,
      height: 1920,
      duration: 5,
      formType: 'cruzeiro',
      background: '#0B1D3A',
      elements: [
        // #1 - Imagem de fundo (bindParam: imgfundo)
        {
          id: 'crz_img_fundo',
          type: 'imageBind',
          bindParam: 'imgfundo',
          name: 'img_fundo',
          x: 0,
          y: 0,
          width: 1080,
          height: 1920,
          imageFit: 'cover',
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #2 - Imagem overlay estática (sem bindParam)
        {
          id: 'crz_overlay',
          type: 'image',
          name: 'overlay',
          x: 0,
          y: -54,
          width: 1080,
          height: 1920,
          imageFit: 'cover',
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #3 - Navio (texto)
        {
          id: 'crz_navio',
          type: 'text',
          bindParam: 'navio',
          name: 'navio',
          text: '[navio]',
          x: 126,
          y: 459,
          width: 458,
          height: 76,
          fontSize: 67,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#55d1f8',
          align: 'left',
          lineHeight: 1.05,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #4 - Valor parcela (texto grande)
        {
          id: 'crz_valor',
          type: 'text',
          bindParam: 'valorparcela',
          name: 'preco',
          text: '0.000,00',
          x: 292,
          y: 1035,
          width: 507,
          height: 139,
          fontSize: 123,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#132449',
          align: 'left',
          lineHeight: 1.31,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #5 - Logo estática (sem bindParam)
        {
          id: 'crz_logo_static',
          type: 'image',
          name: 'logoazv',
          x: 667,
          y: 1512,
          width: 294,
          height: 294,
          imageFit: 'cover',
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #6 - Logo companhia (imageBind)
        {
          id: 'crz_logo_cia',
          type: 'imageBind',
          bindParam: 'logo_cia',
          name: 'logo_cia',
          x: 474,
          y: 453,
          width: 268,
          height: 76,
          imageFit: 'cover',
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #7 - Logo loja (imageBind)
        {
          id: 'crz_logo_loja',
          type: 'imageBind',
          bindParam: 'logo_loja',
          name: 'nome_loja',
          x: 737,
          y: 1713,
          width: 171,
          height: 30,
          imageFit: 'cover',
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #8 - Data período
        {
          id: 'crz_dataperiodo',
          type: 'text',
          bindParam: 'dataperiodo',
          name: 'data_periodo',
          text: 'Texto',
          x: 217,
          y: 649,
          width: 318,
          height: 33,
          fontSize: 60,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#ffffff',
          align: 'left',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #9 - Itinerário
        {
          id: 'crz_itinerario',
          type: 'text',
          bindParam: 'itinerario',
          name: 'itinerario',
          text: 'Texto',
          x: 219,
          y: 757,
          width: 521,
          height: 33,
          fontSize: 60,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#ffffff',
          align: 'left',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #10 - Incluso
        {
          id: 'crz_incluso',
          type: 'text',
          bindParam: 'incluso',
          name: 'incluso',
          text: 'Texto',
          x: 219,
          y: 854,
          width: 521,
          height: 33,
          fontSize: 60,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#ffffff',
          align: 'left',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #11 - Forma pagamento
        {
          id: 'crz_forma_pgto',
          type: 'text',
          bindParam: 'forma_pgto',
          name: 'forma_pgto',
          text: 'Texto',
          x: 207,
          y: 1001,
          width: 455,
          height: 28,
          fontSize: 25,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#38bdf8',
          align: 'center',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #12 - Valor total texto
        {
          id: 'crz_valortotal',
          type: 'text',
          bindParam: 'valortotaltexto',
          name: 'valor_total_texto',
          text: 'Texto',
          x: 204,
          y: 1195,
          width: 471,
          height: 28,
          fontSize: 25,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#38bdf8',
          align: 'center',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #13 - R$ estático
        {
          id: 'crz_rs',
          type: 'text',
          name: 'texto_rs',
          text: 'R$',
          x: 178,
          y: 1110,
          width: 105,
          height: 34,
          fontSize: 30,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#38bdf8',
          align: 'right',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
        // #14 - Parcelas
        {
          id: 'crz_parcelas',
          type: 'text',
          bindParam: 'parcelas',
          name: 'parcelas',
          text: '12x',
          x: 179,
          y: 1079,
          width: 105,
          height: 34,
          fontSize: 30,
          fontFamily: 'Helvetica Neue',
          fontStyle: 'normal',
          fill: '#38bdf8',
          align: 'right',
          lineHeight: 1.16,
          locked: false,
          visible: true,
          opacity: null,
          rotation: 0,
        },
      ],
    };

    // 3. Inserir novo template
    console.log('\n📝 Criando novo template Cruzeiro...');
    const { data, error: insertError } = await supabase
      .from('form_templates')
      .insert({
        name: 'Cruzeiro — Stories',
        form_type: 'cruzeiro',
        format: 'stories',
        width: 1080,
        height: 1920,
        schema,
        is_base: true,
        active: true,
        licensee_id: null,
        thumbnail_url: null,
      })
      .select();

    if (insertError) throw insertError;

    console.log('✅ Template criado:', data[0].id);
    console.log('   name:', data[0].name);
    console.log('   form_type:', data[0].form_type);
    console.log('   format:', data[0].format);
    console.log('   is_base:', data[0].is_base);
    console.log('   licensee_id:', data[0].licensee_id);
    console.log('   elementos:', schema.elements.length);

    // 4. Confirmar que só existe 1 registro
    console.log('\n🔍 Verificando registros cruzeiro no banco...');
    const { data: check, error: checkError } = await supabase
      .from('form_templates')
      .select('id, name, is_base, licensee_id')
      .eq('form_type', 'cruzeiro');

    if (checkError) throw checkError;

    console.log(`\n📊 Total de registros cruzeiro: ${check.length}`);
    check.forEach((t, i) => {
      console.log(`   ${i + 1}. ID: ${t.id}`);
      console.log(`      name: ${t.name}`);
      console.log(`      is_base: ${t.is_base}`);
      console.log(`      licensee_id: ${t.licensee_id || 'null'}`);
    });

    if (check.length === 1) {
      console.log('\n✅ Template Cruzeiro recriado com sucesso!');
    } else {
      console.log(`\n⚠️  ATENÇÃO: Esperado 1 registro, encontrado ${check.length}`);
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

recreateCruzeiroTemplate();

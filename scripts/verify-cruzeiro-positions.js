// Verifica ícones e posições no template Cruzeiro V1 vs V2
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

async function verifyPositions() {
  try {
    // 1. Buscar template V1
    console.log('📦 Buscando template Cruzeiro do V1...\n');
    const { data: v1Template, error: v1Error } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', 22)
      .single();

    if (v1Error) throw v1Error;

    const v1Json = JSON.parse(v1Template.json);
    const v1Objects = v1Json.objects;

    console.log('=== TEMPLATE V1 ===\n');
    console.log(`Total de objetos: ${v1Objects.length}\n`);

    // Listar TODOS os objetos do V1 com posições
    console.log('TODOS OS ELEMENTOS DO V1:\n');
    v1Objects.forEach((obj, i) => {
      const bind = obj.bindParam ? `→ ${obj.bindParam}` : '';
      const text = obj.text ? `text:"${obj.text}"` : '';
      const src = obj.src ? `src:${obj.src.substring(0, 50)}...` : '';
      console.log(`${i + 1}. [${obj.type}] ${obj.name || 'sem nome'}`);
      console.log(`   x:${Math.round(obj.left)}, y:${Math.round(obj.top)}, w:${Math.round(obj.width * obj.scaleX)}, h:${Math.round(obj.height * obj.scaleY)}`);
      if (bind) console.log(`   ${bind}`);
      if (text) console.log(`   ${text}`);
      if (src) console.log(`   ${src}`);
      console.log('');
    });

    // 2. Buscar template V2
    console.log('\n=== TEMPLATE V2 ===\n');
    const { data: v2Template, error: v2Error } = await supabaseV2
      .from('form_templates')
      .select('*')
      .eq('id', TEMPLATE_ID_V2)
      .single();

    if (v2Error) throw v2Error;

    const schema = v2Template.schema;
    console.log(`Total de elementos: ${schema.elements.length}\n`);

    // Elementos específicos para análise
    const formaPgto = schema.elements.find(el => el.bindParam === 'forma_pgto');
    const valorParcela = schema.elements.find(el => el.bindParam === 'valorparcela');
    const dataPeriodo = schema.elements.find(el => el.bindParam === 'dataperiodo');
    const itinerario = schema.elements.find(el => el.bindParam === 'itinerario');
    const incluso = schema.elements.find(el => el.bindParam === 'incluso');

    console.log('ELEMENTOS CRÍTICOS DO V2:\n');

    console.log('📅 data_periodo:');
    console.log(`   id: ${dataPeriodo.id}`);
    console.log(`   x: ${dataPeriodo.x}, y: ${dataPeriodo.y}`);
    console.log(`   width: ${dataPeriodo.width}, height: ${dataPeriodo.height}`);
    console.log(`   fontSize: ${dataPeriodo.fontSize}`);
    console.log('');

    console.log('🚢 itinerario:');
    console.log(`   id: ${itinerario.id}`);
    console.log(`   x: ${itinerario.x}, y: ${itinerario.y}`);
    console.log(`   width: ${itinerario.width}, height: ${itinerario.height}`);
    console.log(`   fontSize: ${itinerario.fontSize}`);
    console.log('');

    console.log('✅ incluso:');
    console.log(`   id: ${incluso.id}`);
    console.log(`   x: ${incluso.x}, y: ${incluso.y}`);
    console.log(`   width: ${incluso.width}, height: ${incluso.height}`);
    console.log(`   fontSize: ${incluso.fontSize}`);
    console.log('');

    console.log('💰 valorparcela (preço grande):');
    console.log(`   id: ${valorParcela.id}`);
    console.log(`   x: ${valorParcela.x}, y: ${valorParcela.y}`);
    console.log(`   width: ${valorParcela.width}, height: ${valorParcela.height}`);
    console.log(`   fontSize: ${valorParcela.fontSize}`);
    console.log('');

    console.log('💳 forma_pgto:');
    console.log(`   id: ${formaPgto.id}`);
    console.log(`   x: ${formaPgto.x}, y: ${formaPgto.y}`);
    console.log(`   width: ${formaPgto.width}, height: ${formaPgto.height}`);
    console.log(`   fontSize: ${formaPgto.fontSize}`);
    console.log('');

    // Análise de sobreposição
    console.log('⚠️  ANÁLISE DE POSIÇÕES:\n');

    const distanciaY = formaPgto.y - (valorParcela.y + valorParcela.height);
    console.log(`Distância entre valorparcela (fim) e forma_pgto (início):`);
    console.log(`   valorparcela termina em: y=${valorParcela.y + valorParcela.height}`);
    console.log(`   forma_pgto começa em: y=${formaPgto.y}`);
    console.log(`   Distância: ${distanciaY}px`);

    if (distanciaY < 0) {
      console.log(`   ❌ SOBREPOSIÇÃO! forma_pgto está ${Math.abs(distanciaY)}px ACIMA do final de valorparcela`);
    } else if (distanciaY < 20) {
      console.log(`   ⚠️  MUITO PRÓXIMO! Apenas ${distanciaY}px de espaço`);
    } else {
      console.log(`   ✅ Espaçamento adequado`);
    }

    console.log('\n🔍 BUSCA DE ÍCONES NO V1:\n');

    // Procurar por elementos de ícone (imagens pequenas ou símbolos) próximos aos campos de texto
    const iconesEncontrados = [];

    // Área de data_periodo (y~649)
    const iconesDataPeriodo = v1Objects.filter(obj =>
      Math.abs(obj.top - 649) < 50 && obj.left < 200 && obj.width < 50
    );
    if (iconesDataPeriodo.length > 0) {
      console.log('Elementos próximos a data_periodo (y~649):');
      iconesDataPeriodo.forEach(obj => {
        console.log(`   - [${obj.type}] ${obj.name} x:${Math.round(obj.left)}, y:${Math.round(obj.top)}, w:${Math.round(obj.width * obj.scaleX)}`);
        if (obj.src) console.log(`     src: ${obj.src}`);
        if (obj.text) console.log(`     text: ${obj.text}`);
      });
      iconesEncontrados.push(...iconesDataPeriodo);
    }

    // Área de itinerario (y~757)
    const iconesItinerario = v1Objects.filter(obj =>
      Math.abs(obj.top - 757) < 50 && obj.left < 200 && obj.width < 50
    );
    if (iconesItinerario.length > 0) {
      console.log('\nElementos próximos a itinerario (y~757):');
      iconesItinerario.forEach(obj => {
        console.log(`   - [${obj.type}] ${obj.name} x:${Math.round(obj.left)}, y:${Math.round(obj.top)}, w:${Math.round(obj.width * obj.scaleX)}`);
        if (obj.src) console.log(`     src: ${obj.src}`);
        if (obj.text) console.log(`     text: ${obj.text}`);
      });
      iconesEncontrados.push(...iconesItinerario);
    }

    // Área de incluso (y~854)
    const iconesIncluso = v1Objects.filter(obj =>
      Math.abs(obj.top - 854) < 50 && obj.left < 200 && obj.width < 50
    );
    if (iconesIncluso.length > 0) {
      console.log('\nElementos próximos a incluso (y~854):');
      iconesIncluso.forEach(obj => {
        console.log(`   - [${obj.type}] ${obj.name} x:${Math.round(obj.left)}, y:${Math.round(obj.top)}, w:${Math.round(obj.width * obj.scaleX)}`);
        if (obj.src) console.log(`     src: ${obj.src}`);
        if (obj.text) console.log(`     text: ${obj.text}`);
      });
      iconesEncontrados.push(...iconesIncluso);
    }

    if (iconesEncontrados.length === 0) {
      console.log('❌ NENHUM elemento de ícone encontrado no V1 próximo aos campos de texto');
      console.log('   Os ícones 📅🚢✅ são ARTIFACTS do V2, não existiam no V1');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

verifyPositions();

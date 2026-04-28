#!/usr/bin/env node

/**
 * Prepara importação do template V1 de cruzeiro para form_templates (V2)
 * Converte formato Fabric.js para formato EditorSchema do V2
 */

const fs = require('fs');

// Binds corretos do V1 (referência)
const V1_BINDS = [
  'data_periodo',
  'forma_pgto',
  'img_fundo',
  'incluso',
  'itinerario',
  'logo_cia',
  'navio',
  'nome_loja',
  'parcelas',
  'valor_preco',
  'valor_total_texto',
];

function genId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function convertFabricToV2(fabricJson) {
  const fabric = JSON.parse(fabricJson);

  const elements = fabric.objects.map((obj, idx) => {
    const baseElement = {
      id: genId(),
      x: obj.left || 0,
      y: obj.top || 0,
      width: obj.width * (obj.scaleX || 1),
      height: obj.height * (obj.scaleY || 1),
      rotation: obj.angle || 0,
      opacity: obj.opacity ?? 1,
      visible: obj.visible ?? true,
      locked: obj.lockMovementX || obj.lockMovementY || false,
    };

    if (obj.type === 'image') {
      return {
        ...baseElement,
        type: 'image',
        name: obj.name || `Imagem ${idx + 1}`,
        src: obj.src || '',
        bindParam: obj.bindParam || undefined,
      };
    }

    if (obj.type === 'textbox' || obj.type === 'text') {
      return {
        ...baseElement,
        type: 'text',
        name: obj.name || obj.text || `Texto ${idx + 1}`,
        text: obj.text || '',
        fontSize: obj.fontSize || 16,
        fontFamily: obj.fontFamily || 'DM Sans',
        fontWeight: obj.fontWeight || 400,
        fill: obj.fill || '#000000',
        align: obj.textAlign || 'left',
        bindParam: obj.bindParam || undefined,
      };
    }

    if (obj.type === 'rect') {
      return {
        ...baseElement,
        type: 'rect',
        name: obj.name || `Retângulo ${idx + 1}`,
        fill: obj.fill || '#000000',
        stroke: obj.stroke || '',
        strokeWidth: obj.strokeWidth || 0,
        cornerRadius: obj.rx || 0,
      };
    }

    // Fallback
    return {
      ...baseElement,
      type: 'rect',
      name: obj.name || `Elemento ${idx + 1}`,
      fill: obj.fill || '#CCCCCC',
    };
  });

  return {
    version: '2.0',
    background: fabric.background || '#FFFFFF',
    elements,
  };
}

function main() {
  console.log('🔄 PREPARANDO IMPORTAÇÃO DO TEMPLATE V1 CRUZEIRO');
  console.log('═'.repeat(80) + '\n');

  // Ler JSON do V1
  const v1Json = fs.readFileSync('cruzeiro-v1-template.json', 'utf8');
  const fabricJsonString = JSON.parse(v1Json); // Parse do wrapper

  // Converter para formato V2
  const v2Schema = convertFabricToV2(fabricJsonString);

  // Extrair elementos com bindParam
  const boundElements = v2Schema.elements.filter(el => el.bindParam);

  console.log('📊 ANÁLISE DO TEMPLATE V1:\n');
  console.log(`Total elementos: ${v2Schema.elements.length}`);
  console.log(`Elementos com bindParam: ${boundElements.length}`);
  console.log(`Background: ${v2Schema.background}`);
  console.log('');

  // Mostrar binds encontrados
  console.log('📋 BINDS ENCONTRADOS:\n');
  console.log('┌─────────────────────────────┬─────────────────────────┬──────────┬────────┐');
  console.log('│ bindParam                   │ name                    │ type     │ Status │');
  console.log('├─────────────────────────────┼─────────────────────────┼──────────┼────────┤');

  const foundBinds = new Set();

  for (const el of boundElements) {
    const bp = (el.bindParam || '').padEnd(27);
    const name = (el.name || '').padEnd(23);
    const type = (el.type || '').padEnd(8);
    const isV1 = V1_BINDS.includes(el.bindParam);
    const status = isV1 ? '✅ V1' : '❌ ???';

    foundBinds.add(el.bindParam);

    console.log(`│ ${bp} │ ${name} │ ${type} │ ${status} │`);
  }

  console.log('└─────────────────────────────┴─────────────────────────┴──────────┴────────┘');

  // Validação
  console.log('\n📊 VALIDAÇÃO:\n');
  console.log(`Binds V1 esperados: ${V1_BINDS.length}`);
  console.log(`Binds encontrados: ${foundBinds.size}`);

  const missing = V1_BINDS.filter(b => !foundBinds.has(b));
  const extra = Array.from(foundBinds).filter(b => !V1_BINDS.includes(b));

  if (missing.length > 0) {
    console.log(`\n⚠️  Binds FALTANDO:`);
    missing.forEach(b => console.log(`   - ${b}`));
  }

  if (extra.length > 0) {
    console.log(`\n⚠️  Binds EXTRAS (não esperados):`);
    extra.forEach(b => console.log(`   - ${b}`));
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log('\n✅ Todos os binds V1 estão presentes e corretos!');
  }

  // Preparar registro para inserção
  const templateRecord = {
    name: 'Cruzeiro V1 (Original)',
    form_type: 'cruzeiro',
    format: 'stories',
    width: 1080,
    height: 1920,
    schema: v2Schema,
    is_base: true,
    licensee_id: null,
    thumbnail_url: null,
  };

  console.log('\n' + '═'.repeat(80));
  console.log('\n📦 REGISTRO PREPARADO PARA INSERÇÃO:\n');
  console.log('Tabela: form_templates');
  console.log(`Nome: "${templateRecord.name}"`);
  console.log(`Tipo: ${templateRecord.form_type}`);
  console.log(`Formato: ${templateRecord.format} (${templateRecord.width}×${templateRecord.height})`);
  console.log(`is_base: ${templateRecord.is_base}`);
  console.log(`Elementos: ${templateRecord.schema.elements.length}`);
  console.log(`Elementos com bind: ${boundElements.length}`);
  console.log('');

  // Salvar para revisão
  const outputFile = 'cruzeiro-v1-for-import.json';
  fs.writeFileSync(outputFile, JSON.stringify(templateRecord, null, 2));
  console.log(`💾 Salvo em: scripts/${outputFile}`);

  // Mostrar preview do schema
  console.log('\n📄 PREVIEW DO SCHEMA (primeiros 3 elementos):\n');
  console.log(JSON.stringify(v2Schema.elements.slice(0, 3), null, 2));

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Preparação concluída!');
  console.log('\n💡 Para inserir no Supabase, use: node import-v1-cruzeiro.js');
  console.log('');
}

main();

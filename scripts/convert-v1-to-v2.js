#!/usr/bin/env node
/**
 * Converte templates v1 (Fabric.js CSV) para v2 (Konva JSON)
 *
 * Entrada: templates_rows.csv (mesmo diretório ou caminho fornecido)
 * Saída: templates_v2_converted.json
 *
 * IDs convertidos: 17, 63, 188, 421, 22, 391, 428
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Caminhos ajustáveis
const INPUT_CSV = process.argv[2] || 'templates_rows.csv';
const OUTPUT_JSON = 'templates_v2_converted.json';
const TARGET_IDS = [17, 63, 188, 421, 22, 391, 428];

/* ── Mapeamento de bindParam ─────────────────────── */
const BIND_PARAM_MAP = {
  'img_fundo': 'imgfundo',
  'valor_preco': 'valorparcela',
  'valor_total_texto': 'valortotaltexto',
  'valor_total_fmt': 'valortotalfmt',
  'texto_pagamento': 'textopagamento',
  'texto_parcelas': 'textoparcelas',
  'data_periodo': 'dataperiodo',
  'nome_loja': 'logo_loja',
};

function mapBindParam(original) {
  if (!original) return '';
  return BIND_PARAM_MAP[original] || original;
}

/* ── Mapeamento de form_type ────────────────────── */
const FORM_TYPE_MAP = {
  'passagem': 'passagem',
  'cruzeiro': 'cruzeiro',
  'lamina': 'card_whatsapp',
};

function mapFormType(original) {
  return FORM_TYPE_MAP[original] || original;
}

/* ── Detectar formato por dimensões ─────────────── */
function detectFormat(width, height) {
  const ratio = width / height;
  if (ratio < 0.7) return 'stories';
  if (ratio > 1.5) return 'tv';
  return 'feed';
}

/* ── Normalizar nome de fonte ───────────────────── */
function normalizeFontFamily(fontFamily) {
  if (!fontFamily) return 'Helvetica Neue';
  const lower = fontFamily.toLowerCase();
  if (lower.includes('helvetica')) return 'Helvetica Neue';
  return fontFamily;
}

/* ── Converter objeto Fabric.js para elemento Konva */
function convertFabricObject(obj, index) {
  // Tipos ignorados
  if (obj.type === 'ellipse') return null;

  // Coordenadas e dimensões
  const x = parseFloat(obj.left) || 0;
  const y = parseFloat(obj.top) || 0;
  const width = (parseFloat(obj.width) || 0) * (parseFloat(obj.scaleX) || 1);
  const height = (parseFloat(obj.height) || 0) * (parseFloat(obj.scaleY) || 1);

  // bindParam mapeado
  const bindParam = mapBindParam(obj.bindParam || obj.bind || '');

  // Tipo Konva
  let type;
  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
    type = 'text';
  } else if (obj.type === 'image') {
    type = bindParam ? 'imageBind' : 'image';
  } else if (obj.type === 'rect') {
    type = 'rect';
  } else {
    return null; // tipo desconhecido
  }

  // Base do elemento
  const element = {
    id: `converted_${index}_${Date.now()}`,
    type,
    name: obj.name || obj.bindParam || `Elemento ${index}`,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    opacity: parseFloat(obj.opacity) ?? 1,
    rotation: parseFloat(obj.angle) || 0,
    visible: obj.visible !== false,
    locked: false,
  };

  // bindParam se existir
  if (bindParam) {
    element.bindParam = bindParam;
  }

  // Propriedades específicas por tipo
  if (type === 'text') {
    element.text = obj.text || `[${bindParam}]` || '';
    element.fontSize = Math.round(parseFloat(obj.fontSize) || 32);
    element.fontFamily = normalizeFontFamily(obj.fontFamily);
    element.fontStyle = obj.fontWeight === 'bold' || obj.fontStyle === 'bold' ? 'bold' : 'normal';
    element.fill = obj.fill || '#FFFFFF';
    element.align = obj.textAlign || 'left';

    if (obj.textTransform === 'uppercase') {
      element.textTransform = 'uppercase';
    }
    if (obj.lineHeight) {
      element.lineHeight = parseFloat(obj.lineHeight);
    }
  } else if (type === 'image' || type === 'imageBind') {
    element.imageFit = obj.imageFit || 'cover';
  } else if (type === 'rect') {
    element.fill = obj.fill || '#000000';
    element.cornerRadius = parseFloat(obj.rx) || 0;
  }

  return element;
}

/* ── Converter template completo ────────────────── */
function convertTemplate(row) {
  // Parse JSON Fabric.js
  const fabricData = JSON.parse(row.json || '{}');
  const rawObjects = fabricData.objects || [];

  // Converter objetos
  const elements = rawObjects
    .map((obj, idx) => convertFabricObject(obj, idx))
    .filter(Boolean);

  // Dimensões baseadas no formato
  const format = row.format || 'stories';
  let width, height;
  if (format === 'stories' || format === 'reels') {
    width = 1080;
    height = 1920;
  } else if (format === 'feed') {
    width = 1080;
    height = 1350;
  } else if (format === 'tv') {
    width = 1920;
    height = 1080;
  } else {
    width = 1080;
    height = 1920;
  }

  const formType = mapFormType(row.form);

  // Background do JSON Fabric
  const background = fabricData.background || '#1E3A6E';

  // Nome descritivo
  const formLabel = {
    'passagem': 'Passagem',
    'cruzeiro': 'Cruzeiro',
    'card_whatsapp': 'Card WhatsApp',
  }[formType] || formType;

  const formatLabel = {
    'stories': 'Stories',
    'reels': 'Reels',
    'feed': 'Feed',
    'tv': 'TV',
  }[format] || format;

  return {
    name: `${formLabel} ${formatLabel} #${row.id}`,
    form_type: formType,
    format,
    width,
    height,
    is_base: true,
    active: true,
    licensee_id: null,
    schema: {
      elements,
      background,
      formType,
      width,
      height,
      duration: 5,
    },
  };
}

/* ── Main ───────────────────────────────────────── */
async function main() {
  console.log('🔄 Iniciando conversão v1 → v2...\n');

  // Verificar se arquivo existe
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`❌ Arquivo não encontrado: ${INPUT_CSV}`);
    console.log('\nUso: node convert-v1-to-v2.js <caminho-para-csv>');
    console.log('Exemplo: node convert-v1-to-v2.js ./templates_rows.csv');
    process.exit(1);
  }

  // Ler CSV
  console.log(`📖 Lendo: ${INPUT_CSV}`);
  const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ ${records.length} templates encontrados no CSV\n`);

  // Filtrar IDs alvo
  const targetRows = records.filter(row => TARGET_IDS.includes(parseInt(row.id)));

  console.log(`🎯 Convertendo ${targetRows.length} templates:`);
  targetRows.forEach(row => {
    console.log(`   - ID ${row.id}: ${row.nome} (${row.form})`);
  });
  console.log('');

  // Converter
  const converted = targetRows.map(row => {
    try {
      return convertTemplate(row);
    } catch (err) {
      console.error(`❌ Erro ao converter ID ${row.id}:`, err.message);
      return null;
    }
  }).filter(Boolean);

  // Salvar JSON
  console.log(`💾 Salvando em: ${OUTPUT_JSON}`);
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(converted, null, 2), 'utf-8');

  console.log(`\n✨ Conversão concluída! ${converted.length} templates salvos.`);

  // Resumo
  console.log('\n📊 Resumo:');
  converted.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name} — ${t.form_type} ${t.format} (${t.schema.elements.length} elementos)`);
  });
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

/**
 * Script de migração de templates V1 → V2
 * Passo 1: Listar templates V1
 * Passo 2: Converter 1 template (Passagem Stories)
 * Passo 3: Mostrar JSON convertido (NÃO inserir)
 */

import { createClient } from '@supabase/supabase-js';

// Supabase V1 (antigo - wwwpuqjdpecnixvbqigq)
const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

// Supabase V2 (novo - emcafedppvwparimvtob) - NÃO USADO NESTE SCRIPT
const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

interface V1Template {
  id: number;
  form: string;
  format: string;
  variant: string;
  grupo: string;
  json: string;
  updated_at: string;
  marca_id: string;
}

interface V2Element {
  id: string;
  type: 'text' | 'image' | 'rect' | 'circle' | 'line';
  bindParam?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;

  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: string;
  lineHeight?: number;

  // Image properties
  src?: string;

  // Shape properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;

  // Visual properties
  opacity?: number;
  rotation?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

interface V2Schema {
  version: string;
  width: number;
  height: number;
  background: string;
  elements: V2Element[];
}

interface V2Template {
  id: string;
  name: string;
  form_type: string;
  format: string;
  licensee_id: string | null;
  is_base: boolean;
  schema: V2Schema;
  width: number;
  height: number;
  active: boolean;
  thumbnail_url: string | null;
}

// Labels que devem ser removidos (texto estático duplicado)
const DUPLICATE_LABELS = [
  'Saída:',
  'Período:',
  'Incluso',
  'Passagem Aérea',
  'Destino',
  'Tipo de Voo',
  'Ida',
  'Volta',
];

// Mapa de renomeação de bindParams V1 → V2
const BIND_RENAME_MAP: Record<string, string> = {
  'data_periodo': 'periodo',
  'valor_preco': 'valorparcela',
  'valor_total_texto': 'valortotal',
  'nome_loja': 'logo_loja',
};

function convertFabricToV2Element(fabricObj: any): V2Element | null {
  const base: Partial<V2Element> = {
    id: fabricObj.name || `el_${Math.random().toString(36).substr(2, 9)}`,
    x: fabricObj.left || 0,
    y: fabricObj.top || 0,
  };

  // Adicionar bindParam se existir (aplicando mapa de renomeação)
  if (fabricObj.bindParam) {
    const originalBind = fabricObj.bindParam;
    base.bindParam = BIND_RENAME_MAP[originalBind] || originalBind;

    if (BIND_RENAME_MAP[originalBind]) {
      console.log(`   🔄 Renomeando bind: "${originalBind}" → "${base.bindParam}"`);
    }
  }

  // Converter por tipo
  switch (fabricObj.type) {
    case 'textbox':
    case 'text': {
      // Se é texto estático (sem bindParam) e é um label duplicado, pular
      if (!fabricObj.bindParam && fabricObj.text) {
        const text = (fabricObj.text as string).trim();
        if (DUPLICATE_LABELS.some(label => text.includes(label))) {
          console.log(`   ⚠️  Removendo texto duplicado: "${text}"`);
          return null;
        }
      }

      return {
        ...base,
        type: 'text',
        text: fabricObj.text || '',
        fontSize: fabricObj.fontSize,
        fontFamily: fabricObj.fontFamily,
        fontWeight: fabricObj.fontWeight,
        color: fabricObj.fill,
        textAlign: fabricObj.textAlign,
        lineHeight: fabricObj.lineHeight,
        width: fabricObj.width,
        height: fabricObj.height,
        opacity: fabricObj.opacity,
      } as V2Element;
    }

    case 'image': {
      return {
        ...base,
        type: 'image',
        src: fabricObj.src || '',
        width: fabricObj.width ? fabricObj.width * (fabricObj.scaleX || 1) : undefined,
        height: fabricObj.height ? fabricObj.height * (fabricObj.scaleY || 1) : undefined,
        opacity: fabricObj.opacity,
      } as V2Element;
    }

    case 'rect': {
      return {
        ...base,
        type: 'rect',
        width: fabricObj.width,
        height: fabricObj.height,
        fill: fabricObj.fill,
        stroke: fabricObj.stroke,
        strokeWidth: fabricObj.strokeWidth,
        rx: fabricObj.rx,
        ry: fabricObj.ry,
        opacity: fabricObj.opacity,
        shadow: fabricObj.shadow ? {
          color: fabricObj.shadow.color,
          blur: fabricObj.shadow.blur,
          offsetX: fabricObj.shadow.offsetX,
          offsetY: fabricObj.shadow.offsetY,
        } : undefined,
      } as V2Element;
    }

    case 'circle': {
      return {
        ...base,
        type: 'circle',
        width: fabricObj.radius ? fabricObj.radius * 2 : fabricObj.width,
        height: fabricObj.radius ? fabricObj.radius * 2 : fabricObj.height,
        fill: fabricObj.fill,
        stroke: fabricObj.stroke,
        strokeWidth: fabricObj.strokeWidth,
        opacity: fabricObj.opacity,
      } as V2Element;
    }

    case 'line': {
      return {
        ...base,
        type: 'line',
        width: fabricObj.width,
        height: fabricObj.height,
        stroke: fabricObj.stroke,
        strokeWidth: fabricObj.strokeWidth,
        opacity: fabricObj.opacity,
      } as V2Element;
    }

    default:
      console.log(`   ⚠️  Tipo desconhecido: ${fabricObj.type} (id: ${fabricObj.name})`);
      return null;
  }
}

function convertV1ToV2(v1Template: V1Template): V2Template {
  console.log(`\n🔄 Convertendo template V1 #${v1Template.id}...`);

  const fabricData = JSON.parse(v1Template.json);
  console.log(`   Canvas Fabric.js: ${fabricData.objects?.length || 0} objetos`);

  // Converter elementos
  const elements: V2Element[] = [];
  let removedCount = 0;

  for (const obj of fabricData.objects || []) {
    const converted = convertFabricToV2Element(obj);
    if (converted) {
      elements.push(converted);
    } else {
      removedCount++;
    }
  }

  console.log(`   ✅ Convertidos: ${elements.length} elementos`);
  console.log(`   🗑️  Removidos: ${removedCount} elementos (textos duplicados ou inválidos)`);

  // Determinar dimensões do canvas
  let width = 1080;
  let height = 1920;

  if (v1Template.format === 'feed') {
    width = 1080;
    height = 1350;
  } else if (v1Template.format === 'tv') {
    width = 1920;
    height = 1080;
  }

  const schema: V2Schema = {
    version: '1.0.0',
    width,
    height,
    background: fabricData.background || '#0B1D3A',
    elements,
  };

  // Gerar nome descritivo
  const formLabel = v1Template.form.charAt(0).toUpperCase() + v1Template.form.slice(1);
  const formatLabel = v1Template.format.charAt(0).toUpperCase() + v1Template.format.slice(1);
  const name = `${formLabel} - ${formatLabel}${v1Template.variant ? ` v${v1Template.variant}` : ''}`;

  return {
    id: `migrated_${v1Template.id}`, // Será substituído por UUID real
    name,
    form_type: v1Template.form,
    format: v1Template.format,
    licensee_id: null, // Migrar todos como templates base (sem licensee)
    is_base: true, // Todos os templates migrados são base (disponíveis para todos)
    schema,
    width,
    height,
    active: true,
    thumbnail_url: null, // Pode ser gerado depois se necessário
  };
}

async function main() {
  console.log('\n🚀 MIGRAÇÃO DE TEMPLATES V1 → V2\n');
  console.log('='.repeat(80));

  // ═══ PASSO 1: LISTAR TEMPLATES V1 ═══
  console.log('\n📋 PASSO 1: Listando templates do V1...\n');

  const { data: v1Templates, error } = await supabaseV1
    .from('templates')
    .select('id, form, format, variant, grupo, marca_id, updated_at')
    .order('id');

  if (error) {
    console.error('❌ Erro ao buscar templates V1:', error);
    return;
  }

  if (!v1Templates || v1Templates.length === 0) {
    console.log('⚠️  Nenhum template encontrado no V1.\n');
    return;
  }

  console.log(`✅ Encontrados ${v1Templates.length} template(s) no V1:\n`);
  console.table(
    v1Templates.map((t: any) => ({
      ID: t.id,
      Form: t.form,
      Format: t.format,
      Variant: t.variant || '-',
      Marca_ID: t.marca_id ? t.marca_id.substring(0, 8) + '...' : '(base)',
      Updated: new Date(t.updated_at).toLocaleDateString('pt-BR'),
    }))
  );

  // ═══ PASSO 2: CONVERTER 1 TEMPLATE (PASSAGEM STORIES) ═══
  console.log('\n' + '─'.repeat(80));
  console.log('\n📦 PASSO 2: Convertendo 1 template (Passagem Stories)...\n');

  // Buscar template Passagem Stories
  const { data: targetTemplates, error: targetError } = await supabaseV1
    .from('templates')
    .select('*')
    .eq('form', 'passagem')
    .eq('format', 'stories')
    .limit(1);

  if (targetError || !targetTemplates || targetTemplates.length === 0) {
    console.log('⚠️  Template "passagem/stories" não encontrado. Tentando "passagem/feed"...\n');

    const { data: feedTemplates, error: feedError } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('form', 'passagem')
      .eq('format', 'feed')
      .limit(1);

    if (feedError || !feedTemplates || feedTemplates.length === 0) {
      console.log('❌ Nenhum template de Passagem encontrado.\n');
      return;
    }

    const v1Template = feedTemplates[0] as V1Template;
    const v2Template = convertV1ToV2(v1Template);

    // ═══ PASSO 3: MOSTRAR JSON CONVERTIDO ═══
    console.log('\n' + '─'.repeat(80));
    console.log('\n📄 PASSO 3: JSON V2 Convertido (NÃO INSERIDO):\n');
    console.log('='.repeat(80));
    console.log(JSON.stringify(v2Template, null, 2));
    console.log('='.repeat(80));

    // Análise do resultado
    console.log('\n📊 ANÁLISE DA CONVERSÃO:\n');
    console.log(`   Nome: ${v2Template.name}`);
    console.log(`   Tipo: ${v2Template.form_type} / ${v2Template.format}`);
    console.log(`   Dimensões: ${v2Template.width}x${v2Template.height}`);
    console.log(`   Background: ${v2Template.schema.background}`);
    console.log(`   Total de elementos: ${v2Template.schema.elements.length}`);

    const byType = new Map<string, number>();
    const withBind = new Map<string, number>();

    for (const el of v2Template.schema.elements) {
      byType.set(el.type, (byType.get(el.type) || 0) + 1);
      if (el.bindParam) {
        withBind.set(el.bindParam, (withBind.get(el.bindParam) || 0) + 1);
      }
    }

    console.log('\n   Elementos por tipo:');
    for (const [type, count] of byType.entries()) {
      console.log(`     ${type}: ${count}`);
    }

    console.log('\n   Elementos com bindParam:');
    if (withBind.size === 0) {
      console.log('     (nenhum)');
    } else {
      for (const [bind, count] of withBind.entries()) {
        console.log(`     ${bind}: ${count}${count > 1 ? ' ⚠️  DUPLICADO!' : ''}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Conversão concluída. Aguardando aprovação para inserir no V2.\n');
    return;
  }

  const v1Template = targetTemplates[0] as V1Template;
  const v2Template = convertV1ToV2(v1Template);

  // ═══ PASSO 3: MOSTRAR JSON CONVERTIDO ═══
  console.log('\n' + '─'.repeat(80));
  console.log('\n📄 PASSO 3: JSON V2 Convertido (NÃO INSERIDO):\n');
  console.log('='.repeat(80));
  console.log(JSON.stringify(v2Template, null, 2));
  console.log('='.repeat(80));

  // Análise do resultado
  console.log('\n📊 ANÁLISE DA CONVERSÃO:\n');
  console.log(`   Nome: ${v2Template.name}`);
  console.log(`   Tipo: ${v2Template.form_type} / ${v2Template.format}`);
  console.log(`   Dimensões: ${v2Template.width}x${v2Template.height}`);
  console.log(`   Background: ${v2Template.schema.background}`);
  console.log(`   Total de elementos: ${v2Template.schema.elements.length}`);

  const byType = new Map<string, number>();
  const withBind = new Map<string, number>();

  for (const el of v2Template.schema.elements) {
    byType.set(el.type, (byType.get(el.type) || 0) + 1);
    if (el.bindParam) {
      withBind.set(el.bindParam, (withBind.get(el.bindParam) || 0) + 1);
    }
  }

  console.log('\n   Elementos por tipo:');
  for (const [type, count] of byType.entries()) {
    console.log(`     ${type}: ${count}`);
  }

  console.log('\n   Elementos com bindParam:');
  if (withBind.size === 0) {
    console.log('     (nenhum)');
  } else {
    for (const [bind, count] of withBind.entries()) {
      console.log(`     ${bind}: ${count}${count > 1 ? ' ⚠️  DUPLICADO!' : ''}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // ═══ PASSO 4: INSERIR NO V2 ═══
  console.log('\n💾 PASSO 4: Inserindo template no V2...\n');

  // Verificar se já existe
  const { data: existing } = await supabaseV2
    .from('form_templates')
    .select('id, name')
    .eq('name', v2Template.name)
    .eq('form_type', v2Template.form_type)
    .eq('format', v2Template.format)
    .single();

  if (existing) {
    console.log(`⚠️  Template "${v2Template.name}" já existe no V2 (ID: ${existing.id}). Pulando inserção.\n`);
  } else {
    // Remover o ID temporário e deixar Supabase gerar UUID
    const { id: _tempId, ...v2TemplateWithoutId } = v2Template;

    const { data: insertedTemplate, error: insertError } = await supabaseV2
      .from('form_templates')
      .insert([v2TemplateWithoutId])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir template no V2:', insertError);
      return;
    }

    console.log(`✅ Template inserido com ID: ${insertedTemplate.id}\n`);
  }

  // ═══ PASSO 5: MIGRAR TODOS OS TEMPLATES RESTANTES ═══
  console.log('─'.repeat(80));
  console.log('\n📦 PASSO 5: Migrando todos os templates do V1...\n');

  let migrated = 1; // Já migramos 1 template
  let skipped = 0;

  for (const v1Tmpl of v1Templates as V1Template[]) {
    // Pular o template que já migramos
    if (v1Tmpl.id === v1Template.id) continue;

    // Buscar JSON completo
    const { data: fullData, error: fullError } = await supabaseV1
      .from('templates')
      .select('*')
      .eq('id', v1Tmpl.id)
      .single();

    if (fullError || !fullData) {
      console.log(`⚠️  Pulando template #${v1Tmpl.id} (erro ao buscar): ${fullError?.message}`);
      skipped++;
      continue;
    }

    const v2Converted = convertV1ToV2(fullData as V1Template);
    const { id: _id, ...v2Data } = v2Converted;

    // Verificar se já existe
    const { data: existingCheck } = await supabaseV2
      .from('form_templates')
      .select('id')
      .eq('name', v2Converted.name)
      .eq('form_type', v2Converted.form_type)
      .eq('format', v2Converted.format)
      .single();

    if (existingCheck) {
      console.log(`⚠️  Pulando: ${v2Converted.name} (já existe)`);
      skipped++;
      continue;
    }

    const { error: err } = await supabaseV2
      .from('form_templates')
      .insert([v2Data]);

    if (err) {
      console.log(`❌ Erro ao inserir template #${v1Tmpl.id}: ${err.message}`);
      skipped++;
    } else {
      console.log(`✅ Migrado: ${v2Converted.name}`);
      migrated++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 MIGRAÇÃO CONCLUÍDA:\n`);
  console.log(`   ✅ Migrados: ${migrated} template(s)`);
  console.log(`   ⚠️  Pulados: ${skipped} template(s)`);
  console.log('\n');
}

main().catch(console.error);

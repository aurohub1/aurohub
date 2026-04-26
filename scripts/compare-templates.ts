/**
 * Script para comparar estrutura de templates V1 vs V2
 * Não faz migração - apenas mostra JSONs lado a lado
 */

import { createClient } from '@supabase/supabase-js';

// Supabase V1 (antigo - wwwpuqjdpecnixvbqigq)
const supabaseV1 = createClient(
  'https://wwwpuqjdpecnixvbqigq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3B1cWpkcGVjbml4dmJxaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDc3MDMsImV4cCI6MjA4OTU4MzcwM30.EutACGyKh2pe7ixv2WFuT8ZFEflUaTS1Whe4LBCz--g'
);

// Supabase V2 (novo - emcafedppvwparimvtob)
const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'sb_publishable_n9oSOiMIXr4fKqtU3YZCPw_efhCxN6N'
);

async function fetchV1Template() {
  console.log('\n📦 Buscando template V1 (Passagem Aérea)...\n');

  // Tentar diferentes nomes de tabela
  const possibleTables = ['templates', 'template', 'artes', 'arte'];

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabaseV1
        .from(table)
        .select('*')
        .ilike('nome', '%passagem%')
        .limit(1)
        .single();

      if (!error && data) {
        console.log(`✅ Template V1 encontrado na tabela "${table}":\n`);
        return { table, data };
      }
    } catch (e) {
      // Tabela não existe, continuar
    }
  }

  // Se não encontrou por nome, buscar qualquer template
  for (const table of possibleTables) {
    try {
      const { data, error } = await supabaseV1
        .from(table)
        .select('*')
        .limit(5);

      if (!error && data && data.length > 0) {
        console.log(`✅ Templates V1 encontrados na tabela "${table}" (mostrando primeiro):\n`);
        return { table, data: data[0], all: data };
      }
    } catch (e) {
      // Tabela não existe, continuar
    }
  }

  throw new Error('Nenhuma tabela de templates encontrada no V1');
}

async function fetchV2Template() {
  console.log('\n📦 Buscando template V2...\n');

  // Tentar buscar qualquer template
  const { data, error } = await supabaseV2
    .from('templates')
    .select('*')
    .limit(5);

  if (error) {
    console.log('⚠️  Nenhum template encontrado no V2 ou tabela não existe.');
    console.log('📝 Criando estrutura V2 exemplo baseada no código atual:\n');

    // Estrutura exemplo baseada no código TypeScript atual
    return {
      id: 'exemplo-uuid',
      nome: 'Passagem Aérea - Feed',
      tipo: 'passagem',
      formato: 'feed',
      variante: '1',
      loja_id: 'exemplo-loja-uuid',
      schema: {
        version: '1.0.0',
        width: 1080,
        height: 1080,
        background: '#0B1D3A',
        elements: [
          {
            id: 'img_fundo',
            type: 'image',
            bindParam: 'img_fundo',
            x: 0,
            y: 0,
            width: 1080,
            height: 1080,
            src: 'https://res.cloudinary.com/dxgj4bcch/image/upload/...'
          },
          {
            id: 'destino',
            type: 'text',
            bindParam: 'destino',
            x: 100,
            y: 200,
            fontSize: 48,
            fontFamily: 'Bebas Neue',
            color: '#55d1f8',
            text: 'DESTINO'
          },
          {
            id: 'saida',
            type: 'text',
            bindParam: 'saida',
            x: 100,
            y: 300,
            fontSize: 24,
            color: '#ffffff',
            text: 'GRU'
          },
          {
            id: 'voo',
            type: 'text',
            bindParam: 'voo',
            x: 200,
            y: 300,
            fontSize: 24,
            color: '#ffffff',
            text: '( Voo Direto )'
          },
          {
            id: 'periodo',
            type: 'text',
            bindParam: 'periodo',
            x: 100,
            y: 350,
            fontSize: 24,
            color: '#ffffff',
            text: '01/01 a 10/01/2026'
          },
          {
            id: 'preco',
            type: 'text',
            bindParam: 'valor_preco',
            x: 100,
            y: 500,
            fontSize: 72,
            fontFamily: 'Bebas Neue',
            color: '#132449',
            text: '841,49'
          },
          {
            id: 'parcelas',
            type: 'text',
            bindParam: 'texto_parcelas',
            x: 100,
            y: 580,
            fontSize: 18,
            color: '#55d1f8',
            text: '12x de R$ 70,12'
          }
        ]
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _note: 'ESTRUTURA EXEMPLO - não existe no banco V2'
    };
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Tabela templates existe mas está vazia no V2.');
    return null;
  }

  console.log(`✅ Templates V2 encontrados (${data.length}), mostrando primeiro:\n`);
  return data[0];
}

function analyzeStructure(obj: any, prefix = ''): string[] {
  const lines: string[] = [];

  if (Array.isArray(obj)) {
    lines.push(`${prefix}[Array com ${obj.length} item(s)]`);
    if (obj.length > 0) {
      lines.push(...analyzeStructure(obj[0], prefix + '  [0].'));
    }
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        lines.push(`${prefix}${key}: [Array com ${value.length} item(s)]`);
        if (value.length > 0) {
          lines.push(...analyzeStructure(value[0], prefix + `  ${key}[0].`));
        }
      } else if (value && typeof value === 'object') {
        lines.push(`${prefix}${key}: {Object}`);
        lines.push(...analyzeStructure(value, prefix + `  ${key}.`));
      } else {
        const preview = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value;
        lines.push(`${prefix}${key}: ${typeof value} = ${JSON.stringify(preview)}`);
      }
    }
  }

  return lines;
}

async function main() {
  console.log('🔍 COMPARAÇÃO DE TEMPLATES V1 vs V2\n');
  console.log('=' .repeat(80));

  try {
    // Buscar V1
    const v1Result = await fetchV1Template();
    const v1Template = v1Result.data;

    console.log('📄 ESTRUTURA V1:');
    console.log('-'.repeat(80));
    console.log(JSON.stringify(v1Template, null, 2));
    console.log('\n');

    // Buscar V2
    const v2Template = await fetchV2Template();

    console.log('📄 ESTRUTURA V2:');
    console.log('-'.repeat(80));
    console.log(JSON.stringify(v2Template, null, 2));
    console.log('\n');

    // Análise comparativa
    console.log('🔬 ANÁLISE COMPARATIVA:');
    console.log('='.repeat(80));

    console.log('\n📊 V1 - Estrutura de campos:');
    const v1Analysis = analyzeStructure(v1Template);
    v1Analysis.forEach(line => console.log('  ' + line));

    console.log('\n📊 V2 - Estrutura de campos:');
    const v2Analysis = analyzeStructure(v2Template);
    v2Analysis.forEach(line => console.log('  ' + line));

    // Mapeamento sugerido
    console.log('\n🗺️  MAPEAMENTO SUGERIDO:');
    console.log('='.repeat(80));
    console.log(`
V1                          →  V2
${'─'.repeat(80)}
id                          →  id (gerar novo UUID)
nome                        →  nome
tipo                        →  tipo
loja_id                     →  loja_id
svg/html/schema             →  schema (converter para formato de elementos)
created_at                  →  created_at
updated_at                  →  updated_at
    `);

    if (v1Result.all) {
      console.log('\n📋 OUTROS TEMPLATES V1 DISPONÍVEIS:');
      console.log('-'.repeat(80));
      v1Result.all.forEach((t: any, i: number) => {
        console.log(`${i + 1}. ${t.nome || t.id} (tipo: ${t.tipo || 'N/A'})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

main().catch(console.error);

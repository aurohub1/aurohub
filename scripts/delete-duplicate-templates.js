#!/usr/bin/env node
/**
 * Deleta templates duplicados de Anoiteceu
 * Mantém apenas: d7ffa240 — 'Anoiteceu — Stories'
 *
 * Uso:
 *   node scripts/delete-duplicate-templates.js preview  - Mostra o que será deletado
 *   node scripts/delete-duplicate-templates.js delete   - Executa a deleção
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const IDS_TO_DELETE = [
  'a89875bd-9e59-4ebd-b36d-0539dbd94eae',
  '84c57387-8357-4460-8a47-ebeadc0ac536',
  '3e651e50-9490-45b3-b444-b762fc50460e',
  '1be1c7be-594a-4791-8e86-199aa1a64005',
];

async function previewDeletion() {
  console.log('🗑️  Preview: Templates duplicados de Anoiteceu que serão deletados\n');

  // Buscar os registros que serão deletados
  console.log('📋 Registros para DELETAR:\n');
  for (const id of IDS_TO_DELETE) {
    const { data } = await supabase
      .from('form_templates')
      .select('id, name, form_type, format, is_base, licensee_id, active, created_at')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      console.log(`   ❌ ${data.id.slice(0, 8)} — ${data.name}`);
      console.log(`      is_base: ${data.is_base}, licensee_id: ${data.licensee_id || 'null'}`);
      console.log(`      criado: ${new Date(data.created_at).toLocaleString('pt-BR')}\n`);
    } else {
      console.log(`   ⚠️  Não encontrado: ${id.slice(0, 8)}\n`);
    }
  }

  // Mostrar o que será mantido
  const KEEP_ID = 'd7ffa240-c4b7-47f6-a594-5fb664a04f56';
  const { data: keep } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, created_at')
    .eq('id', KEEP_ID)
    .maybeSingle();

  if (keep) {
    console.log('✅ Registro que será MANTIDO:\n');
    console.log(`   ✓ ${keep.id.slice(0, 8)} — ${keep.name}`);
    console.log(`      is_base: ${keep.is_base}`);
    console.log(`      criado: ${new Date(keep.created_at).toLocaleString('pt-BR')}\n`);
  }

  console.log('\n💡 Para executar a deleção, rode:');
  console.log('   node scripts/delete-duplicate-templates.js delete\n');
}

async function executeDelete() {
  console.log('🗑️  Executando deleção...\n');

  let deleted = 0;
  let errors = 0;

  for (const id of IDS_TO_DELETE) {
    // Buscar o registro primeiro
    const { data: record } = await supabase
      .from('form_templates')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (!record) {
      console.log(`   ⚠️  Não encontrado: ${id.slice(0, 8)}`);
      continue;
    }

    const { error } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', record.id);

    if (error) {
      console.error(`   ❌ Erro ao deletar ${record.id.slice(0, 8)} (${record.name}): ${error.message}`);
      errors++;
    } else {
      console.log(`   ✓ Deletado: ${record.id.slice(0, 8)} — ${record.name}`);
      deleted++;
    }
  }

  console.log(`\n✅ ${deleted} registros deletados, ${errors} erros.`);
}

const mode = process.argv[2] || 'preview';

if (mode === 'delete') {
  executeDelete().catch(console.error);
} else {
  previewDeletion().catch(console.error);
}

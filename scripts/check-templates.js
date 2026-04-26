#!/usr/bin/env node
/**
 * Verifica os últimos templates inseridos em form_templates
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

async function checkTemplates() {
  console.log('🔍 Verificando últimos templates...\n');

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, licensee_id, active, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Nenhum template encontrado');
    return;
  }

  console.log('📋 Últimos 5 templates:\n');
  console.log('─'.repeat(120));
  console.log(
    'ID'.padEnd(38) +
    'Nome'.padEnd(25) +
    'Tipo'.padEnd(12) +
    'Formato'.padEnd(10) +
    'Base'.padEnd(8) +
    'Licensee'.padEnd(10) +
    'Ativo'
  );
  console.log('─'.repeat(120));

  for (const t of data) {
    const id = t.id.slice(0, 8);
    const name = (t.name || '—').slice(0, 23);
    const type = (t.form_type || '—').slice(0, 10);
    const format = (t.format || '—').slice(0, 8);
    const isBase = t.is_base ? '✓ true' : '✗ false';
    const licensee = t.licensee_id ? t.licensee_id.slice(0, 8) : '—';
    const active = t.active ? '✓' : '✗';
    const created = new Date(t.created_at).toLocaleString('pt-BR');

    console.log(
      id.padEnd(38) +
      name.padEnd(25) +
      type.padEnd(12) +
      format.padEnd(10) +
      isBase.padEnd(8) +
      licensee.padEnd(10) +
      active.padEnd(8) +
      created
    );
  }
  console.log('─'.repeat(120));

  // Verificar templates duplicados (contém "cópia")
  const duplicados = data.filter(t => t.name?.toLowerCase().includes('cópia'));
  if (duplicados.length > 0) {
    console.log('\n✨ Templates duplicados encontrados:\n');
    for (const t of duplicados) {
      console.log(`   📌 ${t.name}`);
      console.log(`      is_base: ${t.is_base ? '✓ true' : '✗ false'}`);
      console.log(`      active: ${t.active ? '✓ true' : '✗ false'}`);
      console.log(`      licensee_id: ${t.licensee_id || 'null (visível para todos)'}`);
      console.log('');
    }
  }
}

checkTemplates().catch(console.error);

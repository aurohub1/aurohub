#!/usr/bin/env node
/**
 * Lista todos os templates de Anoiteceu
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

async function listTemplates() {
  console.log('📋 Todos os templates de Anoiteceu:\n');

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, is_base, licensee_id, active, created_at')
    .eq('form_type', 'anoiteceu')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Nenhum template de Anoiteceu encontrado');
    return;
  }

  for (const t of data) {
    const isDuplicate = t.name?.toLowerCase().includes('cópia');
    const marker = isDuplicate ? '❌' : '✅';

    console.log(`${marker} ID: ${t.id}`);
    console.log(`   Nome: ${t.name}`);
    console.log(`   is_base: ${t.is_base}, licensee_id: ${t.licensee_id || 'null'}, active: ${t.active}`);
    console.log(`   Criado: ${new Date(t.created_at).toLocaleString('pt-BR')}\n`);
  }

  console.log(`\nTotal: ${data.length} templates`);
}

listTemplates().catch(console.error);

// Script para executar migrations no Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://emcafedppvwparimvtob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sql = readFileSync('./database/migration_template_access.sql', 'utf8');

    // Supabase client não suporta execução de SQL arbitrário
    // Precisamos usar a REST API ou o SQL editor do dashboard
    console.log('⚠️  Execute o SQL abaixo no Supabase SQL Editor:');
    console.log('📍 https://supabase.com/dashboard/project/emcafedppvwparimvtob/editor');
    console.log('\n' + sql);

  } catch (err) {
    console.error('Erro ao ler migration:', err);
  }
}

runMigration();

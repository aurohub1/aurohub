#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://emcafedppvwparimvtob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryTemplates() {
  console.log('\n=== QUERY DIRETA NO SUPABASE V2 ===\n');
  console.log('SELECT id, name, form_type, format, licensee_id, created_at');
  console.log('FROM form_templates');
  console.log('ORDER BY form_type, format, name;\n');

  const { data, error } = await supabase
    .from('form_templates')
    .select('id, name, form_type, format, licensee_id, created_at')
    .order('form_type', { ascending: true })
    .order('format', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro:', error);
    process.exit(1);
  }

  console.log(`Total de registros: ${data.length}\n`);
  console.log('┌────────────────────────────────────────┬──────────────────────────────────┬────────────┬────────────┬────────────────────────────────────────┬─────────────────────────┐');
  console.log('│ ID                                     │ Nome                             │ Tipo       │ Formato    │ Licensee ID                            │ Created At              │');
  console.log('├────────────────────────────────────────┼──────────────────────────────────┼────────────┼────────────┼────────────────────────────────────────┼─────────────────────────┤');

  data.forEach(row => {
    const id = (row.id || '').substring(0, 38).padEnd(38);
    const name = (row.name || '').substring(0, 32).padEnd(32);
    const form_type = (row.form_type || '').substring(0, 10).padEnd(10);
    const format = (row.format || '').substring(0, 10).padEnd(10);
    const licensee_id = (row.licensee_id || 'null').substring(0, 38).padEnd(38);
    const created = new Date(row.created_at).toISOString().substring(0, 23);

    console.log(`│ ${id} │ ${name} │ ${form_type} │ ${format} │ ${licensee_id} │ ${created} │`);
  });

  console.log('└────────────────────────────────────────┴──────────────────────────────────┴────────────┴────────────┴────────────────────────────────────────┴─────────────────────────┘');
  console.log(`\nTotal: ${data.length} templates\n`);
}

queryTemplates();

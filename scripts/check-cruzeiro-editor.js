// Verifica template Cruzeiro no system_config para abrir no editor
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function checkCruzeiroEditor() {
  try {
    // Buscar em system_config
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .like('key', '%cruzeiro%');

    if (configError) throw configError;

    console.log('\n=== TEMPLATES CRUZEIRO EM system_config ===\n');
    console.log(`Total encontrado: ${configs?.length || 0}\n`);

    if (configs && configs.length > 0) {
      configs.forEach((row, i) => {
        console.log(`${i + 1}. KEY: ${row.key}`);
        console.log(`   URL: /editor?id=${row.key.replace('tmpl_', '')}`);

        try {
          const parsed = JSON.parse(row.value);
          console.log(`   nome: ${parsed.nome || 'sem nome'}`);
          console.log(`   formType: ${parsed.formType}`);
          console.log(`   format: ${parsed.format}`);
          console.log(`   is_base: ${parsed.is_base}`);
          console.log(`   elementos: ${parsed.elements?.length || 0}`);

          if (parsed.elements) {
            console.log('\n   LAYERS:');
            parsed.elements.forEach((el, idx) => {
              const bind = el.bindParam ? `→ ${el.bindParam}` : '';
              console.log(`   ${idx + 1}. [${el.type}] ${el.name || el.id} ${bind}`);
            });
          }
        } catch (e) {
          console.log('   (erro ao parsear)');
        }
        console.log('');
      });
    } else {
      console.log('⚠️  Nenhum template cruzeiro encontrado em system_config');
      console.log('\n💡 O template existe em form_templates mas pode não estar sincronizado em system_config.');
      console.log('   Isso é normal se o template foi criado direto no form_templates.');
      console.log('   Para o editor funcionar, precisa existir em system_config também.\n');
    }

    // Buscar também em form_templates para comparar
    const { data: formTemplates, error: ftError } = await supabase
      .from('form_templates')
      .select('id, name, form_type, schema')
      .eq('form_type', 'cruzeiro');

    if (ftError) throw ftError;

    console.log('\n=== TEMPLATES CRUZEIRO EM form_templates ===\n');
    console.log(`Total encontrado: ${formTemplates?.length || 0}\n`);

    if (formTemplates && formTemplates.length > 0) {
      formTemplates.forEach((row, i) => {
        console.log(`${i + 1}. ID: ${row.id}`);
        console.log(`   name: ${row.name}`);
        console.log(`   elementos: ${row.schema?.elements?.length || 0}`);

        if (row.schema?.elements) {
          console.log('\n   LAYERS:');
          row.schema.elements.forEach((el, idx) => {
            const bind = el.bindParam ? `→ ${el.bindParam}` : '';
            console.log(`   ${idx + 1}. [${el.type}] ${el.name || el.id} ${bind}`);
          });
        }
        console.log('');
      });
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

checkCruzeiroEditor();

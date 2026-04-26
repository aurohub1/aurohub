// Sincroniza template Cruzeiro limpo para system_config
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function syncCruzeiroToSystemConfig() {
  try {
    // 1. Buscar template limpo do form_templates
    console.log('📦 Buscando template limpo de form_templates...');
    const { data: formTemplate, error: ftError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('form_type', 'cruzeiro')
      .single();

    if (ftError) throw ftError;
    if (!formTemplate) throw new Error('Template não encontrado em form_templates');

    console.log('✅ Template encontrado:', formTemplate.name);
    console.log('   Elementos:', formTemplate.schema.elements.length);

    // 2. Deletar templates antigos de system_config
    console.log('\n🗑️  Deletando templates antigos de system_config...');
    const { error: deleteError } = await supabase
      .from('system_config')
      .delete()
      .like('key', '%cruzeiro%');

    if (deleteError) throw deleteError;
    console.log('✅ Templates antigos deletados');

    // 3. Criar registro em system_config
    const key = 'tmpl_base_cruzeiro_stories';
    const configValue = {
      nome: formTemplate.name,
      formType: formTemplate.form_type,
      format: formTemplate.format,
      width: formTemplate.width,
      height: formTemplate.height,
      elements: formTemplate.schema.elements,
      background: formTemplate.schema.background,
      is_base: formTemplate.is_base,
      thumbnail: formTemplate.thumbnail_url,
    };

    console.log(`\n📝 Criando em system_config com key: ${key}...`);
    const { error: insertError } = await supabase
      .from('system_config')
      .upsert({
        key,
        value: JSON.stringify(configValue),
        updated_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
    console.log('✅ Template sincronizado para system_config');

    // 4. Verificar
    console.log('\n🔍 Verificando resultado...');
    const { data: check, error: checkError } = await supabase
      .from('system_config')
      .select('key, value')
      .eq('key', key)
      .single();

    if (checkError) throw checkError;

    const parsed = JSON.parse(check.value);
    console.log(`\n✅ Template em system_config:`);
    console.log(`   KEY: ${check.key}`);
    console.log(`   URL: /editor?id=${check.key.replace('tmpl_', '')}`);
    console.log(`   nome: ${parsed.nome}`);
    console.log(`   elementos: ${parsed.elements.length}`);

    console.log('\n   LAYERS:');
    parsed.elements.forEach((el, idx) => {
      const bind = el.bindParam ? `→ ${el.bindParam}` : '';
      const name = el.name || el.id;
      console.log(`   ${idx + 1}. [${el.type}] ${name} ${bind}`);
    });

    console.log('\n✅ Sincronização concluída!');
    console.log(`\n🌐 Abrir no editor: http://localhost:3000/editor?id=base_cruzeiro_stories`);

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
}

syncCruzeiroToSystemConfig();

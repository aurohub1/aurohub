// Deletar todos os registros de cruzeiro no V2
import { createClient } from '@supabase/supabase-js';

const supabaseV2 = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

async function reset() {
  try {
    console.log('\n🗑️  Deletando registros de cruzeiro...\n');

    // 1. Deletar de form_templates
    const { error: e1 } = await supabaseV2
      .from('form_templates')
      .delete()
      .eq('form_type', 'cruzeiro');

    if (e1) throw e1;
    console.log('✅ form_templates limpo');

    // 2. Deletar de system_config
    const { error: e2 } = await supabaseV2
      .from('system_config')
      .delete()
      .ilike('key', '%cruzeiro%');

    if (e2) throw e2;
    console.log('✅ system_config limpo');

    console.log('\n✅ Reset completo\n');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

reset();

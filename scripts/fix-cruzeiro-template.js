// Corrige template Cruzeiro no V2
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://emcafedppvwparimvtob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM'
);

const TEMPLATE_ID = '677dd365-9ae9-4ead-ac04-746ad23da802';

async function fixCruzeiroTemplate() {
  try {
    // 1. Buscar template atual
    const { data: current, error: fetchError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', TEMPLATE_ID)
      .single();

    if (fetchError) throw fetchError;
    if (!current) throw new Error('Template não encontrado');

    console.log('✅ Template atual encontrado');

    // 2. Corrigir schema
    const schema = current.schema;

    // Remover bindParam do elemento #1 (imagem estática de overlay)
    if (schema.elements[1] && schema.elements[1].bindParam === 'imgciamaritima') {
      delete schema.elements[1].bindParam;
      console.log('✅ Removido bindParam "imgciamaritima" do elemento #1');
    }

    // Verificar dataperiodo no elemento #7
    if (schema.elements[7] && schema.elements[7].bindParam === 'dataperiodo') {
      console.log('✅ dataperiodo correto no elemento #7');
    }

    // 3. Atualizar registro com is_base: true
    const { error: updateError } = await supabase
      .from('form_templates')
      .update({
        schema,
        is_base: true,
        licensee_id: null,
      })
      .eq('id', TEMPLATE_ID);

    if (updateError) throw updateError;

    console.log('✅ Template atualizado:');
    console.log('   - is_base: true');
    console.log('   - licensee_id: null');
    console.log('   - schema corrigido');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

fixCruzeiroTemplate();

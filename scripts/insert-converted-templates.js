#!/usr/bin/env node
/**
 * Insere templates convertidos em form_templates e system_config
 *
 * Entrada: templates_v2_converted.json
 * Destino: Supabase v2 (form_templates + system_config)
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar .env.local
dotenv.config({ path: '.env.local' });

const INPUT_JSON = 'templates_v2_converted.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.local');
  console.error('   Verifique: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/* ── Main ───────────────────────────────────────── */
async function main() {
  console.log('🔄 Iniciando inserção de templates v2...\n');

  // Ler JSON convertido
  if (!fs.existsSync(INPUT_JSON)) {
    console.error(`❌ Arquivo não encontrado: ${INPUT_JSON}`);
    console.log('Execute primeiro: node scripts/convert-v1-to-v2.js');
    process.exit(1);
  }

  console.log(`📖 Lendo: ${INPUT_JSON}`);
  const templates = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf-8'));
  console.log(`✅ ${templates.length} templates carregados\n`);

  let formTemplatesInserted = 0;
  let systemConfigInserted = 0;
  const errors = [];

  for (const template of templates) {
    const id = template.name.match(/#(\d+)/)?.[1] || Date.now().toString(36);

    console.log(`📝 Processando: ${template.name}`);

    // 1. Inserir em form_templates
    try {
      const { error: ftError } = await supabase
        .from('form_templates')
        .insert({
          name: template.name,
          form_type: template.form_type,
          format: template.format,
          width: template.width,
          height: template.height,
          schema: template.schema,
          is_base: template.is_base,
          active: template.active,
          licensee_id: template.licensee_id,
          thumbnail_url: null,
        });

      if (ftError) {
        console.error(`   ⚠️  form_templates: ${ftError.message}`);
        errors.push({ template: template.name, table: 'form_templates', error: ftError.message });
      } else {
        formTemplatesInserted++;
        console.log(`   ✅ form_templates inserido`);
      }
    } catch (err) {
      console.error(`   ❌ form_templates: ${err.message}`);
      errors.push({ template: template.name, table: 'form_templates', error: err.message });
    }

    // 2. Inserir em system_config
    try {
      const key = `tmpl_base_${template.form_type}_${template.format}_${id}`;

      const configValue = {
        nome: template.name,
        formType: template.form_type,
        format: template.format,
        width: template.width,
        height: template.height,
        is_base: true,
        elements: template.schema.elements,
        background: template.schema.background,
        licenseeId: null,
        licenseeNome: 'Base',
        lojaNome: 'Base',
        segmento: 'Geral',
      };

      const { error: scError } = await supabase
        .from('system_config')
        .upsert({
          key,
          value: JSON.stringify(configValue),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (scError) {
        console.error(`   ⚠️  system_config: ${scError.message}`);
        errors.push({ template: template.name, table: 'system_config', error: scError.message });
      } else {
        systemConfigInserted++;
        console.log(`   ✅ system_config inserido (${key})`);
      }
    } catch (err) {
      console.error(`   ❌ system_config: ${err.message}`);
      errors.push({ template: template.name, table: 'system_config', error: err.message });
    }

    console.log('');
  }

  // Resumo
  console.log('━'.repeat(60));
  console.log('✨ Inserção concluída!\n');
  console.log(`📊 Resumo:`);
  console.log(`   form_templates: ${formTemplatesInserted}/${templates.length} inseridos`);
  console.log(`   system_config:  ${systemConfigInserted}/${templates.length} inseridos`);

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} erro(s) encontrado(s):`);
    errors.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.template} [${e.table}]: ${e.error}`);
    });
  } else {
    console.log('\n🎉 Todos os templates foram inseridos sem erros!');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

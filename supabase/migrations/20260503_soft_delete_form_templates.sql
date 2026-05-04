-- Migração: Soft delete (lixeira 30 dias) para form_templates
-- Data: 2026-05-03

-- 1. Adicionar coluna deleted_at
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Índice para queries de lixeira
CREATE INDEX IF NOT EXISTS idx_form_templates_deleted_at ON form_templates(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Função de limpeza automática (chama via pg_cron ou manualmente)
CREATE OR REPLACE FUNCTION cleanup_form_templates_trash()
RETURNS void AS $$
BEGIN
  DELETE FROM form_templates
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Agendar limpeza diária via pg_cron (requer extensão pg_cron habilitada no projeto)
--    Habilitar em: Supabase Dashboard → Database → Extensions → pg_cron
--    Depois executar manualmente no SQL Editor:
--
-- SELECT cron.schedule(
--   'cleanup-templates-trash',
--   '0 3 * * *',
--   $$ SELECT cleanup_form_templates_trash(); $$
-- );

COMMENT ON COLUMN form_templates.deleted_at IS 'Soft delete: NULL = ativo, timestamp = na lixeira. Limpeza permanente após 30 dias.';

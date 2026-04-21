-- Rename legacy test key para slug organizado.
-- Chave antiga: tmpl_teste_1775869438496 (template Pacote AZV)
-- Nova: tmpl_pacote_stories_azv
-- Rodar no SQL Editor do Supabase. Idempotente — não falha se já foi renomeado.

UPDATE system_config
SET key = 'tmpl_pacote_stories_azv'
WHERE key = 'tmpl_teste_1775869438496'
  AND NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'tmpl_pacote_stories_azv');

-- Verificação:
-- SELECT key, left(value, 80) FROM system_config WHERE key LIKE 'tmpl_pacote%';

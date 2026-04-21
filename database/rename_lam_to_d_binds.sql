-- Renomeia binds legados `lam_*` para o esquema limpo `d{n}_*` usado pela QuatroDestinosForm nova.
-- Roda no SQL Editor do Supabase. Idempotente — cada UPDATE só mexe em linhas que ainda têm o prefixo antigo.
--
-- Mapping:
--   lam_titulo1           -> titulo
--   lam_titulo2           -> subtitulo
--   lam_d{n}_destino      -> d{n}_destino
--   lam_d{n}_saida        -> d{n}_saida
--   lam_d{n}_voo          -> d{n}_voo
--   lam_d{n}_ida          -> d{n}_ida
--   lam_d{n}_volta        -> d{n}_volta
--   lam_d{n}_hotel        -> d{n}_hotel
--   lam_d{n}_incluso      -> d{n}_incluso
--   lam_d{n}_parcelas     -> d{n}_parcelas
--   lam_d{n}_periodo      -> d{n}_periodo       (preservado caso template ainda use)
--   lam_d{n}_pgto         -> d{n}_formapagamento
--   lam_d{n}_valor        -> d{n}_valorparcela
--   lam_d{n}_total        -> d{n}_avista

-- ── system_config (value é text JSON) ───────────────────────────────
UPDATE system_config
SET value = regexp_replace(
  value,
  '"lam_(d[1-4]_(destino|saida|voo|ida|volta|hotel|incluso|parcelas|periodo))"',
  '"\1"',
  'g'
)
WHERE key LIKE 'tmpl_%' AND value ~ '"lam_d[1-4]_';

UPDATE system_config SET value = regexp_replace(value, '"lam_(d[1-4])_pgto"',  '"\1_formapagamento"', 'g') WHERE key LIKE 'tmpl_%' AND value ~ '"lam_d[1-4]_pgto"';
UPDATE system_config SET value = regexp_replace(value, '"lam_(d[1-4])_valor"', '"\1_valorparcela"',   'g') WHERE key LIKE 'tmpl_%' AND value ~ '"lam_d[1-4]_valor"';
UPDATE system_config SET value = regexp_replace(value, '"lam_(d[1-4])_total"', '"\1_avista"',         'g') WHERE key LIKE 'tmpl_%' AND value ~ '"lam_d[1-4]_total"';

UPDATE system_config SET value = replace(value, '"lam_titulo1"', '"titulo"')    WHERE key LIKE 'tmpl_%' AND value ~ '"lam_titulo1"';
UPDATE system_config SET value = replace(value, '"lam_titulo2"', '"subtitulo"') WHERE key LIKE 'tmpl_%' AND value ~ '"lam_titulo2"';

-- ── form_templates (schema é jsonb → cast p/ text, replace, cast de volta) ──
UPDATE form_templates
SET schema = regexp_replace(
  schema::text,
  '"lam_(d[1-4]_(destino|saida|voo|ida|volta|hotel|incluso|parcelas|periodo))"',
  '"\1"',
  'g'
)::jsonb
WHERE schema::text ~ '"lam_d[1-4]_';

UPDATE form_templates SET schema = regexp_replace(schema::text, '"lam_(d[1-4])_pgto"',  '"\1_formapagamento"', 'g')::jsonb WHERE schema::text ~ '"lam_d[1-4]_pgto"';
UPDATE form_templates SET schema = regexp_replace(schema::text, '"lam_(d[1-4])_valor"', '"\1_valorparcela"',   'g')::jsonb WHERE schema::text ~ '"lam_d[1-4]_valor"';
UPDATE form_templates SET schema = regexp_replace(schema::text, '"lam_(d[1-4])_total"', '"\1_avista"',         'g')::jsonb WHERE schema::text ~ '"lam_d[1-4]_total"';

UPDATE form_templates SET schema = replace(schema::text, '"lam_titulo1"', '"titulo"')::jsonb    WHERE schema::text ~ '"lam_titulo1"';
UPDATE form_templates SET schema = replace(schema::text, '"lam_titulo2"', '"subtitulo"')::jsonb WHERE schema::text ~ '"lam_titulo2"';

-- Verificação:
-- SELECT key FROM system_config WHERE key LIKE 'tmpl_%' AND value ~ '"lam_';
-- SELECT id, name FROM form_templates WHERE schema::text ~ '"lam_';
-- Ambas devem retornar 0 linhas depois do migration.

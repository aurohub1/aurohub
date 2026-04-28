-- ═══════════════════════════════════════════════════════════════════════════════
-- Query para extrair binds de templates de cruzeiro do Aurohub v1
-- Rode no Supabase SQL Editor: https://supabase.com/dashboard/project/hiawjrfdotlpssypbcjd/editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Ver estrutura da tabela templates (para saber os campos disponíveis)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'templates'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver um template de exemplo (para entender a estrutura do schema)
SELECT
  id,
  nome,
  tipo,
  "formType",
  categoria,
  formato,
  schema::text AS schema_json
FROM templates
LIMIT 1;

-- 3. Buscar templates de cruzeiro (testar várias colunas possíveis)
SELECT
  id,
  nome,
  COALESCE(tipo, "formType", categoria) AS tipo_template,
  schema::text AS schema_json
FROM templates
WHERE
  tipo = 'cruzeiro'
  OR "formType" = 'cruzeiro'
  OR categoria = 'cruzeiro'
  OR nome ILIKE '%cruzeiro%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Extrair TODOS os bindParams de templates de cruzeiro
-- (necessita que o schema seja JSONB - ajustar se for TEXT)
WITH cruzeiro_templates AS (
  SELECT
    id,
    nome,
    schema
  FROM templates
  WHERE
    tipo = 'cruzeiro'
    OR "formType" = 'cruzeiro'
    OR categoria = 'cruzeiro'
    OR nome ILIKE '%cruzeiro%'
  LIMIT 20
),
elements_with_bind AS (
  SELECT
    t.id AS template_id,
    t.nome AS template_nome,
    elem->>'bindParam' AS bind_param,
    elem->>'name' AS element_name,
    elem->>'type' AS element_type
  FROM cruzeiro_templates t,
  jsonb_array_elements(t.schema->'elements') AS elem
  WHERE elem->>'bindParam' IS NOT NULL
)
SELECT
  bind_param,
  COUNT(*) AS qtd_uso,
  string_agg(DISTINCT element_type, ', ') AS tipos,
  string_agg(DISTINCT element_name, ', ') AS labels,
  string_agg(DISTINCT template_nome, ' | ') AS templates
FROM elements_with_bind
GROUP BY bind_param
ORDER BY bind_param;

-- 5. Se o schema for TEXT (não JSONB), use esta query alternativa:
/*
SELECT
  id,
  nome,
  schema::text
FROM templates
WHERE
  tipo = 'cruzeiro'
  OR "formType" = 'cruzeiro'
LIMIT 5;

-- Depois copie o JSON do campo schema e analise manualmente
-- ou cole em https://jsoncrack.com/editor para visualizar
*/

-- ══════════════════════════════════════════════════════════════
-- Adiciona coluna tour_pages à tabela profiles
-- ══════════════════════════════════════════════════════════════
-- Armazena as páginas onde o usuário já completou o tour guiado
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tour_pages text[] DEFAULT '{}';

COMMENT ON COLUMN profiles.tour_pages IS 'Páginas onde o usuário já completou o tour guiado (ex: ["adm-metricas", "cliente-publicar"])';

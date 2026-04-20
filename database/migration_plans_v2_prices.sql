-- Migration v2: preços definitivos do Aurohub v2.
-- - Adiciona plans.max_stores (limite de perfis Instagram por licensee)
-- - Atualiza 4 planos comerciais (basic/pro/business/enterprise); plano `interno` não é tocado
-- - Atualiza addon Vitrine → Card WhatsApp + insere 13 addons novos (idempotente via slug)
--
-- Rode este arquivo no Supabase SQL Editor uma vez.

BEGIN;

-- ── plans.max_stores ─────────────────────────────────
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_stores integer NOT NULL DEFAULT 1;

-- ── UPDATE plans ────────────────────────────────────
UPDATE plans SET
  name = 'Essencial',
  price_monthly = 397,
  price_setup = 2500,
  max_feed_reels_day = 2,
  max_stories_day = 5,
  max_users = 1,
  max_stores = 1,
  min_months = 6
WHERE slug = 'basic';

UPDATE plans SET
  name = 'Profissional',
  price_monthly = 997,
  price_setup = 3500,
  max_feed_reels_day = 5,
  max_stories_day = 10,
  max_users = 2,
  max_stores = 1,
  min_months = 12
WHERE slug = 'pro';

UPDATE plans SET
  name = 'Franquia',
  price_monthly = 1797,
  price_setup = 6500,
  max_feed_reels_day = 20,
  max_stories_day = 15,
  max_users = 6,
  max_stores = 3,
  min_months = 12
WHERE slug = 'business';

UPDATE plans SET
  name = 'Enterprise',
  price_monthly = NULL,
  price_setup = NULL,
  max_feed_reels_day = NULL,
  max_stories_day = NULL,
  max_users = NULL,
  max_stores = 50,
  min_months = 12
WHERE slug = 'enterprise';

-- ── ADDONS ──────────────────────────────────────────
-- Vitrine → Card WhatsApp
UPDATE addons SET
  nome = 'Card WhatsApp',
  slug = 'card_whatsapp',
  descricao = 'Card de divulgação otimizado para WhatsApp',
  preco_individual = 49,
  preco_time = NULL,
  preco_rede = NULL,
  impl_avulso = 0,
  ativo = true
WHERE slug = 'vitrine';

-- 13 addons novos (ON CONFLICT DO UPDATE — idempotente)
INSERT INTO addons (slug, nome, descricao, preco_individual, preco_time, preco_rede, impl_avulso, ativo)
VALUES
  ('tv',                     'TV',                     'Publicação em formato TV horizontal',           49,   NULL, NULL, 0, true),
  ('ia_legenda',             'IA de Legenda',          'Geração de legendas por IA',                   120,  NULL, NULL, 0, true),
  ('agendamento',            'Agendamento',            'Agendamento de posts no Instagram',             99,   NULL, NULL, 0, true),
  ('metricas',               'Métricas',               'Métricas do Instagram por perfil',              79,   NULL, NULL, 0, true),
  ('stories_plus',           'Stories+',               'Stories adicionais/dia',                        49,   NULL, NULL, 0, true),
  ('perfil_1_3',             'Perfil (1-3)',           'Perfil Instagram adicional — faixa 1-3',       147,  NULL, NULL, 0, true),
  ('perfil_4_9',             'Perfil (4-9)',           'Perfil Instagram adicional — faixa 4-9',       127,  NULL, NULL, 0, true),
  ('perfil_10_plus',         'Perfil (10+)',           'Perfil Instagram adicional — faixa 10+',        97,   NULL, NULL, 0, true),
  ('usuario_extra',          'Usuário Extra',          'Login adicional no painel',                     29,   NULL, NULL, 0, true),
  ('transmissao_individual', 'Transmissão Individual', '1 consultor',                                   29,   NULL, NULL, 0, true),
  ('transmissao_time',       'Transmissão Time',       'Até 10 consultores',                           199,  NULL, NULL, 0, true),
  ('transmissao_rede',       'Transmissão Rede',       'Até 30 consultores',                           449,  NULL, NULL, 0, true),
  ('manutencao',             'Manutenção',             'Pacote mensal de manutenção/ajustes',          197,  NULL, NULL, 0, true)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco_individual = EXCLUDED.preco_individual,
  preco_time = EXCLUDED.preco_time,
  preco_rede = EXCLUDED.preco_rede,
  impl_avulso = EXCLUDED.impl_avulso,
  ativo = EXCLUDED.ativo;

COMMIT;

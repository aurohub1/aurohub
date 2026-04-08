-- Migration: planos v1 → v2 (campos adicionais)
-- Executar no Supabase SQL Editor

ALTER TABLE planos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS preco_implantacao INTEGER;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS fidelidade TEXT;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS max_feed_reels_dia INTEGER DEFAULT 0;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS max_stories_dia INTEGER DEFAULT 0;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS transmissao TEXT DEFAULT '—';
ALTER TABLE planos ADD COLUMN IF NOT EXISTS can_metrics BOOLEAN DEFAULT false;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS can_ia_legenda BOOLEAN DEFAULT false;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS vendas_ativas BOOLEAN DEFAULT true;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS mostrar_bloqueado BOOLEAN DEFAULT false;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS is_enterprise BOOLEAN DEFAULT false;
ALTER TABLE planos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Migrar dados existentes: limite_posts → max_feed_reels_dia, limite_stories → max_stories_dia
UPDATE planos SET max_feed_reels_dia = limite_posts WHERE max_feed_reels_dia = 0 AND limite_posts > 0;
UPDATE planos SET max_stories_dia = limite_stories WHERE max_stories_dia = 0 AND limite_stories > 0;

-- Migrar inclui_transmissao → transmissao text
UPDATE planos SET transmissao = 'Incluso' WHERE inclui_transmissao = true AND transmissao = '—';

-- Migrar inclui_agendamento → can_schedule (renomear conceito)
-- inclui_agendamento já existe, vamos mantê-lo como can_schedule
-- Não precisa de coluna nova, usaremos inclui_agendamento como equivalente

-- Defaults de sort_order
UPDATE planos SET sort_order = 1 WHERE slug = 'essencial';
UPDATE planos SET sort_order = 2 WHERE slug = 'profissional';
UPDATE planos SET sort_order = 3 WHERE slug = 'franquia';
UPDATE planos SET sort_order = 4 WHERE slug = 'enterprise';

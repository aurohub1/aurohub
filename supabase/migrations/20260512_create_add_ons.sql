-- Tabela de add-ons disponíveis na plataforma
CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) DEFAULT 0,
  type text DEFAULT 'monthly', -- 'monthly' | 'one_time'
  limit_per_month int DEFAULT -1, -- -1 = ilimitado
  available_from_plan text DEFAULT 'essencial',
  included_in_plans text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO add_ons (slug, name, description, price_monthly, type, limit_per_month, available_from_plan, included_in_plans, sort_order) VALUES
('card_whatsapp', 'Card WhatsApp', 'Arte exclusiva para atendimento no WhatsApp', 49, 'monthly', -1, 'essencial', '{}', 1),
('tv', 'TV', 'Arte para televisão na agência', 49, 'monthly', -1, 'essencial', '{}', 2),
('ia_legenda', 'IA de legenda', 'Geração automática de copy com IA', 120, 'monthly', -1, 'essencial', '{"franquia","enterprise"}', 3),
('agenda', 'Agenda', 'Calendário de publicação avançado', 99, 'monthly', -1, 'essencial', '{"franquia","enterprise"}', 4),
('metricas', 'Métricas Instagram', 'Dashboard de desempenho do Instagram', 79, 'monthly', -1, 'essencial', '{"franquia","enterprise"}', 5),
('roteiro', 'AuroRoteiro', 'Roteiro de viagem completo para o cliente final', 159, 'monthly', 20, 'essencial', '{}', 6),
('transmissao_ind', 'Transmissão Individual', 'Transmissão de tela para 1 consultor', 29, 'monthly', -1, 'essencial', '{}', 7),
('transmissao_time', 'Transmissão Time', 'Transmissão de tela para até 10 consultores', 199, 'monthly', -1, 'essencial', '{}', 8),
('transmissao_rede', 'Transmissão Rede', 'Transmissão de tela para até 30 consultores', 449, 'monthly', -1, 'essencial', '{}', 9),
('novo_template', 'Novo Template', 'Criação de template personalizado com sua marca', 0, 'one_time', -1, 'essencial', '{}', 10),
('badge_design', 'Badge / Design', 'Criação de badge ou peça de design avulsa', 0, 'one_time', -1, 'essencial', '{}', 11)
ON CONFLICT (slug) DO NOTHING;

-- Coluna de overrides de preço de add-on por plano
ALTER TABLE plans ADD COLUMN IF NOT EXISTS addon_price_overrides jsonb DEFAULT '{}';

-- Tabela de configurações do sistema (chave-valor)
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Valores iniciais
INSERT INTO system_config (key, value) VALUES
  ('platform_name', 'Aurohub'),
  ('base_url', 'https://aurohub.vercel.app'),
  ('logo_url', ''),
  ('support_email', 'suporte@aurovista.com.br'),
  ('support_phone', '(17) 99999-0000'),
  ('timezone', 'America/Sao_Paulo'),
  ('session_hours', '24'),
  ('allow_self_signup', 'false'),
  ('require_email_confirm', 'true'),
  ('mp_public_key', ''),
  ('mp_access_token', ''),
  ('resend_api_key', ''),
  ('resend_domain', ''),
  ('default_posts_day', '5'),
  ('default_stories_day', '5'),
  ('max_stores_per_licensee', '10'),
  ('max_users_per_store', '5'),
  ('maintenance_mode', 'false'),
  ('sales_active', 'true')
ON CONFLICT (key) DO NOTHING;

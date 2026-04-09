-- Adiciona campo de avatar nos perfis de usuários
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Adiciona campo de logo nos licenciados/clientes
ALTER TABLE licensees ADD COLUMN IF NOT EXISTS logo_url text;

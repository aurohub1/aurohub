-- =============================================
-- AUROHUB v2 — Schema Supabase
-- =============================================

-- Marcas (licenciados)
CREATE TABLE IF NOT EXISTS marcas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#D4A843',
  cor_secundaria TEXT DEFAULT '#FF7A1A',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lojas
CREATE TABLE IF NOT EXISTS lojas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca_id UUID REFERENCES marcas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  ig_user_id TEXT,
  ig_access_token TEXT,
  ig_token_expires_at TIMESTAMPTZ,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuários (hierarquia: adm > licenciado > loja > cliente)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('adm', 'licenciado', 'loja', 'cliente')),
  marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
  loja_id UUID REFERENCES lojas(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  plano TEXT,
  ia_premium BOOLEAN DEFAULT false,
  pagina_destino TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo_form TEXT NOT NULL CHECK (tipo_form IN ('pacote', 'campanha', 'cruzeiro', 'anoiteceu')),
  formato TEXT NOT NULL CHECK (formato IN ('stories', 'feed', 'reels', 'transmissao')),
  largura INTEGER NOT NULL DEFAULT 1080,
  altura INTEGER NOT NULL DEFAULT 1920,
  schema_json JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  ativo BOOLEAN DEFAULT true,
  permite_postagem BOOLEAN DEFAULT true,
  apenas_download BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Controle granular: acesso template por usuário
CREATE TABLE IF NOT EXISTS templates_acesso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
  liberado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, usuario_id),
  UNIQUE(template_id, loja_id)
);

-- Postagens
CREATE TABLE IF NOT EXISTS postagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  loja_id UUID REFERENCES lojas(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  imagem_url TEXT NOT NULL,
  legenda TEXT DEFAULT '',
  formato TEXT NOT NULL,
  ig_media_id TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'publicado', 'erro')),
  agendado_para TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  erro_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Planos
CREATE TABLE IF NOT EXISTS planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  preco_mensal INTEGER NOT NULL,
  preco_anual INTEGER,
  preco_implantacao INTEGER,
  fidelidade TEXT,
  limite_lojas INTEGER DEFAULT 1,
  limite_usuarios INTEGER DEFAULT 5,
  limite_posts INTEGER DEFAULT 30,
  limite_stories INTEGER DEFAULT 60,
  max_feed_reels_dia INTEGER DEFAULT 0,
  max_stories_dia INTEGER DEFAULT 0,
  transmissao TEXT DEFAULT '—',
  inclui_transmissao BOOLEAN DEFAULT false,
  inclui_agendamento BOOLEAN DEFAULT true,
  can_metrics BOOLEAN DEFAULT false,
  can_ia_legenda BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  vendas_ativas BOOLEAN DEFAULT true,
  mostrar_bloqueado BOOLEAN DEFAULT false,
  is_enterprise BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Packs de créditos (90 dias)
CREATE TABLE IF NOT EXISTS packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pack10', 'pack30', 'pack60')),
  creditos_total INTEGER NOT NULL,
  creditos_usados INTEGER DEFAULT 0,
  validade TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de atividades
CREATE TABLE IF NOT EXISTS log_atividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  loja_id UUID REFERENCES lojas(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  formato TEXT,
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add-ons (Vitrine, etc.)
CREATE TABLE IF NOT EXISTS addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  preco_individual INTEGER,
  preco_time INTEGER,
  preco_rede INTEGER,
  impl_avulso INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assinaturas de add-ons por loja
CREATE TABLE IF NOT EXISTS addons_assinaturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IN ('individual', 'time', 'rede')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_usuarios_marca ON usuarios(marca_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_loja ON usuarios(loja_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_lojas_marca ON lojas(marca_id);
CREATE INDEX IF NOT EXISTS idx_templates_marca ON templates(marca_id);
CREATE INDEX IF NOT EXISTS idx_postagens_usuario ON postagens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_postagens_loja ON postagens(loja_id);
CREATE INDEX IF NOT EXISTS idx_postagens_status ON postagens(status);
CREATE INDEX IF NOT EXISTS idx_log_usuario ON log_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_packs_usuario ON packs(usuario_id);

-- ===== SEED: Planos padrão =====
INSERT INTO planos (nome, slug, preco_mensal, preco_anual, limite_lojas, limite_usuarios, limite_posts, limite_stories, inclui_transmissao, inclui_agendamento)
VALUES
  ('Essencial', 'essencial', 297, 2851, 1, 5, 30, 60, false, true),
  ('Profissional', 'profissional', 597, 5731, 3, 15, 60, 120, false, true),
  ('Franquia/Rede', 'franquia', 997, 9571, 10, 50, 120, 240, true, true),
  ('Enterprise', 'enterprise', 0, 0, 9999, 9999, 9999, 9999, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ===== SEED: Vitrine add-on =====
INSERT INTO addons (nome, slug, descricao, preco_individual, preco_time, preco_rede, impl_avulso)
VALUES
  ('Vitrine', 'vitrine', 'Lâmina 4 destinos com paletas de cores e IA', 29, 199, 449, 0)
ON CONFLICT (slug) DO NOTHING;

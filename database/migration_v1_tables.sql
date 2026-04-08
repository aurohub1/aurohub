-- =============================================
-- Migration: Tabelas v1 faltantes no v2
-- Executar no Supabase SQL Editor
-- =============================================

-- ===== MARCAS: campos adicionais do v1 =====
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS segmento_id UUID;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS cloudinary_folder TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS contato_nome TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS contato_email TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS contato_telefone TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'essencial';
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS valor_mensalidade NUMERIC(10,2);
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS mp_sub_id TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT false;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS checklist_implantacao JSONB DEFAULT '{"materiais":false,"templates":false,"instagram":false,"treinamento":false}';
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS templates_liberados BOOLEAN DEFAULT false;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS forms JSONB DEFAULT '[]';
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS ig_token TEXT;
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS ig_user_id TEXT;

-- ===== LOJAS: campos adicionais =====
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS ig_username TEXT;

-- ===== USUARIOS: campos adicionais do v1 =====
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS lojas_permitidas JSONB DEFAULT '[]';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS forms_ativos JSONB DEFAULT '[]';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissao_rp_full BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acesso_ia BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acesso_metricas BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acesso_transmissao BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_avulso BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS limite_stories_dia INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS limite_reels_dia INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS limite_feed_dia INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS limite_carousel_dia INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS limite_lives_dia INTEGER DEFAULT 0;

-- ===== TEMPLATES: tipo_form passagem e lamina =====
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_tipo_form_check;
ALTER TABLE templates ADD CONSTRAINT templates_tipo_form_check
  CHECK (tipo_form IN ('pacote', 'campanha', 'cruzeiro', 'anoiteceu', 'passagem', 'lamina'));

-- ===== SEGMENTOS =====
CREATE TABLE IF NOT EXISTS segmentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT DEFAULT '🏢',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK marcas → segmentos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'marcas_segmento_id_fkey') THEN
    ALTER TABLE marcas ADD CONSTRAINT marcas_segmento_id_fkey FOREIGN KEY (segmento_id) REFERENCES segmentos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== IG_TOKENS (tokens Instagram por loja) =====
CREATE TABLE IF NOT EXISTS ig_tokens (
  id BIGSERIAL PRIMARY KEY,
  loja TEXT UNIQUE NOT NULL,
  ig_user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  auto_renewed BOOLEAN DEFAULT null,
  last_renewal TIMESTAMPTZ DEFAULT null,
  renewal_error TEXT DEFAULT null,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== IG_METRICS_CACHE =====
CREATE TABLE IF NOT EXISTS ig_metrics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
  loja TEXT,
  followers INTEGER DEFAULT 0,
  impressions_30d INTEGER DEFAULT 0,
  reach_30d INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  posts_data JSONB DEFAULT '[]',
  peak_hours JSONB DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(loja_id)
);

-- ===== AGENDAMENTOS =====
CREATE TABLE IF NOT EXISTS agendamentos (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  usuario TEXT NOT NULL,
  loja TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  legenda TEXT,
  formato TEXT DEFAULT 'stories',
  media_type TEXT DEFAULT 'image',
  agendar_em TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendente',
  erro TEXT,
  media_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_agendar_em ON agendamentos(agendar_em);

-- ===== LEADS (CRM) =====
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT,
  telefone TEXT,
  servico TEXT,
  origem TEXT,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'cliente', 'descartado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== LEAD_INTERACTIONS =====
CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  resumo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== NOTIFICACOES =====
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario TEXT,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  tipo TEXT DEFAULT 'info',
  lida BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CONFIG_LANDING =====
CREATE TABLE IF NOT EXISTS config_landing (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ONBOARDING_LEADS =====
CREATE TABLE IF NOT EXISTS onboarding_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa TEXT,
  segmento TEXT,
  plano TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_tel TEXT,
  lojas JSONB DEFAULT '[]',
  instagram_urls JSONB DEFAULT '[]',
  addon_ia BOOLEAN DEFAULT false,
  addon_vitrine BOOLEAN DEFAULT false,
  users_extras INTEGER DEFAULT 0,
  lojas_extras INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_pagamento',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  valor_total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== PAGAMENTOS =====
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
  tipo TEXT DEFAULT 'implantacao',
  status TEXT DEFAULT 'pendente',
  valor NUMERIC(10,2),
  mp_payment_id TEXT,
  mp_sub_id TEXT,
  raw_webhook JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== USUARIOS_ONLINE =====
CREATE TABLE IF NOT EXISTS usuarios_online (
  nome TEXT PRIMARY KEY,
  loja TEXT,
  pagina TEXT,
  ultimo_ping TIMESTAMPTZ DEFAULT now()
);

-- ===== ADM_PREFERENCES =====
CREATE TABLE IF NOT EXISTS adm_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL UNIQUE,
  favoritos JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== FAQ_SUPORTE =====
CREATE TABLE IF NOT EXISTS faq_suporte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icone TEXT DEFAULT '💬',
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== SUPORTE_CONFIG =====
CREATE TABLE IF NOT EXISTS suporte_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== MARCA_FORMS (configuração de formulários por marca) =====
CREATE TABLE IF NOT EXISTS marca_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  form_slug TEXT NOT NULL,
  form_label TEXT NOT NULL,
  bind_params JSONB,
  param_labels JSONB,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(marca_id, form_slug)
);

-- ===== TABELAS DE REFERÊNCIA (imagens, badges, etc.) =====

CREATE TABLE IF NOT EXISTS imgfundo (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imghotel (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imgcruise (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  cia TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS icocruise (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imgaviao (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feriados (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  loja TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS textos_visuais (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  texto TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simbol (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== INDEXES ADICIONAIS =====
CREATE INDEX IF NOT EXISTS idx_marcas_segmento ON marcas(segmento_id);
CREATE INDEX IF NOT EXISTS idx_marcas_status ON marcas(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_ig_tokens_loja ON ig_tokens(loja);
CREATE INDEX IF NOT EXISTS idx_imgfundo_nome ON imgfundo(nome);
CREATE INDEX IF NOT EXISTS idx_imghotel_nome ON imghotel(nome);
CREATE INDEX IF NOT EXISTS idx_imgcruise_nome ON imgcruise(nome);

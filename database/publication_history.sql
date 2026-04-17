-- publication_history — registro de publicações IG e downloads
-- Usado pelas páginas /metricas (role-scoped) e /adm/metricas.

CREATE TABLE IF NOT EXISTS publication_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  licensee_id text NOT NULL,
  loja_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,                               -- 'gerente' | 'consultor' | 'unidade'
  template_id text NOT NULL,
  template_nome text,
  formato text NOT NULL,                        -- 'stories' | 'reels' | 'feed' | 'tv'
  tipo text NOT NULL,                           -- 'publicado' | 'download'
  destino text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publication_history_licensee ON publication_history (licensee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_history_user ON publication_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_history_tipo ON publication_history (tipo, created_at DESC);

ALTER TABLE publication_history ENABLE ROW LEVEL SECURITY;

-- Usuário vê os próprios registros
DROP POLICY IF EXISTS "user sees own" ON publication_history;
CREATE POLICY "user sees own" ON publication_history FOR SELECT
  USING (user_id = auth.uid());

-- ADM vê tudo
DROP POLICY IF EXISTS "adm sees all" ON publication_history;
CREATE POLICY "adm sees all" ON publication_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'adm'));

-- Inserir é sempre na própria identidade
DROP POLICY IF EXISTS "insert own" ON publication_history;
CREATE POLICY "insert own" ON publication_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

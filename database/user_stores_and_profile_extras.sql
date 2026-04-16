-- Migration: user_stores para múltiplas lojas por usuário
-- + colunas landing e plan_override em profiles

CREATE TABLE IF NOT EXISTS user_stores (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stores_user ON user_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stores_store ON user_stores(store_id);

-- RLS permissiva (admin via service role)
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_user_stores" ON user_stores FOR ALL USING (true);

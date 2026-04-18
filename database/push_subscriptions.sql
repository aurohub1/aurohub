-- Web Push subscriptions — guarda inscrições por usuário/device
-- Idempotente: pode rodar múltiplas vezes.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,           -- URL do push service (FCM, Mozilla, etc)
  p256dh text NOT NULL,                    -- chave pública do device
  auth text NOT NULL,                      -- auth secret do device
  user_agent text,                         -- ajuda a debugar device específico
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_push_subs" ON push_subscriptions;
CREATE POLICY "users_own_push_subs" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "adm_all_push_subs" ON push_subscriptions;
CREATE POLICY "adm_all_push_subs" ON push_subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('adm','operador')));

-- Service role (API routes) usa key bypass, então não precisa policy extra.

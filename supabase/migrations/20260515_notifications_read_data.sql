-- Adiciona colunas faltantes na tabela notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data JSONB;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_select" ON public.notifications;
CREATE POLICY "notifications_user_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Service role pode inserir (para o /api/push/send)
DROP POLICY IF EXISTS "notifications_service_insert" ON public.notifications;
CREATE POLICY "notifications_service_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

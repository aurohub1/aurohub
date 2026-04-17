-- Support system v2 — chatbot + human escalation + notifications
-- Idempotente: pode rodar múltiplas vezes. Preserva dados existentes.

-- ── support_tickets ─────────────────────────────────────────────
-- Se a tabela já existe (schema antigo), só adiciona os campos novos.
-- Se não existe (deploy limpo), cria do zero com o schema novo.
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  licensee_id uuid,
  status text DEFAULT 'bot' CHECK (status IN ('bot', 'human', 'resolved')),
  unread_adm boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS unread_adm boolean DEFAULT true;
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── support_messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender text CHECK (sender IN ('user', 'bot', 'human')),
  sender_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Índices ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_unread ON support_tickets(unread_adm) WHERE unread_adm = true;
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated ON support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Remove policy permissiva antiga (se existir) pra não vazar acesso
DROP POLICY IF EXISTS "tickets_all" ON support_tickets;
DROP POLICY IF EXISTS "ticket_messages_all" ON support_messages;

-- Tickets: dono do ticket vê o próprio
DROP POLICY IF EXISTS "users_own_tickets" ON support_tickets;
CREATE POLICY "users_own_tickets" ON support_tickets FOR ALL USING (auth.uid() = user_id);

-- Tickets: ADM e operador veem tudo
DROP POLICY IF EXISTS "adm_all_tickets" ON support_tickets;
CREATE POLICY "adm_all_tickets" ON support_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('adm','operador')));

-- Messages: dono do ticket pai vê as mensagens
DROP POLICY IF EXISTS "users_own_messages" ON support_messages;
CREATE POLICY "users_own_messages" ON support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()));

-- Messages: ADM e operador veem tudo
DROP POLICY IF EXISTS "adm_all_messages" ON support_messages;
CREATE POLICY "adm_all_messages" ON support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('adm','operador')));

-- ── Nota operacional ──────────────────────────────────────────
-- Supabase Realtime: habilitar replication no dashboard
-- (Database → Replication) para ambas as tabelas support_tickets e support_messages.
-- Sem isso, o AdminSupportBadge e o SupportChat não recebem eventos em tempo real.

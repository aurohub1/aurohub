-- Migration: adiciona user_id e licensee_id aos tickets de suporte
-- e user_id/user_name/user_role às mensagens

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS licensee_id uuid;

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_role text;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_licensee ON support_tickets(licensee_id);

-- ============================================================
-- AUROHUB — FAQ Articles + Support Tickets
-- ============================================================

-- Artigos da base de conhecimento
CREATE TABLE IF NOT EXISTS faq_articles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  category    text NOT NULL DEFAULT 'geral',
  content     text NOT NULL DEFAULT '',
  tags        text,
  status      text NOT NULL DEFAULT 'draft',
  views       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tickets de suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name   text NOT NULL,
  client_email  text,
  subject       text NOT NULL,
  category      text DEFAULT 'geral',
  priority      text DEFAULT 'media',
  status        text DEFAULT 'open',
  assigned_to   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Mensagens do ticket
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender      text NOT NULL,
  is_staff    boolean DEFAULT false,
  message     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_articles_all" ON faq_articles FOR ALL USING (true);
CREATE POLICY "tickets_all" ON support_tickets FOR ALL USING (true);
CREATE POLICY "ticket_messages_all" ON ticket_messages FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_faq_articles_category ON faq_articles(category);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

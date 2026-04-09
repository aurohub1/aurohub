-- ============================================================
-- AUROHUB — Tabelas do CRM de Leads
-- ============================================================

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  company     text,
  email       text,
  phone       text,
  segment_id  uuid REFERENCES segments(id) ON DELETE SET NULL,
  plan_interest text,
  origin      text DEFAULT 'site',
  status      text DEFAULT 'new',
  priority    text DEFAULT 'media',
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Histórico de interações
CREATE TABLE IF NOT EXISTS lead_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_all" ON leads FOR ALL USING (true);
CREATE POLICY "lead_interactions_all" ON lead_interactions FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON lead_interactions(lead_id);

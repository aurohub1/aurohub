-- Create franquias table
CREATE TABLE IF NOT EXISTS franquias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add franquia_id to licensees
ALTER TABLE licensees ADD COLUMN IF NOT EXISTS franquia_id UUID REFERENCES franquias(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE franquias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adm_all_franquias" ON franquias;
CREATE POLICY "adm_all_franquias" ON franquias
  FOR ALL USING (true) WITH CHECK (true);

-- Tabela de controle de acesso a templates
-- Permite compartilhar templates com múltiplos licensees sem duplicação
-- Suporta acesso granular por loja (store_id)

CREATE TABLE IF NOT EXISTS template_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  licensee_id uuid NOT NULL REFERENCES licensees(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_key, licensee_id, store_id)
);

CREATE INDEX idx_template_access_key ON template_access(template_key);
CREATE INDEX idx_template_access_licensee ON template_access(licensee_id);
CREATE INDEX idx_template_access_store ON template_access(store_id);

-- RLS
ALTER TABLE template_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ADM full access" ON template_access
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'adm'));

CREATE POLICY "Licensee read own" ON template_access
  FOR SELECT TO authenticated
  USING (
    licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid())
    AND (store_id IS NULL OR store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()))
  );

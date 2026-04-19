-- Migração: cria tabela form_templates (templates de formulário com schema Konva).
-- Substitui o armazenamento antigo em system_config (chaves tmpl_*).
-- is_base = true → template base visível para todos os licensees.
-- licensee_id != null → template privado do cliente.

CREATE TABLE form_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  form_type text NOT NULL,
  format text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  schema jsonb NOT NULL DEFAULT '{"elements":[]}'::jsonb,
  is_base boolean NOT NULL DEFAULT false,
  licensee_id uuid REFERENCES licensees(id) ON DELETE CASCADE,
  thumbnail_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON form_templates(licensee_id);
CREATE INDEX ON form_templates(form_type, format);
CREATE INDEX ON form_templates(is_base) WHERE is_base = true;

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ADM full access" ON form_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'adm'));

CREATE POLICY "Licensee read own + base" ON form_templates
  FOR SELECT TO authenticated
  USING (is_base = true OR licensee_id = (
    SELECT licensee_id FROM profiles WHERE id = auth.uid()
  ));

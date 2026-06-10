CREATE TABLE IF NOT EXISTS imgfundo_hrz (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE imgfundo_hrz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON imgfundo_hrz FOR SELECT USING (true);

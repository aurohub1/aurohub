-- Garante que a tabela existe com a estrutura base
CREATE TABLE IF NOT EXISTS public.template_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT        NOT NULL,
  schema      JSONB       NOT NULL,
  saved_by    UUID,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_template_history_template_id
  ON public.template_history (template_id, saved_at DESC);

ALTER TABLE public.template_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ADM acesso total" ON public.template_history;
CREATE POLICY "ADM acesso total" ON public.template_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adiciona colunas que podem não existir na tabela legada
ALTER TABLE public.template_history ADD COLUMN IF NOT EXISTS saved_by UUID;
ALTER TABLE public.template_history ADD COLUMN IF NOT EXISTS note     TEXT;
ALTER TABLE public.template_history ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

-- Preenche saved_at a partir de created_at para linhas legadas
UPDATE public.template_history SET saved_at = created_at WHERE saved_at IS NULL;

-- Agora torna saved_at NOT NULL com default
ALTER TABLE public.template_history
  ALTER COLUMN saved_at SET DEFAULT NOW(),
  ALTER COLUMN saved_at SET NOT NULL;

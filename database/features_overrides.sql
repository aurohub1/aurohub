-- Licensee feature overrides
-- Permite que o ADM habilite/desabilite features específicas para um licenciado,
-- sobrescrevendo o padrão vindo do plano contratado.

CREATE TABLE IF NOT EXISTS public.licensee_feature_overrides (
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  feature     text NOT NULL,
  enabled     boolean NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (licensee_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_licensee
  ON public.licensee_feature_overrides (licensee_id);

-- Features válidas (validação no backend/app; o banco aceita qualquer string):
--   publicar, metricas, ia_legenda, agendamento,
--   templates, unidades, usuarios, vendedores,
--   calendario, lembretes

ALTER TABLE public.licensee_feature_overrides ENABLE ROW LEVEL SECURITY;

-- ADM raiz lê e escreve tudo
DROP POLICY IF EXISTS feature_overrides_adm_all ON public.licensee_feature_overrides;
CREATE POLICY feature_overrides_adm_all ON public.licensee_feature_overrides
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'adm')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'adm')
  );

-- Usuários do licensee podem ler suas próprias overrides
DROP POLICY IF EXISTS feature_overrides_read_own ON public.licensee_feature_overrides;
CREATE POLICY feature_overrides_read_own ON public.licensee_feature_overrides
  FOR SELECT USING (
    licensee_id IN (
      SELECT licensee_id FROM public.profiles WHERE id = auth.uid()
    )
  );

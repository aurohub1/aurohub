CREATE TABLE IF NOT EXISTS public.embarques (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id     uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  store_id        uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  cliente_nome    text NOT NULL,
  cliente_contato text,
  destino         text NOT NULL,
  data_embarque   date NOT NULL,
  data_retorno    date,
  num_passageiros integer DEFAULT 1,
  tipo_pacote     text DEFAULT 'pacote',
  observacoes     text,
  arte_gerada     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.embarques DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_embarques_data ON embarques(data_embarque);
CREATE INDEX IF NOT EXISTS idx_embarques_licensee ON embarques(licensee_id);

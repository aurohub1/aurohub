-- Migração: Sistema de lembretes com visibilidade por loja
-- Data: 2026-04-25

-- Criar tabela lembretes
CREATE TABLE IF NOT EXISTS lembretes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  licensee_id uuid REFERENCES licensees(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  data_iso text NOT NULL,
  texto text NOT NULL,
  visibilidade text DEFAULT 'loja' CHECK (visibilidade IN ('loja', 'todas')),
  feito boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lembretes_licensee ON lembretes(licensee_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_store ON lembretes(store_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_data ON lembretes(data_iso);

-- Habilitar RLS
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem lembretes do seu licensee
CREATE POLICY lembretes_licensee ON lembretes
FOR ALL
USING (licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid()));

-- Policy adicional: usuários só veem lembretes das lojas que têm acesso
-- (via user_stores ou sua própria store_id no profile)
CREATE POLICY lembretes_store_access ON lembretes
FOR ALL
USING (
  -- Se visibilidade = 'todas', qualquer user do licensee vê
  (visibilidade = 'todas' AND licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid()))
  OR
  -- Se visibilidade = 'loja', só vê se tiver acesso via user_stores ou se for sua store
  (
    visibilidade = 'loja' AND (
      store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid())
      OR
      store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
    )
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lembretes_updated_at
BEFORE UPDATE ON lembretes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE lembretes IS 'Lembretes de clientes com visibilidade por loja';
COMMENT ON COLUMN lembretes.visibilidade IS 'loja = visível apenas para users com acesso à loja, todas = visível para todo o licensee';
COMMENT ON COLUMN lembretes.data_iso IS 'Data do lembrete no formato YYYY-MM-DD';
COMMENT ON COLUMN lembretes.texto IS 'Texto do lembrete (cliente + nota)';

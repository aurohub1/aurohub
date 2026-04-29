-- ══════════════════════════════════════════════════════════════
-- Chat interno do Aurohub
-- ══════════════════════════════════════════════════════════════
-- Estrutura de chat para comunicação entre usuários de:
-- - Lojas (vendedores, gerentes, consultores da mesma loja)
-- - Franquias (todos os usuários do licensee)
-- ADM pode ver tudo mas não aparece como "visto" (is_adm=true)
-- ══════════════════════════════════════════════════════════════

-- ── Tabelas ─────────────────────────────────────────────────────

-- 1. Salas de chat
CREATE TABLE IF NOT EXISTS chat_rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id  uuid NOT NULL REFERENCES licensees(id) ON DELETE CASCADE,
  store_id     uuid REFERENCES stores(id) ON DELETE CASCADE, -- NULL = sala da franquia
  type         text NOT NULL CHECK (type IN ('loja', 'franquia')),
  name         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

COMMENT ON TABLE chat_rooms IS 'Salas de chat por loja ou franquia';
COMMENT ON COLUMN chat_rooms.store_id IS 'NULL para sala da franquia (todos os usuários do licensee)';
COMMENT ON COLUMN chat_rooms.type IS 'loja = chat da loja específica, franquia = todos do licensee';

-- 2. Mensagens
CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id),
  sender_name  text NOT NULL,
  content      text NOT NULL,
  media_url    text,
  media_type   text CHECK (media_type IN ('image', 'file', NULL)),
  media_name   text,
  expires_at   timestamptz, -- 30 dias após criação para mensagens com mídia
  created_at   timestamptz DEFAULT now()
);

COMMENT ON TABLE chat_messages IS 'Mensagens do chat (texto + mídia opcional)';
COMMENT ON COLUMN chat_messages.sender_name IS 'Nome do remetente no momento do envio (cache)';
COMMENT ON COLUMN chat_messages.media_url IS 'URL do Cloudinary (imagem ou arquivo)';
COMMENT ON COLUMN chat_messages.media_name IS 'Nome original do arquivo enviado';
COMMENT ON COLUMN chat_messages.expires_at IS 'Data de expiração (30 dias após criação para mensagens com mídia)';

-- 3. Controle de leitura
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id),
  last_read_at   timestamptz DEFAULT now(),
  is_adm         boolean DEFAULT false, -- ADM não aparece como "visto" para outros usuários
  UNIQUE(room_id, user_id)
);

COMMENT ON TABLE chat_read_receipts IS 'Controle de leitura das mensagens por usuário';
COMMENT ON COLUMN chat_read_receipts.is_adm IS 'ADM pode ler tudo mas não aparece como visto';
COMMENT ON COLUMN chat_read_receipts.last_read_at IS 'Timestamp da última mensagem lida pelo usuário';

-- ── Índices ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_rooms_licensee
  ON chat_rooms(licensee_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_store
  ON chat_rooms(store_id)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_room
  ON chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_expires
  ON chat_messages(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_read_receipts
  ON chat_read_receipts(room_id, user_id);

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas (se existirem)
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_read_receipts_select" ON chat_read_receipts;
DROP POLICY IF EXISTS "chat_read_receipts_upsert" ON chat_read_receipts;

-- ═══ chat_rooms ═══

-- SELECT: usuário vê salas do seu licensee; ADM vê tudo
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adm'
    OR
    licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid())
  );

-- INSERT: apenas ADM pode criar salas (via interface administrativa)
CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adm'
  );

-- ═══ chat_messages ═══

-- SELECT: usuário vê mensagens das suas salas; ADM vê tudo
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adm'
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid())
    )
  );

-- INSERT: usuário pode enviar mensagem nas salas do seu licensee
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'adm'
        OR
        chat_rooms.licensee_id = (SELECT licensee_id FROM profiles WHERE id = auth.uid())
      )
    )
    AND sender_id = auth.uid()
  );

-- ═══ chat_read_receipts ═══

-- SELECT: usuário vê apenas os próprios read_receipts; ADM vê tudo
CREATE POLICY "chat_read_receipts_select" ON chat_read_receipts
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adm'
    OR
    user_id = auth.uid()
  );

-- INSERT/UPDATE: usuário atualiza apenas os próprios read_receipts
CREATE POLICY "chat_read_receipts_upsert" ON chat_read_receipts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Triggers ────────────────────────────────────────────────────

-- Atualiza expires_at automaticamente ao inserir mensagem com mídia
CREATE OR REPLACE FUNCTION set_chat_message_expires()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_url IS NOT NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_chat_message_expires ON chat_messages;

CREATE TRIGGER trg_set_chat_message_expires
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_chat_message_expires();

COMMENT ON TRIGGER trg_set_chat_message_expires ON chat_messages IS
  'Define expires_at como created_at + 30 dias quando mídia está presente';

-- ── Função de limpeza de mensagens expiradas ───────────────────

-- Remove mensagens com mídia expirada (chamado via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_chat_media()
RETURNS void AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM chat_messages
  WHERE expires_at IS NOT NULL
  AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Mensagens com mídia expirada removidas: %', deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_chat_media() IS
  'Remove mensagens com mídia expirada (expires_at < now). Executar via cron diário.';

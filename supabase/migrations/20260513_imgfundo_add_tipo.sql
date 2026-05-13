-- Adiciona coluna tipo na tabela imgfundo
-- tipo='destino' para imagens de destino (padrão)
-- tipo='card'    para fundos de CardWhatsApp
ALTER TABLE imgfundo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'destino';

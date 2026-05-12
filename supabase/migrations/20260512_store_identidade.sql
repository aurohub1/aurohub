-- Adiciona campos de identidade visual/comercial à tabela stores
-- Usados na seção "Identidade para documentos" nas configurações
-- e no cabeçalho de impressão do AuroRoteiro.

alter table stores
  add column if not exists nome_comercial text,
  add column if not exists telefone       text,
  add column if not exists email          text,
  add column if not exists site           text,
  add column if not exists logo_url       text;

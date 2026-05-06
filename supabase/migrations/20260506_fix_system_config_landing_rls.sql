-- Permite leitura pública (anon) de chaves landing_* no system_config.
-- Necessário para que o index.html da landing page leia as configurações
-- sem autenticação (visitas externas usam a anon key sem sessão).

drop policy if exists system_config_public_landing on system_config;
create policy system_config_public_landing on system_config for select
  using (key like 'landing_%');

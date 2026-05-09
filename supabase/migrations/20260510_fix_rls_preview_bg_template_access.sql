-- ── Fix 1: system_config — permitir role cliente ler chaves preview_bg_* ────────
-- Antes: RLS bloqueava preview_bg_{licensee_id} para role cliente (só tmpl_* e landing_* passavam).
-- Agora: qualquer usuário autenticado pode ler chaves com prefixo preview_bg_.
drop policy if exists "system_config_preview_bg" on system_config;
create policy "system_config_preview_bg" on system_config
  for select
  using (key like 'preview_bg_%');

-- ── Fix 2: template_access — gerentes/consultores sem store_id veem todos os templates ─
-- Antes: policy exigia store_id = auth_store_id(), que para usuários sem store_id
--        resulta em store_id = NULL (sempre false em SQL) — só templates globais apareciam.
-- Agora: quando auth_store_id() é NULL (gerente/consultor sem loja fixa),
--        o usuário vê todos os templates do seu licensee independente de store_id.
drop policy if exists "Licensee read own" on template_access;
create policy "Licensee read own" on template_access
  for select
  using (
    licensee_id = auth_licensee_id()
    and (
      store_id is null
      or store_id = auth_store_id()
      or auth_store_id() is null
    )
  );

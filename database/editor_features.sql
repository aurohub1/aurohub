-- ============================================================
-- Aurohub — Editor Features (Sessão A — itens 5, 7, 8, 10, 12)
-- Rodar no Supabase SQL editor
-- ============================================================

-- 5. COMPONENTES REUTILIZÁVEIS
create table if not exists public.editor_components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  schema jsonb not null,
  thumbnail text,
  licensee_id uuid null,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists editor_components_licensee_idx on public.editor_components (licensee_id);
create index if not exists editor_components_created_at_idx on public.editor_components (created_at desc);

alter table public.editor_components enable row level security;
drop policy if exists "editor_components_all" on public.editor_components;
create policy "editor_components_all" on public.editor_components for all using (true) with check (true);


-- 7. HISTÓRICO VISUAL
create table if not exists public.template_history (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  schema jsonb not null,
  thumbnail text,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists template_history_template_idx on public.template_history (template_id, created_at desc);

alter table public.template_history enable row level security;
drop policy if exists "template_history_all" on public.template_history;
create policy "template_history_all" on public.template_history for all using (true) with check (true);


-- 8. TEMPLATES DE INÍCIO RÁPIDO (presets)
-- Presets são hardcoded no cliente, mas pode ser override por licensee futuramente.
create table if not exists public.editor_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  form_type text not null,
  format text not null,
  schema jsonb not null,
  thumbnail text,
  created_at timestamptz not null default now()
);

alter table public.editor_presets enable row level security;
drop policy if exists "editor_presets_read" on public.editor_presets;
create policy "editor_presets_read" on public.editor_presets for select using (true);


-- 10. BADGE AUTOMÁTICO — config por ADM
-- Usa system_config existente com chaves 'badge_auto_<param_value>'
-- Exemplo row:
--   key = 'badge_auto_allinclusive'
--   value = '{"trigger":"servicos","match":"All Inclusive","src":"https://res.cloudinary.com/dxgj4bcch/image/upload/aurohubv2/badges/allinclusive.png","width":180,"height":180}'


-- 12. VARIANTES — flag de liberação por licensee
-- Armazenado em system_config:
--   key = 'variants_enabled_<licensee_id>'
--   value = 'true' | 'false'
-- OU global: key = 'variants_enabled_global' value = 'true'

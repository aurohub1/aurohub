-- Template history: one row per manual save, max 10 per template
create table if not exists public.template_history (
  id          uuid        primary key default gen_random_uuid(),
  template_id text        not null,
  schema      jsonb       not null,
  thumbnail   text,
  created_by  uuid        null,
  created_at  timestamptz not null default now()
);

create index if not exists template_history_template_idx
  on public.template_history (template_id, created_at desc);

alter table public.template_history enable row level security;

drop policy if exists "template_history_all" on public.template_history;
create policy "template_history_all" on public.template_history
  for all using (true) with check (true);

-- ============================================================
-- Biblioteca de Imagens — tabelas do ADM
-- Schema compatível com migration_v1_tables.sql do Aurohub Estável
-- ============================================================

create table if not exists public.imgfundo (
  id         bigserial primary key,
  nome       text not null,
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_imgfundo_nome on public.imgfundo(nome);

create table if not exists public.imghotel (
  id         bigserial primary key,
  nome       text not null,
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_imghotel_nome on public.imghotel(nome);

create table if not exists public.imgaviao (
  id         bigserial primary key,
  url        text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.imgcruise (
  id         bigserial primary key,
  nome       text not null,
  url        text not null,
  cia        text,
  created_at timestamptz not null default now()
);
create index if not exists idx_imgcruise_nome on public.imgcruise(nome);

-- RLS — só ADM escreve; qualquer autenticado lê
alter table public.imgfundo  enable row level security;
alter table public.imghotel  enable row level security;
alter table public.imgaviao  enable row level security;
alter table public.imgcruise enable row level security;

do $$
declare t text;
begin
  foreach t in array array['imgfundo','imghotel','imgaviao','imgcruise'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format($p$
      create policy %I_read on public.%I
        for select using (auth.role() = 'authenticated')
    $p$, t, t);
    execute format('drop policy if exists %I_adm_write on public.%I', t, t);
    execute format($p$
      create policy %I_adm_write on public.%I
        for all using (
          exists (select 1 from public.profiles where id = auth.uid() and role = 'adm')
        ) with check (
          exists (select 1 from public.profiles where id = auth.uid() and role = 'adm')
        )
    $p$, t, t);
  end loop;
end $$;

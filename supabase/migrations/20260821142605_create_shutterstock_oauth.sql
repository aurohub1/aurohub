create table if not exists public.shutterstock_oauth_states (
  nonce uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists shutterstock_oauth_states_expires_idx
  on public.shutterstock_oauth_states (expires_at);

create table if not exists public.shutterstock_connections (
  id text primary key check (id = 'primary'),
  status text not null default 'active' check (status in ('active', 'disconnected')),
  encrypted_access_token text not null,
  scopes text[] not null default '{}',
  connected_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shutterstock_oauth_states enable row level security;
alter table public.shutterstock_connections enable row level security;

revoke all on table public.shutterstock_oauth_states from anon, authenticated;
revoke all on table public.shutterstock_connections from anon, authenticated;
grant all on table public.shutterstock_oauth_states to service_role;
grant all on table public.shutterstock_connections to service_role;

comment on table public.shutterstock_oauth_states is
  'Estados OAuth de uso unico; acessivel somente por rotas server-side.';
comment on table public.shutterstock_connections is
  'Token OAuth Shutterstock criptografado; acessivel somente pelo service role.';

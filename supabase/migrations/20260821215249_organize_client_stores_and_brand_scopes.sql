-- Organiza lojas, marcas e escopos sem duplicar os cadastros legados.
-- A tabela `lojas` permanece como fonte legada durante a transicao; `stores`
-- recebe os mesmos IDs para preservar perfis, publicacoes e conexoes existentes.

alter table public.licensees
  add column if not exists splash_logo_url text;

alter table public.stores
  add column if not exists brand_id uuid references public.franquias(id) on delete set null,
  add column if not exists business_model text not null default 'independent';

alter table public.lojas
  add column if not exists brand_id uuid references public.franquias(id) on delete set null,
  add column if not exists business_model text not null default 'independent';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stores_business_model_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_business_model_check
      check (business_model in ('franchise', 'multibrand', 'independent'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'lojas_business_model_check'
      and conrelid = 'public.lojas'::regclass
  ) then
    alter table public.lojas
      add constraint lojas_business_model_check
      check (business_model in ('franchise', 'multibrand', 'independent'));
  end if;
end
$$;

create index if not exists stores_brand_id_idx on public.stores(brand_id);
create index if not exists lojas_brand_id_idx on public.lojas(brand_id);

-- Classifica primeiro a fonte legada. Azul e uma marca; Laura Malz Viagens e
-- uma operacao multimarcas e nao deve herdar automaticamente regras da Azul.
update public.lojas l
set brand_id = f.id,
    franquia = coalesce(l.franquia, f.name),
    business_model = 'franchise'
from public.franquias f,
     public.licensees lic
where lower(f.name) = 'azul viagens'
  and lic.id = l.licensee_id
  and (
    lic.franquia_id = f.id
    or lower(l.name) like 'azul viagens%'
  );

update public.lojas
set brand_id = null,
    franquia = 'Multimarcas',
    business_model = 'multibrand'
where lower(name) = 'laura malz viagens';

-- Espelha apenas lojas ausentes. ON CONFLICT DO NOTHING evita substituir uma
-- loja que ja tenha sido atualizada na estrutura nova.
insert into public.stores (
  id, licensee_id, name, slug, ig_user_id,
  created_at, updated_at, franquia, brand_id, business_model
)
select
  l.id,
  l.licensee_id,
  l.name,
  trim(both '-' from regexp_replace(lower(l.name), '[^a-z0-9]+', '-', 'g')),
  l.ig_user_id,
  coalesce(l.created_at, now()),
  coalesce(l.updated_at, now()),
  l.franquia,
  l.brand_id,
  l.business_model
from public.lojas l
on conflict do nothing;

-- O schema em producao tinha `user_stores` como uma view de lojas permitidas,
-- enquanto todo o aplicativo a utiliza como tabela de associacao usuario/loja.
-- Preservamos a view com um nome explicito e criamos a tabela esperada pelo app.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_stores' and c.relkind = 'v'
  ) and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'allowed_stores'
  ) then
    alter view public.user_stores rename to allowed_stores;
  end if;
end
$$;

create table if not exists public.user_stores (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index if not exists user_stores_store_id_idx
  on public.user_stores(store_id);

alter table public.user_stores enable row level security;

drop policy if exists "user_stores_read_own" on public.user_stores;
create policy "user_stores_read_own"
on public.user_stores for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_actor_role()) in ('adm', 'superadmin')
);

-- Perfis de uma loja recebem essa loja. Clientes/gerentes sem loja fixa recebem
-- todas as lojas do proprio cliente, incluindo as tres operacoes da Laura.
insert into public.user_stores (user_id, store_id)
select p.id, p.store_id
from public.profiles p
join public.stores s on s.id = p.store_id and s.licensee_id = p.licensee_id
where p.store_id is not null
on conflict do nothing;

insert into public.user_stores (user_id, store_id)
select p.id, s.id
from public.profiles p
join public.stores s on s.licensee_id = p.licensee_id
where p.store_id is null
  and p.role in ('cliente', 'gerente', 'admin')
on conflict do nothing;

insert into public.user_stores (user_id, store_id)
select up.user_id, sid.store_id
from public.user_permissions up
cross join lateral unnest(coalesce(up.store_ids, '{}'::uuid[])) as sid(store_id)
join public.stores s on s.id = sid.store_id
on conflict do nothing;

-- Remove a politica antiga que permitia que qualquer autenticado lesse todas
-- as lojas (inclusive campos de integracao) e limita a leitura ao tenant.
drop policy if exists "stores: leitura autenticada" on public.stores;
drop policy if exists "stores: membro lê lojas da própria licensee" on public.stores;
drop policy if exists "stores_read_tenant" on public.stores;
create policy "stores_read_tenant"
on public.stores for select to authenticated
using (
  licensee_id = (select private.current_licensee_id())
  or (select private.current_actor_role()) in ('adm', 'superadmin')
);

-- Escopos explicitos de template. Nao existe mais a ambiguidade de "global":
-- um template compartilhado informa se pertence ao segmento, marca, cliente ou loja.
alter table public.form_templates
  add column if not exists visibility_scope text,
  add column if not exists scope_segment_id text references public.segments(id) on delete set null,
  add column if not exists scope_brand_id uuid references public.franquias(id) on delete set null,
  add column if not exists scope_store_id uuid references public.stores(id) on delete cascade;

update public.form_templates
set visibility_scope = case
  when licensee_id is not null then 'licensee'
  when is_base is true then 'segment'
  else 'restricted'
end
where visibility_scope is null;

update public.form_templates
set scope_segment_id = 'agencia_viagem'
where visibility_scope = 'segment'
  and scope_segment_id is null
  and exists (select 1 from public.segments where id = 'agencia_viagem');

alter table public.form_templates
  alter column visibility_scope set default 'licensee',
  alter column visibility_scope set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'form_templates_visibility_scope_check'
      and conrelid = 'public.form_templates'::regclass
  ) then
    alter table public.form_templates
      add constraint form_templates_visibility_scope_check
      check (visibility_scope in ('segment', 'brand', 'licensee', 'store', 'restricted'));
  end if;
end
$$;

create index if not exists form_templates_scope_segment_idx
  on public.form_templates(scope_segment_id)
  where visibility_scope = 'segment';
create index if not exists form_templates_scope_brand_idx
  on public.form_templates(scope_brand_id)
  where visibility_scope = 'brand';
create index if not exists form_templates_scope_store_idx
  on public.form_templates(scope_store_id)
  where visibility_scope = 'store';

drop policy if exists "authenticated_read_form_templates" on public.form_templates;
drop policy if exists "tenant_read_scoped_form_templates" on public.form_templates;
create policy "tenant_read_scoped_form_templates"
on public.form_templates for select to authenticated
using (
  active = true
  and deleted_at is null
  and (
    licensee_id = (select private.current_licensee_id())
    or (
      visibility_scope = 'segment'
      and scope_segment_id = (
        select l.segment_id from public.licensees l
        where l.id = (select private.current_licensee_id())
      )
    )
    or (
      visibility_scope = 'brand'
      and exists (
        select 1
        from public.stores s
        join public.profiles p on p.id = (select auth.uid())
        where s.licensee_id = p.licensee_id
          and s.brand_id = form_templates.scope_brand_id
          and (p.store_id is null or p.store_id = s.id)
      )
    )
    or (
      visibility_scope = 'store'
      and exists (
        select 1
        from public.stores s
        join public.profiles p on p.id = (select auth.uid())
        where s.id = form_templates.scope_store_id
          and s.licensee_id = p.licensee_id
          and (p.store_id is null or p.store_id = s.id)
      )
    )
    or (select private.current_actor_role()) in ('adm', 'superadmin')
  )
);

-- As duas imagens da Laura passam a ter finalidades independentes.
update public.licensees
set splash_logo_url = coalesce(splash_logo_url, logo_url)
where lower(email) = 'gerencia@lauramalz.com.br';

update public.profiles
set avatar_url = 'https://res.cloudinary.com/dxgj4bcch/image/upload/v1786745120/aurohubv3/brand-kits/70448492-4fdd-4605-a9f3-8b3686724bec/logos/5650e169-3117-4ea5-92e5-64cfad241acb/oxenxojh7jpchdwhvcgv.png',
    updated_at = now()
where lower(email) = 'gerencia@lauramalz.com.br'
  and avatar_url is null;

comment on column public.licensees.splash_logo_url is
  'Logo exclusivo da abertura do painel; nao substitui avatar_url do usuario.';
comment on column public.stores.brand_id is
  'Marca comercial da loja. Permite Global Azul sem compartilhar conteudo privado entre proprietarios.';
comment on column public.form_templates.visibility_scope is
  'Escopo explicito: segment, brand, licensee, store ou restricted.';

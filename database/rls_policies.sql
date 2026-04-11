-- ════════════════════════════════════════════════════════════════
-- Aurohub — Row Level Security (RLS) Policies
-- ════════════════════════════════════════════════════════════════
-- Idempotente: usa DROP POLICY IF EXISTS antes de cada CREATE.
-- Pode ser reaplicado sem erro.
--
-- Roles: adm | cliente | unidade | vendedor
--
-- Funções auxiliares (SECURITY DEFINER) leem a tabela profiles
-- sem passar pela RLS, evitando loops recursivos.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────────

create or replace function auth_role() returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function auth_licensee_id() returns uuid as $$
  select licensee_id from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function auth_store_id() returns uuid as $$
  select store_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Conveniência: true se o chamador for ADM
create or replace function is_adm() returns boolean as $$
  select auth_role() = 'adm'
$$ language sql security definer stable;


-- ════════════════════════════════════════════════════════════════
-- 2. PROFILES
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente: profiles do seu licensee_id
-- unidade: profiles do seu store_id
-- vendedor: só o próprio
-- ════════════════════════════════════════════════════════════════

alter table profiles enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    is_adm()
    or id = auth.uid()
    or (auth_role() = 'cliente'  and licensee_id = auth_licensee_id())
    or (auth_role() = 'unidade'  and store_id    = auth_store_id())
  );

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert
  with check (is_adm() or id = auth.uid());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (is_adm() or id = auth.uid())
  with check (is_adm() or id = auth.uid());

drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 3. LICENSEES
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- Outros: leem só o próprio licensee_id (via profile)
-- ════════════════════════════════════════════════════════════════

alter table licensees enable row level security;

drop policy if exists licensees_select on licensees;
create policy licensees_select on licensees for select
  using (is_adm() or id = auth_licensee_id());

drop policy if exists licensees_insert on licensees;
create policy licensees_insert on licensees for insert
  with check (is_adm());

drop policy if exists licensees_update on licensees;
create policy licensees_update on licensees for update
  using (is_adm())
  with check (is_adm());

drop policy if exists licensees_delete on licensees;
create policy licensees_delete on licensees for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 4. STORES
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente: stores do seu licensee
-- unidade / vendedor: só a própria store
-- ════════════════════════════════════════════════════════════════

alter table stores enable row level security;

drop policy if exists stores_select on stores;
create policy stores_select on stores for select
  using (
    is_adm()
    or (auth_role() = 'cliente'  and licensee_id = auth_licensee_id())
    or (auth_role() in ('unidade', 'vendedor') and id = auth_store_id())
  );

drop policy if exists stores_insert on stores;
create policy stores_insert on stores for insert
  with check (is_adm());

drop policy if exists stores_update on stores;
create policy stores_update on stores for update
  using (is_adm())
  with check (is_adm());

drop policy if exists stores_delete on stores;
create policy stores_delete on stores for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 5. SCHEDULED_POSTS
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente: lê todos do seu licensee
-- unidade / vendedor: lê + cria onde store_id = própria store
-- NOTA: requer coluna store_id em scheduled_posts.
-- ════════════════════════════════════════════════════════════════

alter table scheduled_posts enable row level security;

drop policy if exists scheduled_posts_select on scheduled_posts;
create policy scheduled_posts_select on scheduled_posts for select
  using (
    is_adm()
    or (auth_role() = 'cliente'  and licensee_id = auth_licensee_id())
    or (auth_role() in ('unidade', 'vendedor') and store_id = auth_store_id())
  );

drop policy if exists scheduled_posts_insert on scheduled_posts;
create policy scheduled_posts_insert on scheduled_posts for insert
  with check (
    is_adm()
    or (auth_role() in ('unidade', 'vendedor') and store_id = auth_store_id())
  );

drop policy if exists scheduled_posts_update on scheduled_posts;
create policy scheduled_posts_update on scheduled_posts for update
  using (
    is_adm()
    or (auth_role() in ('unidade', 'vendedor') and store_id = auth_store_id())
  )
  with check (
    is_adm()
    or (auth_role() in ('unidade', 'vendedor') and store_id = auth_store_id())
  );

drop policy if exists scheduled_posts_delete on scheduled_posts;
create policy scheduled_posts_delete on scheduled_posts for delete
  using (is_adm() or user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════
-- 6. ACTIVITY_LOGS
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente: logs do seu licensee
-- unidade / vendedor: logs da própria store
-- Insert: qualquer usuário autenticado (registra publicações, etc.)
-- ════════════════════════════════════════════════════════════════

alter table activity_logs enable row level security;

drop policy if exists activity_logs_select on activity_logs;
create policy activity_logs_select on activity_logs for select
  using (
    is_adm()
    or (auth_role() = 'cliente'  and (metadata->>'licensee_id')::uuid = auth_licensee_id())
    or (auth_role() in ('unidade', 'vendedor') and (metadata->>'store_id')::uuid = auth_store_id())
  );

drop policy if exists activity_logs_insert on activity_logs;
create policy activity_logs_insert on activity_logs for insert
  with check (auth.uid() is not null);

drop policy if exists activity_logs_delete on activity_logs;
create policy activity_logs_delete on activity_logs for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 7. INSTAGRAM_CREDENTIALS
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente / unidade: leem as suas (via licensee)
-- vendedor: sem acesso direto — a API /api/instagram/post
--           usa service role key e bypassa a RLS
-- ════════════════════════════════════════════════════════════════

alter table instagram_credentials enable row level security;

drop policy if exists ig_credentials_select on instagram_credentials;
create policy ig_credentials_select on instagram_credentials for select
  using (
    is_adm()
    or (auth_role() in ('cliente', 'unidade') and licensee_id = auth_licensee_id())
  );

drop policy if exists ig_credentials_insert on instagram_credentials;
create policy ig_credentials_insert on instagram_credentials for insert
  with check (is_adm());

drop policy if exists ig_credentials_update on instagram_credentials;
create policy ig_credentials_update on instagram_credentials for update
  using (is_adm())
  with check (is_adm());

drop policy if exists ig_credentials_delete on instagram_credentials;
create policy ig_credentials_delete on instagram_credentials for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 8. SYSTEM_CONFIG
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- Outros roles: leem apenas keys "tmpl_*" cujo value contém
-- o licenseeId do chamador.
-- Match por substring evita parsing de JSON inválido.
-- ════════════════════════════════════════════════════════════════

alter table system_config enable row level security;

drop policy if exists system_config_select on system_config;
create policy system_config_select on system_config for select
  using (
    is_adm()
    or (
      auth.uid() is not null
      and key like 'tmpl_%'
      and value like '%"licenseeId":"' || auth_licensee_id()::text || '"%'
    )
  );

drop policy if exists system_config_insert on system_config;
create policy system_config_insert on system_config for insert
  with check (is_adm());

drop policy if exists system_config_update on system_config;
create policy system_config_update on system_config for update
  using (is_adm())
  with check (is_adm());

drop policy if exists system_config_delete on system_config;
create policy system_config_delete on system_config for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 9. PLANS — leitura pública autenticada
-- ════════════════════════════════════════════════════════════════

alter table plans enable row level security;

drop policy if exists plans_select on plans;
create policy plans_select on plans for select
  using (auth.uid() is not null);

drop policy if exists plans_write on plans;
create policy plans_write on plans for all
  using (is_adm())
  with check (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 10. SEGMENTS — leitura pública autenticada
-- ════════════════════════════════════════════════════════════════

alter table segments enable row level security;

drop policy if exists segments_select on segments;
create policy segments_select on segments for select
  using (auth.uid() is not null);

drop policy if exists segments_write on segments;
create policy segments_write on segments for all
  using (is_adm())
  with check (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 11. FAQ_ARTICLES — leitura pública autenticada
-- ════════════════════════════════════════════════════════════════

alter table faq_articles enable row level security;

drop policy if exists faq_articles_select on faq_articles;
create policy faq_articles_select on faq_articles for select
  using (auth.uid() is not null);

drop policy if exists faq_articles_write on faq_articles;
create policy faq_articles_write on faq_articles for all
  using (is_adm())
  with check (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 12. LEADS
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- cliente: lê os seus
-- unidade / vendedor: sem acesso
-- ════════════════════════════════════════════════════════════════

alter table leads enable row level security;

drop policy if exists leads_select on leads;
create policy leads_select on leads for select
  using (
    is_adm()
    or (auth_role() = 'cliente' and licensee_id = auth_licensee_id())
  );

drop policy if exists leads_insert on leads;
create policy leads_insert on leads for insert
  with check (
    is_adm()
    or (auth_role() = 'cliente' and licensee_id = auth_licensee_id())
  );

drop policy if exists leads_update on leads;
create policy leads_update on leads for update
  using (
    is_adm()
    or (auth_role() = 'cliente' and licensee_id = auth_licensee_id())
  )
  with check (
    is_adm()
    or (auth_role() = 'cliente' and licensee_id = auth_licensee_id())
  );

drop policy if exists leads_delete on leads;
create policy leads_delete on leads for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 13. LEAD_INTERACTIONS
-- ────────────────────────────────────────────────────────────────
-- Mesma regra dos leads — herda via lead_id
-- ════════════════════════════════════════════════════════════════

alter table lead_interactions enable row level security;

drop policy if exists lead_interactions_select on lead_interactions;
create policy lead_interactions_select on lead_interactions for select
  using (
    is_adm()
    or exists (
      select 1 from leads l
      where l.id = lead_interactions.lead_id
        and auth_role() = 'cliente'
        and l.licensee_id = auth_licensee_id()
    )
  );

drop policy if exists lead_interactions_insert on lead_interactions;
create policy lead_interactions_insert on lead_interactions for insert
  with check (
    is_adm()
    or exists (
      select 1 from leads l
      where l.id = lead_interactions.lead_id
        and auth_role() = 'cliente'
        and l.licensee_id = auth_licensee_id()
    )
  );

drop policy if exists lead_interactions_delete on lead_interactions;
create policy lead_interactions_delete on lead_interactions for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 14. SUPPORT_TICKETS
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- Cada usuário: lê / cria os próprios
-- ════════════════════════════════════════════════════════════════

alter table support_tickets enable row level security;

drop policy if exists support_tickets_select on support_tickets;
create policy support_tickets_select on support_tickets for select
  using (is_adm() or user_id = auth.uid());

drop policy if exists support_tickets_insert on support_tickets;
create policy support_tickets_insert on support_tickets for insert
  with check (is_adm() or user_id = auth.uid());

drop policy if exists support_tickets_update on support_tickets;
create policy support_tickets_update on support_tickets for update
  using (is_adm() or user_id = auth.uid())
  with check (is_adm() or user_id = auth.uid());

drop policy if exists support_tickets_delete on support_tickets;
create policy support_tickets_delete on support_tickets for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- 15. TICKET_MESSAGES
-- ────────────────────────────────────────────────────────────────
-- ADM: tudo
-- Usuário: lê/cria mensagens dos próprios tickets
-- ════════════════════════════════════════════════════════════════

alter table ticket_messages enable row level security;

drop policy if exists ticket_messages_select on ticket_messages;
create policy ticket_messages_select on ticket_messages for select
  using (
    is_adm()
    or exists (
      select 1 from support_tickets t
      where t.id = ticket_messages.ticket_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists ticket_messages_insert on ticket_messages;
create policy ticket_messages_insert on ticket_messages for insert
  with check (
    is_adm()
    or (
      user_id = auth.uid()
      and exists (
        select 1 from support_tickets t
        where t.id = ticket_messages.ticket_id
          and t.user_id = auth.uid()
      )
    )
  );

drop policy if exists ticket_messages_delete on ticket_messages;
create policy ticket_messages_delete on ticket_messages for delete
  using (is_adm());


-- ════════════════════════════════════════════════════════════════
-- FIM
-- ────────────────────────────────────────────────────────────────
-- Notas de operação:
--
-- 1. Rotas server-side que usam SUPABASE_SERVICE_ROLE_KEY
--    (ex.: /api/admin/users, /api/instagram/post) bypassam RLS
--    — isso é esperado e permite operações administrativas.
--
-- 2. Se precisar depurar, rode como o usuário no SQL editor:
--      set local role authenticated;
--      set local request.jwt.claims = '{"sub":"<uuid>"}';
--      select * from <tabela>;
--
-- 3. Verifique que as colunas referenciadas existem:
--    - scheduled_posts.store_id
--    - activity_logs.metadata (jsonb com licensee_id e store_id)
--    - support_tickets.user_id, ticket_messages.user_id / ticket_id
--    - lead_interactions.lead_id
--    Ajuste se seu schema divergir.
--
-- 4. As funções auxiliares usam SECURITY DEFINER — executam com
--    os privilégios do dono da função, evitando recursão infinita
--    nas policies de profiles.
-- ════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- FIX: user_permissions schema
-- ═══════════════════════════════════════════════════════════

-- 1. Verificar se a tabela existe
SELECT * FROM information_schema.tables
WHERE table_name = 'user_permissions' AND table_schema = 'public';

-- 2. Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  licensee_id uuid REFERENCES public.licensees(id) ON DELETE CASCADE,
  store_ids text[] DEFAULT '{}',
  allowed_forms text[] DEFAULT '{}',
  can_publish boolean DEFAULT true,
  can_download boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de acesso
DROP POLICY IF EXISTS "ADM full access" ON public.user_permissions;
CREATE POLICY "ADM full access" ON public.user_permissions
  FOR ALL USING (true);

-- 5. Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

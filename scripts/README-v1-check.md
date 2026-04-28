# Como buscar binds de cruzeiro do Aurohub v1

## 1. Obter credenciais do projeto hiawjrfdotlpssypbcjd

Acesse: https://supabase.com/dashboard/project/hiawjrfdotlpssypbcjd/settings/api

Você precisa de:
- **Project URL**: `https://hiawjrfdotlpssypbcjd.supabase.co`
- **Service Role Key**: Clique em "Reveal" e copie a chave secreta

## 2. Rodar o script

### Opção A: Via variáveis de ambiente (recomendado)

```bash
cd C:\dev\aurohub

SUPABASE_V1_URL=https://hiawjrfdotlpssypbcjd.supabase.co \
SUPABASE_V1_KEY=sua_service_role_key_aqui \
node scripts/check-v1-cruzeiro-binds.js
```

### Opção B: Editar o script diretamente

Abra `scripts/check-v1-cruzeiro-binds.js` e substitua:

```javascript
const SUPABASE_KEY = 'INSIRA_SERVICE_ROLE_KEY_AQUI';
```

Por:

```javascript
const SUPABASE_KEY = 'eyJhbGci...sua_chave_real';
```

Depois rode:

```bash
node scripts/check-v1-cruzeiro-binds.js
```

## 3. Alternativa: Query SQL direta

Se preferir, pode rodar direto no Supabase SQL Editor:

```sql
-- Buscar templates de cruzeiro
SELECT 
  id,
  nome,
  "formType",
  schema
FROM templates
WHERE "formType" = 'cruzeiro'
  OR tipo = 'cruzeiro'
  OR nome ILIKE '%cruzeiro%'
LIMIT 10;
```

Depois analisar o JSON do campo `schema` manualmente.

## 4. Se a tabela for diferente

O v1 pode usar estrutura diferente. Tente:

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'templates';

-- Ver um template de exemplo
SELECT * FROM templates LIMIT 1;
```

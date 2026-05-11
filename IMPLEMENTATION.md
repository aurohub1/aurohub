# AuroRoteiro — Guia de Implementação
# Aurohub v2 · C:\dev\aurohub

## Onde cada arquivo vai

```
extract-route.ts   →  app/api/roteiro/extract/route.ts
generate-route.ts  →  app/api/roteiro/generate/route.ts
useRoteiro.ts      →  hooks/useRoteiro.ts
```

Páginas a criar (copiar estrutura de /consultor/publicar):
```
app/(consultor)/roteiro/page.tsx      ← importa useRoteiro + componentes
app/(gerente)/roteiro/page.tsx        ← mesmo componente, role diferente
```

## Variável de ambiente necessária
Já deve existir no .env.local:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Supabase — system_config (white-label)
Chaves a inserir por cliente:
```sql
-- logo da franquia (URL Cloudinary)
INSERT INTO system_config (key, value) VALUES
  ('roteiro_logo_<licensee_id>', 'https://res.cloudinary.com/dxgj4bcch/...');

-- nome da loja para o PDF/WhatsApp
INSERT INTO system_config (key, value) VALUES
  ('roteiro_store_name_<store_id>', 'Azul Viagens · Rio Preto');

-- cor primária (opcional, fallback = --brand-primary)
INSERT INTO system_config (key, value) VALUES
  ('roteiro_primary_color_<licensee_id>', '#1A56C4');
```

## Menu — adicionar item
No arquivo de configuração do menu do consultor/gerente,
adicionar item protegido pelo add-on:

```ts
{
  label: "Roteiro IA",
  icon: "✈",
  href: "/consultor/roteiro",
  addon: "roteiro",  // só aparece se cliente tiver add-on ativo
}
```

## Google Drive — integração preparada mas desabilitada
O hook useRoteiro.ts tem o bloco comentado:
```ts
// const sendToDrive = async (...) => { ... }
```
Descomentar + criar app/api/drive/roteiro/route.ts
quando o ADM liberar a integração por cliente.

## Privacidade — checklist
- [x] Arquivo não armazenado no Supabase
- [x] base64 vive só na memória da requisição
- [x] CPF/RG/passaporte bloqueados no prompt + filtro pós-extração
- [x] Data de nascimento convertida em ageContext (faixa etária)
- [x] ZDR header na chamada Anthropic
- [x] Max 10MB + tipos permitidos validados server-side
- [ ] TODO: rate limit por usuário na rota /extract (evitar abuso)

## Fontes
```css
/* globals.css ou no componente raiz do AuroRoteiro */
font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
```

## Tema — CSS variables (adapta ao cliente automaticamente)
O componente consome as variáveis existentes do Aurohub v2:
```css
var(--brand-primary)     /* cor principal do cliente */
var(--brand-secondary)   /* cor secundária */
var(--brand-gradient)    /* gradiente do cliente */
```
O white-label do PDF/impressão usa roteiro_primary_color do system_config
com fallback para var(--brand-primary).

## Download — mensagem para o usuário
Exibir no componente de resultado:

> "⬇ Faça o download do roteiro. Por privacidade, não armazenamos
>  roteiros gerados no sistema — o arquivo fica somente com você."

## Sessão de implementação — ordem sugerida
1. Copiar os 3 arquivos acima para o projeto
2. Criar app/(consultor)/roteiro/page.tsx com layout Aurohub
3. Adicionar item no menu (desabilitado até add-on ativo)
4. Testar extração com um voucher real da Azul Viagens
5. Ajustar layout final seguindo padrão visual do Aurohub v2
6. Adicionar campo de upload do logo no ADM → Usuários → Cliente
7. Testar white-label no PDF com logo Azul Viagens

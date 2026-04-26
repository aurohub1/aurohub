# Bugs Críticos da Página de Publicação - Status

## ✅ Bug #1: Formulário atrás do footer
**Status**: CORRIGIDO
**Commit**: a3660c2

**Problema**: O formulário ficava escondido atrás do footer devido a problema de layout flexbox.

**Solução**: Adicionado `minHeight: 0` ao container do formulário para garantir que o flexbox restrinja corretamente o conteúdo scroll e o footer fique sempre visível.

**Arquivo alterado**: `src/components/publish/PublicarPageBase.tsx`

---

## ⚠️  Bug #2: 2 formulários aparecendo
**Status**: NÃO REPRODUZIDO

**Investigação**: 
- Verificado o código de renderização dos formulários
- Cada form (PacoteForm, PassagemForm, etc) é renderizado apenas uma vez via condicionais exclusivos
- Não encontrada duplicação óbvia no código

**Possível causa**: 
- Pode ser relacionado ao Bug #3 (templates duplicados)
- Ou renderização condicional incorreta em algum caso específico

**Ação recomendada**: Verificar novamente após deploy e testar com dados reais.

---

## ✅ Bug #3: Anoiteceu aparece 2x
**Status**: CORRIGIDO
**Commit**: 2a6a004

**Problema**: Templates duplicados apareciam quando existia tanto versão base (`is_base=true`) quanto customizada (`licensee_id`).

**Solução**: Adicionada lógica de deduplicação na query de templates:
- Agrupa templates por `(form_type + format + name)`
- Prioriza templates customizados (licensee_id) sobre base (is_base)
- Remove duplicatas antes de renderizar

**Arquivo alterado**: `src/components/publish/PublicarPageBase.tsx`

---

## ✅ Bug #4: Menu de templates sem feedback visual
**Status**: CORRIGIDO
**Commit**: 1b5e58b

**Problema**: Ao selecionar um template, não havia indicação visual clara de qual estava ativo.

**Solução**: Adicionado estado visual para template selecionado:
- Borda 2px solid var(--brand-primary) quando ativo
- Background levemente colorido
- Box-shadow de destaque
- Hover desabilitado quando já selecionado

**Arquivo alterado**: `src/components/publish/PublicarPageBase.tsx`

---

## 🔍 Bug #5: Preview com binds quebrados
**Status**: INVESTIGADO - NECESSITA MIGRAÇÃO DE TEMPLATES

**Problema relatado**: Preview mostrando textos duplicados como "Saíd Saída:" e "Período: Período:".

**Investigação**:
1. Executado script de verificação de templates no Supabase V2
2. **Descoberta**: Tabela `form_templates` está VAZIA - nenhum template migrado para V2
3. Templates ainda devem estar no Supabase V1 (wwwpuqjdpecnixvbqigq)

**Causa provável**:
Templates do V1 (Fabric.js) têm elementos duplicados:
- Um elemento com texto fixo "Saída:" (sem bindParam)
- Outro elemento com bindParam="saida" contendo também "Saída:" no texto

Exemplo do problema:
```javascript
// V1 - Elemento 1 (texto fixo)
{ type: "textbox", text: "Saída:", name: "saida" }

// V1 - Elemento 2 (bind)
{ type: "textbox", text: "Saída:", bindParam: "saida", name: "saida1" }
```

Quando renderizados, ambos aparecem resultando em "Saída: Saída: GRU".

**Ação necessária**:
1. Migrar templates do V1 → V2 usando script de migração
2. Durante migração, REMOVER elementos de texto fixo que duplicam labels
3. Manter apenas elementos com bindParam
4. Verificar especificamente os binds:
   - `saida` (deve ser só o aeroporto, sem label "Saída:")
   - `periodo` (deve ser só o período, sem label "Período:")
   - `voo` (deve ser só o tipo de voo)

**Formulários já corrigidos** (commits anteriores):
- PassagemForm agora usa binds corretos: `saida`, `voo`, `ida`, `volta`, `periodo`
- Campos não incluem labels nos valores (ex: grava "GRU", não "Saída: GRU")

**Script disponível**: `scripts/check-template-binds.ts` para verificar templates após migração.

---

## 📊 Resumo

| Bug | Status | Commit | Próxima Ação |
|-----|--------|--------|--------------|
| #1 - Formulário atrás do footer | ✅ Corrigido | a3660c2 | Testar em produção |
| #2 - 2 formulários aparecendo | ⚠️  Não reproduzido | - | Monitorar após deploy |
| #3 - Anoiteceu 2x | ✅ Corrigido | 2a6a004 | Testar com templates reais |
| #4 - Menu sem feedback | ✅ Corrigido | 1b5e58b | Testar UX |
| #5 - Binds duplicados | 🔍 Necessita migração | - | Migrar templates V1 → V2 |

---

## 🚀 Próximos Passos

1. **Deploy das correções** (Bugs #1, #3, #4)
2. **Migração de templates V1 → V2**:
   - Usar script `scripts/compare-templates.ts` como base
   - Implementar lógica de limpeza de bindParam duplicados
   - Migrar todos os templates ativos
3. **Validação pós-migração**:
   - Executar `scripts/check-template-binds.ts`
   - Verificar preview visual de cada tipo de template
   - Confirmar que não há textos duplicados
4. **Teste completo** da página de publicação com usuário real

---

## 📝 Notas Técnicas

### Estrutura de binds corretos (PassagemForm):

```typescript
{
  destino: "CANCÚN",           // Só o destino
  saida: "GRU",                // Só o aeroporto
  voo: "( Voo Direto )",       // Só o tipo
  ida: "2026-05-01",           // Data ISO
  volta: "2026-05-10",         // Data ISO
  periodo: "01/05 a 10/05/2026", // Calculado automaticamente
  incluso: "Bagagem, Seguro",  // Texto livre
  valorparcela: "890,00",      // Valor
  parcelas: "12x",             // Número de parcelas
  valortotal: "10.680,00"      // Total
}
```

### Elementos de template (V2) corretos:

```typescript
{
  id: "saida_value",
  type: "text",
  bindParam: "saida",  // Liga ao campo do form
  text: "",            // SEM texto fixo
  x: 100,
  y: 200
}
```

### Elementos de template (V2) ERRADOS (causam duplicação):

```typescript
// ❌ ERRADO - tem texto fixo E bindParam
{
  id: "saida_label",
  type: "text",
  text: "Saída:",  // Texto fixo
  bindParam: "saida"  // ❌ Isso vai duplicar!
}
```

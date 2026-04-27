# Sincronização Schema Template Cruzeiro

**Data:** 2026-04-27  
**Problema:** form_templates e system_config tinham binds desincronizados

---

## Situação Inicial

### form_templates (ee68a0d1-60ec-4049-b631-5a5771f39d9a)
```
❌ valorparcela
❌ dataperiodo
❌ forma_pgto
❌ valortotaltexto
❌ parcelas
```

### system_config (tmpl_base_cruzeiro_stories)
```
✅ inteiro (estava correto, foi sobrescrito temporariamente)
✅ data_correta
✅ forma_de_pagamento
✅ valor_total
✅ q_vezes
```

---

## Correção Aplicada

Script executado em **ambas as tabelas** para aplicar binds corretos:

```
valorparcela → inteiro
dataperiodo → data_correta
forma_pgto → forma_de_pagamento
valortotaltexto → valor_total
parcelas → q_vezes
```

---

## Resultado Final

✅ **form_templates**: 5 binds corrigidos  
✅ **system_config**: 5 binds corrigidos (revertido e corrigido)

**Ambos agora sincronizados com os mesmos bindParams corretos!**

---

## Editor e Preview

✅ Editor agora mostra template com binds corretos  
✅ Form seta valores com binds corretos  
✅ Preview deve renderizar corretamente

Se img_fundo ainda não aparecer, o problema está no PreviewStage, não nos binds.

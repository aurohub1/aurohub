# Atualização BindParams Template Cruzeiro V2

**Data:** 2026-04-27  
**Template:** `tmpl_base_cruzeiro_stories`  
**Tipo:** Correção de bindParams para match V1/Orshot/GAS

## Schema Anterior

```
img_fundo       ✅ (já correto)
navio           ✅ (já correto)
valorparcela    ❌ → deveria ser "inteiro"
dataperiodo     ❌ → deveria ser "data_correta"
itinerario      ✅ (já correto)
incluso         ✅ (já correto)
forma_pgto      ❌ → deveria ser "forma_de_pagamento"
valortotaltexto ❌ → deveria ser "valor_total"
parcelas        ❌ → deveria ser "q_vezes"
```

## Schema Atualizado

```
img_fundo            ✅
navio                ✅
inteiro              ✅ (era "valorparcela")
data_correta         ✅ (era "dataperiodo")
itinerario           ✅
incluso              ✅
forma_de_pagamento   ✅ (era "forma_pgto")
valor_total          ✅ (era "valortotaltexto")
q_vezes              ✅ (era "parcelas")
```

## Binds Atualizados (5 mudanças)

1. `valorparcela` → `inteiro`
2. `dataperiodo` → `data_correta`
3. `forma_pgto` → `forma_de_pagamento`
4. `valortotaltexto` → `valor_total`
5. `parcelas` → `q_vezes`

## Compatibilidade

✅ 100% compatível com CruzeiroForm recém-criado  
✅ Match exato com V1/Orshot/GAS  
✅ Todos os useEffect do form agora setam os binds corretos

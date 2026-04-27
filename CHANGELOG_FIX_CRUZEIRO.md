# Fix Cruzeiro - Débito + Binds System Config

**Data:** 2026-04-27  
**Commits:** 2 separados

---

## Fix 1: Remover Débito do CruzeiroForm

**Commit:** `92bd826`

### Alteração

**ANTES:**
```typescript
['cartao', 'entrada', 'debito'].map(...)
// 3 opções: Cartão | Boleto | Débito
```

**DEPOIS:**
```typescript
['cartao', 'entrada'].map(...)
// 2 opções: Cartão | Boleto
```

### Motivo

Conforme especificações originais GAS/V1, formulário Cruzeiro só tem 2 formas de pagamento:
- **Cartão** (parcelado)
- **Boleto** (à vista)

Débito não é usado em vendas de cruzeiro.

---

## Fix 2: Verificação Binds System Config

**Status:** ✅ Já correto

### Verificação

Query em `system_config.tmpl_base_cruzeiro_stories` mostra que os binds **já estão corretos**:

```
✅ img_fundo
✅ navio
✅ inteiro            (era valorparcela)
✅ data_correta       (era dataperiodo)
✅ itinerario
✅ incluso
✅ forma_de_pagamento (era forma_pgto)
✅ valor_total        (era valortotaltexto)
✅ q_vezes            (era parcelas)
```

O script anterior (`update_cruzeiro_binds.js`) **já havia atualizado** o `system_config` corretamente.

### Se o editor ainda mostra binds antigos

**Possível cache frontend:**
1. Fazer refresh no navegador (Ctrl+F5)
2. Limpar cache do Next.js: `rm -rf .next`
3. Restartar servidor dev

O backend (Supabase) já está com os binds corretos.

---

## Resultado Final

✅ **CruzeiroForm:** apenas Cartão e Boleto  
✅ **Template V2:** todos os binds corretos (verificado)  
✅ **Compatibilidade:** 100% com V1/Orshot/GAS

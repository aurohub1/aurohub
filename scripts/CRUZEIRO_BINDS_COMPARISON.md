# 🚢 COMPARAÇÃO DE BINDS - CRUZEIRO

## ✅ AUROHUB V1 (FUNCIONANDO - projeto hiawjrfdotlpssypbcjd)

```
Binds extraídos do template real em produção:
```

| # | bindParam           | Nome/Label                | Tipo    |
|---|---------------------|---------------------------|---------|
| 1 | **img_fundo**       | cjkxqej7malka829qnre      | image   |
| 2 | **navio**           | navio                     | textbox |
| 3 | **valor_preco**     | preço                     | textbox |
| 4 | **logo_cia**        | rcy6kf4hgfqe7ygnnzct      | image   |
| 5 | **nome_loja**       | priopreto                 | image   |
| 6 | **data_periodo**    | Texto                     | textbox |
| 7 | **itinerario**      | Texto cópia               | textbox |
| 8 | **incluso**         | Texto cópia cópia         | textbox |
| 9 | **forma_pgto**      | Texto                     | textbox |
| 10| **valor_total_texto**| Texto cópia              | textbox |
| 11| **parcelas**        | Texto cópia cópia         | textbox |

---

## ❌ AUROHUB V2 - template-binds.ts (ATUAL - COM ERROS)

```typescript
cruzeiro: {
  Imagens: [
    { id: 'imgfundo',           label: 'Imagem de Fundo',          type: 'image' },  // ❌ ERRADO
    { id: 'logo_cia',           label: 'Logo CIA Marítima',        type: 'image' },  // ✅
  ],
  Destino: [
    { id: 'navio',              label: 'Nome do Navio',            type: 'text' },   // ✅
  ],
  Datas: [
    { id: 'dataperiodo',        label: 'Período (23 a 28/03)',    type: 'text' },   // ❌ ERRADO
    { id: 'dataida',            label: 'Data Ida',                 type: 'text' },   // ❌ NÃO EXISTE NO V1
    { id: 'datavolta',          label: 'Data Volta',               type: 'text' },   // ❌ NÃO EXISTE NO V1
  ],
  Hotel: [
    { id: 'itinerario',         label: 'Itinerário',               type: 'text' },   // ✅
    { id: 'incluso',            label: 'Incluso',                  type: 'text' },   // ✅
  ],
  Preco: [
    { id: 'forma_pgto',         label: 'Forma Pagamento',          type: 'text' },   // ✅
    { id: 'parcelas',           label: 'Parcelas (ex: 12x)',       type: 'text' },   // ✅
    { id: 'valorparcela',       label: 'Valor Inteiro (grande)',   type: 'text' },   // ❌ ERRADO
    { id: 'valortotaltexto',    label: 'Valor Total Texto',        type: 'text' },   // ❌ ERRADO
  ],
  Loja: [
    { id: 'logo_loja',          label: 'Logo Azul Viagens',        type: 'image' },  // ❌ ERRADO
  ],
}
```

---

## 🔴 PROBLEMAS ENCONTRADOS

### **CRÍTICOS (quebram funcionalidade):**

| V1 (correto)         | V2 (errado)          | Status |
|----------------------|----------------------|--------|
| `img_fundo`          | `imgfundo`           | ❌ SEM UNDERSCORE |
| `data_periodo`       | `dataperiodo`        | ❌ SEM UNDERSCORE |
| `valor_preco`        | `valorparcela`       | ❌ NOME DIFERENTE |
| `valor_total_texto`  | `valortotaltexto`    | ❌ SEM UNDERSCORES |
| `nome_loja`          | `logo_loja`          | ❌ NOME DIFERENTE |

### **CAMPOS NO V2 QUE NÃO EXISTEM NO V1:**

- `dataida` - não existe no V1 (V1 usa `data_periodo`)
- `datavolta` - não existe no V1 (V1 usa `data_periodo`)

### **CAMPOS NO V1 QUE FALTAM NO V2:**

- Nenhum! V2 tem todos os campos do V1 (mas com nomes errados)

---

## ✅ SOLUÇÃO - template-binds.ts CORRETO

```typescript
cruzeiro: {
  Imagens: [
    { id: 'img_fundo',           label: 'Imagem de Fundo',          type: 'image' },  // ✅ CORRIGIDO
    { id: 'logo_cia',            label: 'Logo CIA Marítima',        type: 'image' },  // ✅
  ],
  Destino: [
    { id: 'navio',               label: 'Nome do Navio',            type: 'text' },   // ✅
  ],
  Datas: [
    { id: 'data_periodo',        label: 'Período',                  type: 'text' },   // ✅ CORRIGIDO
  ],
  Hotel: [
    { id: 'itinerario',          label: 'Itinerário',               type: 'text' },   // ✅
    { id: 'incluso',             label: 'Incluso',                  type: 'text' },   // ✅
  ],
  Preco: [
    { id: 'forma_pgto',          label: 'Forma Pagamento',          type: 'text' },   // ✅
    { id: 'parcelas',            label: 'Parcelas (ex: 12x)',       type: 'text' },   // ✅
    { id: 'valor_preco',         label: 'Valor da Parcela',         type: 'text' },   // ✅ CORRIGIDO
    { id: 'valor_total_texto',   label: 'Valor Total (texto)',      type: 'text' },   // ✅ CORRIGIDO
  ],
  Loja: [
    { id: 'nome_loja',           label: 'Logo da Loja',             type: 'image' },  // ✅ CORRIGIDO
  ],
}
```

---

## 📋 CHECKLIST DE CORREÇÕES

- [ ] template-binds.ts: `imgfundo` → `img_fundo`
- [ ] template-binds.ts: `dataperiodo` → `data_periodo`
- [ ] template-binds.ts: `valorparcela` → `valor_preco`
- [ ] template-binds.ts: `valortotaltexto` → `valor_total_texto`
- [ ] template-binds.ts: `logo_loja` → `nome_loja`
- [ ] template-binds.ts: Remover `dataida`
- [ ] template-binds.ts: Remover `datavolta`
- [ ] FormSections.tsx: Alinhar set() com os binds corretos
- [ ] canvas-editor.tsx linha 309: `imgfundo` → `img_fundo`
- [ ] canvas-editor.tsx linha 313: `imgfundo` → `img_fundo`
- [ ] types.ts linha 176: `imgfundo` → `img_fundo`
- [ ] types.ts linha 381,408,436,463: `imgfundo` → `img_fundo` (presets)

---

**Fonte:** Template cruzeiro real extraído do Aurohub v1 (scripts/cruzeiro-v1-template.json)

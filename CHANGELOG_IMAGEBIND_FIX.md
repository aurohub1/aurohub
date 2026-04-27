# Fix: Elementos de Imagem Sem bindParam

**Data:** 2026-04-27  
**Problema:** img_fundo e logo_cia não renderizavam no preview

---

## Diagnóstico

### Problema Encontrado

O template Cruzeiro tinha **0 elementos imageBind** e **5 elementos image sem bindParam**:

```
ANTES:
📷 ELEMENTOS imageBind: 0
🖼️  ELEMENTOS image: 5 (todos sem bindParam)

Elementos:
1. el_1777256452585_xt3s → type: "image", SEM bindParam ❌
2. el_1777256452585_y2lg → type: "image", SEM bindParam (overlay)
3. el_1777256452585_7g33 → type: "image", SEM bindParam (logo AZV)
4. el_1777256452585_u744 → type: "image", SEM bindParam ❌
5. el_1777256452585_j7ko → type: "image", SEM bindParam ❌
```

### Por Que Não Renderizava

**CruzeiroForm:**
```typescript
set('img_fundo', url)   // ✅ Setava corretamente
set('logo_cia', url)    // ✅ Setava corretamente
```

**useFormAdapter:**
```typescript
setField('img_fundo', url)  // ✅ Chamava corretamente
setField('logo_cia', url)   // ✅ Chamava corretamente
```

**PreviewStage:**
```typescript
// Buscava values['img_fundo'] e values['logo_cia'] ✅
// MAS os elementos NÃO TINHAM bindParam! ❌
```

---

## Correção Aplicada

Adicionados `bindParam` aos elementos de imagem:

```
DEPOIS:
1. el_1777256452585_xt3s → bindParam: "img_fundo" ✅
2. el_1777256452585_u744 → bindParam: "logo_cia" ✅
3. el_1777256452585_j7ko → bindParam: "loja" ✅
```

### Tabelas Atualizadas

✅ **form_templates** (ee68a0d1-...): 3 elementos  
✅ **system_config** (tmpl_base_cruzeiro_stories): 3 elementos

---

## Fluxo Completo Agora

```
1. CruzeiroForm: set('img_fundo', url)
   ↓
2. useFormAdapter: setFieldRef.current('img_fundo', url)
   ↓
3. formCache['cruzeiro'].img_fundo = url
   ↓
4. previewValues.img_fundo = url
   ↓
5. PreviewStage: el.bindParam === 'img_fundo'
   ↓
6. RenderImage: src = values['img_fundo'] ✅
```

**img_fundo e logo_cia agora devem renderizar!** 🎉

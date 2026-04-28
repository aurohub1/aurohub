# CORREÇÃO 2: Upsert em form_templates deve usar config_key

**⚠️ ESTA CORREÇÃO REQUER:**
1. Rodar SQL no Supabase primeiro (ver arquivo SQL abaixo)
2. Verificar que coluna `config_key` foi criada com sucesso
3. Então aplicar as alterações de código

---

## SQL a rodar no Supabase (MOSTRAR ANTES DE EXECUTAR):

```sql
-- 1. Adicionar coluna config_key
ALTER TABLE form_templates
ADD COLUMN IF NOT EXISTS config_key text;

-- 2. Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS form_templates_config_key_idx 
ON form_templates(config_key);

-- 3. Backfill: popular config_key existentes
UPDATE form_templates ft
SET config_key = sc.key
FROM system_config sc
WHERE sc.key LIKE 'tmpl_%'
  AND sc.value::jsonb->>'nome' = ft.name
  AND sc.value::jsonb->>'formType' = ft.form_type
  AND sc.value::jsonb->>'format' = ft.format
  AND ft.config_key IS NULL;

-- 4. Verificar resultado
SELECT COUNT(*) as sem_config_key FROM form_templates WHERE config_key IS NULL;
SELECT COUNT(*) as com_config_key FROM form_templates WHERE config_key IS NOT NULL;
```

---

## Alterações de código (aplicar APÓS rodar SQL):

### **Arquivo: src/app/editor/page.tsx**

**Localizar linha ~312-327** (função de save, sync com form_templates):

**ANTES:**
```typescript
const ftData = {
  name: p.nome || key,
  form_type: (p.formType || "pacote").replace("lamina","card_whatsapp").replace("quatro_destinos","card_whatsapp"),
  format: p.format || "stories",
  is_base: !p.licenseeId,
  active: true,
  licensee_id: p.licenseeId || null,
  schema: { elements: p.elements, background: p.background || "#0E1520", formType: p.formType, width: p.width || 1080, height: p.height || 1920 },
  width: p.width || 1080,
  height: p.height || 1920,
};
console.log("[Editor][sync] form_templates upsert:", ftData);
const { error: ftErr } = await supabase.from("form_templates").upsert(ftData, { onConflict: "name,form_type,format" });
```

**DEPOIS:**
```typescript
const ftData = {
  config_key: `tmpl_${key}`,  // ← NOVO: vincula ao system_config
  name: p.nome || key,
  form_type: (p.formType || "pacote").replace("lamina","card_whatsapp").replace("quatro_destinos","card_whatsapp"),
  format: p.format || "stories",
  is_base: !p.licenseeId,
  active: true,
  licensee_id: p.licenseeId || null,
  schema: { elements: p.elements, background: p.background || "#0E1520", formType: p.formType, width: p.width || 1080, height: p.height || 1920 },
  width: p.width || 1080,
  height: p.height || 1920,
};
console.log("[Editor][sync] form_templates upsert:", ftData);
const { error: ftErr } = await supabase.from("form_templates").upsert(ftData, { onConflict: "config_key" });  // ← MUDADO
```

**Repetir para as outras 2 ocorrências de upsert form_templates:**
- Linha ~219 (sync variant)
- Linha ~268 (sync starter)

Adicionar `config_key: key` em todas.

---

### **Arquivo: src/app/(dashboard)/editor-de-templates/page.tsx**

**Localizar linha ~360-378** (função runCloneToLicensee):

**ANTES:**
```typescript
await supabase.from("form_templates").insert({
  name: cloneCustomName.trim(),
  form_type: parsed.formType,
  format: parsed.format,
  width: parsed.width,
  height: parsed.height,
  schema: { /* ... */ },
  is_base: false,
  active: true,
  licensee_id: lic?.id ?? null,
  thumbnail_url: parsed.thumbnail ?? null,
});
```

**DEPOIS:**
```typescript
await supabase.from("form_templates").insert({
  config_key: newKey,  // ← NOVO
  name: cloneCustomName.trim(),
  form_type: parsed.formType,
  format: parsed.format,
  width: parsed.width,
  height: parsed.height,
  schema: { /* ... */ },
  is_base: false,
  active: true,
  licensee_id: lic?.id ?? null,
  thumbnail_url: parsed.thumbnail ?? null,
});
```

---

## Benefícios da CORREÇÃO 2:

✅ **Elimina sobrescrita silenciosa:** dois templates com mesmo nome não se sobrescrevem  
✅ **Rastreabilidade:** form_templates vinculado diretamente a system_config  
✅ **Rename seguro:** renomear template não quebra o vínculo  
✅ **Deduplicação correta:** PublicarPageBase pode confiar em config_key único  

---

## Próximos passos:

1. Revisar e aprovar o SQL acima
2. Rodar no Supabase SQL Editor
3. Verificar que backfill funcionou (todos têm config_key)
4. Aplicar alterações de código TypeScript
5. Git commit: "fix: form_templates upsert por config_key (evita sobrescrita)"

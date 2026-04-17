# AUDIT_TODO — Pendências críticas descobertas durante investigação de templates

Contexto: investigação de 2026-04-17 sobre modificação não rastreada em
`system_config.tmpl_teste_1775869438496` (badges `desconto_badge`/`feriado_badge`/
`all_inclusive_badge` não renderizando). Não há autoria no banco, `template_history`
não existe, e o código engole erro de history silenciosamente.

---

## 1. Criar tabela `template_history` no Supabase v2

**Problema:** `src/app/editor/page.tsx:234` já tenta `INSERT` em `template_history`
em todo save de template, mas a tabela não existe no schema (`PGRST205 - Could
not find the table 'public.template_history'`). O `try/catch` silencioso (item 3
abaixo) mascara a falha — nenhum histórico está sendo gravado.

**Schema mínimo sugerido:**

```sql
CREATE TABLE public.template_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL,              -- ex: tmpl_teste_1775869438496
  snapshot       jsonb NOT NULL,             -- JSON completo do value no momento do save
  edited_by      uuid REFERENCES auth.users(id),
  edited_at      timestamptz NOT NULL DEFAULT now(),
  change_summary text                        -- diff resumido (opcional, preenchido pelo app)
);

CREATE INDEX idx_template_history_key ON public.template_history(template_key, edited_at DESC);
```

**Depois de criar:** ajustar `editor/page.tsx:234` para usar `template_key`
(em vez de `template_id`), `snapshot` (em vez de `schema`), e popular `edited_by`
com `auth.uid()` via RLS.

---

## 2. Adicionar `updated_by` e `version` em `system_config`

**Problema:** `system_config` tem só `key`, `value`, `updated_at`. Impossível
saber **quem** modificou uma row ou detectar escritas concorrentes.

**Mudanças:**

```sql
ALTER TABLE public.system_config
  ADD COLUMN updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN version    int  NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION system_config_bump_version()
RETURNS trigger AS $$
BEGIN
  NEW.version    := COALESCE(OLD.version, 0) + 1;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_system_config_bump_version
BEFORE UPDATE ON public.system_config
FOR EACH ROW EXECUTE FUNCTION system_config_bump_version();
```

**Depois de aplicar:** revisar o upsert em `editor/page.tsx:228`, `editor-de-
templates/page.tsx:127,150`, `editor-landing/page.tsx:87,100`, `configuracoes/
page.tsx:112` — se algum passar `version` manualmente, tirar (o trigger é quem
controla).

---

## 3. Remover `try/catch` silencioso em `editor/page.tsx:234`

**Problema:** Falha do `INSERT` em `template_history` cai num `catch` que só
loga `console.warn`. Usuário não é notificado, falha não é surfaceada, e foi
isso que mascarou a ausência da tabela por completo.

**Fix sugerido:** trocar `console.warn` por `console.error` + toast de erro
visível. Se history é obrigatório para compliance/audit, talvez bloquear o save
completo quando history falha — discutir com produto.

**Local exato:**
```
src/app/editor/page.tsx:234
try {
  await supabase.from("template_history").insert({ ... });
} catch (hErr) { console.warn("[History save]", hErr); }  // ← silencioso
```

---

## 4. Corrigir `valortotalfmt` duplicado em `tmpl_teste_1775869438496`

**Problema:** Durante a investigação, detectei que o template único atual
tem o `bindParam="valortotalfmt"` em **dois elementos distintos**. Provavelmente
herdado de um copy/paste no editor. Sintomas possíveis: layout errado, conflito
de estilo, ou o `resolveBindParam` resolvendo para o mesmo valor nos dois lugares
(aparência de "texto duplicado" no preview).

**Ação:** abrir `/editor?id=teste_1775869438496`, inspecionar os 2 elementos
com `bindParam="valortotalfmt"`, decidir qual manter, deletar o outro, e salvar.

---

## Histórico

- **2026-04-17:** investigação disparada por bug de badges condicionais no
  `PreviewStage`. Delta inesperado de 29 → 28 elementos (renomeação de
  `badge` → `desconto_badge`) detectado durante probe do Supabase. Sem
  autoria rastreável. Ver também `_backup_template_1776442575449.json`.

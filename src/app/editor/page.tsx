"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import { getSystemConfig, invalidateSystemConfig } from "@/hooks/useSystemConfig";

import type { EditorSchema } from "@/components/editor/canvas-editor";
import { QuickStartModal, STARTER_KEY_PREFIX, SaveTemplateModal, slugifyTemplateName } from "@/components/editor/modals";
import type { SaveTemplateData } from "@/components/editor/modals";
import type { EditorPreset } from "@/components/editor/types";

const CanvasEditor = dynamic(
  () => import("@/components/editor/canvas-editor").then(m => m.CanvasEditor),
  { ssr: false, loading: () => <LoadingScreen text="Carregando editor..." /> }
);

function LoadingScreen({ text }: { text: string }) {
  return <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d14", color: "#ffffff30", fontSize: 13 }}>{text}</div>;
}

const FMTS: Record<string, [number, number]> = { stories: [1080, 1920], reels: [1080, 1920], feed: [1080, 1350], tv: [1920, 1080] };

function safeZone(fmt: string): { x: number; y: number; w: number; h: number } {
  switch (fmt) {
    case "stories": case "reels": { const h = Math.round(1920 * 0.85); return { x: 0,   y: Math.round((1920 - h) / 2), w: 1080, h }; }
    case "feed":                  { const h = Math.round(1350 * 0.90); return { x: 0,   y: Math.round((1350 - h) / 2), w: 1080, h }; }
    case "tv":                    { const h = Math.round(1080 * 0.90); return { x: 100, y: Math.round((1080 - h) / 2), w: 960,  h }; }
    default: { const [cW, cH] = FMTS[fmt] ?? [1080, 1920]; return { x: 0, y: 0, w: cW, h: cH }; }
  }
}

/** Protege bindParams de elementos text: nunca deixa bind de imagem (imghrz, imgfundo, imghotel*) num text.
 *  Se um elemento text tiver bindParam de imagem, reverte para o bind textual correto. */
function sanitizeTextBinds(elements: unknown[]): unknown[] {
  const IMAGE_ONLY_BINDS = new Set(["imghrz", "imgfundo", "imghotel", "imghotel2"]);
  return (elements ?? []).map((el: any) => {
    if (el?.type === "text" && IMAGE_ONLY_BINDS.has(el.bindParam)) {
      const fixedBind = el.id === "p_dst" ? "destino" : "hotel";
      console.warn(`[sanitizeTextBinds] ${el.id}: bindParam ${el.bindParam} → ${fixedBind}`);
      return { ...el, bindParam: fixedBind };
    }
    return el;
  });
}

function EditorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get("id");
  const [schema, setSchema] = useState<EditorSchema>({ elements: [], background: "#FFFFFF", duration: 5 });
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [format, setFormat] = useState("stories");
  const [formType, setFormType] = useState("pacote");
  const [qtdDestinos, setQtdDestinos] = useState(4);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [editingStarterId, setEditingStarterId] = useState<string | null>(null);
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ thumbnail?: string } | null>(null);
  const [pendingVariants, setPendingVariants] = useState<
    { schema: EditorSchema; width: number; height: number; format: string }[] | null
  >(null);
  const [loadedNome, setLoadedNome] = useState<string>("");
  const [loadedLicenseeId, setLoadedLicenseeId] = useState<string | undefined>(undefined);
  const [loadedLojaId, setLoadedLojaId] = useState<string | undefined>(undefined);
  const [loadedLicenseeNome, setLoadedLicenseeNome] = useState<string | undefined>(undefined);
  const [loadedLojaNome, setLoadedLojaNome] = useState<string | undefined>(undefined);
  const [loadedThumbnail, setLoadedThumbnail] = useState<string | null>(null);
  const [loadedAccessSelections, setLoadedAccessSelections] = useState<Map<string, Set<string>>>(new Map());
  const [isAdm, setIsAdm] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [editorLogoUrl, setEditorLogoUrl] = useState<string | undefined>(undefined);
  const persistSchemaRef = useRef<(() => Promise<void>) | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [cW, cH] = FMTS[format] ?? [1080, 1920];

  // Carrega role do usuário
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile(supabase);
        if (profile?.role === "adm" || profile?.role === "operador") setIsAdm(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userIdRef.current = authUser?.id ?? null;
      } catch {}
    })();
  }, []);

  // Quick start: abre modal se não houver id
  useEffect(() => {
    if (!templateId) setShowQuickStart(true);
  }, [templateId]);

  // Logo do editor
  useEffect(() => {
    getSystemConfig("editor_logo_url").then(val => {
      if (val) setEditorLogoUrl(val);
    });
  }, []);

  // Flag variantes
  useEffect(() => {
    getSystemConfig("variants_enabled_global").then(val => {
      if (val === "true") setVariantsEnabled(true);
    });
  }, []);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const raw = await getSystemConfig(`tmpl_${templateId}`);
        const data = raw ? { value: raw } : null;
        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (parsed.elements) {
            setSchema({ elements: sanitizeTextBinds(parsed.elements) as typeof schema.elements, background: parsed.bgColor || parsed.background || "#FFFFFF", duration: parsed.duration || 5, qtdDestinos: parsed.qtdDestinos, customBinds: parsed.customBinds });
            if (parsed.format) setFormat(parsed.format);
            if (parsed.formType) setFormType(parsed.formType);
            if (parsed.qtdDestinos) setQtdDestinos(parsed.qtdDestinos);
            if (parsed.nome) setLoadedNome(parsed.nome);
            if (parsed.licenseeId) setLoadedLicenseeId(parsed.licenseeId);
            if (parsed.lojaId) setLoadedLojaId(parsed.lojaId);
            if (parsed.licenseeNome) setLoadedLicenseeNome(parsed.licenseeNome);
            if (parsed.lojaNome) setLoadedLojaNome(parsed.lojaNome);
            setLoadedThumbnail(parsed.thumbnail ?? parsed.thumb ?? parsed.schema?.thumbnail ?? null);

            // Busca acessos existentes em template_access
            const { data: accessRows } = await supabase
              .from("template_access")
              .select("licensee_id,store_id")
              .eq("template_key", `tmpl_${templateId}`);

            if (accessRows && accessRows.length > 0) {
              const selMap = new Map<string, Set<string>>();
              for (const rec of accessRows as { licensee_id: string; store_id: string | null }[]) {
                if (!selMap.has(rec.licensee_id)) selMap.set(rec.licensee_id, new Set());
                if (rec.store_id) selMap.get(rec.licensee_id)!.add(rec.store_id);
              }
              setLoadedAccessSelections(selMap);
            } else if (parsed.licenseeId) {
              // Fallback: montar mapa a partir do JSON (template órfão sem template_access)
              const fallbackMap = new Map<string, Set<string>>();
              fallbackMap.set(parsed.licenseeId, parsed.lojaId ? new Set([parsed.lojaId]) : new Set());
              setLoadedAccessSelections(fallbackMap);
            }
          }
        }
      } catch (err) { console.error("[Editor] load:", err); }
      finally { setLoading(false); }
    })();
  }, [templateId]);

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  const persistSchema = useCallback(async () => {
    if (!templateId) return;
    const key = `tmpl_${templateId}`;
    const payload = {
      ...schema, width: cW, height: cH,
      format, formType, qtdDestinos,
      nome: loadedNome,
      licenseeId: loadedLicenseeId,
      lojaId: loadedLojaId,
      licenseeNome: loadedLicenseeNome,
      lojaNome: loadedLojaNome,
      thumbnail: loadedThumbnail,
    };
    try {
      const { error: hErr } = await supabase.from("template_history").insert({
        template_id: key,
        schema: payload,
        saved_by: userIdRef.current,
        note: "auto-save",
      });
      if (!hErr) {
        const { data: oldRows } = await supabase
          .from("template_history")
          .select("id, saved_at")
          .eq("template_id", key)
          .order("saved_at", { ascending: false })
          .range(10, 999);
        if (oldRows && oldRows.length > 0) {
          await supabase.from("template_history").delete()
            .in("id", oldRows.map((r: { id: string }) => r.id));
        }
      }
    } catch {}
    await supabase.from("system_config").upsert({
      key,
      value: JSON.stringify(payload),
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  }, [templateId, schema, cW, cH, format, formType, qtdDestinos, loadedNome, loadedLicenseeId, loadedLojaId, loadedLicenseeNome, loadedLojaNome, loadedThumbnail]);

  persistSchemaRef.current = persistSchema;

  const handleFormatChange = useCallback((newFmt: string) => {
    const oldZone = safeZone(format);
    const newZone = safeZone(newFmt);
    const scaleX = newZone.w / oldZone.w;
    const scaleY = newZone.h / oldZone.h;
    const fontScale = Math.min(scaleX, scaleY);

    const [oldW, oldH] = FMTS[format] ?? [1080, 1920];

    const remapped = schema.elements.map(el => {
      const e = el as any;

      const dentroZona =
        e.x >= -50 &&
        e.y >= -50 &&
        e.x <= oldW + 50 &&
        e.y <= oldH + 50 &&
        e.x >= oldZone.x - 50 &&
        e.y >= oldZone.y - 50 &&
        e.x <= oldZone.x + oldZone.w + 50 &&
        e.y <= oldZone.y + oldZone.h + 50;

      const relX = (e.x - oldZone.x) / oldZone.w;
      const relY = (e.y - oldZone.y) / oldZone.h;

      return {
        ...el,
        x: dentroZona
          ? Math.round(newZone.x + relX * newZone.w)
          : -9999,
        y: dentroZona
          ? Math.round(newZone.y + relY * newZone.h)
          : -9999,
        width:  Math.round(e.width  * fontScale),
        height: Math.round(e.height * fontScale),
        ...(e.fontSize     != null ? { fontSize:     Math.round(e.fontSize     * fontScale) } : {}),
        ...(e.cornerRadius != null ? { cornerRadius: Math.round(e.cornerRadius * fontScale) } : {}),
      };
    });

    setSchema({ ...schema, elements: remapped as typeof schema.elements });
    setFormat(newFmt);
  }, [format, schema]);

  useEffect(() => {
    if (!templateId) return;
    const interval = setInterval(async () => {
      setAutoSaveStatus("saving");
      try { await persistSchemaRef.current?.(); } catch { /* silent */ }
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 60000);
    return () => clearInterval(interval);
  }, [templateId]);

  if (loading) return <LoadingScreen text="Carregando template..." />;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <CanvasEditor
        isAdm={isAdm}
        logoUrl={editorLogoUrl}
        width={cW}
        height={cH}
        format={format}
        onFormatChange={handleFormatChange}
        formType={formType}
        onFormTypeChange={setFormType}
        qtdDestinos={qtdDestinos}
        onQtdDestinosChange={setQtdDestinos}
        schema={schema}
        onChange={(s) => setSchema(s)}
        onAddCustomBind={(bind) => {
          setSchema(prev => ({ ...prev, customBinds: [...(prev.customBinds || []), bind] }));
          setTimeout(() => persistSchemaRef.current?.(), 0);
        }}
        onRemoveCustomBind={(key) => {
          setSchema(prev => ({ ...prev, customBinds: (prev.customBinds || []).filter(b => b.key !== key) }));
          setTimeout(() => persistSchemaRef.current?.(), 0);
        }}
        autoSaveStatus={autoSaveStatus}
        saving={saving}
        templateId={templateId}
        variantsEnabled={variantsEnabled}
        onNew={() => setShowQuickStart(true)}
        onAdaptFormat={async (targetFormat, targetW, targetH, adaptedSchema) => {
          const baseName = loadedNome || "Template";
          const newName = `${baseName} (${targetFormat})`;
          const slug = slugifyTemplateName(newName);
          const newKey = `${slug}_${Date.now()}`;
          const payload = {
            ...adaptedSchema,
            width: targetW, height: targetH,
            format: targetFormat,
            formType,
            qtdDestinos,
            nome: newName,
            licenseeId: loadedLicenseeId,
            lojaId: loadedLojaId,
            licenseeNome: loadedLicenseeNome,
            lojaNome: loadedLojaNome,
            thumbnail: null,
          };
          try {
            await supabase.from("system_config").upsert({
              key: `tmpl_${newKey}`,
              value: JSON.stringify(payload),
              updated_at: new Date().toISOString(),
            }, { onConflict: "key" });
            invalidateSystemConfig(`tmpl_${newKey}`);
            // Sync form_templates
            const ftData = {
              config_key: `tmpl_${newKey}`,
              name: newName,
              form_type: formType,
              format: targetFormat,
              is_base: !loadedLicenseeId,
              active: true,
              licensee_id: loadedLicenseeId || null,
              schema: { elements: sanitizeTextBinds(adaptedSchema.elements), background: adaptedSchema.background, formType, width: targetW, height: targetH, customBinds: adaptedSchema.customBinds || [] },
              width: targetW,
              height: targetH,
              thumbnail_url: (payload as any)?.thumbnail || null,
            };
            await supabase.from("form_templates").upsert(ftData, { onConflict: "config_key" });
            // Copia permissões de acesso do template original
            if (templateId) {
              const { data: accessRows } = await supabase
                .from("template_access")
                .select("licensee_id,store_id")
                .eq("template_key", `tmpl_${templateId}`);
              if (accessRows && accessRows.length > 0) {
                const newRows = (accessRows as { licensee_id: string; store_id: string | null }[]).map(r => ({
                  template_key: `tmpl_${newKey}`,
                  licensee_id: r.licensee_id,
                  store_id: r.store_id,
                }));
                await supabase.from("template_access").insert(newRows);
              }
            }
            router.push(`/editor?id=${newKey}`);
          } catch (err) { console.error("[AdaptFormat]", err); alert("Erro ao criar cópia adaptada."); }
        }}
        onSaveVariants={(variants) => {
          // Stash as variantes e abre o modal pra coletar licensee/loja
          setPendingVariants(variants);
          setPendingSave({});
        }}
        onSave={(thumbnail) => {
          // Abre modal com metadados em vez de salvar direto
          setPendingSave({ thumbnail });
        }}
        onExport={(dataUrl) => {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `aurohub_${templateId || "novo"}_${Date.now()}.png`;
          a.click();
        }}
        onExportJpg={(dataUrl) => {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `aurohub_${templateId || "novo"}_${Date.now()}.jpg`;
          a.click();
        }}
      />
      {saved && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#22C55E", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>Salvo!</div>}
      {pendingSave && (
        <SaveTemplateModal
          initialName={loadedNome}
          initialFormType={formType}
          initialFormat={format}
          initialLicenseeId={loadedLicenseeId}
          initialLojaId={loadedLojaId}
          initialAccessSelections={loadedAccessSelections}
          captureThumb={pendingSave.thumbnail ?? null}
          existingThumb={loadedThumbnail}
          onClose={() => { setPendingSave(null); setPendingVariants(null); }}
          onConfirm={async (meta: SaveTemplateData) => {
            setSaving(true);
            // meta.thumbnail é o dataURL efetivo escolhido no modal (capture ou upload manual).
            // Fallback pro thumb capturado original apenas caso o modal não tenha mandado.
            let thumbnail: string | null = null;
            const rawThumb = meta.thumbnail ?? pendingSave.thumbnail ?? null;
            if (rawThumb && rawThumb.startsWith("data:")) {
              try {
                const res = await fetch("/api/upload-thumb", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dataUrl: rawThumb, folder: "aurohubv2/thumbs" }),
                });
                if (!res.ok) {
                  const detail = await res.text().catch(() => "");
                  throw new Error(`upload-thumb ${res.status}: ${detail.slice(0, 300)}`);
                }
                const json = await res.json();
                thumbnail = json.url ?? null;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[Editor] Thumb upload falhou:", err);
                alert(`Upload do thumbnail falhou. Template será salvo sem imagem — você pode adicionar depois pelo editor de templates.\n\n${msg}`);
              }
            } else if (rawThumb) {
              thumbnail = rawThumb;
            }
            try {
              // Fluxo de variantes: salva cada uma com meta do modal
              if (pendingVariants && pendingVariants.length > 0) {
                for (const v of pendingVariants) {
                  const key = `tmpl_variant_${v.format}_${Date.now()}`;
                  const vEls = (v.schema?.elements ?? []) as Array<{ type?: string; src?: string }>;
                  const vFirstImg = vEls.find((e) => e?.type === "image" && typeof e?.src === "string" && e.src!.length > 0)?.src;
                  const vBg = (v.schema as { background?: string })?.background;
                  const vFallback = vFirstImg || (vBg && typeof vBg === "string" && (vBg.startsWith("http") || vBg.startsWith("data:")) ? vBg : null);
                  const payload = {
                    ...v.schema, width: v.width, height: v.height,
                    format: v.format, formType: meta.formType, qtdDestinos,
                    nome: meta.nome,
                    licenseeId: meta.licenseeId, lojaId: meta.lojaId,
                    licenseeNome: meta.licenseeNome, lojaNome: meta.lojaNome,
                    thumbnail: thumbnail || vFallback || null,
                  };
                  await supabase.from("system_config").upsert({
                    key,
                    value: JSON.stringify(payload),
                    updated_at: new Date().toISOString(),
                  }, { onConflict: "key" });
                  // Sync automático com form_templates
                  try {
                    invalidateSystemConfig(key);
                    const scRow = { value: JSON.stringify(payload) };
                    if (scRow) {
                      const p = JSON.parse(scRow.value);
                      const ftData = {
                        config_key: key,
                        name: p.nome || key,
                        form_type: (p.formType || "pacote").replace("quatro_destinos","card_whatsapp"),
                        format: p.format || "stories",
                        is_base: !p.licenseeId,
                        active: true,
                        licensee_id: p.licenseeId || null,
                        schema: { elements: sanitizeTextBinds(p.elements || []), background: p.background || "#0E1520", formType: p.formType, width: p.width || 1080, height: p.height || 1920, customBinds: p.customBinds || [] },
                        width: p.width || 1080,
                        height: p.height || 1920,
                        thumbnail_url: p.thumbnail || null,
                      };
                      const { error: ftErr } = await supabase.from("form_templates").upsert(ftData, { onConflict: "config_key" });
                      if (ftErr) console.error("[Editor][sync-variant] erro:", ftErr);
                    }
                  } catch (syncErr) { console.error("[Editor][sync-variant] catch:", syncErr); }
                }
                alert(`${pendingVariants.length} variantes salvas!`);
                setPendingVariants(null);
                setPendingSave(null);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                return;
              }

              // Fluxo especial: editando template starter
              if (editingStarterId) {
                const asStarter = confirm("Salvar como template padrão (starter)?\n\nOK = substitui o padrão de fábrica para todos os usuários\nCancelar = salva como template normal");
                if (asStarter) {
                  const payload = {
                    schema: {
                      ...schema, width: cW, height: cH,
                      format: meta.format, formType: meta.formType, qtdDestinos,
                      nome: meta.nome,
                      licenseeId: meta.licenseeId, lojaId: meta.lojaId,
                      licenseeNome: meta.licenseeNome, lojaNome: meta.lojaNome,
                    },
                    thumbnail: thumbnail || null,
                  };
                  await supabase.from("system_config").upsert({
                    key: editingStarterId,
                    value: JSON.stringify(payload),
                    updated_at: new Date().toISOString(),
                  }, { onConflict: "key" });
                  // Sync automático com form_templates
                  try {
                    invalidateSystemConfig(editingStarterId as string);
                    const scRow = { value: JSON.stringify(payload) };
                    if (scRow) {
                      const p = JSON.parse(scRow.value);
                      const ftData = {
                        config_key: editingStarterId,
                        name: p.nome || editingStarterId,
                        form_type: (p.formType || "pacote").replace("quatro_destinos","card_whatsapp"),
                        format: p.format || "stories",
                        is_base: !p.licenseeId,
                        active: true,
                        licensee_id: p.licenseeId || null,
                        schema: { elements: sanitizeTextBinds(p.elements || []), background: p.background || "#0E1520", formType: p.formType, width: p.width || 1080, height: p.height || 1920, customBinds: p.customBinds || [] },
                        width: p.width || 1080,
                        height: p.height || 1920,
                        thumbnail_url: p.thumbnail || null,
                      };
                      const { error: ftErr } = await supabase.from("form_templates").upsert(ftData, { onConflict: "config_key" });
                      if (ftErr) console.error("[Editor][sync-starter] erro:", ftErr);
                    }
                  } catch (syncErr) { console.error("[Editor][sync-starter] catch:", syncErr); }
                  setEditingStarterId(null);
                  setLoadedNome(meta.nome);
                  setFormat(meta.format);
                  setFormType(meta.formType);
                  setLoadedLicenseeId(meta.licenseeId);
                  setLoadedLojaId(meta.lojaId);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                  setPendingSave(null);
                  return;
                }
                setEditingStarterId(null);
              }

              // Key: existente mantém; novo vira tmpl_{slug}_{ts}
              const slug = slugifyTemplateName(meta.nome);
              const key = templateId || `${slug}_${Date.now()}`;
              const payload = {
                ...schema,
                elements: sanitizeTextBinds(schema.elements) as typeof schema.elements,
                width: cW, height: cH,
                format: meta.format, formType: meta.formType, qtdDestinos,
                nome: meta.nome,
                is_base: meta.isBase ?? false,
                licenseeId: meta.licenseeId || (meta.accessSelections && meta.accessSelections.size > 0 ? [...meta.accessSelections.keys()][0] : undefined),
                lojaId: meta.lojaId,
                licenseeNome: meta.licenseeNome || loadedLicenseeNome,
                lojaNome: meta.lojaNome || loadedLojaNome,
                thumbnail: thumbnail || null,
              };
              try {
                const { error: hErr } = await supabase.from("template_history").insert({
                  template_id: key,
                  schema: payload,
                  saved_by: userIdRef.current,
                  note: "auto-save antes de edição",
                });
                if (!hErr) {
                  const { data: oldRows } = await supabase
                    .from("template_history")
                    .select("id, saved_at")
                    .eq("template_id", key)
                    .order("saved_at", { ascending: false })
                    .range(10, 999);
                  if (oldRows && oldRows.length > 0) {
                    await supabase.from("template_history").delete()
                      .in("id", oldRows.map((r: { id: string }) => r.id));
                  }
                }
              } catch {}
              await supabase.from("system_config").upsert({
                key: `tmpl_${key}`,
                value: JSON.stringify(payload),
                updated_at: new Date().toISOString(),
              }, { onConflict: "key" });
              // Sync automático com form_templates
              try {
                invalidateSystemConfig(`tmpl_${key}`);
                const scRow = { value: JSON.stringify(payload) };
                if (scRow) {
                  const p = JSON.parse(scRow.value);
                  const ftData = {
                    config_key: `tmpl_${key}`,
                    name: p.nome || key,
                    form_type: (p.formType || "pacote").replace("quatro_destinos","card_whatsapp"),
                    format: p.format || "stories",
                    is_base: !p.licenseeId,
                    active: true,
                    licensee_id: p.licenseeId || null,
                    schema: { elements: sanitizeTextBinds(p.elements || []), background: p.background || "#0E1520", formType: p.formType, width: p.width || 1080, height: p.height || 1920 },
                    width: p.width || 1080,
                    height: p.height || 1920,
                    thumbnail_url: p.thumbnail || null,
                  };
                  const { error: ftErr } = await supabase.from("form_templates").upsert(ftData, { onConflict: "config_key" });
                  if (ftErr) console.error("[Editor][sync] form_templates erro:", ftErr);
                }
              } catch (syncErr) { console.error("[Editor][sync] catch:", syncErr); }

              // Salva acesso em template_access
              try {
                await supabase.from("template_access").delete().eq("template_key", `tmpl_${key}`);

                if (!meta.isBase && meta.accessSelections && meta.accessSelections.size > 0) {
                  const accessRows: { template_key: string; licensee_id: string; store_id: string | null }[] = [];
                  for (const [licId, storeIds] of meta.accessSelections.entries()) {
                    if (storeIds.size === 0) {
                      accessRows.push({ template_key: `tmpl_${key}`, licensee_id: licId, store_id: null });
                    } else {
                      for (const storeId of storeIds) {
                        accessRows.push({ template_key: `tmpl_${key}`, licensee_id: licId, store_id: storeId });
                      }
                    }
                  }
                  const { error } = await supabase.from("template_access").insert(accessRows);
                  if (error) console.error("[ACCESS] insert error:", error);
                } else if (!meta.isBase && payload.licenseeId) {
                  // Fallback: template tem licenseeId mas accessSelections vazio → criar registro órfão
                  const fallbackRow = {
                    template_key: `tmpl_${key}`,
                    licensee_id: payload.licenseeId,
                    store_id: payload.lojaId || null,
                  };
                  const { error } = await supabase.from("template_access").insert([fallbackRow]);
                  if (error) console.error("[ACCESS] fallback insert error:", error);
                }
              } catch (err) {
                console.error("[ACCESS] catch:", err);
              }

              // Notifica usuários do licensee — novo ou atualizado
              if (meta.licenseeId) {
                try {
                  const { data: users } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("licensee_id", meta.licenseeId);
                  const userIds = (users ?? []).map((u: { id: string }) => u.id);
                  if (userIds.length > 0) {
                    const isUpdate = !!templateId;
                    fetch("/api/push/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userIds,
                        title: isUpdate ? "🔄 Template atualizado" : "✨ Novo template disponível",
                        body: isUpdate
                          ? `O template '${meta.nome}' foi atualizado com melhorias. Confira!`
                          : `${meta.nome} — ${meta.format}`,
                        url: "/",
                        tag: isUpdate ? "updated-template" : "new-template",
                      }),
                    }).catch(() => null);
                  }
                } catch { /* silent */ }
              }

              // Atualiza estado local com os metadados confirmados
              setLoadedNome(meta.nome);
              setFormat(meta.format);
              setFormType(meta.formType);
              setLoadedLicenseeId(meta.licenseeId);
              setLoadedLojaId(meta.lojaId);
              setLoadedThumbnail(thumbnail);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
              setPendingSave(null);
              if (!templateId) router.replace(`/editor?id=${key}`);
            } catch (err) { console.error("[Save]", err); alert("Erro ao salvar."); }
            finally { setSaving(false); }
          }}
        />
      )}
      {showQuickStart && (
        <QuickStartModal
          onClose={() => setShowQuickStart(false)}
          onPick={(p: EditorPreset) => {
            setSchema(p.schema);
            setFormType(p.formType);
            setFormat(p.format);
            if (p.schema.qtdDestinos) setQtdDestinos(p.schema.qtdDestinos);
            setEditingStarterId(null);
          }}
          onEdit={(p: EditorPreset, starterKey: string) => {
            setSchema(p.schema);
            setFormType(p.formType);
            setFormat(p.format);
            if (p.schema.qtdDestinos) setQtdDestinos(p.schema.qtdDestinos);
            setEditingStarterId(starterKey);
          }}
        />
      )}
      {editingStarterId && (
        <div style={{ position: "fixed", top: 52, left: "50%", transform: "translateX(-50%)", background: "var(--ed-bind)", color: "#0c0c12", padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 800, zIndex: 9998, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          ✎ Editando template padrão: <span style={{ textTransform: "uppercase" }}>{editingStarterId.replace(STARTER_KEY_PREFIX, "")}</span>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return <Suspense fallback={<LoadingScreen text="Carregando..." />}><EditorInner /></Suspense>;
}

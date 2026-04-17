"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

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
  const FMTS: Record<string, [number,number]> = { stories: [1080,1920], reels: [1080,1920], feed: [1080,1350], tv: [1920,1080] };
  const [cW, cH] = FMTS[format] || [1080, 1920];

  // Quick start: abre modal se não houver id
  useEffect(() => {
    if (!templateId) setShowQuickStart(true);
  }, [templateId]);

  // Flag variantes
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("system_config").select("value").eq("key", "variants_enabled_global").single();
        if (data?.value === "true") setVariantsEnabled(true);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const { data } = await supabase.from("system_config").select("value").eq("key", `tmpl_${templateId}`).single();
        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (parsed.elements) {
            setSchema({ elements: parsed.elements, background: parsed.bgColor || parsed.background || "#FFFFFF", duration: parsed.duration || 5, qtdDestinos: parsed.qtdDestinos });
            if (parsed.format) setFormat(parsed.format);
            if (parsed.formType) setFormType(parsed.formType);
            if (parsed.qtdDestinos) setQtdDestinos(parsed.qtdDestinos);
            if (parsed.nome) setLoadedNome(parsed.nome);
            if (parsed.licenseeId) setLoadedLicenseeId(parsed.licenseeId);
            if (parsed.lojaId) setLoadedLojaId(parsed.lojaId);
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

  if (loading) return <LoadingScreen text="Carregando template..." />;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <CanvasEditor
        width={cW}
        height={cH}
        format={format}
        onFormatChange={setFormat}
        formType={formType}
        onFormTypeChange={setFormType}
        qtdDestinos={qtdDestinos}
        onQtdDestinosChange={setQtdDestinos}
        schema={schema}
        onChange={setSchema}
        saving={saving}
        templateId={templateId}
        variantsEnabled={variantsEnabled}
        onNew={() => setShowQuickStart(true)}
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
      />
      {saved && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#22C55E", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>Salvo!</div>}
      {pendingSave && (
        <SaveTemplateModal
          initialName={loadedNome}
          initialFormType={formType}
          initialFormat={format}
          initialLicenseeId={loadedLicenseeId}
          initialLojaId={loadedLojaId}
          onClose={() => { setPendingSave(null); setPendingVariants(null); }}
          onConfirm={async (meta: SaveTemplateData) => {
            setSaving(true);
            // Auto-upload da thumbnail do canvas pra Cloudinary via API route
            let thumbnail: string | null = null;
            const rawThumb = pendingSave.thumbnail;
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
                ...schema, width: cW, height: cH,
                format: meta.format, formType: meta.formType, qtdDestinos,
                nome: meta.nome,
                licenseeId: meta.licenseeId, lojaId: meta.lojaId,
                licenseeNome: meta.licenseeNome, lojaNome: meta.lojaNome,
                thumbnail: thumbnail || null,
              };
              console.log("[Editor][save] system_config upsert:", { key: `tmpl_${key}`, hasThumbnail: !!thumbnail, thumbnailLen: thumbnail?.length ?? 0 });
              await supabase.from("system_config").upsert({
                key: `tmpl_${key}`,
                value: JSON.stringify(payload),
                updated_at: new Date().toISOString(),
              }, { onConflict: "key" });
              try {
                const { error: hErr } = await supabase.from("template_history").insert({
                  template_id: key,
                  schema: payload,
                  thumbnail: thumbnail || null,
                });
                if (hErr) throw hErr;
              } catch (hErr) {
                // Alert silenciado até a tabela `template_history` existir (AUDIT_TODO item 1).
                // Quando a tabela for criada, restaurar o alert para alinhar com o fail-loud do upload-thumb.
                console.warn("[History save] falhou:", hErr);
              }

              // Atualiza estado local com os metadados confirmados
              setLoadedNome(meta.nome);
              setFormat(meta.format);
              setFormType(meta.formType);
              setLoadedLicenseeId(meta.licenseeId);
              setLoadedLojaId(meta.lojaId);
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

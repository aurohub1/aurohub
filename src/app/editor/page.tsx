"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import type { EditorSchema } from "@/components/editor/canvas-editor";

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
  const FMTS: Record<string, [number,number]> = { stories: [1080,1920], reels: [1080,1920], feed: [1080,1350], tv: [1920,1080] };
  const [cW, cH] = FMTS[format] || [1080, 1920];

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
          }
        }
      } catch (err) { console.error("[Editor] load:", err); }
      finally { setLoading(false); }
    })();
  }, [templateId]);

  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
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
        onSave={async () => {
          setSaving(true);
          try {
            const key = templateId || `tmpl_${Date.now()}`;
            const payload = { ...schema, width: cW, height: cH, format, formType, qtdDestinos };
            await supabase.from("system_config").upsert({
              key: `tmpl_${key}`,
              value: JSON.stringify(payload),
              updated_at: new Date().toISOString(),
            }, { onConflict: "key" });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            // Redirect to ?id=key after first save
            if (!templateId) router.replace(`/editor?id=${key}`);
          } catch (err) { console.error("[Save]", err); alert("Erro ao salvar."); }
          finally { setSaving(false); }
        }}
        onExport={(dataUrl) => {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `aurohub_${templateId || "novo"}_${Date.now()}.png`;
          a.click();
        }}
      />
      {saved && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#22C55E", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>Salvo!</div>}
    </div>
  );
}

export default function EditorPage() {
  return <Suspense fallback={<LoadingScreen text="Carregando..." />}><EditorInner /></Suspense>;
}

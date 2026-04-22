"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, Sparkles, ListChecks, Save, Loader2, X, Check, Plus, Trash2 } from "lucide-react";

/* ── Types ────────────────────────────────────────── */

type Format = "feed" | "stories" | "reels" | "tv";
type FormType = "pacote" | "campanha" | "passagem" | "cruzeiro" | "anoiteceu" | "lamina";

interface DetectedElement {
  bind: string;
  label?: string;
  type: "text" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  color?: string;
}

interface Rule {
  id: string;
  field: string;
  description: string;
  type: string;
  params: Record<string, unknown>;
  summary: string;
}

interface Licensee {
  id: string;
  name: string;
}

const FORMAT_LABEL: Record<Format, string> = {
  feed: "Feed 1:1",
  stories: "Stories 9:16",
  reels: "Reels 9:16",
  tv: "TV 16:9",
};

const FORMAT_ASPECT: Record<Format, string> = {
  feed: "4/5",
  stories: "9/16",
  reels: "9/16",
  tv: "16/9",
};

const FORM_TYPES: { value: FormType; label: string }[] = [
  { value: "pacote", label: "Pacote" },
  { value: "campanha", label: "Campanha" },
  { value: "passagem", label: "Passagem" },
  { value: "cruzeiro", label: "Cruzeiro" },
  { value: "anoiteceu", label: "Anoiteceu" },
  { value: "lamina", label: "Card WhatsApp" },
];

function detectFormat(w: number, h: number): Format {
  const ratio = w / h;
  if (ratio < 0.7) return "stories";
  if (ratio > 1.5) return "tv";
  return "feed";
}

/* ── Page ─────────────────────────────────────────── */

export default function ImportarTemplatePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — upload
  const [file, setFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<string>("");
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState<Format>("feed");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — analyze
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [elements, setElements] = useState<DetectedElement[]>([]);
  const [formType, setFormType] = useState<FormType>("pacote");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);

  // Step 3 — rules
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleField, setRuleField] = useState<string | null>(null);
  const [ruleDesc, setRuleDesc] = useState("");
  const [rulePreview, setRulePreview] = useState<Rule | null>(null);
  const [generatingRule, setGeneratingRule] = useState(false);
  const [ruleError, setRuleError] = useState("");
  const [dateFormatOverride, setDateFormatOverride] = useState<Record<string, "full" | "short">>({});

  // Step 4 — save
  const [templateName, setTemplateName] = useState("");
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseeId, setLicenseeId] = useState<string>("base");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  /* ── Load licensees ──────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("licensees").select("id, name").order("name");
      if (data) setLicensees(data);
    })();
  }, []);

  /* ── File handling ───────────────────────────── */
  const processFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setAnalyzeError("Arquivo deve ser PNG ou JPG.");
      return;
    }
    setFile(f);
    setAnalyzeError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setImageData(data);
      const img = new Image();
      img.onload = () => {
        setImgW(img.width);
        setImgH(img.height);
        setDetectedFormat(detectFormat(img.width, img.height));
      };
      img.src = data;
    };
    reader.readAsDataURL(f);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  /* ── Step 2: Analyze ─────────────────────────── */
  async function runAnalyze() {
    if (!imageData) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setStep(2);
    try {
      const res = await fetch("/api/analyze-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          mediaType: file?.type || "image/png",
          width: imgW,
          height: imgH,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAnalyzeError(body.error || "Falha na análise");
      } else {
        setElements(body.elements || []);
        setFormType((body.formType as FormType) || "pacote");
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateBind(idx: number, newBind: string) {
    setElements((prev) => prev.map((el, i) => (i === idx ? { ...el, bind: newBind } : el)));
  }

  useEffect(() => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      setImgRect(rect);
    }
  }, [imageData, elements]);

  /* ── Step 3: Rules ───────────────────────────── */
  async function generateRule() {
    if (!ruleField || !ruleDesc.trim()) return;
    setGeneratingRule(true);
    setRuleError("");
    setRulePreview(null);
    try {
      const res = await fetch("/api/generate-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: ruleField, description: ruleDesc }),
      });
      const body = await res.json();
      if (!res.ok) {
        setRuleError(body.error || "Falha ao gerar regra");
      } else {
        setRulePreview({
          id: `rule_${Date.now()}`,
          field: body.field,
          description: body.description,
          type: body.rule.type,
          params: body.rule.params,
          summary: body.rule.summary,
        });
      }
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setGeneratingRule(false);
    }
  }

  function confirmRule() {
    if (!rulePreview) return;
    setRules((prev) => [...prev, rulePreview]);
    setRulePreview(null);
    setRuleDesc("");
    setRuleField(null);
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  /* ── Step 4: Save ────────────────────────────── */
  console.log("elements ao salvar:", elements);

  const canvasW = detectedFormat === "tv" ? 1920 : 1080;
  const canvasH = detectedFormat === "stories" ? 1920 : detectedFormat === "feed" ? 1350 : 1080;

  const konvaElements = elements.map((el, i) => ({
    id: `imported_${i}_${Date.now()}`,
    name: el.bind || `elemento_${i}`,
    type: el.type === "image" ? "image" : "text",
    x: Math.round((el.x / 100) * canvasW),
    y: Math.round((el.y / 100) * canvasH),
    width: Math.round((el.w / 100) * canvasW),
    height: Math.round((el.h / 100) * canvasH),
    fontSize: el.fontSize || 32,
    fontFamily: "Helvetica Neue",
    fontStyle: "bold",
    fill: el.color || "#FFFFFF",
    text: el.bind ? `[${el.bind}]` : el.label || "",
    bindParam: el.bind || "",
    visible: true,
    locked: false,
    rotation: 0,
    opacity: 1,
    imageFit: el.type === "image" ? "cover" : undefined,
  }));

  const templateJson = {
    nome: templateName,
    format: detectedFormat,
    formType,
    width: canvasW,
    height: canvasH,
    segmento: "Geral",
    licenseeId: licenseeId === "base" ? null : licenseeId,
    is_base: licenseeId === "base",
    elements: konvaElements,
    rules: rules.map((r) => ({
      field: r.field,
      type: r.type,
      params: r.params,
      description: r.description,
      summary: r.summary,
    })),
  };

  async function saveTemplate() {
    if (!templateName.trim()) {
      setSaveError("Nome do template é obrigatório.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const key = `tmpl_${Date.now()}`;
      const { error } = await supabase.from("system_config").upsert(
        {
          key,
          value: JSON.stringify(templateJson),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) {
        setSaveError(error.message);
      } else {
        setSavedKey(key);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--txt)]">Importar Template</h1>
          <p className="text-sm text-[var(--txt3)]">Upload de imagem com fundo verde → IA detecta campos → salva como template.</p>
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-3">
        {[
          { n: 1, label: "Upload", icon: Upload },
          { n: 2, label: "Análise", icon: Sparkles },
          { n: 3, label: "Regras", icon: ListChecks },
          { n: 4, label: "Salvar", icon: Save },
        ].map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${
                  active
                    ? "bg-[var(--orange3)] text-[var(--orange)]"
                    : done
                    ? "text-[var(--txt2)]"
                    : "text-[var(--txt3)]"
                }`}
              >
                <Icon size={14} />
                <span>
                  {s.n}. {s.label}
                </span>
                {done && <Check size={14} className="text-[var(--green)]" />}
              </div>
              {i < 3 && <div className={`h-px flex-1 ${done ? "bg-[var(--green)]" : "bg-[var(--bdr)]"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Upload */}
      {step === 1 && (
        <section className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-6">
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
              drag ? "border-[var(--orange)] bg-[var(--orange3)]" : "border-[var(--bdr)] bg-[var(--bg)]"
            }`}
          >
            {imageData ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt="Preview" className="max-h-[320px] max-w-full rounded-lg object-contain" />
                <p className="text-sm text-[var(--txt2)]">
                  {file?.name} • {imgW}×{imgH}px • <span className="font-semibold text-[var(--orange)]">{FORMAT_LABEL[detectedFormat]}</span>
                </p>
              </>
            ) : (
              <>
                <Upload size={36} className="text-[var(--txt3)]" />
                <p className="text-sm font-medium text-[var(--txt2)]">Arraste uma imagem ou clique para selecionar</p>
                <p className="text-xs text-[var(--txt3)]">PNG ou JPG. Regiões verdes serão detectadas como campos.</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>

          {analyzeError && <p className="mt-3 text-sm text-[var(--red)]">{analyzeError}</p>}

          <div className="mt-5 flex justify-end">
            <button
              disabled={!imageData}
              onClick={runAnalyze}
              className="flex items-center gap-2 rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--orange)]/90 disabled:opacity-40"
            >
              <Sparkles size={14} /> Analisar
            </button>
          </div>
        </section>
      )}

      {/* Step 2 — Analyze */}
      {step === 2 && (
        <section className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-6">
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-[var(--orange)]" />
              <p className="mt-4 text-sm text-[var(--txt2)]">Claude Vision analisando imagem…</p>
              <p className="text-xs text-[var(--txt3)]">Detectando campos verdes e inferindo binds.</p>
            </div>
          )}

          {!analyzing && analyzeError && (
            <div className="rounded-lg border border-[var(--red3)] bg-[var(--red3)]/30 p-4 text-sm text-[var(--red)]">
              <p className="font-semibold">Falha na análise</p>
              <p>{analyzeError}</p>
              <button onClick={runAnalyze} className="mt-3 text-[13px] font-medium underline">
                Tentar novamente
              </button>
            </div>
          )}

          {!analyzing && !analyzeError && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col items-center">
                <div
                  className="relative overflow-hidden rounded-lg border border-[var(--bdr)]"
                  style={{ aspectRatio: FORMAT_ASPECT[detectedFormat], maxHeight: "45vh", maxWidth: "320px", width: "100%" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageData}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onLoad={() => {
                      if (imgRef.current) {
                        setImgRect(imgRef.current.getBoundingClientRect());
                      }
                    }}
                  />

                  {/* Overlays container */}
                  {imgRect && (
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        left: 0,
                        top: 0,
                        width: imgRect.width,
                        height: imgRect.height,
                      }}
                    >
                      {elements.map((el, idx) => (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className={`absolute border-2 transition-all pointer-events-auto ${
                            hoveredIdx === idx
                              ? "border-[var(--orange)] bg-[var(--orange)]/30 z-10"
                              : "border-blue-400 bg-blue-400/15"
                          }`}
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            cursor: "pointer",
                          }}
                        >
                          {el.bind && (
                            <div
                              className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                hoveredIdx === idx
                                  ? "bg-[var(--orange)]/80 text-white"
                                  : "bg-blue-500/80 text-white"
                              }`}
                            >
                              {el.bind}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--txt3)]">
                  {imgW}×{imgH}px • {FORMAT_LABEL[detectedFormat]}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--txt3)]">Tipo de formulário sugerido</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as FormType)}
                    className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--txt)]"
                  >
                    {FORM_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--txt)]">
                    {elements.length} elemento{elements.length === 1 ? "" : "s"} detectado{elements.length === 1 ? "" : "s"}
                  </h3>

                  {elements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Sparkles className="mb-3 h-8 w-8 text-[var(--txt3)]" />
                      <p className="text-sm text-[var(--txt3)]">Nenhum campo detectado.</p>
                    </div>
                  ) : (
                    <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                      {elements.map((el, idx) => (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className={`flex flex-col gap-2 rounded-lg border px-3 py-2 transition-colors ${
                            hoveredIdx === idx
                              ? "border-[var(--orange)] bg-[var(--orange3)]/20"
                              : "border-[var(--bdr)] bg-[var(--bg)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                el.type === "image" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {el.type}
                            </span>
                            <input
                              value={el.bind}
                              onChange={(e) => updateBind(idx, e.target.value)}
                              className={`flex-1 rounded border px-2 py-1 text-sm ${
                                el.bind === ""
                                  ? "border-[var(--orange3)] bg-[var(--orange3)]/10 text-[var(--txt)] placeholder:text-[var(--txt3)]"
                                  : "border-transparent bg-transparent text-[var(--txt)]"
                              } hover:border-[var(--bdr)] focus:border-[var(--orange)] focus:outline-none`}
                              placeholder={el.bind === "" ? "ex: destino, valorint, parcelas..." : "bind"}
                            />
                            <span className="font-mono text-[10px] text-[var(--txt3)]">
                              {el.x.toFixed(0)},{el.y.toFixed(0)} {el.w.toFixed(0)}×{el.h.toFixed(0)}
                            </span>
                            {el.color && <span className="h-4 w-4 rounded border border-[var(--bdr)]" style={{ background: el.color }} />}
                          </div>
                          {el.label && (
                            <div className="text-[11px] text-[var(--txt3)]">
                              Detectado: <span className="italic">{el.label}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--txt2)]"
            >
              Voltar
            </button>
            <button
              disabled={analyzing || elements.length === 0}
              onClick={() => setStep(3)}
              className="rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Próximo: Regras
            </button>
          </div>
        </section>
      )}

      {/* Step 3 — Rules */}
      {step === 3 && (
        <section className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--txt)]">Regras por campo</h2>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--txt3)]">Campos</h3>
              {elements.filter((e) => e.bind).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--bdr)] py-12 text-center">
                  <ListChecks className="mb-3 h-8 w-8 text-[var(--txt3)]" />
                  <p className="text-sm text-[var(--txt3)]">Preencha os binds na etapa anterior para adicionar regras.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {elements.filter((e) => e.bind).map((el, idx) => {
                  const ruleCount = rules.filter((r) => r.field === el.bind).length;
                  const isDateField = el.bind === "dataida" || el.bind === "datavolta";
                  return (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[var(--txt)]">{el.bind}</span>
                          {isDateField && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                              REGRA GLOBAL
                            </span>
                          )}
                          {ruleCount > 0 && (
                            <span className="rounded-full bg-[var(--orange3)] px-2 py-0.5 text-[10px] font-bold text-[var(--orange)]">
                              {ruleCount} regra{ruleCount === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setRuleField(el.bind);
                            setRuleDesc("");
                            setRulePreview(null);
                            setRuleError("");
                          }}
                          className="flex items-center gap-1 rounded-md border border-[var(--bdr)] px-2 py-1 text-[11px] font-medium text-[var(--txt2)] hover:border-[var(--orange)] hover:text-[var(--orange)]"
                        >
                          <Plus size={10} /> Regra
                        </button>
                      </div>
                      {isDateField && (
                        <div className="ml-6 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px]">
                          <div className="mb-1 font-semibold text-green-800">
                            {el.bind === "dataida" ? "Validação automática: >= hoje" : "Validação automática: >= data de ida"}
                          </div>
                          <div className="mb-2 text-green-700">
                            Formato de exibição:
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDateFormatOverride((prev) => ({ ...prev, [el.bind]: "full" }))}
                              className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                                dateFormatOverride[el.bind] === "full"
                                  ? "border-green-600 bg-green-600 text-white"
                                  : "border-green-300 bg-white text-green-700 hover:border-green-500"
                              }`}
                            >
                              Completa (25/03/2026)
                            </button>
                            <button
                              onClick={() => setDateFormatOverride((prev) => ({ ...prev, [el.bind]: "short" }))}
                              className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                                dateFormatOverride[el.bind] === "short"
                                  ? "border-green-600 bg-green-600 text-white"
                                  : "border-green-300 bg-white text-green-700 hover:border-green-500"
                              }`}
                            >
                              Abreviada (25/03)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}

              {rules.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--txt3)]">Regras aplicadas</h3>
                  <div className="flex flex-col gap-1.5">
                    {rules.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono text-[var(--orange)]">{r.field}</div>
                          <div className="text-sm text-[var(--txt)]">{r.summary || r.description}</div>
                          <div className="mt-0.5 text-[10px] text-[var(--txt3)]">{r.type}</div>
                        </div>
                        <button
                          onClick={() => removeRule(r.id)}
                          className="rounded p-1 text-[var(--txt3)] hover:bg-[var(--red3)] hover:text-[var(--red)]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              {ruleField ? (
                <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase text-[var(--txt3)]">Nova regra para</div>
                      <div className="font-mono text-sm text-[var(--orange)]">{ruleField}</div>
                    </div>
                    <button
                      onClick={() => {
                        setRuleField(null);
                        setRulePreview(null);
                        setRuleDesc("");
                      }}
                      className="rounded p-1 text-[var(--txt3)] hover:bg-[var(--bdr)]"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <textarea
                    value={ruleDesc}
                    onChange={(e) => setRuleDesc(e.target.value)}
                    placeholder="Ex: formatar como moeda em reais, ocultar se estiver vazio, calcular parcelas dividindo por 10..."
                    rows={4}
                    className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-sm text-[var(--txt)]"
                  />

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      disabled={!ruleDesc.trim() || generatingRule}
                      onClick={generateRule}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--orange)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {generatingRule ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Gerar
                    </button>
                  </div>

                  {ruleError && <p className="mt-3 text-sm text-[var(--red)]">{ruleError}</p>}

                  {rulePreview && (
                    <div className="mt-4 rounded-lg border border-[var(--orange3)] bg-[var(--orange3)]/20 p-3">
                      <div className="mb-1 text-[11px] uppercase text-[var(--orange)]">Preview</div>
                      <div className="text-sm font-semibold text-[var(--txt)]">{rulePreview.summary}</div>
                      <pre className="mt-2 max-h-[160px] overflow-auto rounded bg-[var(--bg)] p-2 text-[11px] text-[var(--txt2)]">
{JSON.stringify({ type: rulePreview.type, params: rulePreview.params }, null, 2)}
                      </pre>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={() => setRulePreview(null)}
                          className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-sm text-[var(--txt2)]"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={confirmRule}
                          className="flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 py-1.5 text-sm font-medium text-white"
                        >
                          <Check size={12} /> Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-[var(--bdr)] py-12 text-center">
                  <ListChecks className="mb-3 h-8 w-8 text-[var(--txt3)]" />
                  <p className="text-sm text-[var(--txt3)]">Selecione um campo para adicionar regras.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--txt2)]"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              className="rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-medium text-white"
            >
              Próximo: Salvar
            </button>
          </div>
        </section>
      )}

      {/* Step 4 — Save */}
      {step === 4 && (
        <section className="rounded-xl border border-[var(--bdr)] bg-[var(--bg1)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--txt)]">Revisar e salvar</h2>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--txt3)]">Nome do template</label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Stories Pacote Caribe"
                  className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--txt)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--txt3)]">Licensee</label>
                <select
                  value={licenseeId}
                  onChange={(e) => setLicenseeId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--txt)]"
                >
                  <option value="base">Base do sistema (disponível para todos)</option>
                  {licensees.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] p-3 text-xs text-[var(--txt2)]">
                <div className="mb-1 font-semibold text-[var(--txt)]">Resumo</div>
                <div>Formato: {FORMAT_LABEL[detectedFormat]}</div>
                <div>Tipo: {FORM_TYPES.find((f) => f.value === formType)?.label}</div>
                <div>{elements.length} elementos • {rules.length} regras</div>
              </div>

              {saveError && <p className="text-sm text-[var(--red)]">{saveError}</p>}

              {savedKey ? (
                <div className="rounded-lg border border-[var(--green)] bg-[var(--green)]/10 p-3 text-sm text-[var(--green)]">
                  <div className="font-semibold">Template salvo</div>
                  <div className="font-mono text-[11px]">{savedKey}</div>
                </div>
              ) : (
                <button
                  disabled={saving || !templateName.trim()}
                  onClick={saveTemplate}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar Template
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--txt3)]">Preview JSON</label>
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--bdr)] bg-[var(--bg)] p-3 text-[11px] text-[var(--txt2)]">
{JSON.stringify({ ...templateJson, imagemOrigem: "[base64]" }, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mt-5 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--txt2)]"
            >
              Voltar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

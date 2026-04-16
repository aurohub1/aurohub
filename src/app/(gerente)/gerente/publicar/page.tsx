"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import type { EditorSchema, EditorElement } from "@/components/editor/types";
import {
  Sparkles, Download, Send, ArrowLeft, Image as ImageIcon, Check, X, Loader2,
} from "lucide-react";

const PreviewStage = dynamic(() => import("./PreviewStage"), { ssr: false });

/* ── Tipos ───────────────────────────────────────── */

interface TemplateRow {
  key: string;
  id: string;
  nome: string;
  format: string;
  formType: string;
  width: number;
  height: number;
  schema: EditorSchema;
  thumbnail: string | null;
}

type BindType = "text" | "image" | "date" | "number";

interface BindField {
  name: string;
  label: string;
  type: BindType;
}

type PublishStatus = "idle" | "generating" | "uploading" | "publishing" | "success" | "error";

interface StoreOption {
  id: string;
  name: string;
}

/* ── Regras de publicação multi-store (AZV) ─────── */
const RIO_PRETO_STORE_ID = "efab2a24-3c34-4d2b-82ee-5fef8018c589";
const RIO_PRETO_GROUP_MATCHERS = ["rio preto", "barretos", "damha"];

function canPublishToAllAZV(storeId: string | null | undefined): boolean {
  return storeId === RIO_PRETO_STORE_ID;
}

function filterAZVGroup(stores: StoreOption[]): StoreOption[] {
  return stores.filter((s) => {
    const n = s.name.toLowerCase();
    return RIO_PRETO_GROUP_MATCHERS.some((m) => n.includes(m));
  });
}

/* ── Helpers ─────────────────────────────────────── */

const FORMAT_DIMS: Record<string, [number, number]> = {
  stories: [1080, 1920],
  reels:   [1080, 1920],
  feed:    [1080, 1350],
  tv:      [1920, 1080],
};

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  reels: "Reels",
  feed: "Feed",
  tv: "TV",
};

const BIND_LABELS: Record<string, string> = {
  imgfundo: "Imagem de fundo",
  imgdestino: "Imagem do destino",
  imghotel: "Imagem do hotel",
  imgaviao: "Imagem do avião",
  imgciamaritima: "Imagem da cia marítima",
  imgloja: "Imagem da loja",
  destino: "Destino",
  saida: "Saída",
  tipovoo: "Tipo de voo",
  dataida: "Data de ida",
  datavolta: "Data de volta",
  noites: "Noites",
  feriado: "Feriado",
  hotel: "Hotel",
  navio: "Navio",
  categoria: "Categoria",
  itinerario: "Itinerário",
  incluso: "Incluso",
  servico1: "Serviço 1",
  servico2: "Serviço 2",
  servico3: "Serviço 3",
  servico4: "Serviço 4",
  servico5: "Serviço 5",
  servico6: "Serviço 6",
  preco: "Preço",
  parcelas: "Parcelas",
  valorparcela: "Valor da parcela",
  desconto: "Desconto",
  formapagamento: "Forma de pagamento",
  totalduplo: "Total duplo",
  totalcruzeiro: "Total cruzeiro",
  loja: "Loja",
  agente: "Agente",
  fone: "Telefone",
  titulo: "Título",
  subtitulo: "Subtítulo",
  texto1: "Texto 1",
  texto2: "Texto 2",
  texto3: "Texto 3",
};

function classifyBind(name: string, elType: string): BindType {
  if (elType === "image" || name.startsWith("img")) return "image";
  if (name === "dataida" || name === "datavolta" || name === "inicio" || name === "fim") return "date";
  if (["preco", "valorparcela", "desconto", "noites", "totalduplo", "totalcruzeiro"].includes(name)) return "number";
  return "text";
}

function collectBindFields(elements: EditorElement[]): BindField[] {
  const seen = new Set<string>();
  const fields: BindField[] = [];
  for (const el of elements) {
    if (!el.bindParam || seen.has(el.bindParam)) continue;
    seen.add(el.bindParam);
    fields.push({
      name: el.bindParam,
      label: BIND_LABELS[el.bindParam] ?? el.bindParam,
      type: classifyBind(el.bindParam, el.type),
    });
  }
  return fields;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ── Component ──────────────────────────────────── */

export default function GerentePublicarPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [selected, setSelected] = useState<TemplateRow | null>(null);

  const [values, setValues] = useState<Record<string, string>>({});
  const [caption, setCaption] = useState<string>("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [status, setStatus] = useState<PublishStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [publishTargets, setPublishTargets] = useState<StoreOption[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  const stageRef = useRef<Konva.Stage | null>(null);

  /* ── Load profile + templates ─────────────────── */
  const loadData = useCallback(async () => {
    const p = await getProfile(supabase);
    setProfile(p);
    if (!p?.licensee_id) { setLoadingTpl(false); return; }
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .like("key", "tmpl_%");
    const rows: TemplateRow[] = [];
    for (const r of (data ?? []) as { key: string; value: string }[]) {
      try {
        const parsed = JSON.parse(r.value);
        const lid = parsed.licenseeId ?? parsed.licensee_id ?? null;
        if (lid && lid.trim() !== p.licensee_id.trim()) continue;
        const schemaElements = parsed.elements ?? parsed.schema?.elements;
        if (!schemaElements) continue;
        const format = parsed.format || parsed.schema?.format || "stories";
        const [defW, defH] = FORMAT_DIMS[format] || [1080, 1920];
        rows.push({
          key: r.key,
          id: r.key.replace(/^tmpl_/, ""),
          nome: parsed.nome || r.key.replace(/^tmpl_/, ""),
          format,
          formType: parsed.formType || parsed.schema?.formType || "pacote",
          width: parsed.width || parsed.schema?.width || defW,
          height: parsed.height || parsed.schema?.height || defH,
          schema: {
            elements: schemaElements,
            background: parsed.bgColor || parsed.background || parsed.schema?.background || "#FFFFFF",
            duration: parsed.duration || 5,
            qtdDestinos: parsed.qtdDestinos,
          },
          thumbnail: parsed.thumbnail || null,
        });
      } catch { /* skip */ }
    }
    setTemplates(rows);

    // Destinos de publicação (stores onde a unidade pode postar)
    const { data: storesData } = await supabase
      .from("stores")
      .select("id, name")
      .eq("licensee_id", p.licensee_id)
      .order("name");
    const allStores = (storesData ?? []) as StoreOption[];

    let targets: StoreOption[] = [];
    if (canPublishToAllAZV(p.store_id)) {
      targets = filterAZVGroup(allStores);
      if (targets.length === 0) {
        // fallback: se o filtro por nome não casar, usa todas do licensee
        targets = allStores;
      }
    } else if (p.store_id) {
      const own = allStores.find((s) => s.id === p.store_id);
      targets = own ? [own] : [];
    }
    setPublishTargets(targets);
    setSelectedTargetIds(targets.length > 0 ? [targets[0].id] : []);

    setLoadingTpl(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const bindFields = useMemo(
    () => (selected ? collectBindFields(selected.schema.elements) : []),
    [selected]
  );

  /* ── Handlers ─────────────────────────────────── */

  function pickTemplate(t: TemplateRow) {
    setSelected(t);
    // Seed imgfundo com thumbnail do template para que o canvas não apareça preto
    // antes do usuário preencher os campos dinâmicos.
    setValues(t.thumbnail ? { imgfundo: t.thumbnail } : {});
    setCaption("");
    setStatus("idle");
    setStatusMsg("");
  }

  function reset() {
    setSelected(null);
    setValues({});
    setCaption("");
    setStatus("idle");
    setStatusMsg("");
  }

  function setField(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  async function onFileChange(name: string, file: File | null) {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setField(name, dataUrl);
  }

  async function generateCaption() {
    setGeneratingCaption(true);
    try {
      const payload = {
        destino: values.destino || selected?.nome || "seu destino",
        hotel: values.hotel,
        servicos: [values.servico1, values.servico2, values.servico3].filter(Boolean).join(", "),
        preco: values.preco,
        parcelas: values.parcelas,
        datas: values.dataida && values.datavolta ? `${values.dataida} a ${values.datavolta}` : undefined,
        noites: values.noites,
        tipo: selected?.formType,
      };
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.legenda) setCaption(d.legenda);
      }
    } catch (err) {
      console.error("[Legenda]", err);
    } finally {
      setGeneratingCaption(false);
    }
  }

  function getPNGDataURL(): string | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const scale = stage.scaleX() || 1;
    return stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/png" });
  }

  async function handleDownload() {
    setStatus("generating");
    const dataUrl = getPNGDataURL();
    if (!dataUrl) { setStatus("error"); setStatusMsg("Falha ao gerar imagem"); return; }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${selected?.nome || "arte"}_${Date.now()}.png`;
    a.click();
    setStatus("success");
    setStatusMsg("Imagem baixada");
    setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2000);
  }

  async function handleGenerate() {
    setStatus("generating");
    const dataUrl = getPNGDataURL();
    if (!dataUrl) { setStatus("error"); setStatusMsg("Falha ao gerar imagem"); return; }
    const w = window.open();
    if (w) w.document.write(`<img src="${dataUrl}" style="max-width:100%"/>`);
    setStatus("success");
    setStatusMsg("Arte gerada");
    setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2000);
  }

  async function handlePublishInstagram() {
    if (!profile?.licensee_id) { setStatus("error"); setStatusMsg("Sem licensee"); return; }
    if (selectedTargetIds.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }
    try {
      setStatus("generating");
      setStatusMsg("Gerando imagem...");
      const dataUrl = getPNGDataURL();
      if (!dataUrl) throw new Error("Falha ao gerar imagem");

      setStatus("uploading");
      setStatusMsg("Enviando para Cloudinary...");
      const upRes = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, folder: `aurohubv2/publicacoes/${profile.licensee_id}` }),
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.secure_url) {
        throw new Error(upData.error || "Upload falhou");
      }

      setStatus("publishing");

      const targetsToPublish = publishTargets.filter((t) => selectedTargetIds.includes(t.id));
      const resultados: { store: StoreOption; ok: boolean; error?: string }[] = [];
      for (const target of targetsToPublish) {
        setStatusMsg(`Publicando em ${target.name}...`);
        try {
          const pubRes = await fetch("/api/instagram/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              licensee_id: profile.licensee_id,
              store_id: target.id,
              image_url: upData.secure_url,
              caption,
            }),
          });
          const pubData = await pubRes.json();
          if (!pubRes.ok || !pubData.success) {
            resultados.push({ store: target, ok: false, error: pubData.error || "Falhou" });
          } else {
            resultados.push({ store: target, ok: true });
          }
        } catch (err) {
          resultados.push({ store: target, ok: false, error: err instanceof Error ? err.message : "Erro" });
        }
      }

      const okCount = resultados.filter((r) => r.ok).length;
      const falhas = resultados.filter((r) => !r.ok);
      if (okCount === 0) {
        throw new Error(`Nenhuma publicação concluída. ${falhas[0]?.error ?? ""}`);
      }

      setStatus("success");
      if (falhas.length === 0) {
        setStatusMsg(`Publicado em ${okCount} loja${okCount === 1 ? "" : "s"}!`);
      } else {
        setStatusMsg(`${okCount} ok · ${falhas.length} falha${falhas.length === 1 ? "" : "s"}: ${falhas.map((f) => f.store.name).join(", ")}`);
      }
      setTimeout(() => {
        reset();
      }, 3000);
    } catch (err) {
      console.error("[Publicar IG]", err);
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  function toggleTarget(id: string) {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  /* ── Render ───────────────────────────────────── */

  const busy = status === "generating" || status === "uploading" || status === "publishing";
  const unidadeLabel = profile?.store?.name || profile?.licensee?.name || "Unidade";

  if (loadingTpl) return <div className="text-[13px] text-[var(--txt3)]">Carregando templates...</div>;

  // Etapa 1: selecionar template
  if (!selected) {
    return (
      <>
        <div className="card-glass relative overflow-hidden px-8 py-6">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }} />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">Central do Gerente</p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-tight text-[var(--txt)]">
              Publicar — {unidadeLabel}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              {templates.length} template{templates.length === 1 ? "" : "s"} disponíve{templates.length === 1 ? "l" : "is"} · Escolha um para começar
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="card-glass flex flex-col items-center gap-3 px-6 py-10 text-center">
            <ImageIcon size={28} className="text-[var(--txt3)]" />
            <div className="text-[13px] text-[var(--txt2)]">Nenhum template disponível para sua agência ainda.</div>
            <div className="text-[11px] text-[var(--txt3)]">Entre em contato com o administrador.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {templates.map((t) => (
              <div
                key={t.key}
                style={{ background: "var(--bg1)", border: "0.5px solid var(--bdr)", borderRadius: 12, overflow: "hidden" }}
              >
                <div style={{ height: 140, background: "#1E3A6E", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumbnail} alt={t.nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {FORMAT_LABELS[t.format] || t.format}
                  </span>
                  {!t.thumbnail && (
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                      {(t.format || "—").toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.nome}>
                    {t.nome}
                  </div>
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, color: "#3B82F6", background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    {t.formType}
                  </span>
                </div>
                <button
                  onClick={() => pickTemplate(t)}
                  style={{ width: "100%", padding: 7, fontSize: 11, fontWeight: 600, color: "#fff", background: "linear-gradient(to right, #3B82F6, #D4A843)", border: "none", borderRadius: "0 0 12px 12px", cursor: "pointer" }}
                >
                  ✦ Usar
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Etapa 2: formulário + preview
  return (
    <>
      <div className="card-glass flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Publicar — {unidadeLabel}
            </div>
            <div className="text-[14px] font-bold text-[var(--txt)]">{selected.nome}</div>
          </div>
        </div>
        <div className="text-[11px] text-[var(--txt3)]">
          {FORMAT_LABELS[selected.format]} · {selected.width}×{selected.height}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        {/* ── Formulário ─────────────────────────── */}
        <div className="card-glass flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden">
          <div className="shrink-0 border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Preencher dados</h3>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
            {bindFields.length === 0 ? (
              <div className="py-4 text-center text-[12px] text-[var(--txt3)]">
                Este template não tem campos dinâmicos.
              </div>
            ) : (
              bindFields.map((f) => (
                <div key={f.name} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">
                    {f.label}
                  </label>
                  {f.type === "image" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onFileChange(f.name, e.target.files?.[0] ?? null)}
                        className="text-[11px] text-[var(--txt2)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--bg2)] file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-[var(--txt)]"
                      />
                      {values[f.name] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={values[f.name]} alt="" className="h-10 w-10 rounded border border-[var(--bdr)] object-cover" />
                      )}
                    </div>
                  ) : f.type === "date" ? (
                    <input
                      type="date"
                      value={values[f.name] || ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                    />
                  ) : f.type === "number" ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={values[f.name] || ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={f.name === "preco" || f.name === "valorparcela" ? "R$ 0,00" : "0"}
                      className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[f.name] || ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                    />
                  )}
                </div>
              ))
            )}

            {/* Legenda */}
            <div className="mt-2 flex flex-col gap-1 border-t border-[var(--bdr)] pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">
                  Legenda (Instagram)
                </label>
                <button
                  onClick={generateCaption}
                  disabled={generatingCaption}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline disabled:opacity-50"
                >
                  {generatingCaption ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Gerar com IA
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                placeholder="Digite ou gere a legenda com IA..."
                className="resize-none rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
              />
            </div>

            {/* Destinos de publicação */}
            {publishTargets.length > 0 && (
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--bdr)] pt-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--txt3)]">
                  Publicar em {publishTargets.length > 1 ? "(selecione uma ou mais)" : ""}
                </label>
                <div className="flex flex-wrap gap-2">
                  {publishTargets.map((t) => {
                    const active = selectedTargetIds.includes(t.id);
                    const single = publishTargets.length === 1;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => !single && toggleTarget(t.id)}
                        disabled={single}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[var(--orange)] bg-[rgba(255,122,26,0.12)] text-[var(--orange)]"
                            : "border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
                        } ${single ? "cursor-default" : ""}`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            active ? "border-[var(--orange)] bg-[var(--orange)] text-white" : "border-[var(--bdr2)]"
                          }`}
                        >
                          {active && <Check size={10} />}
                        </span>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="mt-2 grid grid-cols-1 gap-2 border-t border-[var(--bdr)] pt-4 sm:grid-cols-3">
              <button
                onClick={handleGenerate}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--bdr2)] px-3 py-2.5 text-[12px] font-semibold text-[var(--txt2)] hover:bg-[var(--hover-bg)] disabled:opacity-50"
              >
                <Sparkles size={13} /> Gerar arte
              </button>
              <button
                onClick={handleDownload}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--bdr2)] px-3 py-2.5 text-[12px] font-semibold text-[var(--txt2)] hover:bg-[var(--hover-bg)] disabled:opacity-50"
              >
                <Download size={13} /> Download
              </button>
              <button
                onClick={handlePublishInstagram}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
              >
                <Send size={13} /> Publicar
              </button>
            </div>

            {/* Status */}
            {status !== "idle" && (
              <div
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium"
                style={
                  status === "success"
                    ? { background: "var(--green3)", color: "var(--green)" }
                    : status === "error"
                      ? { background: "var(--red3)", color: "var(--red)" }
                      : { background: "var(--blue3)", color: "var(--blue)" }
                }
              >
                {status === "success" ? <Check size={13} /> : status === "error" ? <X size={13} /> : <Loader2 size={13} className="animate-spin" />}
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Preview ──────────────────────────────── */}
        <div className="card-glass relative flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden lg:sticky lg:top-4 lg:self-start">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <h3 className="text-[14px] font-bold text-[var(--txt)]">Preview ao vivo</h3>
            <div className="text-[10px] text-[var(--txt3)] tabular-nums">
              {selected.width}×{selected.height}
            </div>
          </div>
          <div className="h-full flex flex-1 items-center justify-center p-5 overflow-hidden">
            <div style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))" }}>
              <PreviewStage
                schema={selected.schema}
                width={selected.width}
                height={selected.height}
                values={values}
                maxDisplay={Math.round((typeof window !== "undefined" ? window.innerHeight : 900) * 0.82)}
                onReady={(s) => { stageRef.current = s; }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── TemplateThumb ──────────────────────────────── */

function TemplateThumb({ thumb, label, nome }: { thumb: string | null; label: string; nome: string }) {
  const [failed, setFailed] = useState(false);
  const show = thumb && !failed;
  return (
    <div className="relative mx-auto aspect-[3/4] max-h-[180px] w-full overflow-hidden rounded-lg border border-[var(--bdr)]">
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb as string}
          alt={nome}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: "#1E3A6E" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

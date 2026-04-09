"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import Link from "next/link";

/* ── Lazy react-konva ────────────────────────────── */

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const KRect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const KCircle = dynamic(() => import("react-konva").then((m) => m.Circle), { ssr: false });
const KText = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const KImage = dynamic(() => import("react-konva").then((m) => m.Image), { ssr: false });
const KTransformer = dynamic(() => import("react-konva").then((m) => m.Transformer), { ssr: false });

/* ── Types ───────────────────────────────────────── */

type Tool = "select" | "text" | "image" | "rect" | "circle";
type Format = "feed" | "stories" | "reels" | "tv";
type FormType = "pacote" | "campanha" | "passagem" | "cruzeiro" | "anoiteceu" | "lamina";

interface BaseEl {
  id: string; type: "text" | "image" | "rect" | "circle";
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; visible: boolean; locked: boolean;
  name: string; bindParam: string;
}
interface TextEl extends BaseEl { type: "text"; text: string; fontSize: number; fontFamily: string; fill: string; fontStyle: string; align: string; }
interface ImageEl extends BaseEl { type: "image"; src: string; }
interface RectEl extends BaseEl { type: "rect"; fill: string; stroke: string; strokeWidth: number; cornerRadius: number; }
interface CircleEl extends BaseEl { type: "circle"; fill: string; stroke: string; strokeWidth: number; }
type CanvasEl = TextEl | ImageEl | RectEl | CircleEl;

/* ── Constants ───────────────────────────────────── */

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed:    { w: 1080, h: 1080, label: "Feed 1:1" },
  stories: { w: 1080, h: 1920, label: "Stories 9:16" },
  reels:   { w: 1080, h: 1920, label: "Reels 9:16" },
  tv:      { w: 1920, h: 1080, label: "TV 16:9" },
};

const FORMS: { key: FormType; label: string }[] = [
  { key: "pacote", label: "Pacote" },
  { key: "campanha", label: "Campanha" },
  { key: "passagem", label: "Passagem Aérea" },
  { key: "cruzeiro", label: "Cruzeiro" },
  { key: "anoiteceu", label: "Anoiteceu" },
  { key: "lamina", label: "Lâmina" },
];

const BIND_GROUPS: { group: string; fields: { key: string; label: string }[] }[] = [
  { group: "Imagens", fields: [
    { key: "imgfundo", label: "Imagem de Fundo" }, { key: "imgdestino", label: "Imagem Destino" },
    { key: "imghotel", label: "Imagem Hotel" }, { key: "imgloja", label: "Logo Loja" }, { key: "imgperfil", label: "Foto Perfil" },
  ]},
  { group: "Destino", fields: [
    { key: "destino", label: "Destino" }, { key: "subdestino", label: "Subdestino" },
  ]},
  { group: "Datas", fields: [
    { key: "dataida", label: "Data Ida" }, { key: "datavolta", label: "Data Volta" }, { key: "noites", label: "Noites" },
  ]},
  { group: "Hotel", fields: [
    { key: "hotel", label: "Hotel" }, { key: "categoria", label: "Categoria" },
  ]},
  { group: "Serviços", fields: [
    { key: "servicos", label: "Serviços" }, { key: "allinclusivo", label: "All Inclusive" },
  ]},
  { group: "Selos", fields: [
    { key: "selodesconto", label: "Selo Desconto" }, { key: "seloultimos", label: "Selo Últimos Lugares" },
    { key: "seloferiado", label: "Selo Feriado" }, { key: "selooferta", label: "Selo Oferta" },
  ]},
  { group: "Preço", fields: [
    { key: "preco", label: "Preço" }, { key: "parcelas", label: "Parcelas" }, { key: "entrada", label: "Entrada" },
    { key: "moeda", label: "Moeda" }, { key: "desconto", label: "Desconto" },
  ]},
  { group: "Loja", fields: [
    { key: "loja", label: "Loja" }, { key: "agente", label: "Agente" }, { key: "fone", label: "Telefone" },
  ]},
  { group: "Genérico", fields: [
    { key: "titulo", label: "Título" }, { key: "subtitulo", label: "Subtítulo" },
    { key: "texto1", label: "Texto 1" }, { key: "texto2", label: "Texto 2" }, { key: "texto3", label: "Texto 3" },
  ]},
];

const FORM_BINDS: Record<FormType, string[]> = {
  pacote:    ["imgfundo","destino","subdestino","dataida","datavolta","noites","hotel","categoria","servicos","allinclusivo","selodesconto","seloultimos","seloferiado","selooferta","preco","parcelas","entrada","moeda","desconto","loja","agente","fone","titulo","subtitulo","texto1","texto2","imgloja"],
  campanha:  ["imgfundo","destino","subdestino","dataida","datavolta","hotel","servicos","preco","parcelas","entrada","moeda","desconto","selodesconto","selooferta","loja","agente","fone","titulo","subtitulo","imgloja"],
  passagem:  ["imgfundo","destino","subdestino","dataida","datavolta","preco","parcelas","entrada","moeda","loja","agente","fone","titulo","imgloja"],
  cruzeiro:  ["imgfundo","destino","dataida","datavolta","noites","hotel","servicos","allinclusivo","preco","parcelas","entrada","moeda","loja","agente","fone","titulo","subtitulo","imgloja"],
  anoiteceu: ["imgfundo","destino","dataida","datavolta","desconto","preco","loja","imgloja"],
  lamina:    ["imgfundo","titulo","subtitulo","texto1","texto2","texto3","preco","parcelas","destino","subdestino","hotel","dataida","datavolta","loja","imgloja"],
};

const FONTS = ["DM Sans", "DM Serif Display", "Arial", "Helvetica", "Georgia", "Bebas Neue", "Montserrat", "Poppins", "Roboto", "Open Sans"];

const ALL_BIND_FIELDS = BIND_GROUPS.flatMap((g) => g.fields);

let _id = 0;
function uid(): string { return `el_${Date.now()}_${++_id}`; }

/* ── Component ───────────────────────────────────── */

export default function EditorPage() {
  const [format, setFormat] = useState<Format>("stories");
  const [formType, setFormType] = useState<FormType>("pacote");
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<CanvasEl[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgSrc, setBgSrc] = useState("");
  const [templateName, setTemplateName] = useState("Novo Template");
  const [bindDropdown, setBindDropdown] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [history, setHistory] = useState<string[]>(["[]"]);
  const [histIdx, setHistIdx] = useState(0);

  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasArea, setCanvasArea] = useState({ w: 800, h: 600 });

  const fmt = FORMATS[format];
  const scale = Math.min((canvasArea.w - 40) / fmt.w, (canvasArea.h - 40) / fmt.h, 1);
  const stageW = fmt.w * scale;
  const stageH = fmt.h * scale;
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  // Available bind fields for current form
  const availableBinds = BIND_GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter((f) => FORM_BINDS[formType].includes(f.key)),
  })).filter((g) => g.fields.length > 0);

  /* ── Canvas area resize ────────────────────────── */

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setCanvasArea({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ── History ───────────────────────────────────── */

  function pushHistory(els: CanvasEl[]) {
    const json = JSON.stringify(els);
    const next = history.slice(0, histIdx + 1);
    next.push(json);
    if (next.length > 50) next.shift();
    setHistory(next);
    setHistIdx(next.length - 1);
  }

  function undo() {
    if (histIdx <= 0) return;
    const i = histIdx - 1;
    setHistIdx(i);
    setElements(JSON.parse(history[i]));
  }

  function redo() {
    if (histIdx >= history.length - 1) return;
    const i = histIdx + 1;
    setHistIdx(i);
    setElements(JSON.parse(history[i]));
  }

  /* ── Update ────────────────────────────────────── */

  const updateEl = useCallback((id: string, updates: Partial<CanvasEl>) => {
    setElements((prev) => {
      const next = prev.map((e) => e.id === id ? { ...e, ...updates } as CanvasEl : e);
      pushHistory(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histIdx]);

  function removeEl(id: string) {
    const next = elements.filter((e) => e.id !== id);
    setElements(next);
    setSelectedId(null);
    pushHistory(next);
  }

  /* ── Add elements ──────────────────────────────── */

  function addText(text = "Texto", bindParam = "") {
    const el: TextEl = {
      id: uid(), type: "text", x: fmt.w / 2 - 150, y: fmt.h / 2 - 25, width: 300, height: 50,
      rotation: 0, opacity: 1, visible: true, locked: false,
      name: bindParam ? `[${bindParam}]` : "Texto", bindParam,
      text: bindParam ? `[${bindParam}]` : text,
      fontSize: 36, fontFamily: "DM Sans", fill: bindParam ? "#D4A843" : "#000000",
      fontStyle: "normal", align: "left",
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addRect() {
    const el: RectEl = {
      id: uid(), type: "rect", x: fmt.w / 2 - 100, y: fmt.h / 2 - 75, width: 200, height: 150,
      rotation: 0, opacity: 1, visible: true, locked: false, name: "Retângulo", bindParam: "",
      fill: "#1E3A6E", stroke: "", strokeWidth: 0, cornerRadius: 0,
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addCircle() {
    const el: CircleEl = {
      id: uid(), type: "circle", x: fmt.w / 2, y: fmt.h / 2, width: 120, height: 120,
      rotation: 0, opacity: 1, visible: true, locked: false, name: "Círculo", bindParam: "",
      fill: "#D4A843", stroke: "", strokeWidth: 0,
    };
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    setTool("select");
    pushHistory(next);
  }

  function addImage(src: string) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImages((prev) => ({ ...prev, [src]: img }));
      const ratio = img.width / img.height;
      const w = Math.min(img.width, fmt.w * 0.6);
      const h = w / ratio;
      const el: ImageEl = {
        id: uid(), type: "image", x: (fmt.w - w) / 2, y: (fmt.h - h) / 2, width: w, height: h,
        rotation: 0, opacity: 1, visible: true, locked: false, name: "Imagem", bindParam: "", src,
      };
      const next = [...elements, el];
      setElements(next);
      setSelectedId(el.id);
      setTool("select");
      pushHistory(next);
    };
    img.src = src;
  }

  /* ── Background ────────────────────────────────── */

  function loadBg(src: string) {
    setBgSrc(src);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImage(img);
    img.src = src;
  }

  /* ── Load image elements ───────────────────────── */

  useEffect(() => {
    elements.forEach((el) => {
      if (el.type === "image" && !loadedImages[(el as ImageEl).src]) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setLoadedImages((prev) => ({ ...prev, [(el as ImageEl).src]: img }));
        img.src = (el as ImageEl).src;
      }
    });
  }, [elements, loadedImages]);

  /* ── Transformer sync ──────────────────────────── */

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedId) {
      const node = stageRef.current.findOne("#" + selectedId);
      if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
    } else { trRef.current.nodes([]); }
  }, [selectedId]);

  /* ── Stage handlers ────────────────────────────── */

  function onStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) { setSelectedId(null); return; }
    if (tool === "select") setSelectedId(e.target.id());
  }

  function onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === "select") return;
    if (tool === "text") addText();
    if (tool === "rect") addRect();
    if (tool === "circle") addCircle();
    if (tool === "image") {
      const url = prompt("URL da imagem:");
      if (url) addImage(url);
    }
  }

  /* ── File upload ───────────────────────────────── */

  function uploadImage() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) addImage(reader.result as string); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function uploadBg() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) loadBg(reader.result as string); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ── Export PNG ────────────────────────────────── */

  function exportPng() {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 1 / scale });
    const a = document.createElement("a");
    a.href = uri;
    a.download = `azv_${formType}_${format}.png`;
    a.click();
  }

  /* ── Save ──────────────────────────────────────── */

  function saveTemplate() {
    const data = { name: templateName, format, formType, bgColor, bgSrc, elements };
    console.log("[Editor] Save:", JSON.stringify(data, null, 2));
    alert("Template salvo! (integração Supabase pendente)");
  }

  /* ── Layer ops ─────────────────────────────────── */

  function moveLayer(id: string, dir: -1 | 1) {
    const idx = elements.findIndex((e) => e.id === id);
    const j = idx + dir;
    if (j < 0 || j >= elements.length) return;
    const arr = [...elements];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setElements(arr);
    pushHistory(arr);
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <header className="flex items-center gap-4 border-b border-white/10 bg-[#12122a] px-4 py-2 shrink-0">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 2l1.83 3.72L16 6.55l-3 2.93.71 4.13L10 11.77l-3.71 1.84.71-4.13L4 6.55l4.17-.83L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          <span className="text-[13px] font-bold">Aurohub</span>
        </Link>

        <div className="w-px h-5 bg-white/10" />

        {/* Template name */}
        <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="h-7 w-[200px] rounded border border-white/10 bg-white/5 px-2 text-[12px] text-white outline-none focus:border-[#FF7A1A]" />

        {/* Form type */}
        <select value={formType} onChange={(e) => setFormType(e.target.value as FormType)} className="h-7 rounded border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none">
          {FORMS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>

        {/* Format */}
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="h-7 rounded border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none">
          {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="flex-1" />

        {/* Actions */}
        <button onClick={exportPng} className="flex h-7 items-center gap-1.5 rounded border border-white/10 px-3 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/5">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Exportar PNG
        </button>
        <button onClick={saveTemplate} className="flex h-7 items-center gap-1.5 rounded px-3 text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}>
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M12 14H4a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3v9a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1.3" /><path d="M10 2v3h3M6 9h4M6 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          Salvar
        </button>
      </header>

      {/* ═══ TOOLBAR ════════════════════════════════ */}
      <div className="flex items-center gap-1 border-b border-white/10 bg-[#16162e] px-4 py-1.5 shrink-0">
        {/* Tools */}
        {([
          { key: "select" as Tool, label: "Selecionar", svg: <path d="M4 2l8 6-4 1 2 5-2 1-2-5-3 3V2z" fill="currentColor" /> },
          { key: "text" as Tool, label: "Texto", svg: <path d="M4 4h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> },
          { key: "rect" as Tool, label: "Retângulo", svg: <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /> },
          { key: "circle" as Tool, label: "Círculo", svg: <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" fill="none" /> },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTool(t.key)} title={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tool === t.key ? "bg-[#FF7A1A]/20 text-[#FF7A1A]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            <svg viewBox="0 0 16 16" className="h-4 w-4">{t.svg}</svg>
          </button>
        ))}

        <button onClick={uploadImage} title="Inserir imagem" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
          <svg viewBox="0 0 16 16" className="h-4 w-4"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" /><circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" /><path d="M2 11l3.5-3.5L9 11l2-2 3 3" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Bind field */}
        <div className="relative">
          <button onClick={() => setBindDropdown(!bindDropdown)} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#D4A843]/30 px-2.5 text-[11px] font-medium text-[#D4A843] hover:bg-[#D4A843]/10">
            <span>⬡</span> Campo bind
          </button>
          {bindDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-[240px] max-h-[400px] overflow-y-auto rounded-xl border border-white/10 p-2 shadow-xl" style={{ background: "#1e1e3a" }}>
              {availableBinds.map((g) => (
                <div key={g.group} className="mb-2">
                  <div className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-white/30">{g.group}</div>
                  <div className="flex flex-wrap gap-1">
                    {g.fields.map((f) => (
                      <button key={f.key} onClick={() => { addText(`[${f.key}]`, f.key); setBindDropdown(false); }}
                        className="rounded-md bg-[#D4A843]/15 px-2 py-0.5 text-[10px] font-medium text-[#D4A843] hover:bg-[#D4A843]/25">
                        {f.key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={histIdx <= 0} title="Desfazer" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 disabled:opacity-20">
          <svg viewBox="0 0 16 16" className="h-4 w-4"><path d="M4 6h6a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" /><path d="M6 4L4 6l2 2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button onClick={redo} disabled={histIdx >= history.length - 1} title="Refazer" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 disabled:opacity-20">
          <svg viewBox="0 0 16 16" className="h-4 w-4"><path d="M12 6H6a3 3 0 000 6h3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" /><path d="M10 4l2 2-2 2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* ═══ MAIN ═══════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LAYERS ─────────────────────────────── */}
        <div className="w-[190px] shrink-0 border-r border-white/10 bg-[#14142c] overflow-y-auto p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-white/30">Camadas</div>

          {/* Background */}
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5">
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent" />
            <span className="text-[10px] text-white/40">Fundo</span>
            <button onClick={uploadBg} className="ml-auto text-[9px] text-white/30 hover:text-white/60">img</button>
            {bgSrc && <button onClick={() => { setBgSrc(""); setBgImage(null); }} className="text-[9px] text-red-400">✕</button>}
          </div>

          {/* Elements */}
          {[...elements].reverse().map((el) => {
            const isBound = !!el.bindParam;
            return (
              <div key={el.id} onClick={() => setSelectedId(el.id)}
                className={`mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer ${
                  selectedId === el.id ? "bg-[#FF7A1A]/20 text-[#FF7A1A]" : "text-white/50 hover:bg-white/5"
                } ${isBound ? "border border-[#D4A843]/30" : ""}`}>
                {isBound && <span className="text-[#D4A843] text-[9px]">⬡</span>}
                <span className="text-[9px]">{el.type === "text" ? "T" : el.type === "image" ? "🖼" : el.type === "rect" ? "▭" : "○"}</span>
                <span className="flex-1 truncate">{el.name}</span>
                <button onClick={(e) => { e.stopPropagation(); updateEl(el.id, { visible: !el.visible }); }} className="opacity-40 hover:opacity-100">{el.visible ? "👁" : "—"}</button>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 1); }} className="opacity-30 hover:opacity-80">↑</button>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, -1); }} className="opacity-30 hover:opacity-80">↓</button>
              </div>
            );
          })}
          {elements.length === 0 && <div className="text-[10px] text-white/20 text-center py-6">Canvas vazio</div>}
        </div>

        {/* ── CANVAS ─────────────────────────────── */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto bg-[#1a1a2e]">
          <div style={{ width: stageW, height: stageH, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <Stage
              ref={(n: Konva.Stage | null) => { stageRef.current = n; }}
              width={stageW} height={stageH} scaleX={scale} scaleY={scale}
              onClick={onStageClick} onMouseDown={onStageMouseDown}
            >
              <Layer>
                {/* White background */}
                <KRect x={0} y={0} width={fmt.w} height={fmt.h} fill={bgColor} />
                {bgImage && <KImage image={bgImage} x={0} y={0} width={fmt.w} height={fmt.h} />}

                {elements.filter((e) => e.visible).map((el) => {
                  const common = {
                    id: el.id, x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity,
                    draggable: !el.locked && tool === "select",
                    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => updateEl(el.id, { x: e.target.x(), y: e.target.y() }),
                    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                      const n = e.target;
                      updateEl(el.id, { x: n.x(), y: n.y(), width: Math.max(5, n.width() * n.scaleX()), height: Math.max(5, n.height() * n.scaleY()), rotation: n.rotation() });
                      n.scaleX(1); n.scaleY(1);
                    },
                    onClick: () => { if (tool === "select") setSelectedId(el.id); },
                  };

                  if (el.type === "text") { const t = el as TextEl; return <KText key={el.id} {...common} text={t.text} fontSize={t.fontSize} fontFamily={t.fontFamily} fill={t.fill} fontStyle={t.fontStyle} align={t.align} width={t.width} />; }
                  if (el.type === "rect") { const r = el as RectEl; return <KRect key={el.id} {...common} width={r.width} height={r.height} fill={r.fill} stroke={r.stroke} strokeWidth={r.strokeWidth} cornerRadius={r.cornerRadius} />; }
                  if (el.type === "circle") { const c = el as CircleEl; return <KCircle key={el.id} {...common} radius={c.width / 2} fill={c.fill} stroke={c.stroke} strokeWidth={c.strokeWidth} />; }
                  if (el.type === "image") { const im = el as ImageEl; const obj = loadedImages[im.src]; if (!obj) return null; return <KImage key={el.id} {...common} image={obj} width={im.width} height={im.height} />; }
                  return null;
                })}

                <KTransformer ref={(n: Konva.Transformer | null) => { trRef.current = n; }} />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* ── PROPERTIES ─────────────────────────── */}
        <div className="w-[230px] shrink-0 border-l border-white/10 bg-[#14142c] overflow-y-auto p-4">
          <div className="mb-3 text-[9px] font-bold uppercase tracking-wider text-white/30">Propriedades</div>

          {!selected ? (
            <div className="text-[10px] text-white/20 text-center py-8">Selecione um elemento</div>
          ) : (
            <div className="flex flex-col gap-3">
              <P label="Nome"><input type="text" value={selected.name} onChange={(e) => updateEl(selected.id, { name: e.target.value })} className="inp" /></P>

              {/* Bind param select */}
              <P label="Campo bind">
                <select value={selected.bindParam} onChange={(e) => {
                  const bp = e.target.value;
                  const updates: Partial<CanvasEl> = { bindParam: bp };
                  if (selected.type === "text" && bp) {
                    (updates as Partial<TextEl>).text = `[${bp}]`;
                    (updates as Partial<TextEl>).fill = "#D4A843";
                    updates.name = `[${bp}]`;
                  }
                  updateEl(selected.id, updates);
                }} className="inp">
                  <option value="">Nenhum</option>
                  {availableBinds.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </P>
              {selected.bindParam && <div className="rounded bg-[#D4A843]/10 px-2 py-1 text-[9px] font-medium text-[#D4A843]">⬡ Bind: {selected.bindParam}</div>}

              <div className="h-px bg-white/5" />

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <P label="X"><N value={Math.round(selected.x)} onChange={(v) => updateEl(selected.id, { x: v })} /></P>
                <P label="Y"><N value={Math.round(selected.y)} onChange={(v) => updateEl(selected.id, { y: v })} /></P>
                <P label="W"><N value={Math.round(selected.width)} onChange={(v) => updateEl(selected.id, { width: v })} /></P>
                <P label="H"><N value={Math.round(selected.height)} onChange={(v) => updateEl(selected.id, { height: v })} /></P>
              </div>
              <P label="Rotação"><N value={Math.round(selected.rotation)} onChange={(v) => updateEl(selected.id, { rotation: v })} /></P>
              <P label="Opacidade"><input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => updateEl(selected.id, { opacity: parseFloat(e.target.value) })} className="w-full accent-[#FF7A1A]" /></P>

              <div className="h-px bg-white/5" />

              {/* Type-specific */}
              {selected.type === "text" && (() => {
                const t = selected as TextEl;
                return <>
                  <P label="Texto"><textarea value={t.text} onChange={(e) => updateEl(t.id, { text: e.target.value })} rows={2} className="inp resize-none" /></P>
                  <P label="Fonte"><select value={t.fontFamily} onChange={(e) => updateEl(t.id, { fontFamily: e.target.value })} className="inp">{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select></P>
                  <div className="grid grid-cols-2 gap-2">
                    <P label="Tamanho"><N value={t.fontSize} onChange={(v) => updateEl(t.id, { fontSize: v })} /></P>
                    <P label="Cor"><input type="color" value={t.fill} onChange={(e) => updateEl(t.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-white/10" /></P>
                  </div>
                  <div className="flex gap-1">
                    {([
                      { style: "bold", label: "B", cls: "font-bold" },
                      { style: "italic", label: "I", cls: "italic" },
                    ]).map((s) => (
                      <button key={s.style} onClick={() => updateEl(t.id, { fontStyle: t.fontStyle === s.style ? "normal" : s.style })}
                        className={`flex-1 rounded py-1 text-[11px] ${s.cls} ${t.fontStyle === s.style ? "bg-white/10 text-white" : "text-white/30"}`}>{s.label}</button>
                    ))}
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} onClick={() => updateEl(t.id, { align: a })}
                        className={`flex-1 rounded py-1 text-[11px] ${t.align === a ? "bg-white/10 text-white" : "text-white/30"}`}>
                        {a === "left" ? "◧" : a === "center" ? "☰" : "◨"}
                      </button>
                    ))}
                  </div>
                </>;
              })()}

              {selected.type === "rect" && (() => {
                const r = selected as RectEl;
                return <>
                  <P label="Cor"><input type="color" value={r.fill} onChange={(e) => updateEl(r.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-white/10" /></P>
                  <P label="Borda"><input type="color" value={r.stroke || "#000"} onChange={(e) => updateEl(r.id, { stroke: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-white/10" /></P>
                  <div className="grid grid-cols-2 gap-2">
                    <P label="Borda px"><N value={r.strokeWidth} onChange={(v) => updateEl(r.id, { strokeWidth: v })} /></P>
                    <P label="Radius"><N value={r.cornerRadius} onChange={(v) => updateEl(r.id, { cornerRadius: v })} /></P>
                  </div>
                </>;
              })()}

              {selected.type === "circle" && (() => {
                const c = selected as CircleEl;
                return <>
                  <P label="Cor"><input type="color" value={c.fill} onChange={(e) => updateEl(c.id, { fill: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-white/10" /></P>
                  <P label="Borda"><input type="color" value={c.stroke || "#000"} onChange={(e) => updateEl(c.id, { stroke: e.target.value })} className="h-7 w-full cursor-pointer rounded border border-white/10" /></P>
                  <P label="Borda px"><N value={c.strokeWidth} onChange={(v) => updateEl(c.id, { strokeWidth: v })} /></P>
                </>;
              })()}

              {selected.type === "image" && (
                <P label="URL"><input type="text" value={(selected as ImageEl).src} readOnly className="inp truncate text-white/30" /></P>
              )}

              <div className="h-px bg-white/5" />
              <button onClick={() => removeEl(selected.id)} className="rounded-lg py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-400/10">Excluir elemento</button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STATUSBAR ══════════════════════════════ */}
      <footer className="flex items-center justify-between border-t border-white/10 bg-[#12122a] px-4 py-1 text-[10px] text-white/30 shrink-0">
        <span>{fmt.w}×{fmt.h}px · {FORMS.find((f) => f.key === formType)?.label} · {elements.length} elementos</span>
        <span>Zoom: {Math.round(scale * 100)}%</span>
      </footer>

      <style jsx global>{`
        .inp { height: 28px; width: 100%; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); padding: 0 8px; font-size: 11px; color: white; outline: none; }
        .inp:focus { border-color: #FF7A1A; }
        select.inp { padding-right: 4px; }
        textarea.inp { height: auto; padding: 6px 8px; }
      `}</style>
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function P({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-0.5 text-[9px] font-medium text-white/30">{label}</div>{children}</div>;
}

function N({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="inp" />;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text as KText, Image as KImage, Group } from "react-konva";
import type Konva from "konva";
import { applySmartLinks, type EditorElement, type EditorSchema } from "@/components/editor/types";
import { useBadges } from "@/hooks/useBadges";
import { resolveBadgeUrl, shouldRenderBadge } from "@/lib/badges";

/* ── Helpers ─────────────────────────────────────── */

function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
    i.src = src;
  }, [src]);
  return img;
}

function resolveBindParam(bindParam: string, values: Record<string, string>): string {
  switch (bindParam) {

    // Período formatado: "07 a 13/06/2026" com regra de virada de mês/ano
    case "dataperiodo": {
      const ida = values.dataida || "";
      const volta = values.datavolta || "";
      if (!ida || !volta) return "";
      const [iy, im, id] = ida.split("-").map(Number);
      const [vy, vm, vd] = volta.split("-").map(Number);
      const dId = String(id).padStart(2, "0");
      const dVd = String(vd).padStart(2, "0");
      const dIm = String(im).padStart(2, "0");
      const dVm = String(vm).padStart(2, "0");
      if (iy === vy && im === vm) return `${dId} a ${dVd}/${dIm}/${iy}`;
      if (iy === vy) return `${dId}/${dIm} a ${dVd}/${dVm}/${vy}`;
      return `${dId}/${dIm}/${iy} a ${dVd}/${dVm}/${vy}`;
    }

    // Parte inteira do valor parcela
    case "valorint": {
      const raw = values.valorparcela || values.totalduplo || values.totalcruzeiro || "";
      const nums = raw.replace(/\D/g, "");
      if (!nums) return "";
      return Math.floor(parseInt(nums, 10) / 100).toLocaleString("pt-BR");
    }

    // Parte decimal do valor parcela — prefixada com vírgula (substitui elemento estático ",")
    case "valdec": {
      const raw = values.valorparcela || values.totalduplo || values.totalcruzeiro || "";
      const nums = raw.replace(/\D/g, "");
      if (!nums) return "";
      return "," + String(parseInt(nums, 10) % 100).padStart(2, "0");
    }

    // Valor total formatado: "ou R$ X.XXX,XX por pessoa apto. duplo"
    case "valortotalfmt": {
      const raw = values.totalduplo || values.totalcruzeiro || "";
      const nums = raw.replace(/\D/g, "");
      if (!nums) return "";
      const n = parseInt(nums, 10);
      const fmt = Math.floor(n / 100).toLocaleString("pt-BR") + "," + String(n % 100).padStart(2, "0");
      const sufixo = values.totalcruzeiro ? "por pessoa" : "por pessoa apto. duplo";
      return `ou R$ ${fmt} ${sufixo}`;
    }

    // Lista de serviços com bullets
    case "servicoslista": {
      return [1,2,3,4,5,6]
        .map(i => values[`servico${i}`])
        .filter(Boolean)
        .map(s => `• ${s}`)
        .join("\n");
    }

    // Texto de pagamento derivado
    case "textopagamento": {
      const forma = values.formapagamento || "";
      const entrada = values.entrada || "";
      if (forma === "Boleto" && entrada) {
        const nums = entrada.replace(/\D/g, "");
        const fmt = nums ? Math.floor(parseInt(nums,10)/100).toLocaleString("pt-BR") + "," + String(parseInt(nums,10)%100).padStart(2,"0") : "";
        return `Entrada de R$ ${fmt} +`;
      }
      if (forma === "Cartão de Crédito") return "No Cartão de Crédito Sem Juros";
      return forma;
    }

    // Parcelas passagem
    case "parcelaspassagem":
      return values.parcelaspassagem || values.parcelas || "";

    // Campos de passagem (migração V2)
    case "periodo":
      return values.periodo || "";
    case "saida":
      return values.saida || "";
    case "voo":
      return values.voo || "";
    case "incluso":
      return values.incluso || "";
    case "valorparcela":
      return values.valorparcela || "";
    case "valortotal":
      return values.valortotal || "";
    case "parcelas":
      return values.parcelas || "";

    // Desconto: só o número sem "%" — v1 client.js:946-952
    case "desconto":
    case "desconto_valor": {
      const d = values.desconto;
      if (!d || d === "– nenhum –") return "";
      return String(d).replace("%", "").trim();
    }

    // Desconto Anoiteceu: só o número sem "%" — v1 client.js:953-958
    case "desconto_anoit_valor": {
      const d = values.desconto;
      if (!d || d === "– nenhum –") return "";
      return String(d).replace("%", "").trim();
    }

    // Datas Anoiteceu: data_inicio e data_fim já vêm formatadas DD/MM
    case "data_inicio":
      return values.inicio || "";

    case "data_fim":
      return values.fim || "";

    case "para_viagens_ate": {
      const raw = values.viagens_ate || values.paraviagens || "";
      if (!raw) return "";
      const [y, m, d] = raw.split("-");
      return `${d}/${m}/${y}`;
    }

    case "formapagamento": {
      const forma = values.formapagamento || "";
      const entrada = values.entrada || "";
      if (forma === "Boleto" && entrada) {
        const nums = entrada.replace(/\D/g, "");
        if (nums) {
          const n = parseInt(nums, 10);
          const fmt = Math.floor(n/100).toLocaleString("pt-BR") + "," + String(n%100).padStart(2,"0");
          return `Entrada de R$ ${fmt} +`;
        }
      }
      if (forma === "Cartão de Crédito") return "No Cartão de Crédito Sem Juros";
      return forma;
    }

    default: {
      const raw = values[bindParam] ?? "";
      if (raw === "– nenhum –") return "";
      if (["valorparcela","totalduplo","totalcruzeiro","entrada"].includes(bindParam)) {
        const nums = raw.replace(/\D/g, "");
        if (!nums) return "";
        const n = parseInt(nums, 10);
        return Math.floor(n/100).toLocaleString("pt-BR") + "," + String(n%100).padStart(2,"0");
      }
      return raw;
    }
  }
}

function applyTextTransform(text: string, transform?: string): string {
  switch (transform) {
    case "uppercase": return text.toUpperCase();
    case "lowercase": return text.toLowerCase();
    case "capitalize": return text.replace(/\b\w/g, c => c.toUpperCase());
    default: return text;
  }
}

/** Substitui qualquer [bindKey] no texto pelo valor do form (ou "" se vazio) */
function replaceInlineBinds(text: string, values: Record<string, string>): string {
  return text.replace(/\[([a-z0-9_]+)\]/gi, (_full, key: string) => {
    const resolved = resolveBindParam(key.toLowerCase(), values);
    return resolved || "";
  });
}

function resolveText(el: EditorElement, values: Record<string, string>): string {
  // Prioridade 1: bindParam explícito do editor
  if (el.bindParam) {
    const resolved = resolveBindParam(el.bindParam, values);
    if (resolved) return applyTextTransform(resolved, el.textTransform);
    // bindParam sem valor resolvido → texto vazio. el.text é só preview
    // do editor (ex: "RIBEIRÃO PRETO" para bindParam=saida), não fallback.
    // Guard no RenderEl retorna null quando txt é vazio, escondendo o elemento.
    return "";
  }

  // Prioridade 2: texto livre — substitui [binds] inline por valores do form
  const txt = el.text ?? "";
  const replaced = replaceInlineBinds(txt, values);
  return applyTextTransform(replaced, el.textTransform);
}

/** Reduz fontSize até que o texto caiba em `maxLines` linhas dentro de `maxWidth`. */
function fitFontSize(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontFamily: string,
  fontStyle: string,
  startSize: number
): number {
  if (typeof document === "undefined") return startSize;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let size = startSize;
  while (size > 8) {
    ctx.font = `${fontStyle} ${size}px ${fontFamily}`;
    const words = text.split(" ");
    let lines = 1;
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines++;
        line = word;
      } else {
        line = test;
      }
    }
    if (lines <= maxLines) return size;
    size -= 1;
  }
  return 8;
}

// Badges cujo render é condicional ao estado do form (não ao toggle values[bp]).
// Ver shouldRenderBadge em src/lib/badges.ts.
const DYNAMIC_BADGES = new Set([
  "all_inclusive_badge",
  "desconto_badge",
  "feriado_badge",
]);

function resolveImage(
  el: EditorElement,
  values: Record<string, string>,
  badgeUrls: Record<string, string>,
  feriadoUrls: Record<string, string>,
): string | undefined {
  if (!el.bindParam) return el.src;
  const bp = el.bindParam;

  if (bp.endsWith("_badge")) {
    const url = resolveBadgeUrl(bp, badgeUrls, feriadoUrls, values);
    if (url) return url;
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[badges] alias não bate para "${bp}"`);
    }
    return undefined;
  }

  const val = values[bp];
  if (val) return val;
  return el.src;
}

/* ── Card WhatsApp colorMap (paletas V1) ──────────
 * V1 lamina.html:286-291. Remapeia cores de elementos quando values.lam_palette
 * está definido (0/default = sem mudança). Aplicado só quando o schema tem
 * binds lam_* — assim não afeta outros formTypes que usem cores iguais por acaso.
 */
const LAM_PALETTES_RT = [
  { accent: "#D4E600" },
  { accent: "#1A56C4", bg: "#E8F0FE", text: "#0B1D3A" },
  { accent: "#16b5eb" },
  { accent: "#003366", bg: "#D6E4F0", text: "#0B1D3A" },
];

function buildLamColorMap(paletteIdx: number): Record<string, string> {
  const P = LAM_PALETTES_RT[paletteIdx];
  if (!P) return {};
  const map: Record<string, string> = {};
  // Accent: substitui verde default V1 pelo accent da paleta (skip se = default)
  if (P.accent.toLowerCase() !== "#d4e600") map["#d4e600"] = P.accent;
  // Bg: substitui azuis escuros V1 pela cor de fundo da paleta
  if (P.bg) {
    for (const dark of ["#0b1d3a", "#0b1826", "#0f1e32", "#1a56c4", "#003366"]) map[dark] = P.bg;
  }
  // Text: substitui brancos pela cor de texto da paleta
  if (P.text) {
    map["#ffffff"] = P.text;
    map["#fff"] = P.text;
  }
  return map;
}

function remapColor(c: string | undefined, map: Record<string, string>): string | undefined {
  if (!c || typeof c !== "string") return c;
  const low = c.toLowerCase().trim();
  return map[low] ?? c;
}

function applyLamColorMap(el: EditorElement, map: Record<string, string>): EditorElement {
  if (Object.keys(map).length === 0) return el;
  const fill = remapColor(el.fill, map);
  const stroke = remapColor(el.stroke, map);
  if (fill === el.fill && stroke === el.stroke) return el;
  return { ...el, fill: fill ?? el.fill, stroke: stroke ?? el.stroke };
}

/* ── Per-element ────────────────────────────────── */

function RenderEl({ el, values }: { el: EditorElement; values: Record<string, string> }) {
  if (el.visible === false) return null;
  if (el.hideIfEmpty && el.bindParam && !values[el.bindParam] && !DYNAMIC_BADGES.has(el.bindParam)) return null;

  if (el.type === "rect") {
    return (
      <Rect
        x={el.x} y={el.y} width={el.width} height={el.height}
        rotation={el.rotation ?? 0}
        fill={el.fill || "#000"}
        opacity={el.opacity ?? 1}
        cornerRadius={el.cornerRadius ?? 0}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth ?? 0}
        dash={el.strokeDashArray}
        shadowColor={el.shadow?.color}
        shadowBlur={el.shadow?.blur ?? 0}
        shadowOffsetX={el.shadow?.offsetX ?? 0}
        shadowOffsetY={el.shadow?.offsetY ?? 0}
      />
    );
  }

  if (el.type === "circle") {
    return (
      <Circle
        x={el.x + el.width / 2} y={el.y + el.height / 2}
        radius={Math.min(el.width, el.height) / 2}
        rotation={el.rotation ?? 0}
        fill={el.fill || "#000"}
        opacity={el.opacity ?? 1}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth ?? 0}
        dash={el.strokeDashArray}
        shadowColor={el.shadow?.color}
        shadowBlur={el.shadow?.blur ?? 0}
        shadowOffsetX={el.shadow?.offsetX ?? 0}
        shadowOffsetY={el.shadow?.offsetY ?? 0}
      />
    );
  }

  if (el.type === "text") {
    // Textos estáticos (sem bindParam) não aparecem no preview do cliente — só no editor
    if (!el.bindParam) return null;

    let txt = resolveText(el, values);
    // Se tem bindParam mas valor está vazio, não renderiza
    if (!txt) return null;
    const baseFont = el.fontSize ?? 24;
    const fSize = el.linhas
      ? fitFontSize(
          txt,
          el.width,
          el.linhas,
          el.fontFamily ?? "DM Sans",
          el.fontStyle ?? "normal",
          baseFont
        )
      : baseFont;

    // Price display: inteiro grande + centavos pequenos
    if (el.priceDisplay && el.bindParam && ["valorparcela","valorint"].includes(el.bindParam)) {
      const intPart = resolveBindParam("valorint", values);
      const decPart = resolveBindParam("valdec", values);
      const decSize = Math.round(fSize * 0.38);
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation ?? 0} opacity={el.opacity ?? 1}>
          <KText
            text={intPart}
            fontSize={fSize}
            fontFamily={el.fontFamily ?? "DM Sans"}
            fontStyle={el.fontStyle ?? "normal"}
            fill={el.fill || "#000"}
            align={el.align ?? "left"}
            letterSpacing={el.letterSpacing ?? 0}
            lineHeight={el.lineHeight ?? 1.2}
          />
          <KText
            x={intPart.length * fSize * 0.6}
            text={`,${decPart}`}
            fontSize={decSize}
            fontFamily={el.fontFamily ?? "DM Sans"}
            fontStyle={el.fontStyle ?? "normal"}
            fill={el.fill || "#000"}
            letterSpacing={el.letterSpacing ?? 0}
          />
        </Group>
      );
    }

    // Price display — Card WhatsApp (Lâmina V1):
    //   'R$' small + inteiro big + ,dec small. V1 _cardFallback linhas 962-968.
    //   R$ e inteiro em el.fill (accent); ,dec em branco (afetado pelo colorMap).
    //   Posicionamento via measureText em canvas offscreen (runtime).
    const lamValorMatch = el.bindParam?.match(/^lam_d\d+_valor$/);
    if (el.priceDisplay && lamValorMatch) {
      const raw = values[el.bindParam!] ?? "";
      const parts = raw.split(",");
      const intPart = (parts[0] || "").trim() || "—";
      const decPart = "," + ((parts[1] || "00").trim() || "00");
      const smallSize = Math.round(fSize * 26 / 44);  // V1 ratio 26/44
      const ff = el.fontFamily ?? "DM Sans";
      const accent = el.fill || "#000";
      // Branco real — colorMap substitui #ffffff → P.text se paleta tiver .text
      const decFill = "#ffffff";

      // measureText em canvas offscreen (só no browser)
      let wRS = 0, wInt = 0;
      if (typeof document !== "undefined") {
        const c = document.createElement("canvas").getContext("2d");
        if (c) {
          c.font = `normal ${smallSize}px "${ff}", sans-serif`;
          wRS = c.measureText("R$ ").width;
          c.font = `bold ${fSize}px "${ff}", sans-serif`;
          wInt = c.measureText(intPart).width;
        }
      }
      // Fallback se measureText falhar
      if (wRS === 0) wRS = smallSize * 1.4;
      if (wInt === 0) wInt = intPart.length * fSize * 0.55;

      return (
        <Group x={el.x} y={el.y} rotation={el.rotation ?? 0} opacity={el.opacity ?? 1}>
          <KText
            x={0}
            y={Math.round(fSize * 0.3)}  /* baseline alignment: R$ sits ~30% lower than big number top */
            text="R$"
            fontSize={smallSize}
            fontFamily={ff}
            fill={accent}
          />
          <KText
            x={Math.round(wRS + 2)}
            y={0}
            text={intPart}
            fontSize={fSize}
            fontFamily={ff}
            fontStyle="bold"
            fill={accent}
          />
          <KText
            x={Math.round(wRS + wInt + 6)}
            y={Math.round(fSize * 0.3)}  /* mesmo baseline de R$ */
            text={decPart}
            fontSize={smallSize}
            fontFamily={ff}
            fill={decFill}
          />
        </Group>
      );
    }

    return (
      <KText
        x={el.x} y={el.y}
        width={el.width}
        height={el.linhas ? Math.ceil(fSize * (el.lineHeight ?? 1.2) * el.linhas) : undefined}
        wrap="word"
        ellipsis={!!el.linhas}
        rotation={el.rotation ?? 0}
        text={txt}
        fontSize={fSize}
        fontFamily={el.fontFamily ?? "DM Sans"}
        fontStyle={el.fontStyle ?? "normal"}
        textDecoration={el.textDecoration ?? ""}
        fill={el.fill || "#000"}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth ?? 0}
        align={el.align ?? "left"}
        verticalAlign={el.verticalAlign ?? "top"}
        letterSpacing={el.letterSpacing ?? 0}
        lineHeight={el.lineHeight ?? 1.2}
        opacity={el.opacity ?? 1}
        shadowColor={el.shadow?.color}
        shadowBlur={el.shadow?.blur ?? 0}
        shadowOffsetX={el.shadow?.offsetX ?? 0}
        shadowOffsetY={el.shadow?.offsetY ?? 0}
      />
    );
  }

  if (el.type === "image") {
    return <RenderImage el={el} values={values} />;
  }

  if (el.type === "imageBind") {
    const bp = el.bindParam;
    if (!bp) return null;
    if (DYNAMIC_BADGES.has(bp)) {
      // Badges dinâmicos: condição vem de shouldRenderBadge (servicos, desconto, feriado).
      if (!shouldRenderBadge(bp, values)) return null;
    } else if (!values[bp] && !el.src) {
      // Fallback: bind depende de values[bp] estar preenchido ou el.src padrão existir.
      return null;
    }
    return <RenderImage el={{ ...el, type: "image", src: values[bp] || el.src }} values={values} />;
  }

  return null;
}

function RenderImage({ el, values }: { el: EditorElement; values: Record<string, string> }) {
  const { badges, feriados } = useBadges();
  const src = resolveImage(el, values, badges, feriados);
  const img = useImage(src);
  // Sem src resolvido (bind vazio e sem fallback): não renderizar placeholder —
  // deixa elementos abaixo (ex: rect de fundo) visíveis. Antes: cinza #e5e7eb tapava tudo.
  if (!src) return null;
  if (!img) {
    return (
      <Rect
        x={el.x} y={el.y} width={el.width} height={el.height}
        fill="#e5e7eb"
        opacity={el.opacity ?? 1}
        cornerRadius={el.cornerRadius ?? 0}
      />
    );
  }
  return (
    <KImage
      image={img}
      x={el.x} y={el.y} width={el.width} height={el.height}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      cornerRadius={el.cornerRadius ?? 0}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth ?? 0}
      shadowColor={el.shadow?.color}
      shadowBlur={el.shadow?.blur ?? 0}
      shadowOffsetX={el.shadow?.offsetX ?? 0}
      shadowOffsetY={el.shadow?.offsetY ?? 0}
    />
  );
}

/* ── Stage ──────────────────────────────────────── */

export interface PreviewStageHandle {
  toDataURL: () => string | null;
}

interface Props {
  schema: EditorSchema;
  width: number;
  height: number;
  values: Record<string, string>;
  maxDisplay?: number;
  onReady?: (stage: Konva.Stage) => void;
}

export default function PreviewStage({ schema, width, height, values, maxDisplay = 420, onReady }: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);

  const scale = useMemo(() => {
    const byH = maxDisplay / height;
    const byW = (maxDisplay * 0.75) / width;
    return Math.min(byH, byW, 1);
  }, [width, height, maxDisplay]);

  // Preview-time smart-links: recalcula altura real de textos expansíveis (servicoslista)
  // e propaga para elementos com smartTrack/smartResize apontando para eles.
  const resolvedElements = useMemo(() => {
    // Detecta Card WhatsApp pelo bindParam — se alguma tem lam_*, colorMap está ativo.
    const isLam = schema.elements.some(e => e.bindParam?.startsWith("lam_"));
    const paletteIdx = isLam ? parseInt(values.lam_palette || "0", 10) || 0 : 0;
    const colorMap = isLam && paletteIdx > 0 ? buildLamColorMap(paletteIdx) : {};
    let els = schema.elements.map(e => applyLamColorMap({ ...e }, colorMap));
    // Mede altura real dos textos que dependem de bind dinâmico
    for (const el of els) {
      if (el.type !== "text" || !el.bindParam) continue;
      const txt = resolveBindParam(el.bindParam, values);
      if (!txt) continue;
      // Conta quebras de linha explícitas como base para altura
      const lines = Math.max(1, txt.split("\n").length);
      const fs = el.fontSize ?? 24;
      const lh = el.lineHeight ?? 1.2;
      const measured = Math.ceil(lines * fs * lh);
      if (Math.abs(measured - el.height) > 1) {
        el.height = measured;
      }
    }
    // Propaga cascata de smart-links a partir de cada elemento ajustado
    for (const src of schema.elements) {
      if (src.type !== "text" || !src.bindParam) continue;
      const patches = applySmartLinks(src.id, els);
      els = els.map(e => patches[e.id] ? { ...e, ...patches[e.id] } : e);
    }
    return els;
  }, [schema.elements, values]);

  useEffect(() => {
    if (stageRef.current && onReady) onReady(stageRef.current);
  }, [onReady]);

  return (
    <Stage
      ref={(r) => { stageRef.current = r; }}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      scaleX={scale}
      scaleY={scale}
      style={{ background: schema.background || "#fff", borderRadius: 12, overflow: "hidden" }}
    >
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill={schema.background || "#fff"} />
        {resolvedElements.map((el) => (
          <RenderEl key={el.id} el={el} values={values} />
        ))}
      </Layer>
    </Stage>
  );
}

/**
 * Exporta o canvas em tamanho real (não escalado).
 */
export function exportStagePNG(stage: Konva.Stage): string {
  return stage.toDataURL({ pixelRatio: 1 / (stage.scaleX() || 1), mimeType: "image/png" });
}

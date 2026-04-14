"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text as KText, Image as KImage } from "react-konva";
import type Konva from "konva";
import type { EditorElement, EditorSchema } from "@/components/editor/types";

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

/** Substitui [bindKey] inline pelo valor do form (ou "" se vazio) */
function replaceInlineBinds(text: string, values: Record<string, string>): string {
  return text.replace(/\[([a-z0-9_]+)\]/gi, (_full, key: string) => {
    return values[key.toLowerCase()] || "";
  });
}

function resolveText(el: EditorElement, values: Record<string, string>): string {
  if (el.bindParam) {
    if (values[el.bindParam]) return values[el.bindParam];
    // bindParam sem valor → esconde placeholder bracketado
    const txt = el.text ?? "";
    if (txt.includes("[") && txt.includes("]")) return "";
    return txt;
  }
  // Texto livre: substitui binds [xxx] pelos valores do form
  return replaceInlineBinds(el.text ?? "", values);
}

function resolveImage(el: EditorElement, values: Record<string, string>): string | undefined {
  if (el.bindParam && values[el.bindParam]) return values[el.bindParam];
  return el.src;
}

/* ── Per-element ────────────────────────────────── */

function RenderEl({ el, values }: { el: EditorElement; values: Record<string, string> }) {
  if (el.visible === false) return null;

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
      />
    );
  }

  if (el.type === "text") {
    const txt = resolveText(el, values);
    return (
      <KText
        x={el.x} y={el.y} width={el.width} height={el.height}
        rotation={el.rotation ?? 0}
        text={txt}
        fontSize={el.fontSize ?? 24}
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

  return null;
}

function RenderImage({ el, values }: { el: EditorElement; values: Record<string, string> }) {
  const src = resolveImage(el, values);
  const img = useImage(src);
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
        {schema.elements.map((el) => (
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

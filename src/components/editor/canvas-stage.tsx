import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Image as KImage, Transformer, Line, Group } from "react-konva";
import type Konva from "konva";
import QRCode from "qrcode";
import { EditorElement, EditorSchema, SnapLine, calcSnapLines, computeTextHeight, GradientFill } from "./types";

interface Props {
  width: number; height: number;
  schema: EditorSchema;
  selectedIds: string[];
  stageScale: number;
  playing: boolean; currentTime: number;
  snapEnabled?: boolean;
  onSelect: (id: string | null) => void;
  onShiftSelect: (id: string) => void;
  onMultiSelect?: (ids: string[]) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onMultiUpdate?: (updates: { id: string; x: number; y: number }[]) => void;
  onStageRef: (r: Konva.Stage | null) => void;
  onScaleChange: (s: number) => void;
  previewValues?: Record<string, string>;
}

function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!src) { setImg(null); return; } const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

function useQrImage(url: string, fg: string, bg: string, size: number): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    let cancel = false;
    const px = Math.max(64, Math.min(1024, Math.round(size)));
    QRCode.toDataURL(url, { margin: 1, width: px, color: { dark: fg || "#000000", light: bg || "#FFFFFF" } })
      .then(dataUrl => {
        if (cancel) return;
        const i = new window.Image();
        i.onload = () => { if (!cancel) setImg(i); };
        i.src = dataUrl;
      })
      .catch(() => { if (!cancel) setImg(null); });
    return () => { cancel = true; };
  }, [url, fg, bg, size]);
  return img;
}

/* ── Editor preview — dados de exemplo para o canvas do ADM ─────────── */
export const PREVIEW_DEFAULTS: Record<string, string> = {
  destino: "CANCÚN", hotel: "Hard Rock Hotel Cancún", tipovoo: "( Voo Direto )", tipohospedagem: "Hotel",
  dataperiodo: "07 a 14/Jun/2026",
  servicoslista: "• Passagem Aérea\n• Hotel 5★ All Inclusive\n• Transfer in/out\n• Café da manhã",
  servicos: "Passagem Aérea\nHotel 5★ All Inclusive\nTransfer in/out\nCafé da manhã",
  servico1: "Passagem Aérea", servico2: "Hotel 5★ All Inclusive",
  servico3: "Transfer in/out", servico4: "Café da manhã", servico5: "", servico6: "",
  valorparcela: "1.250,00", valorint: "1.250", valdec: ",00",
  valortotal: "12.500,00", totalduplo: "1250000", inteiro: "1.250", centavos: "00",
  parcelas: "10", entrada: "", formapagamento: "Cartão de Crédito",
  textopagamento: "No Cartão de Crédito Sem Juros",
  saida: "GRU", periodo: "07 a 14/Jun", voo: "LA 8050", incluso: "Bagagem 23kg",
  parcelaspassagem: "12", navio: "MSC Grandiosa",
  itinerario: "Santos → Buenos Aires → Montevidéu", q_vezes: "7", data_correta: "15/07/2026",
  inicio: "10/06", fim: "17/06", desconto: "30",
  lojanome: "Filial Centro", lojatelefone: "(11) 99999-9999",
  forma_pgto: "No Cartão de Crédito Sem Juros", forma_de_pagamento: "No Cartão de Crédito Sem Juros",
  valortotalfmt: "ou R$ 12.500,00 por pessoa apto. duplo",
  valortotaltexto: "ou R$ 12.500,00 por pessoa apto. duplo.",
};

function replacePreviewBinds(text: string, vals: Record<string, string>): string {
  return text.replace(/\[([a-z0-9_]+)\]/gi, (_, k: string) => vals[k.toLowerCase()] ?? "");
}

/* ── Gradient helper ──────────────────────────────── */
function getFillProps(fill: string | GradientFill | undefined, width: number, height: number) {
  if (!fill || typeof fill === "string") {
    return { fill: fill || "#FFFFFF" };
  }
  // Gradiente
  const { colors, direction, stops } = fill;
  let startPoint = { x: 0, y: 0 };
  let endPoint = { x: 0, y: 0 };
  switch (direction) {
    case "horizontal":
      startPoint = { x: 0, y: 0 };
      endPoint = { x: width, y: 0 };
      break;
    case "vertical":
      startPoint = { x: 0, y: 0 };
      endPoint = { x: 0, y: height };
      break;
    case "diagonal-down":
      startPoint = { x: 0, y: 0 };
      endPoint = { x: width, y: height };
      break;
    case "diagonal-up":
      startPoint = { x: 0, y: height };
      endPoint = { x: width, y: 0 };
      break;
  }
  return {
    fillLinearGradientStartPoint: startPoint,
    fillLinearGradientEndPoint: endPoint,
    fillLinearGradientColorStops: stops
      ? stops.flatMap(s => [s.offset, s.color])
      : [0, colors[0], 1, colors[1]],
  };
}

/* ── Fit-font helper ─────────────────────────────── */
function fitFontSize(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontFamily: string,
  fontStyle: string,
  startSize: number,
  _lineHeight: number
): number {
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

/* ── Animation ───────────────────────────────────── */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBounce(t: number) { if (t < 1/2.75) return 7.5625*t*t; if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75; if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375; return 7.5625*(t-=2.625/2.75)*t+0.984375; }

interface AnimState { opacity: number; offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation: number; textClip?: number; }

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none"; const delay = el.animDelay || 0; const dur = el.animDuration || 0.6;
  const elapsed = time - delay; const base = el.opacity ?? 1;
  const done: AnimState = { opacity: base, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  if (anim === "none" || elapsed >= dur) return done;
  if (elapsed < 0) return { ...done, opacity: 0 };
  const t = Math.min(elapsed / dur, 1); const e = easeOut(t);
  switch (anim) {
    case "fadeIn": return { ...done, opacity: base * e };
    case "slideUp": return { ...done, opacity: base * e, offsetY: 100 * (1 - e) };
    case "slideDown": return { ...done, opacity: base * e, offsetY: -100 * (1 - e) };
    case "slideLeft": return { ...done, opacity: base * e, offsetX: 100 * (1 - e) };
    case "slideRight": return { ...done, opacity: base * e, offsetX: -100 * (1 - e) };
    case "zoomIn": return { ...done, opacity: base * e, scaleX: e, scaleY: e };
    case "zoomOut": return { ...done, opacity: base * e, scaleX: 2 - e, scaleY: 2 - e };
    case "typewriter": return { ...done, textClip: Math.floor((el.text || "").length * t) };
    case "bounce": return { ...done, offsetY: -80 * (1 - easeOutBounce(t)) };
    case "rotate360": return { ...done, opacity: base * e, rotation: -360 * (1 - e) };
    case "pulse": return { ...done, scaleX: 1 + 0.1 * Math.sin(t * Math.PI * 4), scaleY: 1 + 0.1 * Math.sin(t * Math.PI * 4) };
    case "shake": return { ...done, offsetX: 10 * Math.sin(t * Math.PI * 8) * (1 - t) };
    case "float": return { ...done, offsetY: -20 * Math.sin(t * Math.PI * 2) };
    default: return done;
  }
}

/* ── Per-element renderer (NO Transformer inside) ── */
function RenderElement({ el, allElements, playing, animState, onClick, onChange, onRegisterRef, onDragMoveSnap, onDragEndClear, onDragEndUpdate, previewValues }: {
  el: EditorElement;
  allElements: EditorElement[];
  playing: boolean;
  animState: AnimState;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (u: Partial<EditorElement>) => void;
  onRegisterRef: (id: string, node: Konva.Node | null) => void;
  onDragMoveSnap: (id: string, rawX: number, rawY: number) => { x: number; y: number };
  onDragEndClear: () => void;
  onDragEndUpdate: (id: string, x: number, y: number) => void;
  previewValues?: Record<string, string>;
}) {
  const shapeRef = useRef<Konva.Node>(null);
  const img = useImage(el.type === "image" ? el.src : undefined);
  const qrImg = useQrImage(
    el.type === "qrcode" ? (el.qrUrl || "") : "",
    el.qrFg || "#000000",
    el.qrBg || "#FFFFFF",
    el.width
  );

  useEffect(() => { onRegisterRef(el.id, shapeRef.current); return () => onRegisterRef(el.id, null); }, [el.id, shapeRef.current]);

  if (el.visible === false) return null;

  const common = {
    id: el.id,
    ref: shapeRef as React.RefObject<Konva.Node>,
    x: el.x + animState.offsetX, y: el.y + animState.offsetY,
    rotation: (el.rotation || 0) + animState.rotation,
    opacity: animState.opacity,
    scaleX: animState.scaleX * (el.flipX ? -1 : 1),
    scaleY: animState.scaleY * (el.flipY ? -1 : 1),
    draggable: !playing && !el.locked,
    // onClick/onTap handled per-element below
    shadowColor: el.shadow?.color, shadowOffsetX: el.shadow?.offsetX, shadowOffsetY: el.shadow?.offsetY, shadowBlur: el.shadow?.blur, shadowEnabled: !!el.shadow,
    globalCompositeOperation: (el.blendMode || "source-over") as GlobalCompositeOperation,
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      // Cancela drag se foi iniciado com botão do meio (pan do canvas)
      if (e.evt.button === 1) {
        e.target.stopDrag();
        return;
      }
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const tgt = e.target;
      const rawX = tgt.x() - animState.offsetX;
      const rawY = tgt.y() - animState.offsetY;
      const snapped = onDragMoveSnap(el.id, rawX, rawY);
      if (snapped.x !== rawX) tgt.x(snapped.x + animState.offsetX);
      if (snapped.y !== rawY) tgt.y(snapped.y + animState.offsetY);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEndClear();
      onDragEndUpdate(el.id, e.target.x() - animState.offsetX, e.target.y() - animState.offsetY);
    },
    onTransformEnd: () => {
      const n = shapeRef.current!;
      const sx = Math.abs(n.scaleX()); const sy = Math.abs(n.scaleY());
      if (el.type === "text") {
        onChange({ x: n.x(), y: n.y(), width: Math.max(20, n.width() * sx), rotation: n.rotation() });
      } else {
        onChange({ x: n.x(), y: n.y(), width: Math.max(5, (el.type === "circle" ? el.width : n.width()) * sx), height: Math.max(5, (el.type === "circle" ? el.height : n.height()) * sy), rotation: n.rotation() });
      }
      n.scaleX(el.flipX ? -1 : 1); n.scaleY(el.flipY ? -1 : 1);
    },
  };

  const rawText = animState.textClip !== undefined ? (el.text || "").slice(0, animState.textClip) : (el.text || "");
  const resolvedText = previewValues
    ? (el.bindParam
        ? (rawText && !(rawText.startsWith('[') && rawText.endsWith(']')) ? rawText : (previewValues[el.bindParam] ?? ""))
        : replacePreviewBinds(rawText, previewValues))
    : rawText;
  const displayText = (() => {
    switch (el.textTransform) {
      case "uppercase": return resolvedText.toUpperCase();
      case "lowercase": return resolvedText.toLowerCase();
      case "capitalize": return resolvedText.replace(/\b\w/g, c => c.toUpperCase());
      default: return resolvedText;
    }
  })();

  if (el.type === "text") {
    const baseFont = el.fontSize || 32;
    const fSize = el.linhas && typeof window !== "undefined"
      ? fitFontSize(
          displayText || el.text || "",
          el.width,
          el.linhas,
          el.fontFamily || '"Helvetica Neue", Arial, Helvetica, sans-serif',
          el.fontStyle || "normal",
          baseFont,
          el.lineHeight || 1.2
        )
      : baseFont;
    const textFillProps = getFillProps(el.fill || "#FFF", el.width, el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : fSize * (el.lineHeight || 1.2));
    const textBgHeight = el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : el.height;
    return <>
      {el.textBg && (
        <Rect
          x={common.x} y={common.y} rotation={common.rotation}
          width={el.width} height={textBgHeight}
          fill={el.textBg} opacity={(el.textBgOpacity ?? 100) / 100}
          listening={false}
        />
      )}
      <Text ref={shapeRef as React.RefObject<Konva.Text>}
        id={el.id} x={common.x} y={common.y} rotation={common.rotation} opacity={common.opacity} scaleX={common.scaleX} scaleY={common.scaleY} draggable={common.draggable}
        shadowColor={common.shadowColor} shadowOffsetX={common.shadowOffsetX} shadowOffsetY={common.shadowOffsetY} shadowBlur={common.shadowBlur} shadowEnabled={common.shadowEnabled}
        onDragMove={common.onDragMove} onDragEnd={common.onDragEnd} onTransformEnd={common.onTransformEnd}
        onClick={(e) => onClick(e)} onDblClick={() => { if (!playing && !el.locked) { const t = prompt("Editar texto:", el.text || ""); if (t !== null) onChange({ text: t }); } }}
        width={el.width}
        height={el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : undefined}
        wrap="word"
        ellipsis={!!el.linhas}
        text={displayText} fontSize={fSize} fontFamily={el.fontFamily || '"Helvetica Neue", Arial, Helvetica, sans-serif'} fontStyle={el.fontStyle || "normal"} {...textFillProps} align={el.align || "left"} letterSpacing={el.letterSpacing || 0} lineHeight={el.lineHeight || 1.2} textDecoration={el.textDecoration || ""} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} padding={Math.max(el.paddingH ?? 0, el.paddingV ?? 0)} />
    </>;
  }
  if (el.type === "rect") {
    const linkedText = el.autoHeightRef
      ? allElements.find(e => e.id === el.autoHeightRef && e.type === "text")
      : null;
    const rectHeight = linkedText ? computeTextHeight(linkedText) : el.height;
    const rectFillProps = getFillProps(el.fill, el.width, rectHeight);
    return <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={rectHeight} {...rectFillProps} cornerRadius={el.cornerRadius || 0} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "circle") {
    const circleFillProps = getFillProps(el.fill, el.width, el.height);
    return <Circle {...common} ref={shapeRef as React.RefObject<Konva.Circle>} onClick={(e) => onClick(e)} radius={Math.min(el.width, el.height) / 2} {...circleFillProps} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "image") {
    if (!img) {
      // Placeholder transparente — mantém border tracejado + label para designers,
      // mas NÃO preenche cinza, deixando o background do template visível por baixo.
      return <>
        <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={el.height} fill="" stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} cornerRadius={el.cornerRadius || 0} />
        <Text x={el.x + el.width / 2 - 40} y={el.y + el.height / 2 - 8} text={el.bindParam ? `📸 ${el.bindParam}` : "Placeholder"} fontSize={14} fill="#aaa" listening={false} />
      </>;
    }
    // Crop: explícito (do CropModal) tem precedência; senão auto-calc via imageFit
    let crop = (el.cropW && el.cropH) ? { x: el.cropX || 0, y: el.cropY || 0, width: el.cropW, height: el.cropH } : undefined;
    if (!crop && img.naturalWidth > 0 && img.naturalHeight > 0 && el.imageFit && el.imageFit !== "fill") {
      const targetAspect = el.width / el.height;
      const srcAspect = img.naturalWidth / img.naturalHeight;
      if (el.imageFit === "cover") {
        if (srcAspect > targetAspect) {
          // Fonte mais larga — corta nas laterais
          const cw = img.naturalHeight * targetAspect;
          crop = { x: (img.naturalWidth - cw) / 2, y: 0, width: cw, height: img.naturalHeight };
        } else {
          // Fonte mais alta — corta topo/base
          const ch = img.naturalWidth / targetAspect;
          crop = { x: 0, y: (img.naturalHeight - ch) / 2, width: img.naturalWidth, height: ch };
        }
      } else if (el.imageFit === "contain") {
        // Contain: expande a source region para que a imagem inteira caiba (letterbox).
        // Não há "cropsmall" padrão no Konva pro contain, mas podemos simular aumentando o crop além da source — Konva renderiza fundo transparente nas bordas.
        if (srcAspect > targetAspect) {
          // Fonte mais larga — adiciona padding vertical
          const ch = img.naturalWidth / targetAspect;
          crop = { x: 0, y: (img.naturalHeight - ch) / 2, width: img.naturalWidth, height: ch };
        } else {
          // Fonte mais alta — adiciona padding horizontal
          const cw = img.naturalHeight * targetAspect;
          crop = { x: (img.naturalWidth - cw) / 2, y: 0, width: cw, height: img.naturalHeight };
        }
      }
    }
    const clipShape = el.clipShape || "none";
    if (clipShape !== "none") {
      const radius = el.clipRadius ?? Math.min(el.width, el.height) * 0.25;
      const clipFunc = clipShape === "circle"
        ? (rawCtx: unknown) => {
            const ctx = rawCtx as CanvasRenderingContext2D;
            ctx.beginPath();
            ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
            ctx.closePath();
          }
        : (rawCtx: unknown) => {
            const ctx = rawCtx as CanvasRenderingContext2D;
            const r = Math.min(radius, el.width / 2, el.height / 2);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(el.width - r, 0);
            ctx.quadraticCurveTo(el.width, 0, el.width, r);
            ctx.lineTo(el.width, el.height - r);
            ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height);
            ctx.lineTo(r, el.height);
            ctx.quadraticCurveTo(0, el.height, 0, el.height - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
          };
      return (
        <Group {...common} ref={shapeRef as React.RefObject<Konva.Group>} onClick={(e) => onClick(e)} width={el.width} height={el.height} clipFunc={clipFunc as unknown as (ctx: Konva.Context) => void}>
          <KImage image={img} x={0} y={0} width={el.width} height={el.height} crop={crop} />
        </Group>
      );
    }
    return <KImage {...common} ref={shapeRef as React.RefObject<Konva.Image>} onClick={(e) => onClick(e)} image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius || 0} crop={crop} />;
  }
  if (el.type === "imageBind") {
    // Placeholder visível apenas no editor ADM: retângulo pontilhado + ícone + label do bind.
    // Os 3 nós vivem num Group para arrastarem juntos — filhos usam coords relativas.
    const label = el.bindParam ? `🖼 ${el.bindParam}` : "🖼 Bind Imagem";
    const iconSize = Math.min(48, Math.min(el.width, el.height) * 0.3);
    return (
      <Group
        {...common}
        ref={shapeRef as React.RefObject<Konva.Group>}
        onClick={(e) => onClick(e)}
        width={el.width}
        height={el.height}
      >
        <Rect
          width={el.width}
          height={el.height}
          fill="rgba(59,130,246,0.08)"
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[8, 6]}
          cornerRadius={el.cornerRadius ?? 8}
        />
        <Text
          x={el.width / 2 - iconSize / 2}
          y={el.height / 2 - iconSize / 2 - 8}
          text="🖼"
          fontSize={iconSize}
          listening={false}
        />
        <Text
          x={0}
          y={el.height / 2 + iconSize / 2 - 4}
          width={el.width}
          align="center"
          text={label}
          fontSize={14}
          fontFamily="Helvetica Neue"
          fontStyle="bold"
          fill="#3B82F6"
          listening={false}
        />
      </Group>
    );
  }
  if (el.type === "group") {
    return (
      <Rect
        {...common}
        ref={shapeRef as React.RefObject<Konva.Rect>}
        onClick={(e) => onClick(e)}
        width={el.width}
        height={el.height}
        fill="rgba(255,122,26,0.04)"
        stroke="#FF7A1A"
        strokeWidth={1.5}
        dash={[10, 6]}
        cornerRadius={4}
      />
    );
  }
  if (el.type === "qrcode") {
    if (!qrImg) {
      return <Rect {...common} ref={shapeRef as React.RefObject<Konva.Rect>} onClick={(e) => onClick(e)} width={el.width} height={el.height} fill={el.qrBg || "#FFFFFF"} stroke="#aaa" strokeWidth={1} dash={[4, 3]} cornerRadius={4} />;
    }
    return <KImage {...common} ref={shapeRef as React.RefObject<Konva.Image>} onClick={(e) => onClick(e)} image={qrImg} width={el.width} height={el.height} />;
  }
  return null;
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ── Main canvas component ───────────────────────── */
export default function CanvasStage(p: Props) {
  const { width, height, schema, selectedIds, stageScale, playing, currentTime, snapEnabled = true } = p;
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const [guides, setGuides] = useState<SnapLine[]>([]);

  const handleDragMoveSnap = useCallback((id: string, rawX: number, rawY: number) => {
    if (!snapEnabled || selectedIds.length > 1) return { x: rawX, y: rawY };
    const el = schema.elements.find(e => e.id === id);
    if (!el) return { x: rawX, y: rawY };
    const r = calcSnapLines({ id, x: rawX, y: rawY, width: el.width, height: el.height }, schema.elements, width, height);
    setGuides(r.lines);
    return { x: r.x, y: r.y };
  }, [schema.elements, width, height, snapEnabled, selectedIds]);

  const handleDragEndClear = useCallback(() => setGuides([]), []);

  // p.onUpdate já é cascadeUpdateElement — propaga smart-links em uma única chamada
  const cascadeUpdate = useCallback((id: string, attrs: Partial<EditorElement>) => {
    p.onUpdate(id, attrs);
  }, [p.onUpdate]);

  // Multi-drag batching: coleta todas as posições finais e aplica em um único update
  const pendingMultiDragRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const multiDragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragEndUpdate = useCallback((id: string, x: number, y: number) => {
    if (selectedIds.length < 2) {
      cascadeUpdate(id, { x, y });
      return;
    }
    // Multi-select: acumula e usa setTimeout para coletar todos os dragEnd do mesmo ciclo
    pendingMultiDragRef.current.set(id, { x, y });
    if (multiDragTimerRef.current) clearTimeout(multiDragTimerRef.current);
    multiDragTimerRef.current = setTimeout(() => {
      multiDragTimerRef.current = null;
      const updates: { id: string; x: number; y: number }[] = [];
      for (const selId of selectedIds) {
        const pending = pendingMultiDragRef.current.get(selId);
        if (pending) {
          updates.push({ id: selId, ...pending });
        } else {
          // Nó foi movido pelo Transformer mas não disparou dragEnd — lê posição do Konva
          const node = nodeRefs.current.get(selId);
          if (node) updates.push({ id: selId, x: node.x(), y: node.y() });
        }
      }
      pendingMultiDragRef.current.clear();
      p.onMultiUpdate?.(updates);
    }, 0);
  }, [selectedIds, cascadeUpdate, p.onMultiUpdate]);

  useEffect(() => {
    if (stageRef.current) stageRef.current.position({ x: 0, y: 0 });
    p.onStageRef(stageRef.current);
  }, [stageRef.current]);

  // Sync Transformer with selectedIds
  useEffect(() => {
    if (!trRef.current || playing) { trRef.current?.nodes([]); return; }
    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const node = nodeRefs.current.get(id);
      if (node) nodes.push(node);
    }
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, playing, schema.elements]);

  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  // Clamp da posição do stage: canvas deve manter ao menos 20% visível em cada eixo
  const clampStagePos = useCallback((x: number, y: number) => {
    const canvasW = width * stageScale;
    const canvasH = height * stageScale;
    const container = containerRef.current;
    if (!container) return { x, y };
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    // Stage é posicionado absolutamente via stage.x()/stage.y(); esses valores são
    // relativos ao seu container. Limita para não sumir completamente.
    const margin = 0.2; // 20% mínimo visível
    const maxRight = viewW - canvasW * margin;
    const maxLeft = -canvasW * (1 - margin);
    const maxBottom = viewH - canvasH * margin;
    const maxTop = -canvasH * (1 - margin);

    return {
      x: Math.max(maxLeft, Math.min(maxRight, x)),
      y: Math.max(maxTop, Math.min(maxBottom, y)),
    };
  }, [width, height, stageScale]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    // Ctrl/Cmd+wheel = zoom (mantém comportamento antigo)
    // Wheel puro com zoom > 100% = scroll/pan
    if (e.evt.ctrlKey || e.evt.metaKey || stageScale <= 1.01) {
      p.onScaleChange(Math.min(3, Math.max(0.1, stageScale * (e.evt.deltaY < 0 ? 1.08 : 0.92))));
      return;
    }

    // Scroll/pan com o stage
    const scrollSpeed = 1.2;
    const dx = (e.evt.shiftKey || Math.abs(e.evt.deltaX) > 0) ? e.evt.deltaX * scrollSpeed : 0;
    const dy = e.evt.deltaY * scrollSpeed;

    const offsetX = e.evt.shiftKey ? e.evt.deltaY * scrollSpeed : dx;
    const offsetY = e.evt.shiftKey ? 0 : dy;

    setPanOffset(prev => clampStagePos(prev.x - offsetX, prev.y - offsetY));
  }, [stageScale, p.onScaleChange, clampStagePos]);

  // Pan via botão do meio do mouse: move o wrapper CSS — Stage + borda movem juntos.
  const containerRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const selRectStart = useRef<{ x: number; y: number } | null>(null);
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: panOffset.x,
      offsetY: panOffset.y,
    };
    setIsPanning(true);
    const onMove = (ev: MouseEvent) => {
      const s = panStartRef.current;
      if (!s) return;
      setPanOffset({
        x: s.offsetX + (ev.clientX - s.clientX),
        y: s.offsetY + (ev.clientY - s.clientY),
      });
    };
    const onUp = () => {
      panStartRef.current = null;
      setIsPanning(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panOffset.x, panOffset.y]);

  const handleElementClick = useCallback((elId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      p.onShiftSelect(elId);
    } else {
      p.onSelect(elId);
    }
  }, [p.onSelect, p.onShiftSelect]);

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
      background: "var(--ed-canvas-bg, #12121a)",
      backgroundImage: "radial-gradient(circle, var(--ed-bdr) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      cursor: isPanning ? "grabbing" : undefined,
    }}
      ref={containerRef}
      onClick={e => { if (e.target === e.currentTarget) p.onSelect(null); }}
      onMouseDown={handleContainerMouseDown}
      onAuxClick={e => { if (e.button === 1) e.preventDefault(); }}>
      <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
      <Stage ref={stageRef} width={width * stageScale} height={height * stageScale} scaleX={stageScale} scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={e => {
          if (e.evt.button === 1) { e.evt.preventDefault(); return; }
          if (e.target === e.target.getStage()) {
            p.onSelect(null);
            const pos = stageRef.current?.getRelativePointerPosition();
            if (pos) {
              selRectStart.current = pos;
              // Cancela o rubber band se o mouse sair do canvas antes do mouseup
              const cleanup = () => { selRectStart.current = null; setSelRect(null); };
              window.addEventListener("mouseup", cleanup, { once: true });
            }
          }
        }}
        onMouseMove={() => {
          if (!selRectStart.current) return;
          const pos = stageRef.current?.getRelativePointerPosition();
          if (!pos) return;
          const s = selRectStart.current;
          setSelRect({ x: Math.min(s.x, pos.x), y: Math.min(s.y, pos.y), w: Math.abs(pos.x - s.x), h: Math.abs(pos.y - s.y) });
        }}
        onMouseUp={() => {
          if (!selRectStart.current) return;
          const s = selRectStart.current;
          selRectStart.current = null;
          setSelRect(null);
          const pos = stageRef.current?.getRelativePointerPosition();
          if (!pos) return;
          const r = { x: Math.min(s.x, pos.x), y: Math.min(s.y, pos.y), w: Math.abs(pos.x - s.x), h: Math.abs(pos.y - s.y) };
          if (r.w < 4 || r.h < 4) return;
          const ids = schema.elements
            .filter(el => !el.locked && rectsIntersect(r, { x: el.x, y: el.y, w: el.width, h: el.height }))
            .map(el => el.id);
          if (ids.length > 0) p.onMultiSelect?.(ids);
        }}
        style={{ borderRadius: 4, boxShadow: "0 10px 48px rgba(0,0,0,0.5)" }}>
        <Layer>
          <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />
          {schema.elements.map(el => (
            <RenderElement key={el.id} el={el} allElements={schema.elements} playing={playing}
              animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
              onClick={(e) => handleElementClick(el.id, e)}
              onChange={attrs => cascadeUpdate(el.id, attrs)}
              onRegisterRef={registerRef}
              onDragMoveSnap={handleDragMoveSnap}
              onDragEndClear={handleDragEndClear}
              onDragEndUpdate={handleDragEndUpdate}
              previewValues={p.previewValues} />
          ))}
          {snapEnabled && guides.map((g, i) => (
            <Line key={`g${i}`}
              points={g.orientation === "V"
                ? [g.position, 0, g.position, height]
                : [0, g.position, width, g.position]}
              stroke={g.kind === "edge" ? "#4444FF" : "#FF4444"}
              strokeWidth={1 / stageScale}
              dash={[4 / stageScale, 4 / stageScale]}
              opacity={0.8}
              listening={false} />
          ))}
          {/* Smart-link dotted connectors (apenas para elementos selecionados) */}
          {!playing && selectedIds.length > 0 && schema.elements.map(el => {
            if (!selectedIds.includes(el.id)) return null;
            const links: React.ReactElement[] = [];
            if (el.smartTrack) {
              const tgt = schema.elements.find(e => e.id === el.smartTrack!.targetId);
              if (tgt) {
                links.push(
                  <Line key={`st-${el.id}`}
                    points={[el.x + el.width / 2, el.y + el.height / 2, tgt.x + tgt.width / 2, tgt.y + tgt.height / 2]}
                    stroke="#3B82F6" strokeWidth={1.5 / stageScale}
                    dash={[6 / stageScale, 4 / stageScale]} opacity={0.75} listening={false} />
                );
              }
            }
            if (el.smartResize) {
              const tgt = schema.elements.find(e => e.id === el.smartResize!.targetId);
              if (tgt) {
                links.push(
                  <Line key={`sr-${el.id}`}
                    points={[el.x + el.width / 2, el.y + el.height / 2, tgt.x + tgt.width / 2, tgt.y + tgt.height / 2]}
                    stroke="#D4A843" strokeWidth={1.5 / stageScale}
                    dash={[2 / stageScale, 3 / stageScale]} opacity={0.75} listening={false} />
                );
              }
            }
            if (el.textAnchor) {
              const tgt = schema.elements.find(e => e.id === el.textAnchor!.targetId);
              if (tgt) {
                // linha do ponto-âncora (fim de target) até início de el
                const ax = el.textAnchor.position === "after" ? tgt.x + tgt.width : tgt.x;
                const ay = el.textAnchor.position === "after" ? tgt.y : tgt.y + tgt.height;
                links.push(
                  <Line key={`ta-${el.id}`}
                    points={[ax, ay, el.x, el.y]}
                    stroke="#10B981" strokeWidth={1.5 / stageScale}
                    dash={[4 / stageScale, 3 / stageScale]} opacity={0.75} listening={false} />
                );
              }
            }
            return <React.Fragment key={`sl-${el.id}`}>{links}</React.Fragment>;
          })}
          {selRect && (
            <Rect x={selRect.x} y={selRect.y} width={selRect.w} height={selRect.h}
              fill="rgba(59,130,246,0.08)" stroke="#3B82F6"
              strokeWidth={1 / stageScale} dash={[4 / stageScale, 2 / stageScale]}
              listening={false} />
          )}
          <Transformer ref={trRef} borderStroke="#FF7A1A" anchorStroke="#FF7A1A" anchorFill="#0c0c12" anchorCornerRadius={3} anchorSize={7} borderStrokeWidth={1.5} boundBoxFunc={(_, nw) => nw} />
        </Layer>
      </Stage>
      </div>
    </div>
  );
}

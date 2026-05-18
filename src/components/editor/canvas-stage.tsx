import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Image as KImage, Transformer, Line, Group } from "react-konva";
import type Konva from "konva";
import QRCode from "qrcode";
import { EditorElement, EditorSchema, SnapLine, calcSnapLines, computeTextHeight, GradientFill, blendColorOpacity, UserGuide } from "./types";

const RULER_SIZE = 18;

function drawRulerH(ctx: CanvasRenderingContext2D, totalW: number, rh: number, ox: number, scale: number, canvasW: number) {
  ctx.clearRect(0, 0, totalW, rh);
  ctx.fillStyle = "#1a1a28"; ctx.fillRect(0, 0, totalW, rh);
  const rawInt = 50 / scale;
  const NICE = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000];
  const major = NICE.find(n => n >= rawInt) ?? 1000;
  const minor = major / 5;
  const start = Math.floor(-ox / scale / minor) * minor;
  const end   = Math.ceil((totalW - ox) / scale / minor) * minor;
  ctx.strokeStyle = "#55556a"; ctx.lineWidth = 1;
  ctx.fillStyle = "#8888a8"; ctx.font = "9px monospace"; ctx.textBaseline = "top";
  for (let px = start; px <= end; px += minor) {
    const sx = Math.round(ox + px * scale);
    if (sx < 0 || sx > totalW) continue;
    const isMaj = Math.round(px / minor) % 5 === 0;
    ctx.beginPath(); ctx.moveTo(sx, rh - (isMaj ? 7 : 3)); ctx.lineTo(sx, rh); ctx.stroke();
    if (isMaj) { ctx.textAlign = "left"; ctx.fillText(String(Math.round(px)), sx + 2, 1); }
  }
  ctx.strokeStyle = "rgba(255,122,26,0.7)"; ctx.lineWidth = 1;
  for (const sx of [Math.round(ox), Math.round(ox + canvasW * scale)]) {
    if (sx >= 0 && sx <= totalW) { ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, rh); ctx.stroke(); }
  }
}

function drawRulerV(ctx: CanvasRenderingContext2D, rw: number, totalH: number, oy: number, scale: number, canvasH: number) {
  ctx.clearRect(0, 0, rw, totalH);
  ctx.fillStyle = "#1a1a28"; ctx.fillRect(0, 0, rw, totalH);
  const rawInt = 50 / scale;
  const NICE = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000];
  const major = NICE.find(n => n >= rawInt) ?? 1000;
  const minor = major / 5;
  const start = Math.floor(-oy / scale / minor) * minor;
  const end   = Math.ceil((totalH - oy) / scale / minor) * minor;
  ctx.strokeStyle = "#55556a"; ctx.lineWidth = 1;
  ctx.fillStyle = "#8888a8"; ctx.font = "9px monospace"; ctx.textAlign = "center";
  for (let px = start; px <= end; px += minor) {
    const sy = Math.round(oy + px * scale);
    if (sy < 0 || sy > totalH) continue;
    const isMaj = Math.round(px / minor) % 5 === 0;
    ctx.beginPath(); ctx.moveTo(rw - (isMaj ? 7 : 3), sy); ctx.lineTo(rw, sy); ctx.stroke();
    if (isMaj) {
      ctx.save(); ctx.translate(rw - 8, sy); ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "middle"; ctx.fillText(String(Math.round(px)), 0, 0); ctx.restore();
    }
  }
  ctx.strokeStyle = "rgba(255,122,26,0.7)"; ctx.lineWidth = 1;
  for (const sy of [Math.round(oy), Math.round(oy + canvasH * scale)]) {
    if (sy >= 0 && sy <= totalH) { ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(rw, sy); ctx.stroke(); }
  }
}

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
  onBatchTransform?: (batch: { id: string; updates: Partial<EditorElement> }[]) => void;
  onStageRef: (r: Konva.Stage | null) => void;
  onScaleChange: (s: number) => void;
  onResetPan?: (fn: () => void) => void;
  commentMode?: boolean;
  showComments?: boolean;
  onAddComment?: (x: number, y: number) => void;
  onUpdateComment?: (id: string, text: string) => void;
  onRemoveComment?: (id: string) => void;
  previewValues?: Record<string, string>;
  showRulers?: boolean;
  userGuides?: UserGuide[];
  onGuideAdd?: (g: UserGuide) => void;
  onGuideMove?: (id: string, pos: number) => void;
  onGuideRemove?: (id: string) => void;
}

function useImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!src) { setImg(null); return; } const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

function useSvgImage(paths: string | undefined, color: string, svgStyle: "stroke" | "fill", w: number, h: number): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!paths) { setImg(null); return; }
    const strokeAttrs = `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const fillAttrs = `fill="${color}"`;
    const attrs = svgStyle === "stroke" ? strokeAttrs : fillAttrs;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${w}" height="${h}" ${attrs}>${paths}</svg>`;
    const encoded = btoa(unescape(encodeURIComponent(svgStr)));
    const src = `data:image/svg+xml;base64,${encoded}`;
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [paths, color, svgStyle, w, h]);
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

// Retorna src real ou URL de placeholder dimensionado quando o elemento
// tem bind mas ainda não tem URL real (editor sem previewValues).
function resolveImageSrc(el: EditorElement): string | undefined {
  if (el.type !== "image") return undefined;
  const raw = el.src || "";
  if (el.bindParam && (!raw || raw.startsWith("[") || raw.startsWith("{"))) {
    const w = Math.round(el.width) || 400;
    const h = Math.round(el.height) || 300;
    return `https://placehold.co/${w}x${h}/1a1a2e/ffffff?text=Imagem`;
  }
  return raw || undefined;
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

const TIMELINE_ANIM_DUR = 0.6; // duração fixa de enterAnim/exitAnim

function getAnimState(el: EditorElement, time: number): AnimState {
  const anim = el.animation || "none"; const delay = el.animDelay || 0; const dur = el.animDuration || 0.6;
  const elapsed = time - delay; const base = el.opacity ?? 1;
  const done: AnimState = { opacity: base, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };

  // ── Timeline showAt/hideAt/enterAnim/exitAnim (time<900 = modo play; 999 = editor) ──
  if (time < 900) {
    const showAt = el.showAt ?? 0;
    const hideAt = el.hideAt;
    if (time < showAt) return { ...done, opacity: 0 };
    if (hideAt !== undefined && time >= hideAt) return { ...done, opacity: 0 };

    // exitAnim: últimos TIMELINE_ANIM_DUR segundos antes de hideAt
    if (el.exitAnim && el.exitAnim !== "none" && hideAt !== undefined) {
      const exitStart = hideAt - TIMELINE_ANIM_DUR;
      if (time >= exitStart) {
        const t = Math.min((time - exitStart) / TIMELINE_ANIM_DUR, 1);
        const e = easeOut(t);
        switch (el.exitAnim) {
          case "fadeOut":       return { ...done, opacity: base * (1 - e) };
          case "slideOutLeft":  return { ...done, opacity: base * (1 - e), offsetX: -120 * e };
          case "slideOutRight": return { ...done, opacity: base * (1 - e), offsetX:  120 * e };
          case "slideOutUp":    return { ...done, opacity: base * (1 - e), offsetY: -120 * e };
          case "slideOutDown":  return { ...done, opacity: base * (1 - e), offsetY:  120 * e };
          case "scaleOut":      return { ...done, opacity: base * (1 - e), scaleX: 1 - e * 0.8, scaleY: 1 - e * 0.8 };
        }
      }
    }

    // enterAnim: primeiros TIMELINE_ANIM_DUR segundos após showAt
    if (el.enterAnim && el.enterAnim !== "none") {
      const enterElapsed = time - showAt;
      if (enterElapsed >= 0 && enterElapsed < TIMELINE_ANIM_DUR) {
        const t = enterElapsed / TIMELINE_ANIM_DUR;
        const e = easeOut(t);
        switch (el.enterAnim) {
          case "fadeIn":       return { ...done, opacity: base * e };
          case "slideInLeft":  return { ...done, opacity: base * e, offsetX: -120 * (1 - e) };
          case "slideInRight": return { ...done, opacity: base * e, offsetX:  120 * (1 - e) };
          case "slideInUp":    return { ...done, opacity: base * e, offsetY:  120 * (1 - e) };
          case "slideInDown":  return { ...done, opacity: base * e, offsetY: -120 * (1 - e) };
          case "scaleIn":      return { ...done, opacity: base * e, scaleX: e, scaleY: e };
        }
      }
    }
  }

  // ── Animação legada (animation / animDelay / animDuration) ────────────────
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

/* ── Particles ───────────────────────────────────────── */
const CONFETTI_PALETTE = ["#FF5B8D","#FF7A1A","#D4A843","#22C55E","#3B82F6","#A855F7","#F9FAFB"];

interface PState {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number;
  life: number; maxLife: number;
  rotation: number; vr: number;
  color: string;
}

function spawnP(el: EditorElement, stagger = false): PState {
  const preset = el.particlePreset ?? "float";
  const spd = el.particleSpeed ?? 1;
  const minS = el.particleSizeMin ?? 3;
  const maxS = el.particleSizeMax ?? 8;
  const size = minS + Math.random() * Math.max(0, maxS - minS);
  const color = el.particleColor || "#FFFFFF";
  let p: PState;
  if (preset === "snow") {
    p = { x: Math.random() * el.width, y: -size,
      vx: (Math.random() - 0.5) * 25 * spd, vy: (35 + Math.random() * 55) * spd,
      size, alpha: 0.5 + Math.random() * 0.5, life: 0, maxLife: 3 + Math.random() * 4,
      rotation: 0, vr: 0, color };
  } else if (preset === "confetti") {
    p = { x: Math.random() * el.width, y: -8,
      vx: (Math.random() - 0.5) * 90 * spd, vy: (55 + Math.random() * 70) * spd,
      size: 4 + Math.random() * 6, alpha: 0.85 + Math.random() * 0.15,
      life: 0, maxLife: 2 + Math.random() * 3,
      rotation: Math.random() * 360, vr: (Math.random() - 0.5) * 380 * spd,
      color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)] };
  } else if (preset === "bokeh") {
    p = { x: Math.random() * el.width, y: Math.random() * el.height,
      vx: (Math.random() - 0.5) * 18 * spd, vy: (Math.random() - 0.5) * 14 * spd,
      size: size * 2.5, alpha: 0.05 + Math.random() * 0.15,
      life: 0, maxLife: 6 + Math.random() * 6, rotation: 0, vr: 0, color };
  } else {
    p = { x: Math.random() * el.width, y: Math.random() * el.height,
      vx: (Math.random() - 0.5) * 35 * spd, vy: (Math.random() - 0.5) * 35 * spd,
      size, alpha: 0.4 + Math.random() * 0.6, life: 0, maxLife: 4 + Math.random() * 6,
      rotation: 0, vr: 0, color };
  }
  if (stagger) p.life = Math.random() * p.maxLife;
  return p;
}

function tickP(p: PState, dt: number, el: EditorElement): PState {
  const preset = el.particlePreset ?? "float";
  let { x, y, vx, vy, life, maxLife, rotation, vr, alpha, size, color } = p;
  life += dt; x += vx * dt; y += vy * dt; rotation += vr * dt;
  if (preset === "float") {
    vx += (Math.random() - 0.5) * 8 * dt;
    vy += (Math.random() - 0.5) * 8 * dt;
    const mv = 40 * (el.particleSpeed ?? 1);
    vx = Math.max(-mv, Math.min(mv, vx)); vy = Math.max(-mv, Math.min(mv, vy));
    if (x <= 0) { vx = Math.abs(vx); x = 0; } if (x >= el.width) { vx = -Math.abs(vx); x = el.width; }
    if (y <= 0) { vy = Math.abs(vy); y = 0; } if (y >= el.height) { vy = -Math.abs(vy); y = el.height; }
    const t = life / maxLife;
    alpha = 0.8 * (t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1);
    if (life >= maxLife) return spawnP(el, false);
  } else if (preset === "bokeh") {
    if (x <= 0) { vx = Math.abs(vx); x = 0; } if (x >= el.width) { vx = -Math.abs(vx); x = el.width; }
    if (y <= 0) { vy = Math.abs(vy); y = 0; } if (y >= el.height) { vy = -Math.abs(vy); y = el.height; }
    const t = life / maxLife;
    alpha = 0.18 * (t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1);
    if (life >= maxLife) return spawnP(el, false);
  } else if ((preset === "snow" || preset === "confetti") && y > el.height + 20) {
    return spawnP(el, false);
  }
  return { x, y, vx, vy, size, alpha, life, maxLife, rotation, vr, color };
}

function ParticlesEl({ el, playing, common, onClick, onRegisterRef }: {
  el: EditorElement; playing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  common: Record<string, any>;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onRegisterRef: (id: string, node: Konva.Node | null) => void;
}) {
  const count = Math.min(Math.max(el.particleCount ?? 50, 1), 300);
  const preset = el.particlePreset ?? "float";
  const groupRef = useRef<Konva.Group | null>(null);
  const nodeRefsRef = useRef<(Konva.Circle | Konva.Rect | null)[]>([]);
  const stateRef = useRef<PState[]>([]);
  const rafRef = useRef<number>(0);
  const keyRef = useRef<string>("");

  // Re-init synchronously when key changes (safe for refs — no state mutation)
  const initKey = `${count}|${preset}|${el.width}|${el.height}`;
  if (keyRef.current !== initKey) {
    keyRef.current = initKey;
    stateRef.current = Array.from({ length: count }, () => spawnP(el, true));
    nodeRefsRef.current = new Array(count).fill(null);
  }

  const groupCb = useCallback((node: Konva.Group | null) => {
    groupRef.current = node;
    onRegisterRef(el.id, node);
  }, [el.id, onRegisterRef]);

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (let i = 0; i < stateRef.current.length; i++) {
        stateRef.current[i] = tickP(stateRef.current[i], dt, el);
        const node = nodeRefsRef.current[i];
        const p = stateRef.current[i];
        if (!node) continue;
        node.x(p.x); node.y(p.y); node.opacity(p.alpha);
        if (preset === "confetti") (node as Konva.Rect).rotation(p.rotation);
      }
      groupRef.current?.getLayer()?.batchDraw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, preset, el.particleSpeed]);

  const { ref: _r, ...rest } = common;
  return (
    <Group ref={groupCb} {...rest} clipX={0} clipY={0} clipWidth={el.width} clipHeight={el.height} onClick={onClick}>
      <Rect width={el.width} height={el.height} fill="transparent" />
      {stateRef.current.map((p, i) => preset === "confetti" ? (
        <Rect key={i} ref={node => { nodeRefsRef.current[i] = node; }}
          x={p.x} y={p.y} width={p.size} height={p.size * 0.5}
          fill={p.color} opacity={p.alpha} rotation={p.rotation}
          offsetX={p.size / 2} offsetY={p.size * 0.25} listening={false} />
      ) : (
        <Circle key={i} ref={node => { nodeRefsRef.current[i] = node; }}
          x={p.x} y={p.y} radius={p.size / 2} fill={p.color} opacity={p.alpha} listening={false} />
      ))}
    </Group>
  );
}

/* ── Per-element renderer (NO Transformer inside) ── */
function GhostCell({ el, dx, dy, previewValues }: { el: EditorElement; dx: number; dy: number; previewValues?: Record<string, string> }) {
  const img = useImage(resolveImageSrc(el));
  const x = el.x + dx;
  const y = el.y + dy;
  const op = el.opacity ?? 1;
  if (el.type === "text") {
    const raw = el.text || "";
    const resolved = previewValues
      ? (el.bindParam ? (previewValues[el.bindParam] ?? raw) : replacePreviewBinds(raw, previewValues))
      : raw;
    const fSize = el.fontSize || 32;
    const fillProps = getFillProps(el.fill || "#FFF", el.width, fSize * (el.lineHeight || 1.2));
    return <Text x={x} y={y} rotation={el.rotation || 0} opacity={op} width={el.width} text={resolved} fontSize={fSize} fontFamily={el.fontFamily || "Helvetica Neue"} fontStyle={el.fontStyle || "normal"} {...fillProps} align={el.align || "left"} letterSpacing={el.letterSpacing || 0} lineHeight={el.lineHeight || 1.2} listening={false} />;
  }
  if (el.type === "rect") {
    const fillProps = getFillProps(el.fill, el.width, el.height);
    return <Rect x={x} y={y} rotation={el.rotation || 0} opacity={op} width={el.width} height={el.height} {...fillProps} cornerRadius={el.cornerRadius || 0} listening={false} />;
  }
  if (el.type === "circle") {
    const fillProps = getFillProps(el.fill, el.width, el.height);
    return <Circle x={x} y={y} rotation={el.rotation || 0} opacity={op} radius={Math.min(el.width, el.height) / 2} {...fillProps} listening={false} />;
  }
  if (el.type === "image") {
    if (!img) return <Rect x={x} y={y} width={el.width} height={el.height} stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} listening={false} />;
    return <KImage x={x} y={y} rotation={el.rotation || 0} opacity={op} image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius || 0} listening={false} />;
  }
  return null;
}

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
  const callbackRef = useCallback((node: Konva.Node | null) => {
    onRegisterRef(el.id, node);
  }, [el.id, onRegisterRef]);
  const img = useImage(resolveImageSrc(el));
  const qrImg = useQrImage(
    el.type === "qrcode" ? (el.qrUrl || "") : "",
    el.qrFg || "#000000",
    el.qrBg || "#FFFFFF",
    el.width
  );
  const svgFill = typeof el.fill === "string" ? el.fill : "#FFFFFF";
  const svgImg = useSvgImage(el.type === "svg" ? (el.svgPaths || "") : undefined, svgFill, el.svgStyle || "stroke", Math.round(el.width), Math.round(el.height));

  // Text Clipping Mask — hooks must be unconditional
  const elIdx = allElements.findIndex(e => e.id === el.id);
  const maskSrcEl = allElements.slice(0, elIdx).reverse().find(e => (e.type === "image") && !!(e.src || e.bindParam)) ?? null;
  const maskImgSrc = (el.type === "text" && el.textMask && maskSrcEl) ? resolveImageSrc(maskSrcEl) : undefined;
  const maskImg = useImage(maskImgSrc);
  const maskGroupRef = useRef<Konva.Group | null>(null);
  useEffect(() => {
    if (el.textMask && maskGroupRef.current && maskImg) {
      maskGroupRef.current.cache({ x: 0, y: 0, width: el.width, height: el.height });
      maskGroupRef.current.getLayer()?.batchDraw();
    }
  }, [el.textMask, el.text, el.fontSize, el.fontFamily, el.fontStyle, el.width, el.height, maskImg]);

  if (el.visible === false) return null;
  if (el.hideWhenBind && previewValues?.[el.hideWhenBind]) return null;

  const common = {
    id: el.id,
    ref: callbackRef as unknown as React.RefObject<Konva.Node>,
    x: el.x + animState.offsetX, y: el.y + animState.offsetY,
    rotation: (el.rotation || 0) + animState.rotation,
    opacity: animState.opacity,
    scaleX: animState.scaleX * (el.flipX ? -1 : 1),
    scaleY: animState.scaleY * (el.flipY ? -1 : 1),
    draggable: !playing && !el.locked,
    // onClick/onTap handled per-element below
    shadowEnabled: el.shadowEnabled ?? !!el.shadow,
    shadowColor: el.shadowColor ?? el.shadow?.color ?? "#000000",
    shadowOpacity: el.shadowOpacity ?? 0.3,
    shadowOffsetX: el.shadowOffsetX ?? el.shadow?.offsetX ?? 0,
    shadowOffsetY: el.shadowOffsetY ?? el.shadow?.offsetY ?? 4,
    shadowBlur: el.shadowBlur ?? el.shadow?.blur ?? 8,
    globalCompositeOperation: (el.blendMode || "source-over") as GlobalCompositeOperation,
    skewX: Math.tan((el.skewX ?? 0) * Math.PI / 180),
    skewY: Math.tan((el.skewY ?? 0) * Math.PI / 180),
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
    onMouseEnter: () => { document.body.style.cursor = el.cursor || "default"; },
    onMouseLeave: () => { document.body.style.cursor = "default"; },
    // onTransformEnd tratado centralmente no Transformer (handleTransformEnd)
  };

  // Link URL: abre em nova aba apenas no modo play; em edit mode apenas seleciona
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (playing && el.linkUrl) window.open(el.linkUrl, "_blank", "noopener,noreferrer");
    onClick(e);
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
          el.fontFamily || "Helvetica Neue",
          el.fontStyle || "normal",
          baseFont,
          el.lineHeight || 1.2
        )
      : baseFont;

    // Text Clipping Mask: show image through text letters
    if (el.textMask && maskSrcEl && maskImg) {
      return (
        <Group
          ref={(node: Konva.Group | null) => { maskGroupRef.current = node; onRegisterRef(el.id, node); }}
          id={el.id}
          x={common.x} y={common.y}
          rotation={common.rotation}
          opacity={common.opacity}
          scaleX={common.scaleX} scaleY={common.scaleY}
          draggable={common.draggable}
          onDragStart={common.onDragStart}
          onDragMove={common.onDragMove}
          onDragEnd={common.onDragEnd}
          onMouseEnter={common.onMouseEnter}
          onMouseLeave={common.onMouseLeave}
          onClick={handleClick}
        >
          <KImage
            x={maskSrcEl.x - el.x}
            y={maskSrcEl.y - el.y}
            width={maskSrcEl.width}
            height={maskSrcEl.height}
            image={maskImg}
            listening={false}
          />
          <Text
            x={0} y={0}
            width={el.width}
            height={el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : undefined}
            wrap="word"
            ellipsis={!!el.linhas}
            text={displayText}
            fontSize={fSize}
            fontFamily={el.fontFamily || "Helvetica Neue"}
            fontStyle={el.fontStyle || "normal"}
            fill="#ffffff"
            align={el.align || "left"}
            letterSpacing={el.letterSpacing || 0}
            lineHeight={el.lineHeight || 1.2}
            textDecoration={el.textDecoration || ""}
            globalCompositeOperation={"destination-in" as GlobalCompositeOperation}
            listening={false}
          />
        </Group>
      );
    }

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
      <Text ref={callbackRef as any}
        id={el.id} x={common.x} y={common.y} rotation={common.rotation} opacity={common.opacity} scaleX={common.scaleX} scaleY={common.scaleY} draggable={common.draggable}
        shadowColor={common.shadowColor} shadowOffsetX={common.shadowOffsetX} shadowOffsetY={common.shadowOffsetY} shadowBlur={common.shadowBlur} shadowEnabled={common.shadowEnabled} shadowOpacity={common.shadowOpacity}
        onDragMove={common.onDragMove} onDragEnd={common.onDragEnd}
        onClick={handleClick} onDblClick={() => { if (!playing && !el.locked) { const t = prompt("Editar texto:", el.text || ""); if (t !== null) onChange({ text: t }); } }}
        width={el.width}
        height={el.linhas ? Math.ceil(fSize * (el.lineHeight || 1.2) * el.linhas) : undefined}
        wrap="word"
        ellipsis={!!el.linhas}
        text={displayText} fontSize={fSize} fontFamily={el.fontFamily || "Helvetica Neue"} fontStyle={el.fontStyle || "normal"} {...textFillProps} align={el.align || "left"} letterSpacing={el.letterSpacing || 0} lineHeight={el.lineHeight || 1.2} textDecoration={el.textDecoration || ""} stroke={el.strokeEnabled ? blendColorOpacity(el.stroke, el.strokeOpacity ?? 1) : undefined} strokeWidth={el.strokeEnabled ? (el.strokeWidth ?? 1) : 0} padding={Math.max(el.paddingH ?? 0, el.paddingV ?? 0)} />
    </>;
  }
  if (el.type === "rect") {
    const linkedText = el.autoHeightRef
      ? allElements.find(e => e.id === el.autoHeightRef && e.type === "text")
      : null;
    const rectHeight = linkedText ? computeTextHeight(linkedText) : el.height;
    const rectFillProps = getFillProps(el.fill, el.width, rectHeight);
    return <Rect {...common} ref={callbackRef as any} onClick={handleClick} width={el.width} height={rectHeight} {...rectFillProps} cornerRadius={el.cornerRadius || 0} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "circle") {
    const circleFillProps = getFillProps(el.fill, el.width, el.height);
    return <Circle {...common} ref={callbackRef as any} onClick={handleClick} radius={Math.min(el.width, el.height) / 2} {...circleFillProps} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} />;
  }
  if (el.type === "image") {
    if (!img) {
      // Placeholder transparente — mantém border tracejado + label para designers,
      // mas NÃO preenche cinza, deixando o background do template visível por baixo.
      return <>
        <Rect {...common} ref={callbackRef as any} onClick={handleClick} width={el.width} height={el.height} fill="" stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} cornerRadius={el.cornerRadius || 0} />
        <Text x={el.x + el.width / 2 - 40} y={el.y + el.height / 2 - 8} text={el.bindParam ? `📸 ${el.bindParam}` : "Placeholder"} fontSize={14} fill="#aaa" listening={false} />
      </>;
    }
    // Crop manual (do CropModal) tem precedência sobre imageFit
    const crop = (el.cropW && el.cropH) ? { x: el.cropX || 0, y: el.cropY || 0, width: el.cropW, height: el.cropH } : undefined;

    // cover: crop nativo em coordenadas da imagem fonte — sem Group, KImage tem exatamente el.width×el.height
    const coverCrop = (() => {
      if (!img || !el.imageFit || el.imageFit !== "cover") return undefined;
      if (el.cropW && el.cropH) return undefined;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw || !ih) return undefined;
      const ew = el.width, eh = el.height;
      const s = Math.max(ew / iw, eh / ih);
      return { x: (iw - ew / s) / 2, y: (ih - eh / s) / 2, width: ew / s, height: eh / s };
    })();

    // contain: offset/size para letterbox (cover usa crop nativo, fill usa dimensões diretas)
    let imgX = 0, imgY = 0, imgW = el.width, imgH = el.height;
    if (!crop && !coverCrop && img.naturalWidth > 0 && img.naturalHeight > 0 && el.imageFit === "contain") {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.min(el.width / iw, el.height / ih);
      imgW = iw * s; imgH = ih * s;
      imgX = (el.width - imgW) / 2; imgY = (el.height - imgH) / 2;
    }

    const clipShape = el.clipShape || "none";
    if (clipShape !== "none") {
      // Group com clipFunc apenas para formas não-retangulares
      const radius = el.clipRadius ?? Math.min(el.width, el.height) * 0.25;
      let clipFunc: (rawCtx: unknown) => void;
      if (clipShape === "circle") {
        clipFunc = (rawCtx: unknown) => {
          const ctx = rawCtx as CanvasRenderingContext2D;
          ctx.beginPath();
          ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
          ctx.closePath();
        };
      } else if (clipShape === "triangle") {
        clipFunc = (rawCtx: unknown) => {
          const ctx = rawCtx as CanvasRenderingContext2D;
          ctx.beginPath();
          ctx.moveTo(el.width / 2, 0);
          ctx.lineTo(el.width, el.height);
          ctx.lineTo(0, el.height);
          ctx.closePath();
        };
      } else if (clipShape === "hexagon") {
        clipFunc = (rawCtx: unknown) => {
          const ctx = rawCtx as CanvasRenderingContext2D;
          const cx = el.width / 2, cy = el.height / 2;
          const r = Math.min(el.width, el.height) / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
        };
      } else {
        clipFunc = (rawCtx: unknown) => {
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
      }
      // cover dentro de clipShape: crop nativo + KImage em coords relativas ao Group
      const innerCrop = coverCrop ?? crop;
      const [kx, ky, kw, kh] = coverCrop ? [0, 0, el.width, el.height] : [imgX, imgY, imgW, imgH];
      return (
        <Group {...common} ref={callbackRef as any} onClick={handleClick} width={el.width} height={el.height} clipFunc={clipFunc as unknown as (ctx: Konva.Context) => void}>
          <KImage image={img} x={kx} y={ky} width={kw} height={kh} crop={innerCrop} />
        </Group>
      );
    }

    // Sem clipShape: cover usa crop nativo do KImage diretamente (sem Group)
    if (coverCrop) {
      return <KImage {...common} ref={callbackRef as any} onClick={handleClick}
        image={img} width={el.width} height={el.height} crop={coverCrop} cornerRadius={el.cornerRadius || 0} />;
    }

    // contain ou fill: KImage direto com offset de centralização
    return <KImage {...common} ref={callbackRef as any} onClick={handleClick} image={img} x={el.x + animState.offsetX + imgX} y={el.y + animState.offsetY + imgY} width={imgW} height={imgH} cornerRadius={el.cornerRadius || 0} crop={crop} />;
  }
  if (el.type === "imageBind") {
    // Placeholder visível apenas no editor ADM: retângulo pontilhado + ícone + label do bind.
    // Os 3 nós vivem num Group para arrastarem juntos — filhos usam coords relativas.
    const label = el.bindParam ? `🖼 ${el.bindParam}` : "🖼 Bind Imagem";
    const iconSize = Math.min(48, Math.min(el.width, el.height) * 0.3);
    return (
      <Group
        {...common}
        ref={callbackRef as any}
        onClick={handleClick}
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
        ref={callbackRef as any}
        onClick={handleClick}
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
      return <Rect {...common} ref={callbackRef as any} onClick={handleClick} width={el.width} height={el.height} fill={el.qrBg || "#FFFFFF"} stroke="#aaa" strokeWidth={1} dash={[4, 3]} cornerRadius={4} />;
    }
    return <KImage {...common} ref={callbackRef as any} onClick={handleClick} image={qrImg} width={el.width} height={el.height} />;
  }
  if (el.type === "svg") {
    if (!svgImg) {
      return <Rect {...common} ref={callbackRef as any} onClick={handleClick} width={el.width} height={el.height} fill="" stroke="#aaa" strokeWidth={1.5} dash={[6, 4]} cornerRadius={4} />;
    }
    return <KImage {...common} ref={callbackRef as any} onClick={handleClick} image={svgImg} width={el.width} height={el.height} />;
  }
  if (el.type === "particles") {
    return <ParticlesEl el={el} playing={playing} common={common} onClick={handleClick} onRegisterRef={onRegisterRef} />;
  }
  return null;
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ── Comment pin overlay ─────────────────────────── */
function CommentPin({ el, stageScale, isActive, onActivate, onUpdate, onRemove }: {
  el: EditorElement; stageScale: number; isActive: boolean;
  onActivate: () => void; onUpdate: (text: string) => void; onRemove: () => void;
}) {
  const [draft, setDraft] = useState(el.commentText || "");
  useEffect(() => { setDraft(el.commentText || ""); }, [el.commentText]);
  return (
    <div style={{ position: "absolute", left: el.x * stageScale, top: el.y * stageScale, zIndex: 201 }}>
      <button
        onClick={e => { e.stopPropagation(); onActivate(); }}
        title={el.commentText || "Comentário"}
        style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF7A1A", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.5)", fontSize: 11 }}
      >💬</button>
      {isActive && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", top: 28, left: 0, width: 220, background: "var(--ed-surface)", border: "1px solid var(--ed-bdr)", borderRadius: 8, padding: 10, zIndex: 300, boxShadow: "0 4px 24px rgba(0,0,0,0.6)" }}
        >
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Escreva uma anotação..."
            autoFocus
            style={{ width: "100%", minHeight: 64, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 11, padding: "6px 8px", resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 6 }}>
            <button onClick={() => onRemove()} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-danger)", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Excluir</button>
            <button onClick={() => { onUpdate(draft); onActivate(); }} style={{ padding: "4px 12px", borderRadius: 5, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main canvas component ───────────────────────── */
export default function CanvasStage(p: Props) {
  const { width, height, schema, selectedIds, stageScale, playing, currentTime, snapEnabled = true } = p;
  const selectedEl = selectedIds.length === 1 ? (schema.elements.find(e => e.id === selectedIds[0]) ?? null) : null;
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapLine[]>([]);
  const hRulerRef = useRef<HTMLCanvasElement>(null);
  const vRulerRef = useRef<HTMLCanvasElement>(null);
  const [pendingGuide, setPendingGuide] = useState<{ orientation: "H" | "V"; pos: number } | null>(null);
  const [resizeIndicator, setResizeIndicator] = useState<{
    visible: boolean; x: number; y: number; w: number; h: number;
  }>({ visible: false, x: 0, y: 0, w: 0, h: 0 });

  const handleDragMoveSnap = useCallback((id: string, rawX: number, rawY: number) => {
    if (!snapEnabled || selectedIds.length > 1) return { x: rawX, y: rawY };
    const el = schema.elements.find(e => e.id === id);
    if (!el) return { x: rawX, y: rawY };
    const r = calcSnapLines({ id, x: rawX, y: rawY, width: el.width, height: el.height }, schema.elements, width, height);
    setGuides(r.lines);
    let { x, y } = r;
    const thr = 8;
    for (const g of (p.userGuides ?? [])) {
      if (g.orientation === "V") {
        if (Math.abs(rawX - g.pos) < thr) x = g.pos;
        else if (Math.abs(rawX + el.width / 2 - g.pos) < thr) x = g.pos - el.width / 2;
        else if (Math.abs(rawX + el.width - g.pos) < thr) x = g.pos - el.width;
      } else {
        if (Math.abs(rawY - g.pos) < thr) y = g.pos;
        else if (Math.abs(rawY + el.height / 2 - g.pos) < thr) y = g.pos - el.height / 2;
        else if (Math.abs(rawY + el.height - g.pos) < thr) y = g.pos - el.height;
      }
    }
    return { x, y };
  }, [schema.elements, width, height, snapEnabled, selectedIds, p.userGuides]);

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

  // Transform end — batch único para não sobrescrever updates anteriores
  const handleTransformEnd = useCallback(() => {
    const batch: { id: string; updates: Partial<EditorElement> }[] = [];

    for (const id of selectedIds) {
      const el = schema.elements.find(e => e.id === id);
      const node = nodeRefs.current.get(id);
      if (!node || !el) continue;

      const sx = Math.abs(node.scaleX());
      const sy = Math.abs(node.scaleY());

      node.scaleX(el.flipX ? -1 : 1);
      node.scaleY(el.flipY ? -1 : 1);

      const updates: Partial<EditorElement> = {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      };

      if (el.type === "text") {
        updates.fontSize = Math.max(6, Math.round((el.fontSize ?? 32) * sx));
        updates.width    = Math.max(20, (el.width  ?? node.width())  * sx);
        updates.height   = Math.max(20, (el.height ?? node.height()) * sy);
      } else if (el.type === "circle") {
        updates.width  = Math.max(5, el.width  * sx);
        updates.height = Math.max(5, el.height * sy);
      } else if (el.type === "image") {
        updates.width  = Math.max(5, el.width  * sx);
        updates.height = Math.max(5, el.height * sy);
        const isDiagonal = Math.abs(sx - sy) < 0.15;
        if (!isDiagonal) {
          updates.imageFit = "cover";
        }
      } else {
        updates.width  = Math.max(5, node.width()  * sx);
        updates.height = Math.max(5, node.height() * sy);
      }

      batch.push({ id, updates });
    }

    if (batch.length === 0) return;
    // Uma única chamada → um único setState → um único re-render
    p.onBatchTransform?.(batch);
  }, [selectedIds, schema.elements, p.onBatchTransform]);

  // ── onTransform — feedback em tempo real ──
  const handleTransform = useCallback(() => {
    if (!trRef.current) return;
    const node = trRef.current.getActiveAnchor()
      ? trRef.current.nodes()[0]
      : null;
    if (!node) return;

    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const el = schema.elements.find(e => e.id === selectedIds[0]);
    if (!el) return;

    const newW = Math.round((el.type === 'circle' ? el.width : node.width()) * sx);
    const newH = Math.round((el.type === 'circle' ? el.height : node.height()) * sy);

    const absPos = node.getAbsolutePosition();
    const stageBox = node.getStage()?.container().getBoundingClientRect();
    if (!stageBox) return;

    setResizeIndicator({
      visible: true,
      x: absPos.x + (stageBox?.left ?? 0),
      y: absPos.y + (stageBox?.top ?? 0) - 28,
      w: newW,
      h: newH,
    });
  }, [selectedIds, schema.elements]);

  useEffect(() => {
    if (stageRef.current) stageRef.current.position({ x: 0, y: 0 });
    p.onStageRef(stageRef.current);
  }, [stageRef.current]);

  // Sync Transformer with selectedIds
  useEffect(() => {
    if (!trRef.current || playing) { trRef.current?.nodes([]); return; }

    const attach = () => {
      const nodes: Konva.Node[] = [];
      for (const id of selectedIds) {
        const node = nodeRefs.current.get(id);
        if (node) nodes.push(node);
      }
      trRef.current?.nodes(nodes);
      trRef.current?.getLayer()?.batchDraw();
    };

    // aguarda o commit do React antes de reconectar
    const raf = requestAnimationFrame(attach);
    return () => cancelAnimationFrame(raf);
  }, [selectedIds, playing, schema.elements]);

  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  // Pan via botão do meio do mouse: move o wrapper CSS — Stage + borda movem juntos.
  const containerRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const selRectStart = useRef<{ x: number; y: number } | null>(null);
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Expõe função de reset de pan ao parent (para Ctrl+0 centrar o canvas)
  useEffect(() => {
    p.onResetPan?.(() => setPanOffset({ x: 0, y: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.onResetPan]);

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
    if (!stageRef.current) return;

    // Ctrl/Cmd+wheel = zoom centrado no cursor
    if (e.evt.ctrlKey || e.evt.metaKey || stageScale <= 1.01) {
      const oldScale = stageScale;
      const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.min(4, Math.max(0.25, oldScale * factor));
      if (newScale === oldScale) return;

      const container = containerRef.current;
      if (!container) { p.onScaleChange(newScale); return; }

      const rect = container.getBoundingClientRect();
      const mouseX = e.evt.clientX - rect.left;
      const mouseY = e.evt.clientY - rect.top;
      const cw = rect.width;
      const ch = rect.height;

      // Ponto do canvas sob o cursor antes do zoom
      const stageLeft = (cw - width * oldScale) / 2 + panOffset.x;
      const stageTop  = (ch - height * oldScale) / 2 + panOffset.y;
      const canvasX = (mouseX - stageLeft) / oldScale;
      const canvasY = (mouseY - stageTop) / oldScale;

      // Novo pan para que o mesmo ponto fique sob o cursor
      const newPanX = mouseX - canvasX * newScale - (cw - width * newScale) / 2;
      const newPanY = mouseY - canvasY * newScale - (ch - height * newScale) / 2;

      p.onScaleChange(newScale);
      setPanOffset({ x: newPanX, y: newPanY });
      return;
    }

    // Scroll/pan sem Ctrl
    const scrollSpeed = 1.2;
    const dx = (e.evt.shiftKey || Math.abs(e.evt.deltaX) > 0) ? e.evt.deltaX * scrollSpeed : 0;
    const dy = e.evt.deltaY * scrollSpeed;
    const offsetX = e.evt.shiftKey ? e.evt.deltaY * scrollSpeed : dx;
    const offsetY = e.evt.shiftKey ? 0 : dy;
    setPanOffset(prev => clampStagePos(prev.x - offsetX, prev.y - offsetY));
  }, [stageScale, width, height, panOffset, p.onScaleChange, clampStagePos]);

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
    const el = schema.elements.find(el => el.id === elId);
    if (el?.locked) return;
    if (e.evt.shiftKey) {
      p.onShiftSelect(elId);
    } else {
      p.onSelect(elId);
    }
  }, [p.onSelect, p.onShiftSelect, schema.elements]);

  // Réguas — useEffect e handler ficam aqui (após panOffset ser declarado)
  useEffect(() => {
    if (!p.showRulers) return;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ox = (cw - width * stageScale) / 2 + panOffset.x;
    const oy = (ch - height * stageScale) / 2 + panOffset.y;
    const hc = hRulerRef.current;
    if (hc) { hc.width = cw; hc.height = RULER_SIZE; const ctx = hc.getContext("2d"); if (ctx) drawRulerH(ctx, cw, RULER_SIZE, ox, stageScale, width); }
    const vc = vRulerRef.current;
    if (vc) { vc.width = RULER_SIZE; vc.height = ch; const ctx = vc.getContext("2d"); if (ctx) drawRulerV(ctx, RULER_SIZE, ch, oy, stageScale, height); }
  }, [p.showRulers, panOffset, stageScale, width, height]);

  const handleRulerMouseDown = useCallback((e: React.MouseEvent, orientation: "H" | "V") => {
    e.stopPropagation(); e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const getPos = (clientX: number, clientY: number) => {
      const r = container.getBoundingClientRect();
      const cw = container.clientWidth; const ch = container.clientHeight;
      const ox = (cw - width * stageScale) / 2 + panOffset.x;
      const oy = (ch - height * stageScale) / 2 + panOffset.y;
      return { x: Math.round((clientX - r.left - ox) / stageScale), y: Math.round((clientY - r.top - oy) / stageScale) };
    };
    const onMove = (ev: MouseEvent) => {
      const pos = getPos(ev.clientX, ev.clientY);
      setPendingGuide({ orientation, pos: orientation === "H" ? pos.y : pos.x });
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const pos = getPos(ev.clientX, ev.clientY);
      const gPos = orientation === "H" ? pos.y : pos.x;
      if (gPos >= 0 && gPos <= (orientation === "H" ? height : width))
        p.onGuideAdd?.({ id: `g${Date.now()}`, orientation, pos: gPos });
      setPendingGuide(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, height, stageScale, panOffset, p.onGuideAdd]);

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
      {p.showRulers && <>
        <div style={{ position: "absolute", top: 0, left: 0, width: RULER_SIZE, height: RULER_SIZE, background: "#1a1a28", zIndex: 10 }} />
        <canvas ref={hRulerRef} style={{ position: "absolute", top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE, zIndex: 10, cursor: "s-resize", display: "block" }} onMouseDown={e => handleRulerMouseDown(e, "H")} />
        <canvas ref={vRulerRef} style={{ position: "absolute", top: RULER_SIZE, left: 0, width: RULER_SIZE, bottom: 0, zIndex: 10, cursor: "e-resize", display: "block" }} onMouseDown={e => handleRulerMouseDown(e, "V")} />
      </>}
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
            .filter(el => el.type !== "comment" && !el.locked && rectsIntersect(r, { x: el.x, y: el.y, w: el.width, h: el.height }))
            .map(el => el.id);
          if (ids.length > 0) p.onMultiSelect?.(ids);
        }}
        style={{ borderRadius: 4, boxShadow: "0 10px 48px rgba(0,0,0,0.5)" }}>
        <Layer>
          <Rect x={0} y={0} width={width} height={height} fill={schema.background} listening={false} />
          {schema.elements.map(el => {
            if (el.type === "comment") return null;
            if (!el.repeatGrid) {
              return <RenderElement key={el.id} el={el} allElements={schema.elements} playing={playing}
                animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
                onClick={(e) => handleElementClick(el.id, e)}
                onChange={attrs => cascadeUpdate(el.id, attrs)}
                onRegisterRef={registerRef}
                onDragMoveSnap={handleDragMoveSnap}
                onDragEndClear={handleDragEndClear}
                onDragEndUpdate={handleDragEndUpdate}
                previewValues={p.previewValues} />;
            }
            const cols = el.repeatCols ?? 2;
            const rows = el.repeatRows ?? 2;
            const gapX = el.repeatGapX ?? 8;
            const gapY = el.repeatGapY ?? 8;
            const stepX = el.width + gapX;
            const stepY = el.height + gapY;
            const ghosts: React.ReactElement[] = [];
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue;
                ghosts.push(<GhostCell key={`${el.id}_${r}_${c}`} el={el} dx={c * stepX} dy={r * stepY} previewValues={p.previewValues} />);
              }
            }
            return (
              <React.Fragment key={el.id}>
                <RenderElement el={el} allElements={schema.elements} playing={playing}
                  animState={playing || currentTime > 0 ? getAnimState(el, currentTime) : getAnimState(el, 999)}
                  onClick={(e) => handleElementClick(el.id, e)}
                  onChange={attrs => cascadeUpdate(el.id, attrs)}
                  onRegisterRef={registerRef}
                  onDragMoveSnap={handleDragMoveSnap}
                  onDragEndClear={handleDragEndClear}
                  onDragEndUpdate={handleDragEndUpdate}
                  previewValues={p.previewValues} />
                {ghosts}
              </React.Fragment>
            );
          })}
          {snapEnabled && guides.map((g, i) => {
            const color = g.kind === "edge" ? "#4499FF" : "#FF5B8D";
            const sw = 1 / stageScale;
            const isV = g.orientation === "V";
            const pos = g.position;
            const showDist = g.kind === "element"
              && g.gapPx !== undefined && g.gapPx > 0
              && g.lineFrom !== undefined && g.lineTo !== undefined
              && (g.lineTo - g.lineFrom) * stageScale > 8;
            const from = g.lineFrom ?? 0;
            const to = g.lineTo ?? 0;
            const mid = g.labelAt ?? (from + to) / 2;
            const tick = 5 / stageScale;
            const fs = 9 / stageScale;
            const padH = 3 / stageScale;
            const padV = 2 / stageScale;
            const label = showDist ? `${Math.round(g.gapPx!)}px` : "";
            const lw = label.length * fs * 0.62 + padH * 2;
            const lh = fs + padV * 2;
            return (
              <React.Fragment key={`g${i}`}>
                <Line
                  points={isV ? [pos, 0, pos, height] : [0, pos, width, pos]}
                  stroke={color} strokeWidth={sw}
                  dash={[4 / stageScale, 4 / stageScale]} opacity={0.75} listening={false} />
                {showDist && isV && <>
                  <Line points={[pos, from, pos, to]} stroke={color} strokeWidth={1.5 / stageScale} opacity={1} listening={false} />
                  <Line points={[pos - tick, from, pos + tick, from]} stroke={color} strokeWidth={1.5 / stageScale} listening={false} />
                  <Line points={[pos - tick, to, pos + tick, to]} stroke={color} strokeWidth={1.5 / stageScale} listening={false} />
                  <Group x={pos + 4 / stageScale} y={mid - lh / 2} listening={false}>
                    <Rect width={lw} height={lh} fill="#1A1A2E" cornerRadius={2 / stageScale} opacity={0.9} />
                    <Text text={label} fontSize={fs} fill={color} fontFamily="monospace" x={padH} y={padV} listening={false} />
                  </Group>
                </>}
                {showDist && !isV && <>
                  <Line points={[from, pos, to, pos]} stroke={color} strokeWidth={1.5 / stageScale} opacity={1} listening={false} />
                  <Line points={[from, pos - tick, from, pos + tick]} stroke={color} strokeWidth={1.5 / stageScale} listening={false} />
                  <Line points={[to, pos - tick, to, pos + tick]} stroke={color} strokeWidth={1.5 / stageScale} listening={false} />
                  <Group x={mid - lw / 2} y={pos - lh - 4 / stageScale} listening={false}>
                    <Rect width={lw} height={lh} fill="#1A1A2E" cornerRadius={2 / stageScale} opacity={0.9} />
                    <Text text={label} fontSize={fs} fill={color} fontFamily="monospace" x={padH} y={padV} listening={false} />
                  </Group>
                </>}
              </React.Fragment>
            );
          })}
          {p.userGuides?.map(g => g.orientation === "H" ? (
            <Line key={g.id} points={[0, 0, width, 0]} x={0} y={g.pos}
              stroke="#2563EB" strokeWidth={1 / stageScale} opacity={0.75}
              hitStrokeWidth={8 / stageScale} draggable
              dragBoundFunc={pos => ({ x: 0, y: Math.max(0, Math.min(height, pos.y)) })}
              onDragEnd={e => p.onGuideMove?.(g.id, Math.round(e.target.y()))}
              onDblClick={() => p.onGuideRemove?.(g.id)}
              onMouseEnter={() => { document.body.style.cursor = "row-resize"; }}
              onMouseLeave={() => { document.body.style.cursor = "default"; }} />
          ) : (
            <Line key={g.id} points={[0, 0, 0, height]} x={g.pos} y={0}
              stroke="#2563EB" strokeWidth={1 / stageScale} opacity={0.75}
              hitStrokeWidth={8 / stageScale} draggable
              dragBoundFunc={pos => ({ x: Math.max(0, Math.min(width, pos.x)), y: 0 })}
              onDragEnd={e => p.onGuideMove?.(g.id, Math.round(e.target.x()))}
              onDblClick={() => p.onGuideRemove?.(g.id)}
              onMouseEnter={() => { document.body.style.cursor = "col-resize"; }}
              onMouseLeave={() => { document.body.style.cursor = "default"; }} />
          ))}
          {pendingGuide && (pendingGuide.orientation === "H" ? (
            <Line points={[0, 0, width, 0]} x={0} y={pendingGuide.pos}
              stroke="#2563EB" strokeWidth={1 / stageScale} opacity={0.45}
              dash={[4 / stageScale, 4 / stageScale]} listening={false} />
          ) : (
            <Line points={[0, 0, 0, height]} x={pendingGuide.pos} y={0}
              stroke="#2563EB" strokeWidth={1 / stageScale} opacity={0.45}
              dash={[4 / stageScale, 4 / stageScale]} listening={false} />
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
          <Transformer ref={trRef} borderStroke="#FF7A1A" anchorStroke="#FF7A1A" anchorFill="#0c0c12" anchorCornerRadius={3} anchorSize={7} borderStrokeWidth={1.5} keepRatio={selectedEl?.lockAspectRatio === true} boundBoxFunc={(_, nw) => nw} onTransform={handleTransform} onTransformEnd={() => { handleTransformEnd(); setResizeIndicator(r => ({ ...r, visible: false })); }} />
        </Layer>
      </Stage>

      {/* Comment pins — renderizados como HTML sobre o Stage */}
      {(p.showComments || p.commentMode) && schema.elements.filter(e => e.type === "comment").map(el => (
        <CommentPin
          key={el.id}
          el={el}
          stageScale={stageScale}
          isActive={activeCommentId === el.id}
          onActivate={() => setActiveCommentId(activeCommentId === el.id ? null : el.id)}
          onUpdate={(text) => p.onUpdateComment?.(el.id, text)}
          onRemove={() => { p.onRemoveComment?.(el.id); setActiveCommentId(null); }}
        />
      ))}

      {/* Overlay transparente para capturar cliques em modo comentário */}
      {p.commentMode && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 200, cursor: "crosshair" }}
          onClick={e => {
            if (activeCommentId) { setActiveCommentId(null); return; }
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const cx = (e.clientX - rect.left) / stageScale;
            const cy = (e.clientY - rect.top) / stageScale;
            p.onAddComment?.(Math.round(cx), Math.round(cy));
          }}
        />
      )}
      </div>
      {resizeIndicator.visible && (
        <div style={{
          position: 'fixed',
          left: resizeIndicator.x,
          top: resizeIndicator.y,
          background: 'rgba(12,12,18,.85)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 300,
          fontFamily: 'Inter, sans-serif',
          padding: '3px 8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 999,
          letterSpacing: '.03em',
          backdropFilter: 'blur(4px)',
          border: '.5px solid rgba(255,255,255,.1)',
        }}>
          {resizeIndicator.w} × {resizeIndicator.h}
        </div>
      )}
    </div>
  );
}

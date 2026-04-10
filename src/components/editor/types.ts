/* ══ Editor Types ══════════════════════════════════ */

export type AnimationType = "none"|"fadeIn"|"fadeOut"|"slideUp"|"slideDown"|"slideLeft"|"slideRight"|"zoomIn"|"zoomOut"|"bounce"|"rotate360"|"typewriter"|"pulse"|"shake"|"float"|"blurIn"|"flipX"|"flipY";
export type EasingType = "linear"|"easeIn"|"easeOut"|"easeInOut"|"bounce"|"elastic";
export type BlendMode = "source-over"|"multiply"|"screen"|"overlay"|"darken"|"lighten"|"color-dodge"|"color-burn"|"hard-light"|"soft-light"|"difference"|"exclusion";
export type TextCase = "none"|"uppercase"|"lowercase"|"capitalize";
export type ImageFit = "contain"|"cover"|"fill";

export interface ShadowConfig { color: string; offsetX: number; offsetY: number; blur: number; spread?: number; }

export interface EditorElement {
  id: string;
  type: "text"|"image"|"rect"|"circle"|"qrcode";
  name?: string;
  x: number; y: number; width: number; height: number;
  rotation?: number; opacity?: number;
  // Text
  text?: string; fontSize?: number; fontFamily?: string; fontStyle?: string;
  fill?: string; align?: string; verticalAlign?: string;
  letterSpacing?: number; lineHeight?: number;
  textDecoration?: string; textTransform?: TextCase;
  // Image
  src?: string; imageFit?: ImageFit;
  cropX?: number; cropY?: number; cropW?: number; cropH?: number;
  clipShape?: "none" | "circle" | "rounded";
  clipRadius?: number;
  // QR Code
  qrUrl?: string; qrFg?: string; qrBg?: string;
  // Shape
  cornerRadius?: number; stroke?: string; strokeWidth?: number;
  strokeDashArray?: number[];
  // Effects
  shadow?: ShadowConfig; blendMode?: BlendMode;
  skewX?: number; skewY?: number; blurAmount?: number;
  // Flip
  flipX?: boolean; flipY?: boolean;
  // Lock/Vis
  locked?: boolean; visible?: boolean;
  // Bind
  bindParam?: string;
  // Animation
  animation?: AnimationType; animDelay?: number; animDuration?: number;
  animEasing?: EasingType; animRepeat?: number;
}

export interface EditorSchema {
  elements: EditorElement[];
  background: string;
  duration?: number;
  qtdDestinos?: number;
}

export const BIND_GROUPS = [
  { group: "Imagens", fields: ["imgfundo","imgdestino","imghotel","imgaviao","imgciamaritima","imgloja"] },
  { group: "Destino", fields: ["destino","saida","tipovoo"] },
  { group: "Período", fields: ["dataida","datavolta","noites","feriado"] },
  { group: "Hotel / Navio", fields: ["hotel","navio","categoria","itinerario","incluso"] },
  { group: "Serviços", fields: ["servico1","servico2","servico3","servico4","servico5","servico6"] },
  { group: "Selos", fields: ["seloultimos","seloferiado","selooferta","selodesconto"] },
  { group: "Pagamento", fields: ["formapagamento","parcelas","valorparcela","desconto"] },
  { group: "Total", fields: ["totalduplo","totalcruzeiro"] },
  { group: "Anoiteceu", fields: ["desconto","inicio","fim","paraviagens"] },
  { group: "Loja", fields: ["loja","agente","fone"] },
  { group: "Genérico", fields: ["titulo","subtitulo","texto1","texto2","texto3"] },
];

export const FONTS = [
  "DM Sans","DM Serif Display","Helvetica Neue","Arial","Inter","Montserrat",
  "Poppins","Roboto","Open Sans","Lato","Raleway","Oswald","Bebas Neue",
  "Barlow","Playfair Display","Georgia","Times New Roman","Impact","Verdana",
];

export const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: "none", label: "Nenhuma" },{ value: "fadeIn", label: "Fade In" },{ value: "fadeOut", label: "Fade Out" },
  { value: "slideUp", label: "Slide Up" },{ value: "slideDown", label: "Slide Down" },
  { value: "slideLeft", label: "Slide Left" },{ value: "slideRight", label: "Slide Right" },
  { value: "zoomIn", label: "Zoom In" },{ value: "zoomOut", label: "Zoom Out" },
  { value: "bounce", label: "Bounce" },{ value: "rotate360", label: "Rotação 360" },
  { value: "typewriter", label: "Typewriter" },{ value: "pulse", label: "Pulse" },
  { value: "shake", label: "Shake" },{ value: "float", label: "Float" },
  { value: "blurIn", label: "Blur In" },{ value: "flipX", label: "Flip X" },{ value: "flipY", label: "Flip Y" },
];

export const EASINGS: { value: EasingType; label: string }[] = [
  { value: "linear", label: "Linear" },{ value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },{ value: "easeInOut", label: "Ease In Out" },
  { value: "bounce", label: "Bounce" },{ value: "elastic", label: "Elastic" },
];

export const BLEND_MODES: BlendMode[] = ["source-over","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"];

export function genId() { return `el_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

/* ══ Smart Guides / Snap ═════════════════════════ */
export interface SnapLine {
  orientation: "V" | "H";
  position: number;
  kind: "edge" | "element";
}
export interface SnapResult {
  x: number;
  y: number;
  lines: SnapLine[];
}

/**
 * Calcula snap de um elemento arrastado contra bordas do canvas e outros elementos.
 * Considera 3 pontos por eixo (início, centro, fim). Threshold default 6px.
 */
export function calcSnapLines(
  dragging: { id: string; x: number; y: number; width: number; height: number },
  all: EditorElement[],
  canvasW: number,
  canvasH: number,
  threshold = 6
): SnapResult {
  const { x, y, width, height } = dragging;

  const targetsX: { pos: number; kind: "edge" | "element" }[] = [
    { pos: 0, kind: "edge" },
    { pos: canvasW / 2, kind: "edge" },
    { pos: canvasW, kind: "edge" },
  ];
  const targetsY: { pos: number; kind: "edge" | "element" }[] = [
    { pos: 0, kind: "edge" },
    { pos: canvasH / 2, kind: "edge" },
    { pos: canvasH, kind: "edge" },
  ];

  for (const el of all) {
    if (el.id === dragging.id || el.visible === false) continue;
    targetsX.push({ pos: el.x, kind: "element" });
    targetsX.push({ pos: el.x + el.width / 2, kind: "element" });
    targetsX.push({ pos: el.x + el.width, kind: "element" });
    targetsY.push({ pos: el.y, kind: "element" });
    targetsY.push({ pos: el.y + el.height / 2, kind: "element" });
    targetsY.push({ pos: el.y + el.height, kind: "element" });
  }

  const srcX = [x, x + width / 2, x + width];
  const srcY = [y, y + height / 2, y + height];

  let snapDX: number | null = null;
  let lineX: SnapLine | null = null;
  for (const s of srcX) {
    for (const t of targetsX) {
      const d = t.pos - s;
      if (Math.abs(d) <= threshold && (snapDX === null || Math.abs(d) < Math.abs(snapDX))) {
        snapDX = d;
        lineX = { orientation: "V", position: t.pos, kind: t.kind };
      }
    }
  }

  let snapDY: number | null = null;
  let lineY: SnapLine | null = null;
  for (const s of srcY) {
    for (const t of targetsY) {
      const d = t.pos - s;
      if (Math.abs(d) <= threshold && (snapDY === null || Math.abs(d) < Math.abs(snapDY))) {
        snapDY = d;
        lineY = { orientation: "H", position: t.pos, kind: t.kind };
      }
    }
  }

  const lines: SnapLine[] = [];
  if (lineX) lines.push(lineX);
  if (lineY) lines.push(lineY);

  return {
    x: x + (snapDX ?? 0),
    y: y + (snapDY ?? 0),
    lines,
  };
}

/* ══ Templates de início rápido (hardcoded presets) ═══ */
export interface EditorPreset {
  id: string;
  name: string;
  formType: string;
  format: string;
  schema: EditorSchema;
}

export const BLANK_SCHEMA: EditorSchema = { elements: [], background: "#0E1520", duration: 5 };

export const QUICK_START_PRESETS: EditorPreset[] = [
  {
    id: "blank",
    name: "Em branco",
    formType: "pacote",
    format: "stories",
    schema: BLANK_SCHEMA,
  },

  /* ── 1. PACOTE — Stories (1080×1920) ─────────────── */
  {
    id: "pacote-stories",
    name: "Pacote — Stories",
    formType: "pacote",
    format: "stories",
    schema: {
      background: "#1E3A6E",
      duration: 5,
      elements: [
        { id: "p_bg", type: "image", name: "Fundo", x: 0, y: 0, width: 1080, height: 1920, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
        { id: "p_card", type: "rect", name: "Card", x: 40, y: 180, width: 1000, height: 1400, fill: "#1E3A6E", opacity: 0.92, cornerRadius: 32 },
        { id: "p_dst", type: "text", name: "Destino", x: 60, y: 220, width: 960, height: 120, text: "[destino]", fontSize: 90, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "destino", opacity: 1 },
        { id: "p_per", type: "text", name: "Período", x: 60, y: 380, width: 960, height: 40, text: "[dataida] a [datavolta]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "p_sai", type: "text", name: "Saída", x: 60, y: 450, width: 960, height: 40, text: "Saída: [saida]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "p_hot", type: "text", name: "Hotel", x: 60, y: 520, width: 960, height: 40, text: "Hotel: [hotel]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "p_srv", type: "text", name: "Serviços", x: 60, y: 620, width: 940, height: 580, text: "[servico1]", fontSize: 26, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", lineHeight: 1.6, bindParam: "servico1", opacity: 1 },
        { id: "p_prbox", type: "rect", name: "Caixa preço", x: 60, y: 1250, width: 960, height: 200, fill: "#FFFFFF", cornerRadius: 16, opacity: 1 },
        { id: "p_par", type: "text", name: "Parcelas", x: 80, y: 1270, width: 180, height: 48, text: "[parcelas]x R$", fontSize: 32, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "p_pre", type: "text", name: "Preço", x: 260, y: 1260, width: 680, height: 110, text: "[valorparcela]", fontSize: 80, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", bindParam: "valorparcela", opacity: 1 },
        { id: "p_obs", type: "text", name: "Observação", x: 80, y: 1360, width: 880, height: 40, text: "ou R$ [totalduplo] por pessoa apto duplo", fontSize: 22, fontFamily: "DM Sans", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "p_ilj", type: "image", name: "Logo Loja", x: 60, y: 1650, width: 200, height: 80, bindParam: "imgloja", imageFit: "cover", opacity: 1 },
        { id: "p_lj", type: "text", name: "Loja", x: 280, y: 1670, width: 760, height: 40, text: "[loja]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "loja", opacity: 1 },
      ],
    },
  },

  /* ── 2. CAMPANHA — Stories (1080×1920) ────────────── */
  {
    id: "campanha-stories",
    name: "Campanha — Stories",
    formType: "campanha",
    format: "stories",
    schema: {
      background: "#1E3A6E",
      duration: 5,
      elements: [
        { id: "c_bg", type: "image", name: "Fundo", x: 0, y: 0, width: 1080, height: 1920, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
        { id: "c_tit", type: "text", name: "Chamada", x: 40, y: 100, width: 1000, height: 60, text: "[titulo]", fontSize: 36, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "center", bindParam: "titulo", opacity: 1 },
        { id: "c_card", type: "rect", name: "Card", x: 40, y: 180, width: 1000, height: 1400, fill: "#1B3A6B", opacity: 0.88, cornerRadius: 28 },
        { id: "c_dst", type: "text", name: "Destino", x: 60, y: 220, width: 960, height: 120, text: "[destino]", fontSize: 90, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "destino", opacity: 1 },
        { id: "c_per", type: "text", name: "Período", x: 60, y: 380, width: 960, height: 40, text: "[dataida] a [datavolta]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "c_sai", type: "text", name: "Saída", x: 60, y: 450, width: 960, height: 40, text: "Saída: [saida]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "c_hot", type: "text", name: "Hotel", x: 60, y: 520, width: 960, height: 40, text: "Hotel: [hotel]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "c_srv", type: "text", name: "Serviços", x: 60, y: 620, width: 940, height: 580, text: "[servico1]", fontSize: 26, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", lineHeight: 1.6, bindParam: "servico1", opacity: 1 },
        { id: "c_prbox", type: "rect", name: "Caixa preço", x: 60, y: 1250, width: 960, height: 200, fill: "#FFFFFF", cornerRadius: 16, opacity: 1 },
        { id: "c_par", type: "text", name: "Parcelas", x: 80, y: 1270, width: 180, height: 48, text: "[parcelas]x R$", fontSize: 32, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "c_pre", type: "text", name: "Preço", x: 260, y: 1260, width: 680, height: 110, text: "[valorparcela]", fontSize: 80, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", bindParam: "valorparcela", opacity: 1 },
        { id: "c_obs", type: "text", name: "Observação", x: 80, y: 1360, width: 880, height: 40, text: "ou R$ [totalduplo] por pessoa apto duplo", fontSize: 22, fontFamily: "DM Sans", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "c_ilj", type: "image", name: "Logo Loja", x: 60, y: 1650, width: 200, height: 80, bindParam: "imgloja", imageFit: "cover", opacity: 1 },
        { id: "c_lj", type: "text", name: "Loja", x: 280, y: 1670, width: 760, height: 40, text: "[loja]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "loja", opacity: 1 },
      ],
    },
  },

  /* ── 3. PASSAGEM — Stories (1080×1920) ────────────── */
  {
    id: "passagem-stories",
    name: "Passagem — Stories",
    formType: "passagem",
    format: "stories",
    schema: {
      background: "#1E3A6E",
      duration: 5,
      elements: [
        { id: "pa_bg", type: "image", name: "Fundo", x: 0, y: 0, width: 1080, height: 1920, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
        { id: "pa_ih", type: "image", name: "Imagem avião", x: 40, y: 60, width: 1000, height: 480, cornerRadius: 24, bindParam: "imghotel", imageFit: "cover", opacity: 1 },
        { id: "pa_card", type: "rect", name: "Card", x: 40, y: 560, width: 1000, height: 900, fill: "#1E3A6E", opacity: 0.93, cornerRadius: 28 },
        { id: "pa_dst", type: "text", name: "Destino", x: 70, y: 590, width: 940, height: 100, text: "[destino]", fontSize: 76, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "destino", opacity: 1 },
        { id: "pa_tag", type: "text", name: "Tag", x: 70, y: 690, width: 940, height: 50, text: "Passagem Aérea", fontSize: 32, fontFamily: "DM Sans", fontStyle: "bold", fill: "#D4A843", align: "left", opacity: 1 },
        { id: "pa_sai", type: "text", name: "Saída", x: 70, y: 750, width: 940, height: 40, text: "Saída: [saida]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "pa_per", type: "text", name: "Período", x: 70, y: 800, width: 940, height: 40, text: "Período: [dataida] a [datavolta]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "pa_srv", type: "text", name: "Serviços", x: 70, y: 860, width: 920, height: 180, text: "[servico1]", fontSize: 26, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", lineHeight: 1.6, bindParam: "servico1", opacity: 1 },
        { id: "pa_prbox", type: "rect", name: "Caixa preço", x: 70, y: 1060, width: 920, height: 160, fill: "#FFFFFF", cornerRadius: 16, opacity: 1 },
        { id: "pa_pre", type: "text", name: "Preço", x: 200, y: 1075, width: 660, height: 120, text: "[valorparcela]", fontSize: 90, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", bindParam: "valorparcela", opacity: 1 },
        { id: "pa_par", type: "text", name: "Parcelas", x: 90, y: 1175, width: 840, height: 40, text: "Até [parcelas]x sem juros", fontSize: 22, fontFamily: "DM Sans", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "pa_ilj", type: "image", name: "Logo Loja", x: 70, y: 1650, width: 200, height: 80, bindParam: "imgloja", imageFit: "cover", opacity: 1 },
        { id: "pa_lj", type: "text", name: "Loja", x: 290, y: 1670, width: 720, height: 40, text: "[loja]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "loja", opacity: 1 },
      ],
    },
  },

  /* ── 4. TV — Horizontal (1920×1080) ───────────────── */
  {
    id: "tv-horizontal",
    name: "TV — Horizontal",
    formType: "pacote",
    format: "tv",
    schema: {
      background: "#1E3A6E",
      duration: 8,
      elements: [
        { id: "tv_bg", type: "image", name: "Fundo", x: 0, y: 0, width: 1920, height: 1080, bindParam: "imgfundo", imageFit: "cover", opacity: 1 },
        { id: "tv_card", type: "rect", name: "Card", x: 60, y: 60, width: 560, height: 960, fill: "#1E3A6E", opacity: 0.93, cornerRadius: 32 },
        { id: "tv_ilj", type: "image", name: "Logo Loja", x: 90, y: 90, width: 180, height: 72, bindParam: "imgloja", imageFit: "cover", opacity: 1 },
        { id: "tv_tit", type: "text", name: "Chamada", x: 90, y: 200, width: 500, height: 50, text: "[titulo]", fontSize: 28, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "titulo", opacity: 1 },
        { id: "tv_dst", type: "text", name: "Destino", x: 90, y: 270, width: 500, height: 90, text: "[destino]", fontSize: 64, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "destino", opacity: 1 },
        { id: "tv_sai", type: "text", name: "Saída", x: 90, y: 360, width: 500, height: 36, text: "Saída: [saida]", fontSize: 24, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "tv_per", type: "text", name: "Período", x: 90, y: 400, width: 500, height: 36, text: "Período: [dataida] a [datavolta]", fontSize: 24, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "tv_hot", type: "text", name: "Hotel", x: 90, y: 440, width: 500, height: 36, text: "Hotel: [hotel]", fontSize: 24, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", opacity: 1 },
        { id: "tv_srv", type: "text", name: "Serviços", x: 90, y: 490, width: 480, height: 240, text: "[servico1]", fontSize: 22, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", lineHeight: 1.6, bindParam: "servico1", opacity: 1 },
        { id: "tv_prbox", type: "rect", name: "Caixa preço", x: 90, y: 760, width: 480, height: 150, fill: "#FFFFFF", cornerRadius: 16, opacity: 1 },
        { id: "tv_par", type: "text", name: "Parcelas", x: 110, y: 780, width: 160, height: 42, text: "[parcelas]x R$", fontSize: 28, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", opacity: 1 },
        { id: "tv_pre", type: "text", name: "Preço", x: 280, y: 768, width: 280, height: 100, text: "[valorparcela]", fontSize: 72, fontFamily: "DM Sans", fontStyle: "bold", fill: "#1E3A6E", align: "left", bindParam: "valorparcela", opacity: 1 },
        { id: "tv_obs", type: "text", name: "Observação", x: 110, y: 870, width: 460, height: 36, text: "ou R$ [totalduplo] por pessoa apto duplo", fontSize: 18, fontFamily: "DM Sans", fill: "#1E3A6E", align: "left", opacity: 1 },
      ],
    },
  },

  /* ── 5. LÂMINA — Stories (grid 2×2, 4 destinos) ───── */
  {
    id: "lamina-stories",
    name: "Lâmina — Stories",
    formType: "lamina",
    format: "stories",
    schema: {
      background: "#1A2F6E",
      duration: 5,
      qtdDestinos: 4,
      elements: [
        { id: "l_bg", type: "rect", name: "Fundo", x: 0, y: 0, width: 1080, height: 1920, fill: "#1A2F6E", opacity: 1 },
        { id: "l_tit", type: "text", name: "Título", x: 40, y: 80, width: 1000, height: 60, text: "[titulo]", fontSize: 48, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "center", bindParam: "titulo", opacity: 1 },
        { id: "l_sub", type: "text", name: "Subtítulo", x: 40, y: 150, width: 1000, height: 50, text: "[subtitulo]", fontSize: 28, fontFamily: "DM Sans", fill: "#FFFFFF", align: "center", bindParam: "subtitulo", opacity: 1 },

        { id: "l_c1", type: "rect", name: "D1 Card", x: 30, y: 220, width: 480, height: 560, fill: "#243B7A", cornerRadius: 20, opacity: 1 },
        { id: "l_c1d", type: "text", name: "D1 Destino", x: 50, y: 260, width: 440, height: 50, text: "[d1_destino]", fontSize: 36, fontFamily: "DM Sans", fontStyle: "bold", fill: "#D4A843", align: "left", bindParam: "d1_destino", opacity: 1 },
        { id: "l_c1i", type: "text", name: "D1 Ida", x: 50, y: 320, width: 440, height: 30, text: "[d1_dataida]", fontSize: 20, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d1_dataida", opacity: 1 },
        { id: "l_c1r", type: "text", name: "D1 Serviço", x: 50, y: 360, width: 440, height: 30, text: "[d1_servico1]", fontSize: 18, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d1_servico1", opacity: 1 },
        { id: "l_c1p", type: "text", name: "D1 Preço", x: 50, y: 470, width: 440, height: 60, text: "[d1_valorparcela]", fontSize: 42, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "d1_valorparcela", opacity: 1 },
        { id: "l_c1n", type: "text", name: "D1 Noites", x: 50, y: 540, width: 440, height: 30, text: "[d1_noites]", fontSize: 18, fontFamily: "DM Sans", fill: "#D4A843", align: "left", bindParam: "d1_noites", opacity: 1 },

        { id: "l_c2", type: "rect", name: "D2 Card", x: 570, y: 220, width: 480, height: 560, fill: "#243B7A", cornerRadius: 20, opacity: 1 },
        { id: "l_c2d", type: "text", name: "D2 Destino", x: 590, y: 260, width: 440, height: 50, text: "[d2_destino]", fontSize: 36, fontFamily: "DM Sans", fontStyle: "bold", fill: "#D4A843", align: "left", bindParam: "d2_destino", opacity: 1 },
        { id: "l_c2i", type: "text", name: "D2 Ida", x: 590, y: 320, width: 440, height: 30, text: "[d2_dataida]", fontSize: 20, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d2_dataida", opacity: 1 },
        { id: "l_c2r", type: "text", name: "D2 Serviço", x: 590, y: 360, width: 440, height: 30, text: "[d2_servico1]", fontSize: 18, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d2_servico1", opacity: 1 },
        { id: "l_c2p", type: "text", name: "D2 Preço", x: 590, y: 470, width: 440, height: 60, text: "[d2_valorparcela]", fontSize: 42, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "d2_valorparcela", opacity: 1 },
        { id: "l_c2n", type: "text", name: "D2 Noites", x: 590, y: 540, width: 440, height: 30, text: "[d2_noites]", fontSize: 18, fontFamily: "DM Sans", fill: "#D4A843", align: "left", bindParam: "d2_noites", opacity: 1 },

        { id: "l_c3", type: "rect", name: "D3 Card", x: 30, y: 830, width: 480, height: 560, fill: "#243B7A", cornerRadius: 20, opacity: 1 },
        { id: "l_c3d", type: "text", name: "D3 Destino", x: 50, y: 870, width: 440, height: 50, text: "[d3_destino]", fontSize: 36, fontFamily: "DM Sans", fontStyle: "bold", fill: "#D4A843", align: "left", bindParam: "d3_destino", opacity: 1 },
        { id: "l_c3i", type: "text", name: "D3 Ida", x: 50, y: 930, width: 440, height: 30, text: "[d3_dataida]", fontSize: 20, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d3_dataida", opacity: 1 },
        { id: "l_c3r", type: "text", name: "D3 Serviço", x: 50, y: 970, width: 440, height: 30, text: "[d3_servico1]", fontSize: 18, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d3_servico1", opacity: 1 },
        { id: "l_c3p", type: "text", name: "D3 Preço", x: 50, y: 1080, width: 440, height: 60, text: "[d3_valorparcela]", fontSize: 42, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "d3_valorparcela", opacity: 1 },
        { id: "l_c3n", type: "text", name: "D3 Noites", x: 50, y: 1150, width: 440, height: 30, text: "[d3_noites]", fontSize: 18, fontFamily: "DM Sans", fill: "#D4A843", align: "left", bindParam: "d3_noites", opacity: 1 },

        { id: "l_c4", type: "rect", name: "D4 Card", x: 570, y: 830, width: 480, height: 560, fill: "#243B7A", cornerRadius: 20, opacity: 1 },
        { id: "l_c4d", type: "text", name: "D4 Destino", x: 590, y: 870, width: 440, height: 50, text: "[d4_destino]", fontSize: 36, fontFamily: "DM Sans", fontStyle: "bold", fill: "#D4A843", align: "left", bindParam: "d4_destino", opacity: 1 },
        { id: "l_c4i", type: "text", name: "D4 Ida", x: 590, y: 930, width: 440, height: 30, text: "[d4_dataida]", fontSize: 20, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d4_dataida", opacity: 1 },
        { id: "l_c4r", type: "text", name: "D4 Serviço", x: 590, y: 970, width: 440, height: 30, text: "[d4_servico1]", fontSize: 18, fontFamily: "DM Sans", fill: "#FFFFFF", align: "left", bindParam: "d4_servico1", opacity: 1 },
        { id: "l_c4p", type: "text", name: "D4 Preço", x: 590, y: 1080, width: 440, height: 60, text: "[d4_valorparcela]", fontSize: 42, fontFamily: "DM Sans", fontStyle: "bold", fill: "#FFFFFF", align: "left", bindParam: "d4_valorparcela", opacity: 1 },
        { id: "l_c4n", type: "text", name: "D4 Noites", x: 590, y: 1150, width: 440, height: 30, text: "[d4_noites]", fontSize: 18, fontFamily: "DM Sans", fill: "#D4A843", align: "left", bindParam: "d4_noites", opacity: 1 },

        { id: "l_ilj", type: "image", name: "Logo Loja", x: 380, y: 1650, width: 320, height: 70, bindParam: "imgloja", imageFit: "cover", opacity: 1 },
        { id: "l_lj", type: "text", name: "Loja", x: 40, y: 1740, width: 1000, height: 40, text: "[loja]", fontSize: 24, fontFamily: "DM Sans", fill: "#FFFFFF", align: "center", bindParam: "loja", opacity: 1 },
      ],
    },
  },
];

/** Reescala um schema para um novo tamanho de canvas — uso em geração de variantes */
export function rescaleSchema(schema: EditorSchema, srcW: number, srcH: number, dstW: number, dstH: number): EditorSchema {
  const sx = dstW / srcW;
  const sy = dstH / srcH;
  const s = Math.min(sx, sy);
  return {
    ...schema,
    elements: schema.elements.map(el => ({
      ...el,
      x: Math.round(el.x * sx),
      y: Math.round(el.y * sy),
      width: Math.round(el.width * sx),
      height: el.type === "text" ? Math.round(el.height * s) : Math.round(el.height * sy),
      fontSize: el.fontSize ? Math.round(el.fontSize * s) : el.fontSize,
    })),
  };
}

/** Gera bind groups dinâmicos para Lâmina baseado no nº de destinos */
export function getLaminaBindGroups(qtd: number): typeof BIND_GROUPS {
  const groups: typeof BIND_GROUPS = [];
  for (let n = 1; n <= qtd; n++) {
    groups.push({
      group: `Destino ${n}`,
      fields: [
        `d${n}_destino`, `d${n}_hotel`, `d${n}_categoria`,
        `d${n}_dataida`, `d${n}_datavolta`, `d${n}_noites`,
        `d${n}_servico1`, `d${n}_servico2`, `d${n}_servico3`,
        `d${n}_entrada`, `d${n}_parcelas`, `d${n}_valorparcela`,
        `d${n}_totalduplo`,
      ],
    });
  }
  return [
    { group: "Imagens", fields: ["imgfundo", "imgloja"] },
    { group: "Genérico", fields: ["titulo", "subtitulo", "texto1", "texto2"] },
    ...groups,
    { group: "Loja", fields: ["loja", "agente", "fone"] },
  ];
}

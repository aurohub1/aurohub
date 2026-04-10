/* ══ Editor Types ══════════════════════════════════ */

export type AnimationType = "none"|"fadeIn"|"fadeOut"|"slideUp"|"slideDown"|"slideLeft"|"slideRight"|"zoomIn"|"zoomOut"|"bounce"|"rotate360"|"typewriter"|"pulse"|"shake"|"float"|"blurIn"|"flipX"|"flipY";
export type EasingType = "linear"|"easeIn"|"easeOut"|"easeInOut"|"bounce"|"elastic";
export type BlendMode = "source-over"|"multiply"|"screen"|"overlay"|"darken"|"lighten"|"color-dodge"|"color-burn"|"hard-light"|"soft-light"|"difference"|"exclusion";
export type TextCase = "none"|"uppercase"|"lowercase"|"capitalize";
export type ImageFit = "contain"|"cover"|"fill";

export interface ShadowConfig { color: string; offsetX: number; offsetY: number; blur: number; spread?: number; }

export interface EditorElement {
  id: string;
  type: "text"|"image"|"rect"|"circle";
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
  { group: "Imagens", fields: ["imgfundo","imgdestino","imghotel","imgloja","imgperfil"] },
  { group: "Destino", fields: ["destino","subdestino"] },
  { group: "Datas", fields: ["dataida","datavolta","noites"] },
  { group: "Hotel", fields: ["hotel","categoria"] },
  { group: "Serviços", fields: ["servicos","allinclusivo"] },
  { group: "Selos", fields: ["selodesconto","seloultimos","seloferiado","selooferta"] },
  { group: "Preço", fields: ["preco","parcelas","entrada","moeda","desconto"] },
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

/** Gera bind groups dinâmicos para Lâmina baseado no nº de destinos */
export function getLaminaBindGroups(qtd: number): typeof BIND_GROUPS {
  const groups: typeof BIND_GROUPS = [];
  for (let n = 1; n <= qtd; n++) {
    groups.push({
      group: `Destino ${n}`,
      fields: [
        `d${n}_destino`, `d${n}_hotel`, `d${n}_preco`, `d${n}_periodo`,
        `d${n}_dataida`, `d${n}_datavolta`, `d${n}_noites`, `d${n}_regime`, `d${n}_servicos`,
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

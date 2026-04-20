"use client";

/**
 * CardsCanvas — port direto do V1 app.aurovista.com.br/lamina (AUROHUB FIRE/lamina.html).
 * Canvas 2D puro (sem Konva). Render pixel-by-pixel igual ao V1:
 *   _renderFallback (linhas 898-923)
 *   _cardFallback   (linhas 925-972)
 *   _drawValorPreco (linhas 785-843)
 *   _formatPeriodo  (linhas 623-631)
 *   _rr rounded-rect (linhas 974-981)
 *
 * Estado sincronizado via useEffect disparando re-render no canvas a cada mudança.
 * Pré-carrega ícones + logo + fontes antes do primeiro render.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ══ Constantes V1 ══════════════════════════════════ */

const CW = 1080;
const CH = 1920;
const HN = `"Helvetica Neue", Helvetica, Arial, sans-serif`;

// Paletas V1 (lamina.html:286-291)
const PALETTES: Array<{ name: string; emoji: string; accent: string; bg?: string; text?: string }> = [
  { name: "Verde",       emoji: "🟡", accent: "#D4E600" },
  { name: "Azul",        emoji: "🔵", accent: "#1A56C4", bg: "#E8F0FE", text: "#0B1D3A" },
  { name: "Azul Claro",  emoji: "🩵", accent: "#16b5eb" },
  { name: "Azul Escuro", emoji: "🌑", accent: "#003366", bg: "#D6E4F0", text: "#0B1D3A" },
];

// Assets fixos (lamina.html:294-297)
const IC_L = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_51_3_suuhzf.png";
const IC_M = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982256/icones_50_3_juxelf.png";
const IC_R = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1773982257/icones_49_3_yupsnv.png";
const LOGO_FALLBACK = "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774116248/PERFIL_34_pw0feq.png";

// 20 sugestões locais de título (lamina.html:520-543)
const TITULO_TEMPLATES: Array<{ l1: string; l2: string }> = [
  { l1: "Férias dos Sonhos!",      l2: "Voe com a Azul Viagens" },
  { l1: "Seu Paraíso te Espera",   l2: "Pacotes imperdíveis!" },
  { l1: "Hora de Viajar!",         l2: "As melhores ofertas pra você" },
  { l1: "Destinos Incríveis",      l2: "Reserve já sua viagem" },
  { l1: "Viaje com a Azul!",       l2: "Preços que cabem no bolso" },
  { l1: "Embarque Nessa!",         l2: "Ofertas exclusivas Azul" },
  { l1: "Realize Seu Sonho",       l2: "Viaje com a Azul Viagens" },
  { l1: "Promoção Relâmpago!",     l2: "Garanta já seu pacote" },
  { l1: "Vem Pra Azul!",           l2: "Os melhores destinos te esperam" },
  { l1: "Aventura te Chama!",      l2: "Pacotes a partir de 10x" },
  { l1: "Escapada Perfeita",       l2: "Conheça destinos únicos" },
  { l1: "Férias Inesquecíveis",    l2: "Faça suas malas!" },
  { l1: "Oferta Especial!",        l2: "Só na Azul Viagens" },
  { l1: "Próxima Parada:",         l2: "{destino}" },
  { l1: "Bora pra {destino}?",     l2: "Pacotes com a Azul Viagens" },
  { l1: "{destino} te Espera!",    l2: "Reserve com a Azul" },
  { l1: "Partiu {destino}!",       l2: "As melhores condições" },
  { l1: "Sonhe. Planeje. Viaje.",  l2: "Azul Viagens te leva!" },
  { l1: "Seu Destino é Aqui!",     l2: "Confira as ofertas" },
  { l1: "Viaje Mais, Pague Menos", l2: "Ofertas Azul Viagens" },
];

const PARCELAS_OPTS: string[] = Array.from({ length: 35 }, (_, i) => `${i + 2}x`);

/* ══ Tipos ══════════════════════════════════════════ */

interface Dest {
  destino: string;
  saida: string;
  voo: "Voo Direto" | "Voo Conexão";
  ida: string;
  volta: string;
  hotel: string;
  incluso: string;
  pgto: "" | "cartao" | "boleto";
  entrada: string;
  parc: string;
  valor: string;
  total: string;
}

function emptyDest(): Dest {
  return {
    destino: "", saida: "", voo: "Voo Direto",
    ida: "", volta: "",
    hotel: "", incluso: "",
    pgto: "", entrada: "", parc: "",
    valor: "", total: "",
  };
}

interface Assets {
  icL: HTMLImageElement | null;
  icM: HTMLImageElement | null;
  icR: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

interface Props {
  lojaLogoUrl?: string | null;
}

/* ══ Helpers ════════════════════════════════════════ */

/** lamina.html:623-631 — formata período com regra de mesmo mês/ano. */
function formatPeriodo(ida: string, volta: string): string {
  if (!ida || !volta) return "";
  const [yi, mi, di] = ida.split("-");
  const [yv, mv, dv] = volta.split("-");
  const p = (n: string) => n.padStart(2, "0");
  if (yi === yv && mi === mv) return `${p(di)} a ${p(dv)}/${p(mi)}/${yi}`;
  if (yi === yv) return `${p(di)}/${p(mi)} a ${p(dv)}/${p(mv)}/${yi}`;
  return `${p(di)}/${p(mi)}/${yi} a ${p(dv)}/${p(mv)}/${yv}`;
}

/** lamina.html:974-981 — rounded-rect path. */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/* ══ Render — port direto do V1 ═══════════════════ */

/** lamina.html:785-843. R$ pequeno + inteiro grande + ,centavos pequeno, base alinhada. */
function drawValorPreco(
  c: CanvasRenderingContext2D,
  val: string,
  x: number,
  baseY: number,
  accent: string,
  txtColor: string,
) {
  const str = String(val).replace("R$", "").replace(/\s/g, "");
  const partes = str.split(",");
  const inteiro = partes[0] || "—";
  const cents = "," + (partes[1] || "00");

  const fsGrande = 44;
  const fsPequeno = Math.round(fsGrande * 0.42);
  const gap = 2;

  c.save();
  c.textBaseline = "alphabetic";
  c.textAlign = "left";

  // Medir
  c.font = `400 ${fsPequeno}px ${HN}`;
  const wRS = c.measureText("R$").width;
  c.font = `900 ${fsGrande}px ${HN}`;
  const wInt = c.measureText(inteiro).width;

  // R$ pequeno (accent)
  c.font = `400 ${fsPequeno}px ${HN}`;
  c.fillStyle = accent;
  c.fillText("R$", x, baseY);

  // Inteiro grande (accent)
  c.font = `900 ${fsGrande}px ${HN}`;
  c.fillStyle = accent;
  c.fillText(inteiro, x + wRS + gap, baseY);

  // Centavos pequeno (branco / txtColor)
  c.font = `400 ${fsPequeno}px ${HN}`;
  c.fillStyle = txtColor;
  c.fillText(cents, x + wRS + gap + wInt + gap, baseY);

  c.restore();
}

/** lamina.html:925-972 — card individual. */
function drawCard(
  c: CanvasRenderingContext2D,
  d: Dest,
  x: number,
  y: number,
  P: typeof PALETTES[number],
  assets: Assets,
) {
  const txtColor = P.text || "#ffffff";
  const subColor = P.text ? `${P.text}bb` : "rgba(255,255,255,0.7)";
  const borderColor = P.text ? `${P.text}66` : "rgba(255,255,255,0.6)";

  c.save();
  c.textBaseline = "alphabetic";
  c.textAlign = "left";

  // Pill destino — stroke-only, width=min(text+40, 420), height=36, radius=18, lineWidth=1.5
  const dt = (d.destino || "DESTINO").toUpperCase();
  c.font = `700 20px ${HN}`;
  const bw = Math.min(c.measureText(dt).width + 40, 420);
  const bh = 36;
  const br = 18;
  c.strokeStyle = borderColor;
  c.lineWidth = 1.5;
  c.beginPath();
  rr(c, x, y, bw, bh, br);
  c.stroke();
  c.fillStyle = P.accent;
  c.textBaseline = "middle";
  c.fillText(dt, x + 18, y + bh / 2);
  c.textBaseline = "alphabetic";

  // Período 700 36px txtColor at (x+4, y+80)
  const per = formatPeriodo(d.ida, d.volta);
  c.font = `700 36px ${HN}`;
  c.fillStyle = txtColor;
  c.fillText(per || "DATA", x + 4, y + 80);

  // 3 ícones 26×26 at (x+4, y+90), gap 34
  const isz = 26;
  const ig = 34;
  if (assets.icL) c.drawImage(assets.icL, x + 4, y + 90, isz, isz);
  if (assets.icM) c.drawImage(assets.icM, x + 4 + ig, y + 90, isz, isz);
  if (assets.icR) c.drawImage(assets.icR, x + 4 + ig * 2, y + 90, isz, isz);

  // Incluso 400 18px accent at (x+4, y+138)
  c.font = `400 18px ${HN}`;
  c.fillStyle = P.accent;
  c.fillText(d.incluso || "Aéreo + Hotel + Transfer", x + 4, y + 138);

  // Saída+Voo 400 17px txtColor 'Saída: X  Voo' at (x+4, y+162)
  c.font = `400 17px ${HN}`;
  c.fillStyle = txtColor;
  c.fillText(`Saída: ${d.saida || "—"}  ${d.voo || ""}`, x + 4, y + 162);
  // Hotel 400 17px txtColor at (x+4, y+184)
  c.fillText(`Hotel: ${d.hotel || "—"}`, x + 4, y + 184);

  // Pgto 700 15px subColor uppercase at (x+4, y+210)
  c.font = `700 15px ${HN}`;
  c.fillStyle = subColor;
  const pgtoTxt =
    d.pgto === "cartao"
      ? "No Cartão de Crédito S/ Juros"
      : d.pgto === "boleto"
        ? (d.entrada ? `Entrada de R$ ${d.entrada} +` : "Boleto")
        : "PAGAMENTO";
  c.fillText(pgtoTxt.toUpperCase(), x + 4, y + 210);

  // Parcelas 400 20px txtColor at (x+4, y+236)
  c.font = `400 20px ${HN}`;
  c.fillStyle = txtColor;
  const parTxt = d.parc ? (/x$/i.test(d.parc) ? d.parc : `${d.parc}x`) : "—x";
  c.fillText(parTxt, x + 4, y + 236);

  // Valor composto at (x+4, y+288)
  drawValorPreco(c, d.valor || "", x + 4, y + 288, P.accent, txtColor);

  // Total 400 15px subColor at (x+4, y+312)
  c.font = `400 15px ${HN}`;
  c.fillStyle = subColor;
  c.fillText(
    d.total ? `ou R$ ${d.total} à vista por pessoa` : "À VISTA",
    x + 4,
    y + 312,
  );

  c.restore();
}

/** lamina.html:898-923 — render global do canvas. */
function renderLamina(
  canvas: HTMLCanvasElement,
  titulo1: string,
  titulo2: string,
  dests: Dest[],
  bgImg: HTMLImageElement | null,
  assets: Assets,
  paletteIdx: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const P = PALETTES[paletteIdx] ?? PALETTES[0];
  const txtColor = P.text || "#ffffff";

  ctx.clearRect(0, 0, CW, CH);

  // Fundo: imagem cover OU cor sólida
  if (bgImg) {
    const s = Math.max(CW / bgImg.naturalWidth, CH / bgImg.naturalHeight);
    const fw = bgImg.naturalWidth * s;
    const fh = bgImg.naturalHeight * s;
    ctx.drawImage(bgImg, (CW - fw) / 2, (CH - fh) / 2, fw, fh);
  } else {
    ctx.fillStyle = P.bg || "#0B1D3A";
    ctx.fillRect(0, 0, CW, CH);
  }

  // Títulos centralizados
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 47px ${HN}`;
  ctx.fillStyle = txtColor;
  ctx.fillText(titulo1 || "Férias dos Sonhos Já!", CW / 2, 200);
  ctx.font = `400 54px ${HN}`;
  ctx.fillStyle = txtColor;
  ctx.fillText(titulo2 || "Voe com a Azul Viagens", CW / 2, 268);

  // 4 cards em posições V1 fixas
  const positions = [
    { x: 55, y: 420 }, { x: 560, y: 420 },
    { x: 55, y: 820 }, { x: 560, y: 820 },
  ];
  positions.forEach((pos, i) => drawCard(ctx, dests[i], pos.x, pos.y, P, assets));

  // Logo bottom-right, w=160, margin 40
  if (assets.logo) {
    const lw = 160;
    const lh = (assets.logo.naturalHeight / assets.logo.naturalWidth) * lw;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(assets.logo, CW - lw - 40, CH - lh - 40, lw, lh);
    ctx.globalAlpha = 1;
  }
}

/* ══ Componente ═════════════════════════════════════ */

export default function CardsCanvas({ lojaLogoUrl }: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [titulo1, setTitulo1] = useState("Férias dos Sonhos Já!");
  const [titulo2, setTitulo2] = useState("Voe com a Azul Viagens");
  const [dests, setDests] = useState<Dest[]>([emptyDest(), emptyDest(), emptyDest(), emptyDest()]);
  const [curDest, setCurDest] = useState(0);
  const [palette, setPalette] = useState(0);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [assets, setAssets] = useState<Assets>({ icL: null, icM: null, icR: null, logo: null });
  const [assetsReady, setAssetsReady] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [scale, setScale] = useState(0.45);

  const today = todayISO();

  /* ── Preload assets + fonte ─────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [icL, icM, icR, logo] = await Promise.all([
        loadImage(IC_L),
        loadImage(IC_M),
        loadImage(IC_R),
        loadImage(lojaLogoUrl || LOGO_FALLBACK),
      ]);
      if (cancelled) return;
      setAssets({ icL, icM, icR, logo });
      // Carrega Helvetica Neue se disponível (pode cair no fallback do HN string)
      try {
        if (typeof document !== "undefined" && document.fonts) {
          await document.fonts.load(`400 16px "Helvetica Neue"`);
          await document.fonts.load(`700 20px "Helvetica Neue"`);
          await document.fonts.load(`900 44px "Helvetica Neue"`);
        }
      } catch {
        /* noop */
      }
      setAssetsReady(true);
    })();
    return () => { cancelled = true; };
  }, [lojaLogoUrl]);

  /* ── Scale responsivo do preview ────────────── */
  useEffect(() => {
    function update() {
      const avH = Math.max(window.innerHeight - 160, 400);
      const avW = Math.max(Math.min(window.innerWidth - 480, 560), 260);
      setScale(Math.min(avW / CW, avH / CH, 0.55));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ── Render a cada mudança de estado ────────── */
  useEffect(() => {
    if (!assetsReady) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    renderLamina(cvs, titulo1, titulo2, dests, bgImg, assets, palette);
  }, [titulo1, titulo2, dests, bgImg, palette, assets, assetsReady]);

  /* ── Ações ──────────────────────────────────── */

  const updateDest = useCallback((idx: number, patch: Partial<Dest>) => {
    setDests((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }, []);

  const onDataIda = useCallback((val: string) => {
    const v = val < today ? today : val;
    setDests((prev) => prev.map((d, i) => {
      if (i !== curDest) return d;
      const nextVolta = d.volta && d.volta < v ? v : d.volta;
      return { ...d, ida: v, volta: nextVolta };
    }));
  }, [curDest, today]);

  const onDataVolta = useCallback((val: string) => {
    setDests((prev) => prev.map((d, i) => {
      if (i !== curDest) return d;
      const min = d.ida || today;
      return { ...d, volta: val < min ? min : val };
    }));
  }, [curDest, today]);

  async function handleShuffle() {
    setBgLoading(true);
    try {
      const { data, error } = await supabase
        .from("imgfundo")
        .select("url")
        .not("url", "is", null)
        .limit(1000);
      if (error) { console.error("[Cards] imgfundo:", error); return; }
      const rows = (data ?? []) as Array<{ url: string }>;
      if (!rows.length) return;
      const pick = rows[Math.floor(Math.random() * rows.length)];
      const img = await loadImage(pick.url);
      if (img) setBgImg(img);
    } catch (err) {
      console.error("[Cards] shuffle:", err);
    } finally {
      setBgLoading(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (!reader.result) return;
      const img = await loadImage(String(reader.result));
      if (img) setBgImg(img);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function handleClearBg() {
    setBgImg(null);
  }

  function handleIATitulo() {
    const first = dests.map((d) => d.destino).filter(Boolean)[0] || "seu destino";
    const tmpl = TITULO_TEMPLATES[Math.floor(Math.random() * TITULO_TEMPLATES.length)];
    let l1 = tmpl.l1.replace("{destino}", first);
    let l2 = tmpl.l2.replace("{destino}", first);
    if (l1.length > 25) l1 = l1.slice(0, 24) + "…";
    if (l2.length > 30) l2 = l2.slice(0, 29) + "…";
    setTitulo1(l1);
    setTitulo2(l2);
  }

  function handleDownload() {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const url = cvs.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cards_${Date.now()}.png`;
    a.click();
  }

  const d = dests[curDest];
  const inputCls = "h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]";

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* ── FORM ──────────────────────────────── */}
      <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden border-r border-[var(--bdr)]" style={{ background: "var(--bg1)" }}>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">

          {/* Título */}
          <Section title="✦ Título da Arte">
            <Field label="Linha 1">
              <div className="flex gap-1.5">
                <input
                  value={titulo1}
                  onChange={(e) => setTitulo1(e.target.value.slice(0, 25))}
                  placeholder="Férias dos Sonhos Já!"
                  className={`${inputCls} flex-1`}
                  maxLength={25}
                />
                <button
                  type="button"
                  onClick={handleIATitulo}
                  title="Gerar com IA (local, 20 sugestões)"
                  className="shrink-0 rounded-lg border px-2.5 text-[11px] font-bold"
                  style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "rgba(255,122,26,0.08)" }}
                >
                  ✦ IA
                </button>
              </div>
            </Field>
            <Field label="Linha 2">
              <input
                value={titulo2}
                onChange={(e) => setTitulo2(e.target.value.slice(0, 30))}
                placeholder="Voe com a Azul Viagens"
                className={inputCls}
                maxLength={30}
              />
            </Field>
          </Section>

          {/* Sub-abas destinos */}
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => {
              const active = curDest === i;
              const label = dests[i].destino
                ? dests[i].destino.toUpperCase().slice(0, 8)
                : `Dest ${i + 1}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurDest(i)}
                  className="rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={
                    active
                      ? { background: "var(--orange)", color: "#fff", borderColor: "var(--orange)" }
                      : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Campos do destino atual */}
          <Section title="📍 Destino & Voo">
            <Field label="Destino">
              <input
                value={d.destino}
                onChange={(e) => updateDest(curDest, { destino: e.target.value.toUpperCase() })}
                placeholder="ex: NATAL"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Saída">
                <input
                  value={d.saida}
                  onChange={(e) => updateDest(curDest, { saida: e.target.value })}
                  placeholder="GRU"
                  className={inputCls}
                />
              </Field>
              <Field label="Tipo Voo">
                <select
                  value={d.voo}
                  onChange={(e) => updateDest(curDest, { voo: e.target.value as Dest["voo"] })}
                  className={inputCls}
                >
                  <option>Voo Direto</option>
                  <option>Voo Conexão</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="📅 Datas">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ida">
                <input
                  type="date"
                  min={today}
                  value={d.ida}
                  onChange={(e) => onDataIda(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Volta">
                <input
                  type="date"
                  min={d.ida || today}
                  value={d.volta}
                  onChange={(e) => onDataVolta(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          <Section title="🏨 Hotel & Incluso">
            <Field label="Hotel">
              <input
                value={d.hotel}
                onChange={(e) => updateDest(curDest, { hotel: e.target.value })}
                placeholder="Summerville Resort"
                className={inputCls}
              />
            </Field>
            <Field label="Incluso">
              <input
                value={d.incluso}
                onChange={(e) => updateDest(curDest, { incluso: e.target.value })}
                placeholder="Aéreo + Hotel + Transfer"
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="💰 Pagamento">
            <Field label="Forma de Pagamento">
              <select
                value={d.pgto}
                onChange={(e) => {
                  const v = e.target.value as Dest["pgto"];
                  updateDest(curDest, { pgto: v, ...(v !== "boleto" ? { entrada: "" } : {}) });
                }}
                className={inputCls}
              >
                <option value="">– selecione –</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="boleto">Boleto</option>
              </select>
            </Field>
            {d.pgto === "boleto" && (
              <Field label="Valor da Entrada (R$)">
                <input
                  value={d.entrada}
                  onChange={(e) => updateDest(curDest, { entrada: e.target.value })}
                  placeholder="1.500,00"
                  className={inputCls}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Parcelas">
                <select
                  value={d.parc}
                  onChange={(e) => updateDest(curDest, { parc: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— nenhum —</option>
                  {PARCELAS_OPTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valor Parcela">
                <input
                  value={d.valor}
                  onChange={(e) => updateDest(curDest, { valor: e.target.value })}
                  placeholder="890,00"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="À Vista (por pessoa)">
              <input
                value={d.total}
                onChange={(e) => updateDest(curDest, { total: e.target.value })}
                placeholder="8.900,00"
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="✦ Personalização Visual">
            <Field label="Cor tema">
              <div className="grid grid-cols-4 gap-1.5">
                {PALETTES.map((p, i) => {
                  const active = palette === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPalette(i)}
                      title={p.name}
                      className="flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-all"
                      style={
                        active
                          ? { borderColor: "var(--orange)", background: "var(--bg1)" }
                          : { borderColor: "var(--bdr)", background: "transparent" }
                      }
                    >
                      <span
                        className="block rounded-md"
                        style={{
                          width: 24, height: 24,
                          background: p.accent,
                          boxShadow: active ? "0 0 0 2px var(--txt) inset" : "none",
                        }}
                      />
                      <span className="text-[9px] font-semibold leading-none text-[var(--txt2)]">
                        {p.emoji} {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Fundo">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={bgLoading}
                  className="rounded-lg border px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
                >
                  {bgLoading ? "Buscando…" : "⟳ Aleatório"}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                  style={{ borderColor: "var(--bdr)", color: "var(--txt2)" }}
                >
                  ↑ Upload
                </button>
                {bgImg && (
                  <button
                    type="button"
                    onClick={handleClearBg}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                    style={{ borderColor: "var(--bdr)", color: "var(--txt3)" }}
                  >
                    ✕ Limpar
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </Field>
          </Section>
        </div>

        {/* Footer — Download */}
        <div className="shrink-0 border-t border-[var(--bdr)] p-3" style={{ background: "var(--bg1)" }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!assetsReady}
            className="w-full rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0e8f4e, #16b862)" }}
          >
            ⬇ Baixar 1080 × 1920
          </button>
        </div>
      </aside>

      {/* ── PREVIEW ───────────────────────────── */}
      <main
        className="flex flex-1 items-center justify-center overflow-hidden p-6"
        style={{
          background:
            "radial-gradient(ellipse at 15% 20%, rgba(30,64,128,0.4) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(201,168,76,0.12) 0%, transparent 50%), var(--bg)",
        }}
      >
        <div className="relative shrink-0">
          <span
            className="absolute -top-6 right-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ background: "var(--bg1)", borderColor: "var(--bdr)", color: "var(--txt3)" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
              width: Math.round(CW * scale),
              height: Math.round(CH * scale),
              display: "block",
              borderRadius: 4,
              boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.12)",
            }}
          />
          {!assetsReady && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--txt3)]">
              Carregando assets…
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ══ Primitivos UI ═════════════════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ background: "var(--bg2)", borderColor: "var(--bdr)" }}>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--txt3)]">{label}</span>
      {children}
    </label>
  );
}

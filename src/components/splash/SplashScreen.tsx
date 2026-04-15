"use client";
import { useEffect, useRef, useState } from "react";

export type SplashEffect =
  | "particles" | "cinematic" | "slideup" | "scalefade" | "fadesuave"
  | "ondas" | "flutuacao" | "scanner" | "holofote" | "chuvapontos"
  | "gradiente" | "dissolve" | "bigbang" | "aurora" | "tinta" | "vagalumes"
  | "aurora_espacial" | "galaxia"
  | "vidro_janela" | "vidro_liquido"
  | "cidade_a" | "cidade_b" | "restaurante" | "saude"
  | "moda" | "imobiliaria" | "educacao" | "beleza"
  | "aurovista_adm";

interface Props {
  logoUrl: string;
  logoOrientation?: "horizontal" | "vertical" | "quadrado";
  effect?: SplashEffect | "random";
  cor1?: string;
  cor2?: string;
  cor3?: string;
  cor4?: string;
  cor5?: string;
  corFundo?: string;
  userName?: string;
  onDone?: () => void;
  /** Modo embarcado: renderiza dentro de container relativo com tamanho custom e sem timers/dismiss */
  embedded?: { width: number; height: number };
  /** Modo preview: position:absolute inset:0 (preenche o parent) — sem timers, sem dismiss. */
  preview?: boolean;
  /** Velocidade da animação 1-10 (default 5 = normal). Escala o tempo base. */
  velocidade?: number;
  /** Suavidade 1-10 (default 7). Controla blur/alpha em efeitos aurora/vidro. */
  suavidade?: number;
  /** URL do áudio para tocar durante o splash. */
  somUrl?: string;
  /** aurovista_adm: quantidade de partículas orbitando (1-10, default 5). */
  quantidade?: number;
  /** aurovista_adm: tamanho das partículas (1-10, default 5). */
  tamanho?: number;
  /** aurovista_adm: raio orbital base das partículas (1-10, default 5). */
  raioOrbital?: number;
  /** aurovista_adm: intensidade da nebulosa dourada (0-10, default 6). */
  nebulosa?: number;
  /** aurovista_adm: opacidade geral do efeito (1-10, default 8). */
  opacidade?: number;
  /** aurovista_adm: dispersão/jitter das órbitas (0-10, default 4). */
  dispersao?: number;
  /** aurovista_adm: velocidade do texto (1-10, default 5). */
  velocidadeTexto?: number;
  /** aurovista_adm: efeito do texto. */
  textoEfeito?: TextoEfeito;
  /** aurovista_adm: glow no texto (drop-shadow). Default true. */
  glowTexto?: boolean;
  /** aurovista_adm: intensidade do glow 1-10 (default 5 ≈ shadowBlur 14px). */
  glowIntensidade?: number;
}

export type TextoEfeito = "typewriter" | "fadein" | "slideup" | "glitch" | "reveal" | "blurtosharp" | "scalein";
export const TEXTO_EFEITOS: TextoEfeito[] = ["typewriter", "fadein", "slideup", "glitch", "reveal", "blurtosharp", "scalein"];

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "aurora_espacial","galaxia",
  "vidro_janela","vidro_liquido",
  "cidade_a","cidade_b","restaurante","saude",
  "moda","imobiliaria","educacao","beleza",
  "aurovista_adm",
];

export default function SplashScreen({
  logoUrl, logoOrientation = "horizontal",
  effect = "random", cor1 = "#D4A843", cor2 = "#FF7A1A", cor3 = "transparent",
  cor4 = "transparent", cor5 = "transparent", corFundo = "#060B16", userName, onDone,
  embedded, preview, velocidade = 5, suavidade = 7, somUrl,
  quantidade = 5, tamanho = 5, raioOrbital = 5, nebulosa = 6,
  opacidade = 8, dispersao = 4, velocidadeTexto = 5,
  textoEfeito = "typewriter",
  glowTexto = true, glowIntensidade = 5,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);
  const [greetVisible, setGreetVisible] = useState(false);
  const greetVisibleRef = useRef(false);
  const textStartMsRef = useRef<number | null>(null);
  const textEndMsRef = useRef<number | null>(null);
  useEffect(() => {
    greetVisibleRef.current = greetVisible;
    if (greetVisible) {
      textStartMsRef.current = performance.now();
      textEndMsRef.current = null;
    } else if (textStartMsRef.current != null) {
      textEndMsRef.current = performance.now();
    }
  }, [greetVisible]);

  // Som do splash: toca ao montar, para ao desmontar/embedded
  useEffect(() => {
    if (!somUrl || embedded) return;
    const audio = new Audio(somUrl);
    audio.volume = 0.6;
    audio.play().catch(() => { /* autoplay pode ser bloqueado */ });
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [somUrl, embedded]);

  function getGreeting() {
    const h = new Date().getHours();
    console.log("[SplashScreen] getHours():", h);
    if (h >= 5 && h < 12) return "Bom dia";
    if (h >= 12 && h < 18) return "Boa tarde";
    return "Boa noite";
  }

  const activeEffect: SplashEffect = effect === "random"
    ? EFFECTS[Math.floor(Math.random() * EFFECTS.length)]
    : effect;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (embedded) {
      canvas.width = embedded.width;
      canvas.height = embedded.height;
    } else if (preview) {
      const r = canvas.parentElement?.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r?.width ?? window.innerWidth));
      canvas.height = Math.max(1, Math.round(r?.height ?? window.innerHeight));
    } else {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    let animId: number;
    let lastFrame = performance.now();
    let simTime = 0;

    // Aurovista ADM: pool de cores (só hex válidos) e partículas
    const isValidHex = (c: string | undefined): c is string =>
      !!c && typeof c === "string" && c.startsWith("#") && c.length >= 7;
    const aurovistaPool: string[] = [cor1, cor2, cor3 as string, cor4 as string, cor5 as string].filter(isValidHex);
    if (aurovistaPool.length === 0) aurovistaPool.push("#D4A843", "#FF7A1A");
    interface AurovistaPt { a: number; rad: number; spd: number; sz: number; col: string; al: number; pl: number; }
    const aurovistaPts: AurovistaPt[] = [];

    // Helper — "transparent"/inválido vira preto neutro (só impacta c4/c5 que são fallbacks opcionais)
    const hex2rgb = (hex: string) => {
      if (!hex || !hex.startsWith("#") || hex.length < 7) return { r: 0, g: 0, b: 0 };
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return { r, g, b };
    };
    const c1 = hex2rgb(cor1), c2 = hex2rgb(cor2), c3 = hex2rgb(cor3);
    const c4 = cor4 ? hex2rgb(cor4) : c1;
    const c5 = cor5 ? hex2rgb(cor5) : c2;

    const W = canvas.width, H = canvas.height;

    // Inicializa partículas do aurovista_adm — baseado em aurovista_splash_v2.html, modulado por props
    const aurovistaCount = Math.round(50 + (quantidade / 10) * 200); // 50-250 (default ~150 @ quantidade=5)
    const aurovistaSizeMult = 0.4 + (tamanho / 10) * 1.2; // 0.4-1.6 (default 1.0 @ tamanho=5)
    const aurovistaRadScale = (raioOrbital / 5); // 0.2-2 (default 1.0 @ raioOrbital=5)
    const aurovistaSpdMult = 0.4 + (velocidade / 10) * 1.2; // 0.4-1.6 (default 1.0 @ velocidade=5)
    const aurovistaDispersion = (dispersao / 10); // 0-1 (0 = órbita limpa, 1 = spread máximo)
    for (let i = 0; i < aurovistaCount; i++) {
      const disp = 1 + (Math.random() - 0.5) * aurovistaDispersion * 0.6;
      aurovistaPts.push({
        a: Math.random() * Math.PI * 2,
        rad: (50 + Math.random() * Math.min(W, H) * 0.45) * aurovistaRadScale * disp,
        spd: (0.0015 + Math.random() * 0.003) * aurovistaSpdMult,
        sz: (0.8 + Math.random() * 2.8) * aurovistaSizeMult,
        col: aurovistaPool[Math.floor(Math.random() * aurovistaPool.length)],
        al: 0.2 + Math.random() * 0.8,
        pl: Math.random() * Math.PI * 2,
      });
    }

    // Sequência: logo fade-in → 2s visível → fade-out → greeting fade-in → 2s visível → fade-out → onDone
    // Canvas (partículas + nebulosa) roda continuamente durante toda a sequência como fundo.
    // Em modo embedded: sem timers (preview infinito, sem dismiss).
    const noTimers = embedded || preview;
    const logoInTimer = noTimers ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setLogoVisible(true), 400);
    const logoOutTimer = noTimers ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setLogoVisible(false), 2900);
    const greetInTimer = noTimers ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setGreetVisible(true), 3500);
    const greetOutTimer = noTimers ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setGreetVisible(false), 6000);
    const doneTimer = noTimers ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 6800);

    function draw(now: number) {
      // velocidade: 1=0.3x, 5=1x, 10=2x — delta time para consistência em telas 30/60/120/144Hz
      const speedFactor = 0.3 + (velocidade / 10) * 1.7;
      const rawDt = (now - lastFrame) / 1000;
      lastFrame = now;
      // Evita saltos grandes (tab em bg) e pausa quando document.hidden
      const dt = typeof document !== "undefined" && document.hidden
        ? 0
        : Math.min(0.1, rawDt);
      simTime += dt * speedFactor;
      const t = simTime;
      ctx.clearRect(0, 0, W, H);

      // Fundo
      ctx.fillStyle = corFundo;
      ctx.fillRect(0, 0, W, H);

      switch (activeEffect) {

        case "particles": {
          for(let i=0;i<120;i++){
            const orbit=(i%3+1)*H*0.18;
            const speed=0.3+(i%5)*0.1;
            const angle=(i/120)*Math.PI*2+t*speed;
            const x=W/2+Math.cos(angle)*orbit*(0.8+Math.sin(i*0.7)*0.2);
            const y=H/2+Math.sin(angle)*orbit*0.35;
            const size=1+Math.sin(i+t*2)*0.8;
            const col=i%3===0?c2:i%3===1?c1:c3;
            const alpha=0.5+Math.sin(i*0.5+t)*0.4;
            const trail=ctx.createRadialGradient(x,y,0,x,y,size*3);
            trail.addColorStop(0,`rgba(${col.r},${col.g},${col.b},${alpha})`);
            trail.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=trail;
            ctx.beginPath();
            ctx.arc(x,y,size*3,0,Math.PI*2);
            ctx.fill();
          }
          break;
        }

        case "cinematic": {
          const barH=H*0.13;
          const sweepX=(t*0.4%1.4-0.2)*W;
          const sweep=ctx.createLinearGradient(sweepX-W*0.15,0,sweepX+W*0.15,0);
          sweep.addColorStop(0,"rgba(255,255,255,0)");
          sweep.addColorStop(0.5,`rgba(${c2.r},${c2.g},${c2.b},0.08)`);
          sweep.addColorStop(1,"rgba(255,255,255,0)");
          ctx.fillStyle=sweep;
          ctx.fillRect(0,barH,W,H-barH*2);
          const vig=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.8);
          vig.addColorStop(0,"rgba(0,0,0,0)");
          vig.addColorStop(1,"rgba(0,0,0,0.7)");
          ctx.fillStyle=vig;
          ctx.fillRect(0,0,W,H);
          ctx.fillStyle="#000";
          ctx.fillRect(0,0,W,barH);
          ctx.fillRect(0,H-barH,W,barH);
          const lineGrad1=ctx.createLinearGradient(0,0,W,0);
          lineGrad1.addColorStop(0,"rgba(255,255,255,0)");
          lineGrad1.addColorStop(0.3,`rgba(${c2.r},${c2.g},${c2.b},0.6)`);
          lineGrad1.addColorStop(0.7,`rgba(${c1.r},${c1.g},${c1.b},0.6)`);
          lineGrad1.addColorStop(1,"rgba(255,255,255,0)");
          ctx.fillStyle=lineGrad1;
          ctx.fillRect(0,barH-1,W,2);
          ctx.fillRect(0,H-barH-1,W,2);
          break;
        }

        case "slideup": {
          const progress=Math.min(1,t/1.2);
          const eased=1-Math.pow(1-progress,4);
          const waveY=H*(1-eased);
          ctx.beginPath();
          ctx.moveTo(0,H);
          for(let x=0;x<=W;x+=4){
            const wave=Math.sin(x*0.015+t*4)*12*(1-eased);
            ctx.lineTo(x,waveY+wave);
          }
          ctx.lineTo(W,H);
          ctx.closePath();
          const slideGrad=ctx.createLinearGradient(0,waveY,0,H);
          slideGrad.addColorStop(0,`rgb(${c1.r},${c1.g},${c1.b})`);
          slideGrad.addColorStop(0.5,`rgb(${c3.r},${c3.g},${c3.b})`);
          slideGrad.addColorStop(1,`rgb(${Math.floor(c3.r*0.6)},${Math.floor(c3.g*0.6)},${Math.floor(c3.b*0.6)})`);
          ctx.fillStyle=slideGrad;
          ctx.fill();
          ctx.beginPath();
          for(let x=0;x<=W;x+=4){
            const wave=Math.sin(x*0.015+t*4)*12*(1-eased);
            x===0?ctx.moveTo(x,waveY+wave):ctx.lineTo(x,waveY+wave);
          }
          ctx.strokeStyle=`rgba(${c2.r},${c2.g},${c2.b},0.8)`;
          ctx.lineWidth=2;
          ctx.stroke();
          break;
        }

        case "scalefade": {
          const zoom=1+t*0.15;
          ctx.save();
          ctx.translate(W/2,H/2);
          ctx.scale(zoom,zoom);
          ctx.translate(-W/2,-H/2);
          for(let i=0;i<200;i++){
            const sx=(i*173.7)%W,sy=(i*97.3)%H;
            const br=0.3+Math.sin(i*0.7+t*3)*0.4;
            ctx.beginPath();
            ctx.arc(sx,sy,0.7,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,255,${br})`;
            ctx.fill();
          }
          ctx.restore();
          const glow=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,H*0.5);
          glow.addColorStop(0,`rgba(${c1.r},${c1.g},${c1.b},${Math.min(0.4,t*0.15)})`);
          glow.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=glow;
          ctx.fillRect(0,0,W,H);
          break;
        }

        case "fadesuave": {
          for(let i=0;i<6;i++){
            const x=W*(0.1+i*0.16+Math.sin(t*0.3+i)*0.05);
            const y=H*(0.2+Math.cos(t*0.2+i*0.8)*0.3);
            const r=H*(0.3+Math.sin(t*0.4+i)*0.1);
            const col=i%3===0?c1:i%3===1?c2:c3;
            const fog=ctx.createRadialGradient(x,y,0,x,y,r);
            fog.addColorStop(0,`rgba(${col.r},${col.g},${col.b},${0.12+Math.sin(t+i)*0.05})`);
            fog.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=fog;
            ctx.fillRect(0,0,W,H);
          }
          break;
        }

        case "ondas": {
          for(let i=0;i<8;i++){
            const phase=(t*0.8+i/8)%1;
            const r=phase*Math.max(W,H)*0.9;
            const alpha=Math.max(0,(1-phase)*0.6);
            const col=i%3===0?c1:i%3===1?c2:c3;
            ctx.beginPath();
            ctx.arc(W/2,H/2,r,0,Math.PI*2);
            ctx.strokeStyle=`rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.lineWidth=2+Math.sin(i)*1;
            ctx.stroke();
          }
          const pulse=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,H*0.08*(1+Math.sin(t*3)*0.3));
          pulse.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},0.9)`);
          pulse.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=pulse;
          ctx.fillRect(0,0,W,H);
          break;
        }

        case "flutuacao": {
          for(let i=0;i<20;i++){
            const x=W*(0.05+((i*137.5)%90)/100)+Math.sin(t*0.5+i)*30;
            const baseY=H*(0.9-(i/20)*1.1);
            const y=((baseY+t*60*(0.5+i%3*0.3))%(H+100))-50;
            const r=8+Math.sin(i+t)*4;
            const col=i%3===0?c1:i%3===1?c2:c3;
            const bub=ctx.createRadialGradient(x-r*0.3,y-r*0.3,0,x,y,r);
            bub.addColorStop(0,"rgba(255,255,255,0.3)");
            bub.addColorStop(0.4,`rgba(${col.r},${col.g},${col.b},0.2)`);
            bub.addColorStop(1,`rgba(${col.r},${col.g},${col.b},0)`);
            ctx.fillStyle=bub;
            ctx.beginPath();
            ctx.arc(x,y,r,0,Math.PI*2);
            ctx.fill();
            ctx.strokeStyle=`rgba(${col.r},${col.g},${col.b},0.4)`;
            ctx.lineWidth=0.8;
            ctx.stroke();
          }
          const sunray=ctx.createLinearGradient(0,0,0,H*0.5);
          sunray.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},0.15)`);
          sunray.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=sunray;
          ctx.fillRect(0,0,W,H*0.5);
          break;
        }

        case "scanner": {
          const scanY=(t*180)%H;
          ctx.strokeStyle=`rgba(${c3.r},${c3.g},${c3.b},0.08)`;
          ctx.lineWidth=0.5;
          for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
          for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
          const scanGrad=ctx.createLinearGradient(0,scanY-60,0,scanY+20);
          scanGrad.addColorStop(0,"rgba(0,0,0,0)");
          scanGrad.addColorStop(0.6,`rgba(${c1.r},${c1.g},${c1.b},0.15)`);
          scanGrad.addColorStop(0.9,`rgba(${c2.r},${c2.g},${c2.b},0.9)`);
          scanGrad.addColorStop(1,`rgba(${c1.r},${c1.g},${c1.b},0.3)`);
          ctx.fillStyle=scanGrad;
          ctx.fillRect(0,scanY-60,W,80);
          ctx.fillStyle=`rgba(${c2.r},${c2.g},${c2.b},1)`;
          ctx.fillRect(0,scanY,W,1.5);
          for(let i=0;i<20;i++){
            const px=(i/20)*W+Math.sin(t*10+i)*5;
            ctx.beginPath();
            ctx.arc(px,scanY,1.5,0,Math.PI*2);
            ctx.fillStyle="rgba(255,255,255,0.8)";
            ctx.fill();
          }
          break;
        }

        case "holofote": {
          for(let i=0;i<3;i++){
            const spotX=W/2+Math.sin(t*0.8+i*1.2)*W*0.2;
            const spotY=H/2+Math.cos(t*0.6+i*1.2)*H*0.15;
            const spot=ctx.createRadialGradient(spotX,spotY,0,spotX,spotY,H*0.35);
            const col=i===0?c1:i===1?c2:c3;
            spot.addColorStop(0,`rgba(${col.r},${col.g},${col.b},0.25)`);
            spot.addColorStop(0.5,`rgba(${col.r},${col.g},${col.b},0.08)`);
            spot.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=spot;
            ctx.fillRect(0,0,W,H);
          }
          break;
        }

        case "chuvapontos": {
          for(let i=0;i<100;i++){
            const x=(i*137.5)%W;
            const y=((i*50+t*150)%(H+20))-10;
            const col=i%3===0?c1:i%3===1?c2:c3;
            ctx.beginPath();
            ctx.arc(x,y,1.5,0,Math.PI*2);
            ctx.fillStyle=`rgba(${col.r},${col.g},${col.b},0.5)`;
            ctx.fill();
          }
          break;
        }

        case "gradiente": {
          const time=t*0.5;
          for(let i=0;i<5;i++){
            const x=W/2+Math.cos(time+i*1.26)*W*0.4;
            const y=H/2+Math.sin(time*0.7+i*1.26)*H*0.35;
            const r=H*(0.35+Math.sin(time+i)*0.1);
            const col=i%3===0?c1:i%3===1?c2:c3;
            const blob=ctx.createRadialGradient(x,y,0,x,y,r);
            blob.addColorStop(0,`rgba(${col.r},${col.g},${col.b},0.35)`);
            blob.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=blob;
            ctx.fillRect(0,0,W,H);
          }
          break;
        }

        case "dissolve": {
          const density=Math.min(1,t/1.5);
          for(let i=0;i<200;i++){
            const x=(Math.sin(i*127.1)*0.5+0.5)*W;
            const y=(Math.cos(i*311.7)*0.5+0.5)*H;
            const size=2+Math.sin(i+t*2)*1.5;
            const col=i%3===0?c1:i%3===1?c2:c3;
            const appearing=i<200*density;
            if(!appearing)continue;
            const alpha=(0.3+Math.sin(i*0.5+t)*0.2)*Math.min(1,(density-i/200)*5);
            ctx.fillStyle=`rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.fillRect(x,y,size,size);
          }
          break;
        }

        case "bigbang": {
          const cx=W/2,cy=H/2;
          const blast=Math.min(1,t/0.8);
          if(t<0.3){
            ctx.fillStyle=`rgba(255,255,255,${Math.max(0,1-t/0.3)*0.8})`;
            ctx.fillRect(0,0,W,H);
          }
          const shockR=blast*Math.max(W,H)*0.8;
          ctx.beginPath();
          ctx.arc(cx,cy,shockR,0,Math.PI*2);
          ctx.strokeStyle=`rgba(${c2.r},${c2.g},${c2.b},${Math.max(0,0.8-blast*0.8)})`;
          ctx.lineWidth=4;
          ctx.stroke();
          for(let i=0;i<80;i++){
            const angle=(i/80)*Math.PI*2;
            const speed=(0.3+i%5*0.15)*t;
            const dist=speed*Math.max(W,H)*0.5;
            const x=cx+Math.cos(angle)*dist;
            const y=cy+Math.sin(angle)*dist;
            const col=i%3===0?c1:i%3===1?c2:c3;
            const alpha=Math.max(0,1-t*0.4);
            ctx.beginPath();
            ctx.arc(x,y,2+Math.sin(i)*1,0,Math.PI*2);
            ctx.fillStyle=`rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.fill();
          }
          const neb=ctx.createRadialGradient(cx,cy,0,cx,cy,H*0.3*blast);
          neb.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},${0.4*blast})`);
          neb.addColorStop(0.4,`rgba(${c1.r},${c1.g},${c1.b},${0.2*blast})`);
          neb.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=neb;
          ctx.fillRect(0,0,W,H);
          break;
        }

        case "aurora": {
          // Apple-glossy aurora: gradientes radiais enormes fluindo horizontalmente
          const suavidadeNorm = suavidade / 10; // 0.1 a 1.0

          // Fundo escuro gradient
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, "#040612");
          bg.addColorStop(1, "#0a0f22");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          ctx.save();
          ctx.filter = `blur(${Math.round(suavidadeNorm * 80)}px)`;

          // Orbes coloridos gigantes que se movem horizontalmente em velocidades diferentes
          const orbs = [
            { col: c1, yBase: 0.3, yAmp: 0.05, xSpeed: 0.08, phase: 0,   radius: 0.7, alpha: 0.55 },
            { col: c2, yBase: 0.35, yAmp: 0.08, xSpeed: 0.06, phase: 2.1, radius: 0.6, alpha: 0.45 },
            { col: c3, yBase: 0.25, yAmp: 0.06, xSpeed: 0.05, phase: 4.2, radius: 0.75, alpha: 0.50 },
            { col: c1, yBase: 0.45, yAmp: 0.04, xSpeed: 0.07, phase: 1.5, radius: 0.55, alpha: 0.30 },
            { col: c2, yBase: 0.2,  yAmp: 0.07, xSpeed: 0.04, phase: 3.0, radius: 0.65, alpha: 0.35 },
          ];

          for (const orb of orbs) {
            // Movimento horizontal contínuo loopado: cycles pela tela
            const xCycle = (t * orb.xSpeed + orb.phase / (Math.PI * 2)) % 1.5 - 0.25;
            const x = W * xCycle;
            const y = H * (orb.yBase + Math.sin(t * 0.1 + orb.phase) * orb.yAmp);
            const r = H * orb.radius;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            const col = orb.col;
            grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${orb.alpha})`);
            grad.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${orb.alpha * 0.4})`);
            grad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }

          ctx.restore();

          // Leve overlay claro no topo (brilho Apple-glossy)
          const shine = ctx.createLinearGradient(0, 0, 0, H * 0.5);
          shine.addColorStop(0, "rgba(255,255,255,0.04)");
          shine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = shine;
          ctx.fillRect(0, 0, W, H * 0.5);
          break;
        }

        case "tinta": {
          const drops=8;
          for(let i=0;i<drops;i++){
            const progress=Math.min(1,Math.max(0,t-i*0.15));
            const x=W*(0.1+(i/drops)*0.8);
            const radius=progress*H*0.6;
            const col=i%3===0?c1:i%3===1?c3:c2;
            const grad=ctx.createRadialGradient(x,-20,0,x,-20,radius);
            grad.addColorStop(0,`rgba(${col.r},${col.g},${col.b},${0.4*progress})`);
            grad.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=grad;
            ctx.beginPath();
            ctx.arc(x,-20,radius,0,Math.PI*2);
            ctx.fill();
          }
          break;
        }

        case "vagalumes": {
          const totalFade=Math.max(0,1-(t-1.8)/0.6);
          for(let i=0;i<40;i++){
            const x=W/2+Math.sin(i*1.7+t*0.8)*W*0.4;
            const y=H/2+Math.cos(i*2.3+t*0.6)*H*0.35;
            const blink=Math.pow(Math.max(0,Math.sin(t*3+i*1.1)),3);
            const col=i%2===0?c1:c2;
            const glowR=4+blink*8;
            const glow=ctx.createRadialGradient(x,y,0,x,y,glowR);
            glow.addColorStop(0,`rgba(255,255,220,${blink*totalFade*0.9})`);
            glow.addColorStop(0.3,`rgba(${col.r},${col.g},${col.b},${blink*totalFade*0.5})`);
            glow.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=glow;
            ctx.fillRect(x-glowR,y-glowR,glowR*2,glowR*2);
            ctx.beginPath();
            ctx.arc(x,y,1.5,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,200,${blink*totalFade})`;
            ctx.fill();
          }
          break;
        }

        case "aurora_espacial": {
          for(let i=0;i<200;i++){
            const sx=(i*173.7)%W,sy=(i*97.3)%H;
            const br=0.2+Math.sin(i*0.7+t*2)*0.25;
            ctx.beginPath();
            ctx.arc(sx,sy,0.5,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,255,${br})`;
            ctx.fill();
          }
          const hY=H*0.65;
          for(let i=0;i<12;i++){
            const bandY=hY-i*H*0.04+Math.sin(t*0.5+i*0.7)*H*0.02;
            const colors=[c1,c2,c3,{r:80,g:255,b:180},{r:120,g:80,b:255},c2,c1,c3,c2,c1,c3,c2];
            const col=colors[i];
            const alpha=(0.15+Math.sin(t*0.7+i)*0.08)*(1-i/12);
            ctx.beginPath();
            for(let x=0;x<=W;x+=5){
              const y=bandY+Math.sin(x*0.01+t*0.6+i*0.5)*20;
              x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
            }
            ctx.strokeStyle=`rgba(${col.r},${col.g},${col.b},${alpha*3})`;
            ctx.lineWidth=H*0.03+Math.sin(t+i)*H*0.01;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.ellipse(W/2,hY+H*0.8,W*0.8,H*0.6,0,0,Math.PI*2);
          const earthGrad=ctx.createLinearGradient(0,hY,0,H);
          earthGrad.addColorStop(0,`rgba(${c3.r},${c3.g},${c3.b},0.6)`);
          earthGrad.addColorStop(1,`rgba(${Math.floor(c3.r*0.4)},${Math.floor(c3.g*0.4)},${Math.floor(c3.b*0.6)},0.9)`);
          ctx.fillStyle=earthGrad;
          ctx.fill();
          break;
        }

        case "galaxia": {
          // Fundo preto profundo
          ctx.fillStyle = "#000005";
          ctx.fillRect(0, 0, W, H);

          const cx = W / 2;
          const cy = H / 2;
          const rotation = t * 0.05; // rotação MUITO lenta (3x mais lenta)

          // Halo geral sutil cobrindo toda a tela
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
          halo.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.08)`);
          halo.addColorStop(0.4, `rgba(${c2.r},${c2.g},${c2.b},0.04)`);
          halo.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);

          // Estrelas de fundo (não rotacionam) — mais espalhadas e sutis
          for (let i = 0; i < 300; i++) {
            const sx = (i * 173.7) % W;
            const sy = (i * 97.3) % H;
            const br = 0.15 + Math.sin(i * 0.7 + t * 0.8) * 0.1;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${br})`;
            ctx.fill();
          }

          // Braços espirais — ESPIRAL AMPLIADA ocupando toda a tela
          const arms = 4;
          const particlesPerArm = 280; // mais partículas, mais espalhadas
          const maxRadius = Math.max(W, H) * 0.75; // ocupa tela inteira
          const a = 12;
          const b = 0.24;

          for (let arm = 0; arm < arms; arm++) {
            const armOffset = (arm / arms) * Math.PI * 2;
            const armColor = [c1, c2, c3, c4, c5][arm % 5];

            for (let i = 0; i < particlesPerArm; i++) {
              const theta = (i / particlesPerArm) * Math.PI * 5; // 2.5 voltas (mais voltas)
              const r = a * Math.exp(b * theta);
              if (r > maxRadius) break;

              const angle = theta + armOffset + rotation;
              // Dispersão maior (partículas mais espalhadas)
              const noise = Math.sin(i * 12.9898 + arm * 78.233) * 0.5;
              const noiseR = Math.cos(i * 43.723 + arm * 11.17) * 20;
              const px = cx + Math.cos(angle + noise * 0.22) * (r + noiseR);
              const py = cy + Math.sin(angle + noise * 0.22) * (r + noiseR) * 0.55;

              const normR = r / maxRadius;
              // Tamanhos menores em geral
              const size = 1.5 * (1 - normR * 0.6) + 0.3;
              // Opacidade reduzida — fundo que não compete com logo
              const alpha = (1 - normR * 0.6) * (0.22 + Math.sin(i + t * 1.2) * 0.12);

              // Glow sutil
              const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 2.5);
              glow.addColorStop(0, `rgba(${armColor.r},${armColor.g},${armColor.b},${alpha})`);
              glow.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(px, py, size * 2.5, 0, Math.PI * 2);
              ctx.fill();

              // Núcleo menor e mais sutil
              ctx.beginPath();
              ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,255,255,${alpha * 0.55})`;
              ctx.fill();
            }
          }

          // Bulbo central luminoso — reduzido e mais suave (sem competir com logo)
          const coreR = Math.min(W, H) * 0.08;
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          const corePulse = 0.4 + Math.sin(t * 0.8) * 0.1;
          core.addColorStop(0, `rgba(255,245,220,${0.35 * corePulse})`);
          core.addColorStop(0.3, `rgba(${c2.r},${c2.g},${c2.b},${0.22 * corePulse})`);
          core.addColorStop(0.7, `rgba(${c1.r},${c1.g},${c1.b},${0.1 * corePulse})`);
          core.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "vidro_janela": {
          // Formas grandes passando atrás de vidro fosco
          const suavidadeNorm = suavidade / 10;

          // Fundo escuro
          const bg = ctx.createLinearGradient(0, 0, W, H);
          bg.addColorStop(0, "#0a0d1a");
          bg.addColorStop(1, "#030510");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Formas geométricas grandes se movendo lentamente (com blur)
          ctx.save();
          ctx.filter = `blur(${Math.round(suavidadeNorm * 50)}px)`;
          const shapes = [
            { col: c1, x0: 0.2, y0: 0.3, size: 0.35, speed: 0.06, rot: 0 },
            { col: c2, x0: 0.7, y0: 0.6, size: 0.4, speed: 0.05, rot: 0.5 },
            { col: c3, x0: 0.5, y0: 0.15, size: 0.3, speed: 0.04, rot: 1.2 },
            { col: c1, x0: 0.85, y0: 0.8, size: 0.28, speed: 0.055, rot: 2.1 },
          ];
          for (const s of shapes) {
            const x = W * (s.x0 + Math.sin(t * s.speed + s.rot) * 0.15);
            const y = H * (s.y0 + Math.cos(t * s.speed * 0.8 + s.rot) * 0.1);
            const sz = H * s.size;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(t * s.speed + s.rot);
            const grad = ctx.createLinearGradient(-sz, -sz, sz, sz);
            grad.addColorStop(0, `rgba(${s.col.r},${s.col.g},${s.col.b},0.6)`);
            grad.addColorStop(1, `rgba(${s.col.r},${s.col.g},${s.col.b},0.3)`);
            ctx.fillStyle = grad;
            ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
            ctx.restore();
          }
          ctx.restore();

          // Camada fosca translúcida (vidro) cobrindo tudo
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(0, 0, W, H);

          // Bordas sutis brilhando (moldura)
          const border = 20;
          const borderGrad = ctx.createLinearGradient(0, 0, 0, H);
          borderGrad.addColorStop(0, "rgba(255,255,255,0.12)");
          borderGrad.addColorStop(0.5, "rgba(255,255,255,0.02)");
          borderGrad.addColorStop(1, "rgba(255,255,255,0.08)");
          ctx.strokeStyle = borderGrad;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(border, border, W - border * 2, H - border * 2);

          // Highlight interno superior (reflexo de vidro)
          const shine = ctx.createLinearGradient(0, border, 0, H * 0.3);
          shine.addColorStop(0, "rgba(255,255,255,0.08)");
          shine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = shine;
          ctx.fillRect(border, border, W - border * 2, H * 0.3 - border);
          break;
        }

        case "vidro_liquido": {
          // Superfície ondulante com reflexos
          const suavidadeNorm = suavidade / 10;

          // Fundo escuro gradient
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, "#050a18");
          bg.addColorStop(1, "#0a1228");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Ondas de cor (camadas horizontais com distorção)
          ctx.save();
          ctx.filter = `blur(${Math.round(suavidadeNorm * 30)}px)`;

          const waves = [
            { col: c1, yBase: 0.35, amp: 0.08, freq: 0.004, speed: 0.3, phase: 0,   alpha: 0.4 },
            { col: c2, yBase: 0.50, amp: 0.06, freq: 0.005, speed: 0.25, phase: 1.5, alpha: 0.35 },
            { col: c3, yBase: 0.65, amp: 0.07, freq: 0.0045, speed: 0.35, phase: 3.0, alpha: 0.38 },
          ];

          for (const w of waves) {
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 3) {
              const wave1 = Math.sin(x * w.freq + t * w.speed + w.phase) * H * w.amp;
              const wave2 = Math.sin(x * w.freq * 2.3 - t * w.speed * 0.6) * H * w.amp * 0.4;
              const y = H * w.yBase + wave1 + wave2;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            const col = w.col;
            const grad = ctx.createLinearGradient(0, H * w.yBase - H * w.amp, 0, H);
            grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0)`);
            grad.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${w.alpha * 0.6})`);
            grad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},${w.alpha})`);
            ctx.fillStyle = grad;
            ctx.fill();
          }
          ctx.restore();

          // Reflexos de luz que distorcem (linhas horizontais finas brilhantes)
          for (let i = 0; i < 5; i++) {
            const yBase = H * (0.3 + i * 0.12);
            ctx.beginPath();
            for (let x = 0; x <= W; x += 4) {
              const y = yBase + Math.sin(x * 0.008 + t * 0.8 + i) * 8 + Math.sin(x * 0.02 + t * 1.2 + i * 0.7) * 3;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(255,255,255,${0.1 + Math.sin(t + i) * 0.05})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

          // Borda superior com brilho especular (linha horizontal luminosa)
          const topShine = ctx.createLinearGradient(0, 0, 0, 40);
          topShine.addColorStop(0, "rgba(255,255,255,0.25)");
          topShine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = topShine;
          ctx.fillRect(0, 0, W, 40);
          break;
        }

        case "cidade_a": {
          // Silhuetas urbanas geométricas atrás de vidro jateado
          ctx.fillStyle = "#0a0e1f";
          ctx.fillRect(0, 0, W, H);

          // Halo cor1 atrás
          const glow = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.5);
          glow.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.25)`);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);

          // Prédios (12 retângulos)
          for (let i = 0; i < 12; i++) {
            const bx = (i / 12) * W - 20;
            const bw = W / 12 + Math.sin(i * 2.3) * 10;
            const bh = H * (0.3 + ((i * 37) % 50) / 100);
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.5)`;
            ctx.fillRect(bx, H - bh, bw, bh);
          }

          // Carros (pontinhos se movendo horizontal)
          for (let i = 0; i < 6; i++) {
            const cx = ((t * 30 + i * 200) % (W + 40)) - 20;
            const cy = H * (0.85 + (i % 2) * 0.05);
            ctx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},0.9)`;
            ctx.fillRect(cx, cy, 14, 6);
            ctx.fillStyle = `rgba(255,255,255,0.6)`;
            ctx.fillRect(cx + 12, cy + 1, 2, 4);
          }

          // Pessoas (traços finos verticais se movendo)
          for (let i = 0; i < 10; i++) {
            const px = ((t * 8 + i * 100) % W);
            const py = H * 0.9;
            ctx.fillStyle = `rgba(${c3.r},${c3.g},${c3.b},0.7)`;
            ctx.fillRect(px, py, 2, 8);
            ctx.beginPath();
            ctx.arc(px + 1, py - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Camada de vidro jateado cobrindo tudo
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "rgba(10,20,40,0.25)";
          ctx.fillRect(0, 0, W, H);

          // Borda glassmorphism
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.strokeRect(15, 15, W - 30, H - 30);
          break;
        }

        case "cidade_b": {
          // Skyline detalhada com janelas piscando
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, "#06091c");
          bg.addColorStop(1, "#101530");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Estrelas
          for (let i = 0; i < 60; i++) {
            const sx = (i * 173.7) % W;
            const sy = ((i * 97.3) % H) * 0.5;
            const br = 0.3 + Math.sin(i * 0.7 + t) * 0.2;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${br})`;
            ctx.fill();
          }

          // Prédios detalhados
          const buildings = [
            { x: 0.05, w: 0.12, h: 0.55 },
            { x: 0.18, w: 0.08, h: 0.45 },
            { x: 0.27, w: 0.14, h: 0.65 },
            { x: 0.42, w: 0.09, h: 0.40 },
            { x: 0.52, w: 0.13, h: 0.55 },
            { x: 0.66, w: 0.10, h: 0.70 },
            { x: 0.77, w: 0.08, h: 0.45 },
            { x: 0.86, w: 0.12, h: 0.50 },
          ];

          for (let bi = 0; bi < buildings.length; bi++) {
            const b = buildings[bi];
            const bx = W * b.x;
            const bw = W * b.w;
            const bh = H * b.h;
            const by = H - bh;

            // Corpo do prédio
            const bGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
            bGrad.addColorStop(0, "#1a2038");
            bGrad.addColorStop(1, "#0e1325");
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, by, bw, bh);

            // Borda sutil
            ctx.strokeStyle = "rgba(100,120,180,0.25)";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, bw, bh);

            // Janelas piscando
            const cols = Math.max(3, Math.floor(bw / 8));
            const rows = Math.max(5, Math.floor(bh / 10));
            for (let r = 0; r < rows; r++) {
              for (let col = 0; col < cols; col++) {
                const hash = (bi * 31 + r * 17 + col * 7) % 100;
                if (hash < 55) {
                  const blink = Math.sin(t * 0.5 + hash * 0.3) > 0.3 ? 1 : 0.3;
                  const wCol = hash % 3 === 0 ? c2 : hash % 3 === 1 ? c1 : c3;
                  ctx.fillStyle = `rgba(${wCol.r},${wCol.g},${wCol.b},${0.85 * blink})`;
                  const wx = bx + 3 + col * (bw - 6) / cols;
                  const wy = by + 5 + r * (bh - 10) / rows;
                  ctx.fillRect(wx, wy, Math.max(2, bw / cols - 3), 2.5);
                }
              }
            }
          }
          break;
        }

        case "restaurante": {
          // Vapor/fumaça dourada subindo
          const bg = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H);
          bg.addColorStop(0, "#1a0e05");
          bg.addColorStop(1, "#05030a");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Partículas subindo em espiral
          for (let i = 0; i < 120; i++) {
            const lifeT = (t * 0.3 + i / 120) % 1;
            const baseX = W * (0.3 + (i % 5) * 0.1);
            const spiralR = 30 * lifeT;
            const angle = t + i * 0.5;
            const x = baseX + Math.cos(angle) * spiralR + Math.sin(lifeT * Math.PI * 2 + i) * 20;
            const y = H - lifeT * H * 0.95;
            const size = 1.5 + lifeT * 4;
            const alpha = (1 - lifeT) * 0.6;
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : { r: 255, g: 200, b: 100 };
            const glowG = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            glowG.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${alpha})`);
            glowG.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glowG;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Brilhos quentes (sparkles)
          for (let i = 0; i < 25; i++) {
            const sparkT = (t * 0.5 + i / 25) % 1;
            const sx = (i * 137) % W;
            const sy = H - sparkT * H;
            const flash = Math.max(0, 1 - sparkT * 2);
            if (flash > 0) {
              ctx.fillStyle = `rgba(255,220,120,${flash * 0.9})`;
              ctx.beginPath();
              ctx.arc(sx, sy, 1.5 + flash * 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "saude": {
          // Pulso cardíaco + DNA
          const bg = ctx.createLinearGradient(0, 0, W, 0);
          bg.addColorStop(0, "#051a15");
          bg.addColorStop(1, "#05101a");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // DNA dupla hélice ao fundo (tenuem)
          ctx.save();
          ctx.globalAlpha = 0.25;
          const dnaRot = t * 0.3;
          for (let i = 0; i < 30; i++) {
            const yd = (i / 30) * H;
            const phase1 = yd * 0.03 + dnaRot;
            const phase2 = phase1 + Math.PI;
            const x1 = W * 0.5 + Math.cos(phase1) * W * 0.15;
            const x2 = W * 0.5 + Math.cos(phase2) * W * 0.15;
            const col = i % 2 === 0 ? c1 : c3;
            // Pontos
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.7)`;
            ctx.beginPath(); ctx.arc(x1, yd, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x2, yd, 3, 0, Math.PI * 2); ctx.fill();
            // Ligação
            if (Math.abs(Math.cos(phase1)) < 0.3) {
              ctx.strokeStyle = `rgba(${c2.r},${c2.g},${c2.b},0.4)`;
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(x1, yd); ctx.lineTo(x2, yd); ctx.stroke();
            }
          }
          ctx.restore();

          // Linha de pulso cardíaco
          ctx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},0.9)`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(${c1.r},${c1.g},${c1.b},0.8)`;
          ctx.beginPath();
          const scrollX = (t * 80) % W;
          for (let x = 0; x <= W; x += 2) {
            const xRel = ((x + scrollX) % W) / W;
            // Pulse wave: picos ocasionais
            let y = H * 0.5;
            const cycle = (xRel * 6) % 1;
            if (cycle < 0.1) y = H * 0.5 - H * 0.2 * Math.sin(cycle * Math.PI * 10);
            else if (cycle < 0.15) y = H * 0.5 + H * 0.08 * Math.sin(cycle * Math.PI * 20);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Partículas azuis/verdes
          for (let i = 0; i < 40; i++) {
            const px = ((i * 137 + t * 20) % W);
            const py = H * 0.5 + Math.sin(i + t) * H * 0.2;
            const col = i % 2 === 0 ? c2 : c3;
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.6)`;
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case "moda": {
          // Faixas de seda com shimmer
          ctx.fillStyle = "#0a0815";
          ctx.fillRect(0, 0, W, H);

          // Faixas diagonais fluindo
          const strips = [
            { col: c1, y0: 0.1, angle: -0.15, speed: 0.3, width: 0.18 },
            { col: c2, y0: 0.35, angle: -0.1, speed: 0.25, width: 0.15 },
            { col: c3, y0: 0.6, angle: -0.12, speed: 0.35, width: 0.2 },
            { col: c1, y0: 0.85, angle: -0.08, speed: 0.28, width: 0.14 },
          ];

          for (const s of strips) {
            ctx.save();
            const centerY = H * s.y0;
            ctx.translate(W * 0.5, centerY);
            ctx.rotate(s.angle);
            const stripW = W * 2;
            const stripH = H * s.width;
            const offset = (t * s.speed * 200) % (W * 0.5);
            for (let x = -stripW; x < stripW; x += 4) {
              const wave = Math.sin((x + offset) * 0.012 + t * s.speed) * stripH * 0.15;
              // Gradient de seda (com shimmer)
              const grad = ctx.createLinearGradient(x, -stripH, x, stripH);
              const shimmer = 0.5 + Math.sin(x * 0.03 + t * 2) * 0.5;
              grad.addColorStop(0, `rgba(${s.col.r},${s.col.g},${s.col.b},0)`);
              grad.addColorStop(0.4, `rgba(${s.col.r},${s.col.g},${s.col.b},${0.25 + shimmer * 0.2})`);
              grad.addColorStop(0.5, `rgba(255,255,255,${0.1 + shimmer * 0.15})`);
              grad.addColorStop(0.6, `rgba(${s.col.r},${s.col.g},${s.col.b},${0.25 + shimmer * 0.2})`);
              grad.addColorStop(1, `rgba(${s.col.r},${s.col.g},${s.col.b},0)`);
              ctx.fillStyle = grad;
              ctx.fillRect(x, wave - stripH, 4, stripH * 2);
            }
            ctx.restore();
          }
          break;
        }

        case "imobiliaria": {
          // Skyline ao entardecer
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, `rgba(${c3.r},${c3.g},${c3.b},0.8)`);
          bg.addColorStop(0.5, `rgba(${c1.r},${c1.g},${c1.b},0.5)`);
          bg.addColorStop(1, "#0a0615");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Sol/Gradiente laranja
          const sun = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.4);
          sun.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.6)`);
          sun.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sun;
          ctx.fillRect(0, 0, W, H);

          // Estrelas (aparecendo com o tempo)
          const starOpacity = Math.min(1, t * 0.2);
          for (let i = 0; i < 40; i++) {
            const sx = (i * 173.7) % W;
            const sy = ((i * 97.3) % H) * 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${starOpacity * (0.3 + Math.sin(i + t) * 0.2)})`;
            ctx.fill();
          }

          // Prédios (silhuetas escuras)
          const buildings = [
            { x: 0.0, w: 0.15, h: 0.45 },
            { x: 0.14, w: 0.10, h: 0.35 },
            { x: 0.23, w: 0.13, h: 0.55 },
            { x: 0.35, w: 0.09, h: 0.40 },
            { x: 0.44, w: 0.14, h: 0.60 },
            { x: 0.58, w: 0.10, h: 0.50 },
            { x: 0.68, w: 0.12, h: 0.45 },
            { x: 0.79, w: 0.09, h: 0.55 },
            { x: 0.88, w: 0.12, h: 0.42 },
          ];

          for (let bi = 0; bi < buildings.length; bi++) {
            const b = buildings[bi];
            const bx = W * b.x;
            const bw = W * b.w;
            const bh = H * b.h;
            const by = H - bh;

            ctx.fillStyle = "#0a0a1a";
            ctx.fillRect(bx, by, bw, bh);

            // Janelas acendendo aleatoriamente
            const cols = Math.max(2, Math.floor(bw / 10));
            const rows = Math.max(4, Math.floor(bh / 12));
            for (let r = 0; r < rows; r++) {
              for (let col = 0; col < cols; col++) {
                const hash = (bi * 31 + r * 17 + col * 7) % 100;
                const lightUp = Math.sin(t * 0.3 + hash * 0.1);
                if (lightUp > 0.2) {
                  const wx = bx + 3 + col * (bw - 6) / cols;
                  const wy = by + 4 + r * (bh - 8) / rows;
                  ctx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},${(lightUp - 0.2) * 1.2})`;
                  ctx.fillRect(wx, wy, Math.max(2, bw / cols - 3), 3);
                }
              }
            }
          }
          break;
        }

        case "educacao": {
          // Constelações/rede neural
          ctx.fillStyle = "#05081a";
          ctx.fillRect(0, 0, W, H);

          // Nodos (pontos luminosos)
          const nodes: { x: number; y: number; col: { r: number; g: number; b: number } }[] = [];
          const N = 40;
          for (let i = 0; i < N; i++) {
            // Posição pseudo-aleatória estável + leve movimento
            const bx = ((i * 173.7) % 100) / 100;
            const by = ((i * 97.3) % 100) / 100;
            const nx = W * (bx + Math.sin(t * 0.2 + i) * 0.02);
            const ny = H * (by + Math.cos(t * 0.15 + i) * 0.02);
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
            nodes.push({ x: nx, y: ny, col });
          }

          // Conexões (linhas finas entre nodos próximos)
          const maxDist = Math.min(W, H) * 0.25;
          for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
              const dx = nodes[i].x - nodes[j].x;
              const dy = nodes[i].y - nodes[j].y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < maxDist) {
                const alpha = (1 - d / maxDist) * 0.3;
                const col = nodes[i].col;
                ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.stroke();
              }
            }
          }

          // Nodos brilhantes
          for (let i = 0; i < N; i++) {
            const n = nodes[i];
            const pulse = 0.6 + Math.sin(t * 1.5 + i * 0.7) * 0.4;
            const size = 2 + pulse * 1.5;
            const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, size * 3);
            halo.addColorStop(0, `rgba(${n.col.r},${n.col.g},${n.col.b},${pulse})`);
            halo.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,255,255,${pulse})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case "beleza": {
          // Pétalas caindo com brilho perolado
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, `rgba(${c3.r},${c3.g},${c3.b},0.3)`);
          bg.addColorStop(1, "#10050f");
          ctx.fillStyle = "#10050f";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Sparkles
          for (let i = 0; i < 60; i++) {
            const sparkT = (t * 0.4 + i / 60) % 1;
            const sx = (i * 137) % W;
            const sy = sparkT * H;
            const flash = Math.max(0, Math.sin(sparkT * Math.PI));
            ctx.fillStyle = `rgba(255,230,245,${flash * 0.7})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.8 + flash * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Pétalas (elipses inclinadas)
          for (let i = 0; i < 25; i++) {
            const fallT = (t * 0.15 + i / 25) % 1;
            const sway = Math.sin(t + i * 0.5) * W * 0.1;
            const px = ((i * 137.5) % W) + sway;
            const py = fallT * (H + 40) - 20;
            const rot = t * 0.5 + i;
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : { r: 255, g: 220, b: 230 };

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot);

            // Pétala: gradiente perolado
            const petalGrad = ctx.createLinearGradient(-8, 0, 8, 0);
            petalGrad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.7)`);
            petalGrad.addColorStop(0.5, `rgba(255,240,250,0.5)`);
            petalGrad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0.7)`);
            ctx.fillStyle = petalGrad;

            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = `rgba(255,255,255,0.3)`;
            ctx.beginPath();
            ctx.ellipse(-2, -1, 3, 1, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
          break;
        }

        case "aurovista_adm": {
          // Port fiel de aurovista_splash_v2.html — modulado por props
          const cx = W / 2, cy = H / 2;
          const dtScale = dt * 60;
          const fr = simTime * 60;
          const opacityMult = Math.max(0.1, Math.min(1, opacidade / 10));

          // Radial nebula: cor1 (center) → cor2 (0.4) → transparent
          const naCap = 0.18 * (nebulosa / 10) * 2; // default 6 → cap 0.216; 10 → 0.36
          const na = Math.min(naCap, fr * 0.0012);
          const hexToRgbStr = (hex: string, a: number) => {
            const rgb = hex2rgb(hex);
            return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
          };
          const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.55);
          g1.addColorStop(0, hexToRgbStr(cor1, na));
          g1.addColorStop(0.4, hexToRgbStr(cor2, na * 0.5));
          g1.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g1;
          ctx.fillRect(0, 0, W, H);

          // Partículas orbitando
          aurovistaPts.forEach((p) => {
            p.a += p.spd * dtScale;
            const px = cx + Math.cos(p.a) * p.rad;
            const py = cy + Math.sin(p.a) * p.rad;
            p.pl += 0.04 * dtScale;
            const al = p.al * (0.5 + 0.5 * Math.sin(p.pl)) * opacityMult;
            ctx.beginPath();
            ctx.arc(px, py, p.sz, 0, Math.PI * 2);
            ctx.fillStyle = p.col + Math.floor(Math.min(1, al) * 255).toString(16).padStart(2, "0");
            ctx.fill();
          });

          // Texto renderizado via DOM (centralizado na tela, fora do canvas)
          break;
        }

        default: {
          const g=ctx.createLinearGradient(0,0,W,H);
          g.addColorStop(0,`rgba(${c3.r},${c3.g},${c3.b},0.3)`);
          g.addColorStop(1,`rgba(${c1.r},${c1.g},${c1.b},0.15)`);
          ctx.fillStyle=g;
          ctx.fillRect(0,0,W,H);
          break;
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(logoInTimer);
      clearTimeout(logoOutTimer);
      clearTimeout(greetInTimer);
      clearTimeout(greetOutTimer);
      clearTimeout(doneTimer);
    };
  }, [activeEffect, cor1, cor2, cor3, cor4, cor5, corFundo, velocidade, suavidade, quantidade, tamanho, raioOrbital, nebulosa, opacidade, dispersao, velocidadeTexto, textoEfeito, glowTexto, glowIntensidade, userName, embedded, preview]);

  const logoDims = {
    horizontal: { width: 220, height: 80 },
    vertical:   { width: 120, height: 160 },
    quadrado:   { width: 140, height: 140 },
  }[logoOrientation];

  if (!visible) return null;

  return (
    <div
      className={
        preview
          ? "absolute inset-0 z-[1] overflow-hidden flex items-center justify-center"
          : embedded
            ? "relative overflow-hidden flex items-center justify-center"
            : "fixed inset-0 z-[9999] flex items-center justify-center"
      }
      style={{
        background: corFundo,
        width: preview ? "100%" : embedded ? embedded.width : "100vw",
        height: preview ? "100%" : embedded ? embedded.height : "100dvh",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" style={embedded ? { width: embedded.width, height: embedded.height } : preview ? { width: "100%", height: "100%" } : undefined} />
      <div className="relative z-10 flex items-center justify-center"
        style={{ position: "relative", width: logoDims.width, height: logoDims.height + 40 }}>
        <img src={logoUrl} alt="Logo"
          style={{
            position: "absolute",
            width: logoDims.width, height: logoDims.height, objectFit: "contain",
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "scale(1)" : "scale(0.85)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }} />
        {userName && activeEffect !== "aurovista_adm" && (
          <p style={{
            position: "absolute",
            opacity: greetVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: preview ? 14 : 18,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "nowrap",
          }}>
            {getGreeting()}, {userName}!
          </p>
        )}
      </div>
      {userName && activeEffect === "aurovista_adm" && (
        <p style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: (preview || embedded || greetVisible) ? 1 : 0,
          transition: "opacity 0.4s ease",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: preview ? 12 : 18,
          fontWeight: 500,
          color: "rgba(255,255,255,0.9)",
          whiteSpace: "nowrap",
          textShadow: glowTexto
            ? `0 0 ${4 + (glowIntensidade / 10) * 24}px ${cor2}`
            : "none",
          zIndex: 11,
          margin: 0,
          pointerEvents: "none",
        }}>
          {getGreeting()}, {userName}!
        </p>
      )}
    </div>
  );
}

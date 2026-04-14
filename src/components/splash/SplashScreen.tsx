"use client";
import { useEffect, useRef, useState } from "react";

export type SplashEffect =
  | "particles" | "cinematic" | "slideup" | "scalefade" | "fadesuave"
  | "ondas" | "flutuacao" | "scanner" | "holofote" | "chuvapontos"
  | "gradiente" | "dissolve" | "bigbang" | "aurora" | "tinta" | "vagalumes"
  | "aurora_espacial" | "galaxia" | "vidro";

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
  /** Velocidade da animação 1-10 (default 5 = normal). Escala o tempo base. */
  velocidade?: number;
  /** Suavidade 1-10 (default 7). Controla blur/alpha em efeitos aurora/vidro. */
  suavidade?: number;
}

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "aurora_espacial","galaxia","vidro",
];

export default function SplashScreen({
  logoUrl, logoOrientation = "horizontal",
  effect = "random", cor1 = "#FF7A1A", cor2 = "#D4A843", cor3 = "#1E3A6E",
  cor4, cor5, corFundo = "#0E1520", userName, onDone,
  embedded, velocidade = 5, suavidade = 7,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);
  const [greetVisible, setGreetVisible] = useState(false);

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
    canvas.width = embedded ? embedded.width : window.innerWidth;
    canvas.height = embedded ? embedded.height : window.innerHeight;
    let animId: number;
    let startTime = performance.now();

    // Helper
    const hex2rgb = (hex: string) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return { r, g, b };
    };
    const c1 = hex2rgb(cor1), c2 = hex2rgb(cor2), c3 = hex2rgb(cor3);
    const c4 = cor4 ? hex2rgb(cor4) : c1;
    const c5 = cor5 ? hex2rgb(cor5) : c2;

    const W = canvas.width, H = canvas.height;

    // Em modo embedded: sem timers (preview infinito, sem dismiss)
    const logoInTimer = embedded ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setLogoVisible(true), 400);
    const logoOutTimer = embedded ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setLogoVisible(false), 3400);
    const greetInTimer = embedded ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setGreetVisible(true), 3900);
    const greetOutTimer = embedded ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => setGreetVisible(false), 5900);
    const doneTimer = embedded ? 0 as unknown as ReturnType<typeof setTimeout> : setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 6300);

    function draw(now: number) {
      // velocidade: 1=0.3x (muito lento), 5=1x (normal), 10=2x (rápido)
      const speedFactor = 0.3 + (velocidade / 10) * 1.7;
      const t = ((now - startTime) / 1000) * speedFactor;
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

        case "vidro": {
          // Glassmorphism / Apple Vision Pro style
          const suavidadeNorm = suavidade / 10; // 0.1 a 1.0

          // Fundo escuro gradient radial (ambiente)
          const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
          bg.addColorStop(0, "#1a2038");
          bg.addColorStop(1, "#050810");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Blobs coloridos difusos no fundo (simulando conteúdo atrás do vidro)
          ctx.save();
          ctx.filter = `blur(${Math.round(suavidadeNorm * 90)}px)`;
          const blobs = [
            { col: c1, x: 0.25, y: 0.3, r: 0.45, alpha: 0.6 },
            { col: c2, x: 0.75, y: 0.35, r: 0.4, alpha: 0.55 },
            { col: c3, x: 0.5,  y: 0.75, r: 0.5, alpha: 0.5 },
            { col: c4, x: 0.15, y: 0.7, r: 0.35, alpha: 0.4 },
            { col: c5, x: 0.85, y: 0.65, r: 0.38, alpha: 0.4 },
          ];
          for (let i = 0; i < blobs.length; i++) {
            const b = blobs[i];
            const bx = W * (b.x + Math.sin(t * 0.15 + i) * 0.05);
            const by = H * (b.y + Math.cos(t * 0.12 + i * 0.7) * 0.05);
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, H * b.r);
            g.addColorStop(0, `rgba(${b.col.r},${b.col.g},${b.col.b},${b.alpha})`);
            g.addColorStop(1, `rgba(${b.col.r},${b.col.g},${b.col.b},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
          }
          ctx.restore();

          // Camadas de vidro translúcido (formas geométricas)
          const shapes = [
            { type: "circle", x: 0.3, y: 0.4, r: 0.18, alpha: 0.08, border: 0.25 },
            { type: "rrect",  x: 0.55, y: 0.25, w: 0.35, h: 0.18, r: 0.04, alpha: 0.1, border: 0.22 },
            { type: "circle", x: 0.75, y: 0.65, r: 0.22, alpha: 0.06, border: 0.2 },
            { type: "rrect",  x: 0.15, y: 0.68, w: 0.28, h: 0.15, r: 0.03, alpha: 0.09, border: 0.25 },
            { type: "circle", x: 0.5, y: 0.9, r: 0.12, alpha: 0.07, border: 0.2 },
          ];

          for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            // Flutuação suave
            const floatY = Math.sin(t * 0.3 + i * 1.3) * H * 0.01;
            const floatX = Math.cos(t * 0.25 + i * 0.8) * W * 0.005;

            ctx.save();

            if (s.type === "circle") {
              const cx = W * s.x + floatX;
              const cy = H * s.y + floatY;
              const rr = H * s.r;

              // Fundo do vidro (fill translúcido com gradient interno — reflexo)
              const innerGrad = ctx.createRadialGradient(
                cx - rr * 0.3, cy - rr * 0.3, 0,
                cx, cy, rr
              );
              innerGrad.addColorStop(0, `rgba(255,255,255,${s.alpha + 0.08})`);
              innerGrad.addColorStop(0.5, `rgba(255,255,255,${s.alpha * 0.6})`);
              innerGrad.addColorStop(1, `rgba(255,255,255,${s.alpha * 0.3})`);
              ctx.fillStyle = innerGrad;
              ctx.beginPath();
              ctx.arc(cx, cy, rr, 0, Math.PI * 2);
              ctx.fill();

              // Borda brilhante (sutil)
              ctx.lineWidth = 1.5;
              const borderGrad = ctx.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
              borderGrad.addColorStop(0, `rgba(255,255,255,${s.border})`);
              borderGrad.addColorStop(0.5, `rgba(255,255,255,${s.border * 0.2})`);
              borderGrad.addColorStop(1, `rgba(255,255,255,${s.border * 0.5})`);
              ctx.strokeStyle = borderGrad;
              ctx.stroke();

              // Highlight (reflexo diagonal superior)
              ctx.beginPath();
              ctx.arc(cx, cy, rr * 0.85, Math.PI * 1.15, Math.PI * 1.55);
              ctx.lineWidth = 2;
              ctx.strokeStyle = `rgba(255,255,255,${0.15})`;
              ctx.stroke();
            } else {
              // Rounded rect
              const x = W * s.x + floatX;
              const y = H * s.y + floatY;
              const w = W * (s.w ?? 0.2);
              const h = H * (s.h ?? 0.12);
              const r = H * (s.r ?? 0.03);

              const innerGrad = ctx.createLinearGradient(x, y, x + w, y + h);
              innerGrad.addColorStop(0, `rgba(255,255,255,${s.alpha + 0.1})`);
              innerGrad.addColorStop(0.5, `rgba(255,255,255,${s.alpha * 0.7})`);
              innerGrad.addColorStop(1, `rgba(255,255,255,${s.alpha * 0.4})`);

              // Path do rounded rect
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.fillStyle = innerGrad;
              ctx.fill();

              // Borda
              ctx.lineWidth = 1.5;
              const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
              borderGrad.addColorStop(0, `rgba(255,255,255,${s.border})`);
              borderGrad.addColorStop(0.5, `rgba(255,255,255,${s.border * 0.3})`);
              borderGrad.addColorStop(1, `rgba(255,255,255,${s.border * 0.6})`);
              ctx.strokeStyle = borderGrad;
              ctx.stroke();

              // Highlight superior (linha fina branca)
              ctx.beginPath();
              ctx.moveTo(x + r * 2, y + 0.5);
              ctx.lineTo(x + w - r * 2, y + 0.5);
              ctx.lineWidth = 1;
              ctx.strokeStyle = `rgba(255,255,255,0.3)`;
              ctx.stroke();
            }

            ctx.restore();
          }

          // Overlay superior sutil (shine)
          const topShine = ctx.createLinearGradient(0, 0, 0, H * 0.3);
          topShine.addColorStop(0, "rgba(255,255,255,0.03)");
          topShine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = topShine;
          ctx.fillRect(0, 0, W, H * 0.3);
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
  }, [activeEffect, cor1, cor2, cor3, cor4, cor5, corFundo, velocidade, suavidade]);

  const logoDims = {
    horizontal: { width: 220, height: 80 },
    vertical:   { width: 120, height: 160 },
    quadrado:   { width: 140, height: 140 },
  }[logoOrientation];

  if (!visible) return null;

  return (
    <div className={embedded ? "relative overflow-hidden flex items-center justify-center" : "fixed inset-0 z-[9999] flex items-center justify-center"}
      style={{ background: corFundo, width: embedded?.width, height: embedded?.height }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={embedded ? { width: embedded.width, height: embedded.height } : undefined} />
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
        {userName && (
          <p style={{
            position: "absolute",
            opacity: greetVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: 18,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "nowrap",
          }}>
            {getGreeting()}, {userName}!
          </p>
        )}
      </div>
    </div>
  );
}

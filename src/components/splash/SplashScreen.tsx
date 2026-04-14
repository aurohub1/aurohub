"use client";
import { useEffect, useRef, useState } from "react";

export type SplashEffect =
  | "particles" | "cinematic" | "slideup" | "scalefade" | "fadesuave"
  | "ondas" | "flutuacao" | "scanner" | "holofote" | "chuvapontos"
  | "gradiente" | "dissolve" | "bigbang" | "aurora" | "tinta" | "vagalumes"
  | "aurora_espacial" | "galaxia"
  | "vidro_janela" | "vidro_liquido"
  | "cidade_b" | "restaurante" | "restaurante2" | "saude"
  | "moda" | "imobiliaria" | "educacao" | "educacao2" | "beleza";

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
  /** URL do áudio para tocar durante o splash. */
  somUrl?: string;
}

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "aurora_espacial","galaxia",
  "vidro_janela","vidro_liquido",
  "cidade_b","restaurante","restaurante2","saude",
  "moda","imobiliaria","educacao","educacao2","beleza",
];

export default function SplashScreen({
  logoUrl, logoOrientation = "horizontal",
  effect = "random", cor1 = "#FF7A1A", cor2 = "#D4A843", cor3 = "#1E3A6E",
  cor4, cor5, corFundo = "#0E1520", userName, onDone,
  embedded, velocidade = 5, suavidade = 7, somUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);
  const [greetVisible, setGreetVisible] = useState(false);

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

        case "cidade_b": {
          // Skyline maior com prédios 3x e carros como luzes
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, "#04051a");
          bg.addColorStop(1, "#0c1238");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Estrelas no topo
          for (let i = 0; i < 80; i++) {
            const sx = (i * 173.7) % W;
            const sy = ((i * 97.3) % H) * 0.3;
            const br = 0.3 + Math.sin(i * 0.7 + t) * 0.2;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${br})`;
            ctx.fill();
          }

          // Prédios bem maiores (3x)
          const buildings = [
            { x: 0.02, w: 0.18, h: 0.75 },
            { x: 0.21, w: 0.12, h: 0.60 },
            { x: 0.34, w: 0.20, h: 0.85 },
            { x: 0.55, w: 0.14, h: 0.55 },
            { x: 0.70, w: 0.16, h: 0.72 },
            { x: 0.87, w: 0.12, h: 0.65 },
          ];

          for (let bi = 0; bi < buildings.length; bi++) {
            const b = buildings[bi];
            const bx = W * b.x;
            const bw = W * b.w;
            const bh = H * b.h;
            const by = H - bh;

            const bGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
            bGrad.addColorStop(0, "#1c2344");
            bGrad.addColorStop(1, "#0e1528");
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "rgba(120,150,200,0.25)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);

            // Janelas maiores e mais visíveis
            const cols = Math.max(4, Math.floor(bw / 18));
            const rows = Math.max(8, Math.floor(bh / 22));
            const winW = (bw - 12) / cols - 3;
            const winH = 8;
            for (let r = 0; r < rows; r++) {
              for (let col = 0; col < cols; col++) {
                const hash = (bi * 31 + r * 17 + col * 7) % 100;
                if (hash < 65) {
                  const blink = Math.sin(t * 0.4 + hash * 0.25) > 0.2 ? 1 : 0.4;
                  const wCol = hash % 3 === 0 ? c2 : hash % 3 === 1 ? c1 : { r: 255, g: 220, b: 150 };
                  ctx.fillStyle = `rgba(${wCol.r},${wCol.g},${wCol.b},${0.9 * blink})`;
                  const wx = bx + 6 + col * ((bw - 12) / cols);
                  const wy = by + 8 + r * ((bh - 16) / rows);
                  ctx.fillRect(wx, wy, winW, winH);
                }
              }
            }
          }

          // Carros como pontos de luz se movendo nas ruas (base)
          for (let i = 0; i < 12; i++) {
            const lane = i % 2;
            const carT = (t * 0.12 + i / 12) % 1;
            const cx = carT * (W + 60) - 30;
            const cy = H * (0.93 + lane * 0.03);
            const col = lane === 0 ? { r: 255, g: 220, b: 150 } : { r: 255, g: 100, b: 80 };
            // Halo do farol
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
            halo.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.9)`);
            halo.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();
            // Trilha
            const trail = ctx.createLinearGradient(cx - 40, cy, cx, cy);
            trail.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0)`);
            trail.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0.5)`);
            ctx.fillStyle = trail;
            ctx.fillRect(cx - 40, cy - 1, 40, 2);
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

        case "restaurante2": {
          // Brasas de churrasqueira
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, "#1a0505");
          bg.addColorStop(0.5, "#2a0808");
          bg.addColorStop(1, "#0a0202");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Brilho quente base (brasa no chão)
          const emberBase = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H * 0.7);
          emberBase.addColorStop(0, "rgba(255,80,30,0.35)");
          emberBase.addColorStop(0.4, "rgba(200,40,20,0.12)");
          emberBase.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = emberBase;
          ctx.fillRect(0, 0, W, H);

          // Brasas: partículas pequenas subindo
          for (let i = 0; i < 200; i++) {
            const lifeT = ((t * 0.35 + i / 200) % 1);
            const baseX = ((i * 173.7) % W);
            const sway = Math.sin(t * 1.5 + i * 0.3) * 18;
            const x = baseX + sway;
            const y = H - lifeT * H * 0.95;
            const size = 1.2 + (1 - lifeT) * 1.3;
            // Brasas perdem intensidade subindo (algumas "apagam")
            const extinguish = Math.sin(i * 7.3) > 0.4 ? 1 : Math.max(0, 1 - lifeT * 1.8);
            const alpha = (1 - lifeT * 0.7) * extinguish * 0.9;
            const hue = lifeT < 0.3 ? 1 : lifeT < 0.7 ? 0.7 : 0.4;
            const r = 255;
            const g = Math.floor(80 + hue * 80);
            const b = Math.floor(20 * hue);

            // Glow
            const gg = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            gg.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
            gg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = gg;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo brilhante
            ctx.fillStyle = `rgba(255,${200 + hue * 55},${100 * hue},${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }

          // Flickers intensos ocasionais
          for (let i = 0; i < 15; i++) {
            const ft = (t * 0.8 + i / 15) % 1;
            if (ft < 0.15) {
              const fx = (i * 137) % W;
              const fy = H - ft * H * 0.5;
              const flash = Math.max(0, 1 - ft / 0.15);
              ctx.fillStyle = `rgba(255,230,150,${flash * 0.8})`;
              ctx.beginPath();
              ctx.arc(fx, fy, 2 + flash * 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "saude": {
          // DNA helicoidal centralizado + células flutuantes
          const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
          bg.addColorStop(0, "#05142a");
          bg.addColorStop(1, "#020610");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Partículas azul-verde flutuando (células)
          for (let i = 0; i < 60; i++) {
            const drift = (t * 0.2 + i / 60);
            const cx = W * (0.1 + ((i * 0.17) % 0.8)) + Math.sin(drift + i) * 30;
            const cy = H * (0.1 + ((i * 0.23) % 0.8)) + Math.cos(drift + i * 0.7) * 25;
            const size = 2 + Math.sin(i + t) * 1.5;
            const col = i % 2 === 0 ? { r: 80, g: 200, b: 220 } : { r: 100, g: 220, b: 160 };
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 3);
            halo.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.5)`);
            halo.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.8)`;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // DNA dupla hélice centralizada
          const dnaRot = t * 0.25;
          for (let i = 0; i < 60; i++) {
            const yd = (i / 60) * H;
            const phase1 = yd * 0.025 + dnaRot;
            const phase2 = phase1 + Math.PI;
            const x1 = W * 0.5 + Math.cos(phase1) * W * 0.12;
            const x2 = W * 0.5 + Math.cos(phase2) * W * 0.12;

            const z1 = Math.sin(phase1);
            const z2 = Math.sin(phase2);
            const size1 = 4 + z1 * 2;
            const size2 = 4 + z2 * 2;
            const alpha1 = 0.5 + z1 * 0.5;
            const alpha2 = 0.5 + z2 * 0.5;

            // Bolas da fita 1
            const col1 = { r: 100, g: 220, b: 200 };
            ctx.fillStyle = `rgba(${col1.r},${col1.g},${col1.b},${alpha1 * 0.8})`;
            ctx.beginPath();
            ctx.arc(x1, yd, size1, 0, Math.PI * 2);
            ctx.fill();

            // Bolas da fita 2
            const col2 = { r: 80, g: 180, b: 230 };
            ctx.fillStyle = `rgba(${col2.r},${col2.g},${col2.b},${alpha2 * 0.8})`;
            ctx.beginPath();
            ctx.arc(x2, yd, size2, 0, Math.PI * 2);
            ctx.fill();

            // Pontes entre fitas (aparecem quando ambas estão "à frente")
            if (Math.abs(Math.cos(phase1)) < 0.4) {
              const bridgeAlpha = (0.4 - Math.abs(Math.cos(phase1))) * 2;
              ctx.strokeStyle = `rgba(100,220,200,${bridgeAlpha * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(x1, yd);
              ctx.lineTo(x2, yd);
              ctx.stroke();
            }
          }
          break;
        }

        case "moda": {
          // Faixas de luz metálica dourada/prateada diagonais
          ctx.fillStyle = "#0a0610";
          ctx.fillRect(0, 0, W, H);

          // Halo ambient
          const ambient = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.6);
          ambient.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.08)`);
          ambient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = ambient;
          ctx.fillRect(0, 0, W, H);

          // Faixas diagonais metálicas
          const strips = [
            { angle: -0.3, y: 0.15, speed: 0.25, width: 80, col: { r: 255, g: 215, b: 120 }, phase: 0 },
            { angle: -0.25, y: 0.38, speed: 0.2, width: 60, col: { r: 220, g: 220, b: 235 }, phase: 1.2 },
            { angle: -0.35, y: 0.55, speed: 0.3, width: 90, col: { r: 255, g: 230, b: 180 }, phase: 2.5 },
            { angle: -0.22, y: 0.75, speed: 0.22, width: 55, col: { r: 200, g: 200, b: 220 }, phase: 3.8 },
            { angle: -0.28, y: 0.92, speed: 0.26, width: 70, col: { r: 255, g: 200, b: 100 }, phase: 5 },
          ];

          for (const s of strips) {
            ctx.save();
            const cy = H * s.y;
            ctx.translate(W * 0.5, cy);
            ctx.rotate(s.angle);

            const offset = (t * s.speed * 300 + s.phase * 200) % (W * 2) - W;

            // Faixa com gradient especular
            const grad = ctx.createLinearGradient(offset - s.width, 0, offset + s.width, 0);
            grad.addColorStop(0, `rgba(${s.col.r},${s.col.g},${s.col.b},0)`);
            grad.addColorStop(0.2, `rgba(${s.col.r},${s.col.g},${s.col.b},0.3)`);
            grad.addColorStop(0.45, `rgba(${s.col.r},${s.col.g},${s.col.b},0.7)`);
            grad.addColorStop(0.5, `rgba(255,255,255,0.9)`);
            grad.addColorStop(0.55, `rgba(${s.col.r},${s.col.g},${s.col.b},0.7)`);
            grad.addColorStop(0.8, `rgba(${s.col.r},${s.col.g},${s.col.b},0.3)`);
            grad.addColorStop(1, `rgba(${s.col.r},${s.col.g},${s.col.b},0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(offset - s.width * 2, -3, s.width * 4, 6);

            // Partículas brilhantes seguindo a faixa
            for (let p = 0; p < 8; p++) {
              const px = offset - s.width + (p / 8) * s.width * 2;
              const flash = Math.max(0, Math.sin(t * 3 + p + s.phase));
              if (flash > 0.3) {
                ctx.fillStyle = `rgba(255,255,255,${flash * 0.9})`;
                ctx.beginPath();
                ctx.arc(px, (p % 2) * 2 - 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.restore();
          }

          // Brilhos aleatórios (shimmer de seda)
          for (let i = 0; i < 40; i++) {
            const sparkT = (t * 0.4 + i / 40) % 1;
            const sx = (i * 137) % W;
            const sy = (i * 197) % H;
            const flash = Math.max(0, Math.sin(sparkT * Math.PI));
            if (flash > 0.5) {
              ctx.fillStyle = `rgba(255,240,200,${(flash - 0.5) * 1.4})`;
              ctx.beginPath();
              ctx.arc(sx, sy, 1, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "imobiliaria": {
          // Skyline ao entardecer detalhado
          // Céu gradient roxo-laranja-dourado
          const sky = ctx.createLinearGradient(0, 0, 0, H);
          sky.addColorStop(0, "#2a1145");
          sky.addColorStop(0.3, "#592050");
          sky.addColorStop(0.55, "#c05828");
          sky.addColorStop(0.75, "#e8a040");
          sky.addColorStop(1, "#1a0818");
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, W, H);

          // Sol
          const sunY = H * 0.6;
          const sunR = H * 0.08;
          const sun = ctx.createRadialGradient(W * 0.5, sunY, 0, W * 0.5, sunY, sunR * 3);
          sun.addColorStop(0, "rgba(255,240,180,0.95)");
          sun.addColorStop(0.4, "rgba(255,180,80,0.5)");
          sun.addColorStop(1, "rgba(255,100,40,0)");
          ctx.fillStyle = sun;
          ctx.beginPath();
          ctx.arc(W * 0.5, sunY, sunR * 3, 0, Math.PI * 2);
          ctx.fill();

          // Estrelas aparecendo gradualmente
          const starOpacity = Math.min(1, t * 0.15);
          for (let i = 0; i < 50; i++) {
            const sx = (i * 173.7) % W;
            const sy = ((i * 97.3) % H) * 0.45;
            const br = starOpacity * (0.3 + Math.sin(i + t) * 0.2);
            if (br > 0.05) {
              ctx.beginPath();
              ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,255,255,${br})`;
              ctx.fill();
            }
          }

          // Skyline detalhada
          const buildings = [
            { x: 0.0, w: 0.08, h: 0.38 },
            { x: 0.07, w: 0.11, h: 0.52 },
            { x: 0.17, w: 0.07, h: 0.36 },
            { x: 0.23, w: 0.13, h: 0.58 },
            { x: 0.35, w: 0.08, h: 0.42 },
            { x: 0.42, w: 0.11, h: 0.55 },
            { x: 0.52, w: 0.07, h: 0.40 },
            { x: 0.58, w: 0.13, h: 0.62 },
            { x: 0.70, w: 0.08, h: 0.45 },
            { x: 0.77, w: 0.12, h: 0.50 },
            { x: 0.88, w: 0.07, h: 0.38 },
            { x: 0.94, w: 0.08, h: 0.48 },
          ];

          const horizon = H * 0.68; // separação prédios/água

          for (let bi = 0; bi < buildings.length; bi++) {
            const b = buildings[bi];
            const bx = W * b.x;
            const bw = W * b.w;
            const bh = H * b.h;
            const by = horizon - bh;

            // Prédio silhueta escura
            ctx.fillStyle = "#0e0a1a";
            ctx.fillRect(bx, by, bw, bh);

            // Janelas piscando
            const cols = Math.max(2, Math.floor(bw / 12));
            const rows = Math.max(5, Math.floor(bh / 15));
            for (let r = 0; r < rows; r++) {
              for (let col = 0; col < cols; col++) {
                const hash = (bi * 31 + r * 17 + col * 7) % 100;
                const pulse = Math.sin(t * 0.4 + hash * 0.12);
                if (pulse > 0.1) {
                  const wx = bx + 3 + col * ((bw - 6) / cols);
                  const wy = by + 4 + r * ((bh - 8) / rows);
                  const wCol = hash % 3 === 0 ? { r: 255, g: 220, b: 140 } : hash % 3 === 1 ? c2 : { r: 255, g: 180, b: 100 };
                  ctx.fillStyle = `rgba(${wCol.r},${wCol.g},${wCol.b},${pulse})`;
                  ctx.fillRect(wx, wy, Math.max(2, (bw - 6) / cols - 2), 3);
                }
              }
            }
          }

          // Reflexo na água (parte inferior)
          const waterGrad = ctx.createLinearGradient(0, horizon, 0, H);
          waterGrad.addColorStop(0, "rgba(40,20,60,0.9)");
          waterGrad.addColorStop(1, "rgba(10,5,20,1)");
          ctx.fillStyle = waterGrad;
          ctx.fillRect(0, horizon, W, H - horizon);

          // Reflexo dos prédios (invertido + distorção)
          ctx.save();
          ctx.globalAlpha = 0.4;
          for (let bi = 0; bi < buildings.length; bi++) {
            const b = buildings[bi];
            const bx = W * b.x;
            const bw = W * b.w;
            const bh = H * b.h * 0.6; // Reflexo mais curto
            // Ondulação
            const wave = Math.sin(t * 2 + bi) * 2;
            ctx.fillStyle = "#1a0e2a";
            ctx.fillRect(bx + wave, horizon, bw, bh);
          }
          ctx.restore();

          // Ondas horizontais de luz na água
          for (let i = 0; i < 8; i++) {
            const yw = horizon + 10 + i * ((H - horizon) / 10);
            ctx.strokeStyle = `rgba(255,200,120,${0.15 * (1 - i / 8)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            for (let x = 0; x <= W; x += 6) {
              const wy = yw + Math.sin(x * 0.02 + t + i) * 1.5;
              if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
            }
            ctx.stroke();
          }
          break;
        }

        case "educacao": {
          // Constelações/rede neural
          ctx.fillStyle = "#05081a";
          ctx.fillRect(0, 0, W, H);

          const nodes: { x: number; y: number; col: { r: number; g: number; b: number } }[] = [];
          const N = 40;
          for (let i = 0; i < N; i++) {
            const bx = ((i * 173.7) % 100) / 100;
            const by = ((i * 97.3) % 100) / 100;
            const nx = W * (bx + Math.sin(t * 0.2 + i) * 0.02);
            const ny = H * (by + Math.cos(t * 0.15 + i) * 0.02);
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
            nodes.push({ x: nx, y: ny, col });
          }

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

        case "educacao2": {
          // Constelações nos cantos + rede neural expandindo do centro
          ctx.fillStyle = "#04071a";
          ctx.fillRect(0, 0, W, H);

          // Constelações nos 4 cantos
          const corners = [
            { cx: 0.15, cy: 0.15, size: 0.15 },
            { cx: 0.85, cy: 0.15, size: 0.15 },
            { cx: 0.15, cy: 0.85, size: 0.15 },
            { cx: 0.85, cy: 0.85, size: 0.15 },
          ];
          for (let ci = 0; ci < corners.length; ci++) {
            const c = corners[ci];
            const ccx = W * c.cx;
            const ccy = H * c.cy;
            const cSize = Math.min(W, H) * c.size;

            const stars: { x: number; y: number }[] = [];
            for (let i = 0; i < 8; i++) {
              const ang = ((i / 8) + ci * 0.1) * Math.PI * 2;
              const r = cSize * (0.3 + ((i * 0.31) % 0.7));
              stars.push({ x: ccx + Math.cos(ang) * r, y: ccy + Math.sin(ang) * r });
            }
            // Linhas
            for (let i = 0; i < stars.length - 1; i++) {
              ctx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},0.3)`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
              ctx.stroke();
            }
            // Estrelas
            for (const s of stars) {
              const pulse = 0.5 + Math.sin(t + s.x * 0.01) * 0.5;
              ctx.fillStyle = `rgba(255,255,255,${pulse})`;
              ctx.beginPath();
              ctx.arc(s.x, s.y, 1.5 + pulse, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Rede neural central expandindo
          const centerX = W * 0.5;
          const centerY = H * 0.5;
          const N = 30;
          const expandProgress = Math.min(1, (t * 0.1) % 2);
          const maxR = Math.min(W, H) * 0.35 * expandProgress;

          const nodes: { x: number; y: number; col: { r: number; g: number; b: number } }[] = [];
          for (let i = 0; i < N; i++) {
            const ang = (i / N) * Math.PI * 2 + t * 0.1;
            const r = maxR * (0.3 + ((i * 0.17) % 0.7));
            const nx = centerX + Math.cos(ang) * r;
            const ny = centerY + Math.sin(ang) * r;
            const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
            nodes.push({ x: nx, y: ny, col });
          }

          // Conexões com o centro
          for (let i = 0; i < N; i++) {
            const n = nodes[i];
            const alpha = 0.25;
            ctx.strokeStyle = `rgba(${n.col.r},${n.col.g},${n.col.b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }

          // Conexões adjacentes
          for (let i = 0; i < N; i++) {
            const j = (i + 1) % N;
            const n1 = nodes[i];
            const n2 = nodes[j];
            ctx.strokeStyle = `rgba(${n1.col.r},${n1.col.g},${n1.col.b},0.2)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }

          // Nodos
          for (let i = 0; i < N; i++) {
            const n = nodes[i];
            const pulse = 0.6 + Math.sin(t * 2 + i * 0.5) * 0.4;
            const size = 2 + pulse;
            const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, size * 3);
            halo.addColorStop(0, `rgba(${n.col.r},${n.col.g},${n.col.b},${pulse})`);
            halo.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,255,255,${pulse})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Núcleo central brilhante
          const corePulse = 0.7 + Math.sin(t * 2) * 0.3;
          const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
          core.addColorStop(0, `rgba(255,255,255,${corePulse})`);
          core.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "beleza": {
          // Pétalas de rosa caindo em espiral com glitter
          // Fundo rosé-dourado escuro
          const bg = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.5, H * 0.6, Math.max(W, H) * 0.9);
          bg.addColorStop(0, "#3a1a28");
          bg.addColorStop(0.5, "#1f0a18");
          bg.addColorStop(1, "#0a0308");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Halo dourado difuso
          const goldHalo = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.6);
          goldHalo.addColorStop(0, "rgba(212,168,67,0.12)");
          goldHalo.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = goldHalo;
          ctx.fillRect(0, 0, W, H);

          // Glitter de fundo (partículas cintilantes pequenas)
          for (let i = 0; i < 100; i++) {
            const gx = (i * 173.7) % W;
            const gy = (i * 97.3) % H;
            const flash = Math.max(0, Math.sin(t * 1.5 + i * 0.7));
            if (flash > 0.5) {
              const alpha = (flash - 0.5) * 1.6;
              ctx.fillStyle = `rgba(255,230,200,${alpha})`;
              ctx.beginPath();
              ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Brilhos perolados pulsantes (grandes)
          for (let i = 0; i < 12; i++) {
            const bx = W * (0.1 + (i * 0.085));
            const by = H * (0.2 + ((i * 0.17) % 0.6));
            const pulse = 0.4 + Math.sin(t * 1.2 + i * 0.9) * 0.6;
            const size = 20 + pulse * 15;
            const pearl = ctx.createRadialGradient(bx, by, 0, bx, by, size);
            pearl.addColorStop(0, `rgba(255,240,245,${pulse * 0.3})`);
            pearl.addColorStop(0.5, `rgba(255,200,220,${pulse * 0.15})`);
            pearl.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = pearl;
            ctx.beginPath();
            ctx.arc(bx, by, size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Pétalas grandes e suaves em espiral
          for (let i = 0; i < 18; i++) {
            const fallT = (t * 0.08 + i / 18) % 1;
            const spiralAngle = fallT * Math.PI * 3 + i;
            const spiralR = 80 + fallT * 60;
            const baseX = W * (0.15 + (i * 0.05) % 0.7);
            const px = baseX + Math.cos(spiralAngle) * spiralR;
            const py = fallT * (H + 80) - 40;
            const rot = spiralAngle + t * 0.5;

            // Cor: rosé ou dourada alternando
            const colRose = { r: 230, g: 140, b: 165 };
            const colGold = { r: 230, g: 190, b: 130 };
            const colPink = { r: 245, g: 180, b: 200 };
            const cols = [colRose, colGold, colPink];
            const col = cols[i % 3];

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot);

            // Pétala: forma de lágrima (elipse mais alongada)
            const pW = 14;
            const pH = 22;

            // Shadow/halo
            const pShadow = ctx.createRadialGradient(0, 0, 0, 0, 0, pW * 2);
            pShadow.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.3)`);
            pShadow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = pShadow;
            ctx.beginPath();
            ctx.ellipse(0, 0, pW * 2, pH * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pétala com gradient perolado
            const pGrad = ctx.createLinearGradient(-pW, -pH, pW, pH);
            pGrad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.95)`);
            pGrad.addColorStop(0.5, `rgba(255,240,245,0.85)`);
            pGrad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0.9)`);
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, pW, pH, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight perolado superior
            const hi = ctx.createRadialGradient(-pW * 0.3, -pH * 0.3, 0, -pW * 0.3, -pH * 0.3, pW * 0.8);
            hi.addColorStop(0, "rgba(255,255,255,0.6)");
            hi.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = hi;
            ctx.beginPath();
            ctx.ellipse(-pW * 0.3, -pH * 0.3, pW * 0.6, pH * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Linha central da pétala (detalhe)
            ctx.strokeStyle = `rgba(${col.r},${col.g - 20},${col.b - 20},0.4)`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(0, -pH * 0.9);
            ctx.lineTo(0, pH * 0.9);
            ctx.stroke();

            ctx.restore();
          }
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

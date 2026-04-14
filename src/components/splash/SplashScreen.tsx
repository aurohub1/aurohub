"use client";
import { useEffect, useRef, useState } from "react";

export type SplashEffect =
  | "particles" | "cinematic" | "slideup" | "scalefade" | "fadesuave"
  | "ondas" | "flutuacao" | "scanner" | "holofote" | "chuvapontos"
  | "gradiente" | "dissolve" | "bigbang" | "aurora" | "tinta" | "vagalumes"
  | "aurora_espacial" | "universo" | "galaxia";

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
}

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "aurora_espacial","universo","galaxia",
];

export default function SplashScreen({
  logoUrl, logoOrientation = "horizontal",
  effect = "random", cor1 = "#FF7A1A", cor2 = "#D4A843", cor3 = "#1E3A6E",
  cor4, cor5, corFundo = "#0E1520", userName, onDone,
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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

    // Sequência: logo in (400ms) → logo out (3400ms) → greet in (3900ms) → greet out (5900ms) → done (6300ms)
    const logoInTimer = setTimeout(() => setLogoVisible(true), 400);
    const logoOutTimer = setTimeout(() => setLogoVisible(false), 3400);
    const greetInTimer = setTimeout(() => setGreetVisible(true), 3900);
    const greetOutTimer = setTimeout(() => setGreetVisible(false), 5900);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 6300);

    function draw(now: number) {
      const t = (now - startTime) / 1000;
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
          for(let i=0;i<10;i++){
            const baseX=W*(i/10);
            const waveAmp=H*0.25;
            const freq=0.008;
            const speed=t*(0.4+i*0.05);
            ctx.beginPath();
            ctx.moveTo(baseX,0);
            for(let y=0;y<H;y+=3){
              const x=baseX+Math.sin(y*freq+speed+i*0.8)*waveAmp*(1-y/H);
              ctx.lineTo(x,y);
            }
            const col=i%4===0?c1:i%4===1?c2:i%4===2?c3:{r:100,g:200,b:255};
            const curtain=ctx.createLinearGradient(baseX,0,baseX,H);
            curtain.addColorStop(0,`rgba(${col.r},${col.g},${col.b},${0.15+Math.sin(t+i)*0.08})`);
            curtain.addColorStop(0.5,`rgba(${col.r},${col.g},${col.b},${0.25+Math.cos(t*0.7+i)*0.1})`);
            curtain.addColorStop(1,`rgba(${col.r},${col.g},${col.b},0)`);
            ctx.strokeStyle=curtain;
            ctx.lineWidth=W*0.06;
            ctx.stroke();
          }
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

        case "universo": {
          // Fundo preto profundo (sobrescreve o corFundo)
          ctx.fillStyle = "#000008";
          ctx.fillRect(0, 0, W, H);

          // Nebulosas coloridas (pulsação lenta) — cores da empresa
          const nebulas = [c1, c2, c3, c4, c5];
          for (let i = 0; i < 5; i++) {
            const nCol = nebulas[i];
            const nx = W * (0.15 + (i * 0.18)) + Math.sin(t * 0.15 + i) * 40;
            const ny = H * (0.3 + Math.cos(t * 0.12 + i * 0.7) * 0.2);
            const nr = H * (0.22 + Math.sin(t * 0.2 + i) * 0.06);
            const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
            const nAlpha = 0.12 + Math.sin(t * 0.3 + i) * 0.05;
            nebGrad.addColorStop(0, `rgba(${nCol.r},${nCol.g},${nCol.b},${nAlpha})`);
            nebGrad.addColorStop(0.5, `rgba(${nCol.r},${nCol.g},${nCol.b},${nAlpha * 0.4})`);
            nebGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = nebGrad;
            ctx.fillRect(0, 0, W, H);
          }

          // Estrelas distantes (fundo) — pontos pequenos estáticos
          for (let i = 0; i < 250; i++) {
            const sx = (i * 173.7) % W;
            const sy = (i * 97.3) % H;
            const br = 0.3 + Math.sin(i * 0.7 + t * 1.5) * 0.25;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${br})`;
            ctx.fill();
          }

          // Clusters de estrelas (3 regiões densas)
          for (let cIdx = 0; cIdx < 3; cIdx++) {
            const cx = W * (0.2 + cIdx * 0.3) + Math.cos(t * 0.1 + cIdx) * 30;
            const cy = H * (0.25 + cIdx * 0.2);
            for (let i = 0; i < 40; i++) {
              const ang = (i / 40) * Math.PI * 2;
              const d = Math.sqrt((i * 13.37) % 1) * 80;
              const px = cx + Math.cos(ang) * d;
              const py = cy + Math.sin(ang) * d;
              const br = 0.4 + Math.sin(i + t * 2) * 0.3;
              ctx.beginPath();
              ctx.arc(px, py, 0.8, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,255,255,${br})`;
              ctx.fill();
            }
          }

          // Estrelas maiores com brilho pulsante (20 estrelas principais)
          for (let i = 0; i < 20; i++) {
            const orbit = (i % 4 + 1) * H * 0.14;
            const speed = 0.15 + (i % 3) * 0.05;
            const angle = (i / 20) * Math.PI * 2 + t * speed;
            const x = W / 2 + Math.cos(angle) * orbit * (0.8 + Math.sin(i * 0.7) * 0.2);
            const y = H / 2 + Math.sin(angle) * orbit * 0.5;
            const pulse = 0.5 + Math.sin(t * 2 + i * 1.3) * 0.5;
            const size = 1.5 + pulse * 2;
            const col = [c1, c2, c3, c4, c5][i % 5];

            // Halo/glow
            const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
            halo.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${0.6 + pulse * 0.4})`);
            halo.addColorStop(0.3, `rgba(${col.r},${col.g},${col.b},${0.2 * pulse})`);
            halo.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(x, y, size * 5, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo da estrela
            ctx.beginPath();
            ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${0.8 + pulse * 0.2})`;
            ctx.fill();

            // Cruz de luz (spike) nas estrelas mais brilhantes
            if (pulse > 0.7) {
              ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(pulse - 0.7) * 2})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(x - size * 4, y); ctx.lineTo(x + size * 4, y);
              ctx.moveTo(x, y - size * 4); ctx.lineTo(x, y + size * 4);
              ctx.stroke();
            }
          }

          // Trilhas de luz (cometas) — partículas em movimento rápido com rastro
          for (let i = 0; i < 8; i++) {
            const cometT = (t * 0.3 + i / 8) % 1;
            const startX = -50 + cometT * (W + 100);
            const startY = H * (0.1 + (i % 4) * 0.22) + Math.sin(i) * 30;
            const col = [c1, c2, c3, c4, c5][i % 5];

            // Trail
            const trail = ctx.createLinearGradient(startX - 80, startY, startX, startY);
            trail.addColorStop(0, "rgba(0,0,0,0)");
            trail.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0.7)`);
            ctx.strokeStyle = trail;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(startX - 80, startY);
            ctx.lineTo(startX, startY);
            ctx.stroke();

            // Ponta (cabeça do cometa)
            ctx.beginPath();
            ctx.arc(startX, startY, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,0.95)`;
            ctx.fill();
          }
          break;
        }

        case "galaxia": {
          // Fundo preto profundo
          ctx.fillStyle = "#000005";
          ctx.fillRect(0, 0, W, H);

          const cx = W / 2;
          const cy = H / 2;
          const rotation = t * 0.15; // rotação suave

          // Halo geral (névoa difusa)
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.6);
          halo.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.18)`);
          halo.addColorStop(0.3, `rgba(${c2.r},${c2.g},${c2.b},0.08)`);
          halo.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);

          // Estrelas de fundo (não rotacionam)
          for (let i = 0; i < 200; i++) {
            const sx = (i * 173.7) % W;
            const sy = (i * 97.3) % H;
            const br = 0.2 + Math.sin(i * 0.7 + t) * 0.15;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${br})`;
            ctx.fill();
          }

          // Braços espirais (espiral logarítmica: r = a * e^(b*theta))
          const arms = 4; // 4 braços
          const particlesPerArm = 180;
          const maxRadius = Math.min(W, H) * 0.42;
          const a = 6;
          const b = 0.22;

          for (let arm = 0; arm < arms; arm++) {
            const armOffset = (arm / arms) * Math.PI * 2;
            const armColor = [c1, c2, c3, c4, c5][arm % 5];

            for (let i = 0; i < particlesPerArm; i++) {
              const theta = (i / particlesPerArm) * Math.PI * 4; // 2 voltas
              const r = a * Math.exp(b * theta);
              if (r > maxRadius) break;

              const angle = theta + armOffset + rotation;
              // Dispersão aleatória mas determinística
              const noise = Math.sin(i * 12.9898 + arm * 78.233) * 0.5;
              const noiseR = Math.cos(i * 43.723 + arm * 11.17) * 8;
              const px = cx + Math.cos(angle + noise * 0.15) * (r + noiseR);
              const py = cy + Math.sin(angle + noise * 0.15) * (r + noiseR) * 0.55; // achata

              // Tamanho: maior no centro, menor nas bordas
              const normR = r / maxRadius;
              const size = 2.5 * (1 - normR * 0.7) + 0.5;
              const alpha = (1 - normR * 0.5) * (0.5 + Math.sin(i + t * 2) * 0.3);

              // Glow
              const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
              glow.addColorStop(0, `rgba(${armColor.r},${armColor.g},${armColor.b},${alpha})`);
              glow.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(px, py, size * 3, 0, Math.PI * 2);
              ctx.fill();

              // Núcleo
              ctx.beginPath();
              ctx.arc(px, py, size * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
              ctx.fill();
            }
          }

          // Bulbo central luminoso (core)
          const coreR = Math.min(W, H) * 0.12;
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          const corePulse = 0.85 + Math.sin(t * 1.5) * 0.15;
          core.addColorStop(0, `rgba(255,245,220,${0.95 * corePulse})`);
          core.addColorStop(0.15, `rgba(${c2.r},${c2.g},${c2.b},${0.7 * corePulse})`);
          core.addColorStop(0.4, `rgba(${c1.r},${c1.g},${c1.b},${0.35 * corePulse})`);
          core.addColorStop(0.8, `rgba(${c1.r},${c1.g},${c1.b},${0.1 * corePulse})`);
          core.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
          ctx.fill();

          // Ponto central super brilhante
          ctx.fillStyle = `rgba(255,255,255,${corePulse})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
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
  }, [activeEffect, cor1, cor2, cor3, cor4, cor5, corFundo]);

  const logoDims = {
    horizontal: { width: 220, height: 80 },
    vertical:   { width: 120, height: 160 },
    quadrado:   { width: 140, height: 140 },
  }[logoOrientation];

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: corFundo }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
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

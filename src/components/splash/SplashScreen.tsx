"use client";
import { useEffect, useRef, useState } from "react";

export type SplashEffect =
  | "particles" | "cinematic" | "slideup" | "scalefade" | "fadesuave"
  | "ondas" | "flutuacao" | "scanner" | "holofote" | "chuvapontos"
  | "gradiente" | "dissolve" | "bigbang" | "aurora" | "tinta" | "vagalumes"
  | "eclipse" | "aurora_espacial" | "nascer_sol";

interface Props {
  logoUrl: string;
  logoOrientation?: "horizontal" | "vertical" | "quadrado";
  effect?: SplashEffect | "random";
  cor1?: string;
  cor2?: string;
  cor3?: string;
  corFundo?: string;
  onDone?: () => void;
}

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "eclipse","aurora_espacial","nascer_sol",
];

export default function SplashScreen({
  logoUrl, logoOrientation = "horizontal",
  effect = "random", cor1 = "#FF7A1A", cor2 = "#D4A843", cor3 = "#1E3A6E",
  corFundo = "#0E1520", onDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const [logoVisible, setLogoVisible] = useState(false);

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

    const W = canvas.width, H = canvas.height;

    // Mostra logo após 400ms, some tudo após 2800ms
    const logoTimer = setTimeout(() => setLogoVisible(true), 400);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2800);

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
          const ringGlow=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.2);
          ringGlow.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},0)`);
          ringGlow.addColorStop(0.5,`rgba(${c2.r},${c2.g},${c2.b},0.3)`);
          ringGlow.addColorStop(1,`rgba(${c2.r},${c2.g},${c2.b},0)`);
          ctx.fillStyle=ringGlow;
          ctx.fillRect(0,0,W,H);
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
            const spotX=W*(0.2+i*0.3)+Math.sin(t*0.4+i)*W*0.1;
            const spotY=H*0.85;
            const targetX=W/2+Math.cos(t*0.3+i)*W*0.15;
            const targetY=H*0.4;
            const spot=ctx.createLinearGradient(spotX,spotY,targetX,targetY);
            const col=i===0?c1:i===1?c2:c3;
            spot.addColorStop(0,`rgba(${col.r},${col.g},${col.b},0)`);
            spot.addColorStop(0.3,`rgba(${col.r},${col.g},${col.b},0.12)`);
            spot.addColorStop(1,`rgba(${col.r},${col.g},${col.b},0.35)`);
            ctx.beginPath();
            ctx.moveTo(spotX-20,spotY);
            ctx.lineTo(targetX-60,targetY);
            ctx.lineTo(targetX+60,targetY);
            ctx.lineTo(spotX+20,spotY);
            ctx.closePath();
            ctx.fillStyle=spot;
            ctx.fill();
          }
          const topGlow=ctx.createLinearGradient(0,H*0.35,0,H*0.55);
          topGlow.addColorStop(0,"rgba(255,255,255,0.05)");
          topGlow.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=topGlow;
          ctx.fillRect(0,H*0.35,W,H*0.2);
          break;
        }

        case "chuvapontos": {
          for(let i=0;i<60;i++){
            const x=(i*(W/60));
            const speed=50+i%7*20;
            const y=(t*speed+i*137)%(H+40)-20;
            const col=i%3===0?c1:i%3===1?c2:c3;
            for(let j=0;j<8;j++){
              const ty=y-j*18;
              const alpha=Math.max(0,(1-j/8)*0.6);
              ctx.fillStyle=`rgba(${col.r},${col.g},${col.b},${alpha})`;
              ctx.font="12px monospace";
              ctx.fillText(String.fromCharCode(0x30A0+Math.floor((t*10+i+j)%96)),x,ty);
            }
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
          for(let i=0;i<300*density;i++){
            const x=(Math.sin(i*127.1+t)*0.5+0.5)*W;
            const y=(Math.cos(i*311.7+t*0.7)*0.5+0.5)*H;
            const size=1+Math.sin(i+t*3)*1;
            const col=i%3===0?c1:i%3===1?c2:c3;
            const alpha=0.3+Math.sin(i*0.5+t*2)*0.2;
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
          for(let i=0;i<10;i++){
            const progress=Math.min(1,Math.max(0,(t*0.8-i*0.08)));
            if(progress<=0)continue;
            const eased=1-Math.pow(1-progress,3);
            const cx=W*(0.15+i*0.07+Math.sin(i*1.3)*0.05);
            const cy=H*(0.3+Math.cos(i*0.9)*0.25);
            const r=eased*H*(0.25+i%3*0.08);
            const col=i%3===0?c1:i%3===1?c3:c2;
            const ink=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
            ink.addColorStop(0,`rgba(${col.r},${col.g},${col.b},${0.5*eased})`);
            ink.addColorStop(0.5,`rgba(${col.r},${col.g},${col.b},${0.2*eased})`);
            ink.addColorStop(1,"rgba(0,0,0,0)");
            ctx.save();
            ctx.translate(cx,cy);
            ctx.beginPath();
            for(let a=0;a<=Math.PI*2;a+=0.1){
              const wobble=1+Math.sin(a*4+t*2+i)*0.15*eased;
              const rx=Math.cos(a)*r*wobble;
              const ry=Math.sin(a)*r*wobble*0.8;
              a===0?ctx.moveTo(rx,ry):ctx.lineTo(rx,ry);
            }
            ctx.closePath();
            ctx.fillStyle=ink;
            ctx.fill();
            ctx.restore();
          }
          break;
        }

        case "vagalumes": {
          const totalFade=Math.max(0,1-(t-1.8)/0.7);
          for(let i=0;i<60;i++){
            const pathX=W*0.1+((i*W*0.8/60)+(Math.sin(t*0.3+i*0.4)*W*0.08))%W*0.8;
            const pathY=H*(0.2+Math.sin(i*0.7+t*0.4)*0.5+Math.cos(i*0.3+t*0.2)*0.15);
            const blink=Math.pow(Math.max(0,Math.sin(t*(2+i%4*0.3)+i*1.1)),3);
            const col=i%2===0?c1:c2;
            const glowR=6+blink*8;
            const glow=ctx.createRadialGradient(pathX,pathY,0,pathX,pathY,glowR);
            glow.addColorStop(0,`rgba(255,255,220,${blink*totalFade*0.9})`);
            glow.addColorStop(0.3,`rgba(${col.r},${col.g},${col.b},${blink*totalFade*0.5})`);
            glow.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=glow;
            ctx.fillRect(pathX-glowR,pathY-glowR,glowR*2,glowR*2);
            if(blink>0.3){
              ctx.beginPath();
              ctx.arc(pathX,pathY,1.5,0,Math.PI*2);
              ctx.fillStyle=`rgba(255,255,200,${blink*totalFade})`;
              ctx.fill();
            }
          }
          break;
        }

        case "eclipse": {
          for(let i=0;i<150;i++){
            const sx=(i*173.7)%W,sy=(i*97.3)%H;
            const br=0.5+Math.sin(i*0.7+t*1.5)*0.3;
            ctx.beginPath();
            ctx.arc(sx,sy,0.7,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,255,${br})`;
            ctx.fill();
          }
          const moonOffsetX=Math.max(0,(1-t*0.6))*W*0.3;
          const moonX=W/2-moonOffsetX,moonY=H/2;
          const R=Math.min(W,H)*0.2;
          for(let i=0;i<32;i++){
            const angle=(i/32)*Math.PI*2+t*0.08;
            const inner=R*1.02;
            const outer=R*(1.5+Math.sin(i*2.1+t*2)*0.3+Math.cos(i*3.7+t)*0.2);
            const wid=0.025;
            ctx.beginPath();
            ctx.moveTo(moonX+Math.cos(angle-wid)*inner,moonY+Math.sin(angle-wid)*inner);
            ctx.lineTo(moonX+Math.cos(angle)*outer*1.8,moonY+Math.sin(angle)*outer*1.8);
            ctx.lineTo(moonX+Math.cos(angle+wid)*inner,moonY+Math.sin(angle+wid)*inner);
            ctx.closePath();
            const rayGrad=ctx.createLinearGradient(
              moonX+Math.cos(angle)*inner,moonY+Math.sin(angle)*inner,
              moonX+Math.cos(angle)*outer*2,moonY+Math.sin(angle)*outer*2
            );
            rayGrad.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},0.85)`);
            rayGrad.addColorStop(0.4,`rgba(${c1.r},${c1.g},${c1.b},0.35)`);
            rayGrad.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=rayGrad;
            ctx.fill();
          }
          const corona=ctx.createRadialGradient(moonX,moonY,R,moonX,moonY,R*4);
          corona.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},0.5)`);
          corona.addColorStop(0.3,`rgba(${c1.r},${c1.g},${c1.b},0.2)`);
          corona.addColorStop(0.6,`rgba(${c3.r},${c3.g},${c3.b},0.08)`);
          corona.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=corona;
          ctx.fillRect(0,0,W,H);
          ctx.beginPath();
          ctx.arc(moonX,moonY,R,0,Math.PI*2);
          ctx.fillStyle="#00000A";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(moonX,moonY,R*1.015,0,Math.PI*2);
          ctx.arc(moonX,moonY,R*0.96,0,Math.PI*2,true);
          ctx.fillStyle=`rgba(${c2.r},${c2.g},${c2.b},0.95)`;
          ctx.fill();
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

        case "nascer_sol": {
          const spaceGrad=ctx.createLinearGradient(0,0,0,H);
          spaceGrad.addColorStop(0,"#000005");
          spaceGrad.addColorStop(0.6,`rgb(${Math.floor(c3.r*0.3)},${Math.floor(c3.g*0.15)},${Math.floor(c3.b*0.5)})`);
          spaceGrad.addColorStop(1,`rgb(${c3.r},${c3.g},${c3.b})`);
          ctx.fillStyle=spaceGrad;
          ctx.fillRect(0,0,W,H);
          for(let i=0;i<200;i++){
            const sx=(i*173.7)%W,sy=(i*97.3)%(H*0.7);
            const br=Math.max(0,1-(sy/(H*0.5)))*(0.4+Math.sin(i*0.7+t*2)*0.35);
            if(br<0.05)continue;
            const starSize=br>0.6?1.2:0.7;
            ctx.beginPath();
            ctx.arc(sx,sy,starSize,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,255,${br})`;
            ctx.fill();
          }
          const horizY=H*0.7;
          const pR=W*1.15;
          ctx.save();
          const clipPath=new Path2D();
          clipPath.ellipse(W/2,horizY+pR*0.8,pR,pR,0,0,Math.PI*2);
          ctx.clip(clipPath);
          const planetGrad=ctx.createRadialGradient(W/2,horizY+pR*0.2,pR*0.1,W/2,horizY+pR*0.8,pR);
          planetGrad.addColorStop(0,`rgb(${Math.min(255,c3.r+30)},${Math.min(255,c3.g+30)},${Math.min(255,c3.b+60)})`);
          planetGrad.addColorStop(0.3,`rgb(${c3.r},${c3.g},${c3.b})`);
          planetGrad.addColorStop(0.7,`rgb(${Math.floor(c3.r*0.6)},${Math.floor(c3.g*0.6)},${Math.floor(c3.b*0.7)})`);
          planetGrad.addColorStop(1,`rgb(${Math.floor(c3.r*0.3)},${Math.floor(c3.g*0.3)},${Math.floor(c3.b*0.5)})`);
          ctx.fillStyle=planetGrad;
          ctx.fillRect(0,0,W,H);
          ctx.restore();
          const atmGrad=ctx.createLinearGradient(0,horizY-40,0,horizY+60);
          atmGrad.addColorStop(0,"rgba(0,0,0,0)");
          atmGrad.addColorStop(0.3,`rgba(${c1.r},${c1.g},${c1.b},0.7)`);
          atmGrad.addColorStop(0.6,`rgba(${c2.r},${c2.g},${c2.b},0.5)`);
          atmGrad.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=atmGrad;
          ctx.fillRect(0,horizY-40,W,100);
          const sunP=Math.min(1,t/2);
          const sunEase=1-Math.pow(1-sunP,4);
          const sunY=horizY+30-sunEase*H*0.4;
          const sunR2=Math.min(W,H)*0.075;
          if(sunP>0.1){
            const hGlow=ctx.createRadialGradient(W/2,horizY,0,W/2,horizY,W*0.9);
            hGlow.addColorStop(0,`rgba(${c2.r},${c2.g},${c2.b},${sunEase*0.8})`);
            hGlow.addColorStop(0.15,`rgba(${c1.r},${c1.g},${c1.b},${sunEase*0.5})`);
            hGlow.addColorStop(0.4,`rgba(${c3.r},${Math.floor(c3.g*0.5)},0,${sunEase*0.25})`);
            hGlow.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=hGlow;
            ctx.fillRect(0,0,W,H);
          }
          if(sunY<horizY+sunR2){
            if(sunP>0.4){
              for(let i=0;i<20;i++){
                const angle=(i/20)*Math.PI*2+t*0.1;
                const len=sunR2*(2+Math.sin(i*1.9+t*2)*0.4);
                ctx.beginPath();
                ctx.moveTo(W/2+Math.cos(angle-0.02)*sunR2,sunY+Math.sin(angle-0.02)*sunR2);
                ctx.lineTo(W/2+Math.cos(angle)*len*3,sunY+Math.sin(angle)*len*3);
                ctx.lineTo(W/2+Math.cos(angle+0.02)*sunR2,sunY+Math.sin(angle+0.02)*sunR2);
                ctx.closePath();
                ctx.fillStyle=`rgba(${c2.r},${c2.g},${c2.b},${(sunP-0.4)/0.6*0.25})`;
                ctx.fill();
              }
            }
            const sGrad=ctx.createRadialGradient(W/2,sunY,0,W/2,sunY,sunR2*2);
            sGrad.addColorStop(0,"#ffffff");
            sGrad.addColorStop(0.15,`rgb(${c2.r},${c2.g},${Math.floor(c2.b*0.3)})`);
            sGrad.addColorStop(0.4,`rgba(${c1.r},${c1.g},${c1.b},0.8)`);
            sGrad.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=sGrad;
            ctx.beginPath();
            ctx.arc(W/2,sunY,sunR2*2,0,Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(W/2,sunY,sunR2,0,Math.PI*2);
            ctx.fillStyle="#fffef0";
            ctx.fill();
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
      clearTimeout(logoTimer);
      clearTimeout(doneTimer);
    };
  }, [activeEffect, cor1, cor2, cor3, corFundo]);

  if (!visible) return null;

  const logoDims = {
    horizontal: { width: 220, height: 80 },
    vertical:   { width: 120, height: 160 },
    quadrado:   { width: 140, height: 140 },
  }[logoOrientation];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: corFundo }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center"
        style={{
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? "scale(1)" : "scale(0.85)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
        <img src={logoUrl} alt="Logo"
          style={{ width: logoDims.width, height: logoDims.height, objectFit: "contain" }} />
      </div>
    </div>
  );
}

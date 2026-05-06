"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole } from "@/lib/auth";
import SplashScreen, { type SplashEffect, type TextoEfeito } from "@/components/splash/SplashScreen";

/* ── Particle system ─────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let animId: number;
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx!.scale(dpr, dpr);
    }

    function init() {
      resize();
      const count = Math.floor((window.innerWidth * window.innerHeight) / 12000);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? "rgba(30,58,110,0.2)" : "rgba(212,168,67,0.3)";
        ctx.fill();
      }

      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isLight ? `rgba(30,58,110,${alpha})` : `rgba(212,168,67,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", init);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, [canvasRef]);
}

/* ── Login page ──────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [splash, setSplash] = useState<{
    name: string; home: string;
    logoUrl?: string; effect?: string; logoOrientation?: string;
    cor1?: string; cor2?: string; cor3?: string; cor4?: string; cor5?: string; corFundo?: string;
    velocidade?: number; suavidade?: number; somUrl?: string;
    quantidade?: number; tamanho?: number; raioOrbital?: number;
    nebulosa?: number; opacidade?: number; dispersao?: number; velocidadeTexto?: number;
    textoEfeito?: string;
    glowTexto?: boolean; glowIntensidade?: number;
    textoCor?: string; glowCor?: string;
  } | null>(null);

  useParticles(canvasRef);

  useEffect(() => {
    const saved = (localStorage.getItem("ah_theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);

    // Login usa tema Aurovista laranja
    let s = document.getElementById("login-theme") as HTMLStyleElement | null;
    if (!s) { s = document.createElement("style"); s.id = "login-theme"; document.head.appendChild(s); }
    s.textContent = `
      html[data-theme="dark"] {
        --orange: #FF7A1A; --orange2: #FF9A3C; --orange3: rgba(255,122,26,0.12);
        --bg: #060B16; --bg1: #0A1020; --bg2: #0C1428; --bg3: #182844;
        --txt: #EEF2FF; --txt2: #8A9BBF; --txt3: #4A5878;
        --bdr: rgba(255,255,255,0.055); --bdr2: rgba(255,255,255,0.10);
        --card-bg: rgba(12,20,40,0.72); --sidebar-bg: rgba(8,14,28,0.92);
      }
      html[data-theme="light"] {
        --orange: #FF7A1A; --orange2: #FF9A3C; --orange3: rgba(255,122,26,0.12);
        --bg: #F8FAFC; --bg1: #FFFFFF; --bg2: #F1F5F9; --bg3: #E2E8F0;
        --txt: #0F172A; --txt2: #334155; --txt3: #64748B;
        --bdr: #E2E8F0; --bdr2: #CBD5E1;
        --card-bg: #ffffff; --sidebar-bg: #ffffff;
      }`;
    return () => { s?.remove(); };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ah_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(
            authError.message === "Invalid login credentials"
              ? "Email ou senha incorretos."
              : authError.message
          );
          return;
        }

        // Busca profile pra obter role + home correta (evita flash do /inicio)
        const profile = await getProfile(supabase);

        const u = data?.user;
        const name = profile?.name
          || (u?.user_metadata?.name as string | undefined)
          || (u?.user_metadata?.full_name as string | undefined)
          || u?.email?.split("@")[0]
          || "você";
        const role = profile?.role ?? null;
        const home = homeForRole(role);
        const splashRoles = ["adm", "operador", "cliente", "unidade", "gerente", "vendedor"];
        const canShowSplash = role !== null && splashRoles.includes(role);

        if (!canShowSplash) {
          router.push(home);
          return;
        }

        let splashConfig: Record<string, string | number | boolean | undefined> | null = null;

        if (role === "adm") {
          const { data: cfgRows } = await supabase
            .from("system_config")
            .select("key,value")
            .like("key", "adm_splash_%");
          const cfg: Record<string, string> = {};
          for (const r of (cfgRows ?? []) as { key: string; value: string }[]) {
            cfg[r.key] = r.value;
          }
          const num = (k: string, def: number): number => {
            const v = Number(cfg[k]);
            return Number.isFinite(v) && v > 0 ? v : def;
          };
          {
            splashConfig = {
              logoUrl: cfg.adm_splash_logo || undefined,
              effect: cfg.adm_splash_effect || "aurovista_adm",
              logoOrientation: "horizontal",
              cor1: cfg.adm_splash_cor1 || "#D4A843",
              cor2: cfg.adm_splash_cor2 || "#FF7A1A",
              cor3: cfg.adm_splash_cor3 || "transparent",
              cor4: cfg.adm_splash_cor4 || "transparent",
              cor5: cfg.adm_splash_cor5 || "transparent",
              corFundo: cfg.adm_splash_cor_fundo || "#060B16",
              velocidade: num("adm_splash_velocidade", 5),
              suavidade: num("adm_splash_suavidade", 7),
              somUrl: cfg.adm_splash_som || undefined,
              quantidade: num("adm_splash_quantidade", 5),
              tamanho: num("adm_splash_tamanho", 5),
              raioOrbital: num("adm_splash_raio_orbital", 5),
              nebulosa: num("adm_splash_nebulosa", 6),
              opacidade: num("adm_splash_opacidade", 8),
              dispersao: num("adm_splash_dispersao", 4),
              velocidadeTexto: num("adm_splash_velocidade_texto", 5),
              textoEfeito: cfg.adm_splash_texto_efeito || "typewriter",
              glowTexto: cfg.adm_splash_texto_glow !== "false",
              glowIntensidade: num("adm_splash_texto_glow_intensidade", 5),
              textoCor: cfg.adm_splash_texto_cor || "#FFFFFF",
              glowCor: cfg.adm_splash_glow_cor || cfg.adm_splash_cor2 || "#FF7A1A",
            };
          }
        } else if (profile?.licensee_id) {
          const { data: lic } = await supabase
            .from("licensees")
            .select("logo_url,splash_effect,splash_logo_orientation,splash_velocidade,splash_suavidade,splash_som_url,cor_primaria,cor_secundaria,cor_acento,cor_fundo,cor4,cor5")
            .eq("id", profile.licensee_id)
            .single();
          if (lic && lic.splash_effect) {
            const lic2 = lic as typeof lic & { splash_velocidade?: number; splash_suavidade?: number; splash_som_url?: string };
            splashConfig = {
              logoUrl: lic.logo_url || undefined,
              effect: lic.splash_effect,
              logoOrientation: lic.splash_logo_orientation || "horizontal",
              cor1: lic.cor_primaria || "var(--orange)",
              cor2: lic.cor_secundaria || "#D4A843",
              cor3: lic.cor_acento || "#1E3A6E",
              cor4: lic.cor4 || undefined,
              cor5: lic.cor5 || undefined,
              corFundo: lic.cor_fundo || "#0E1520",
              velocidade: lic2.splash_velocidade ?? 5,
              suavidade: lic2.splash_suavidade ?? 7,
              somUrl: lic2.splash_som_url || undefined,
            };
          }
        }

        if (!splashConfig) {
          router.push(home);
          return;
        }

        // Frequência: exibe no máximo 1x a cada 12h por dispositivo
        const lastSeen = Number(localStorage.getItem("intro_last_seen") || 0);
        if (Date.now() - lastSeen < 43200000) {
          router.push(home);
          return;
        }
        localStorage.setItem("intro_last_seen", String(Date.now()));

        setLoading(false);
        setSplash({ name, home, ...splashConfig });
        return;
      } catch (err) {
        console.error("[Login] signIn exception:", err);
        setError("Erro ao conectar. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  const dk = theme === "dark";
  const containerBg = dk
    ? "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(10,36,99,0.5) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(212,168,67,0.07) 0%, transparent 50%), #06090F"
    : "radial-gradient(ellipse 100% 80% at 0% 50%, rgba(10,36,99,0.07) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(212,168,67,0.05) 0%, transparent 50%), #F5F5F7";
  const panelBg = dk ? "rgba(8,14,28,0.92)" : "rgba(255,255,255,0.98)";
  const panelBorder = dk ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(13,22,40,0.10)";
  const heroHeadColor = dk ? "rgba(255,255,255,0.88)" : "#1D1D1F";
  const heroStatColor = dk ? "#fff" : "#1E3A6E";
  const heroSubColor = dk ? "var(--txt2)" : "#4A5878";
  const cardText = dk ? "#fff" : "#0D1628";
  const labelColor = dk ? "#8A9BBF" : "#4A5878";
  const inputBg = dk ? "rgba(255,255,255,0.05)" : "rgba(13,22,40,0.04)";
  const inputBorder = dk ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(13,22,40,0.12)";
  const inputColor = dk ? "#fff" : "#0D1628";

  if (splash) {
    return (
      <SplashScreen
        logoUrl={splash.logoUrl || "https://res.cloudinary.com/dxgj4bcch/image/upload/page/page/logo_aurovista.png"}
        logoOrientation={(splash.logoOrientation as "horizontal"|"vertical"|"quadrado") || "horizontal"}
        effect={(splash.effect as SplashEffect) || "random"}
        cor1={splash.cor1 || "var(--orange)"}
        cor2={splash.cor2 || "#D4A843"}
        cor3={splash.cor3 || "#1E3A6E"}
        cor4={splash.cor4}
        cor5={splash.cor5}
        corFundo={splash.corFundo || "#0E1520"}
        velocidade={splash.velocidade}
        suavidade={splash.suavidade}
        somUrl={splash.somUrl}
        quantidade={splash.quantidade}
        tamanho={splash.tamanho}
        raioOrbital={splash.raioOrbital}
        nebulosa={splash.nebulosa}
        opacidade={splash.opacidade}
        dispersao={splash.dispersao}
        velocidadeTexto={splash.velocidadeTexto}
        textoEfeito={splash.textoEfeito as TextoEfeito | undefined}
        glowTexto={splash.glowTexto}
        glowIntensidade={splash.glowIntensidade}
        textoCor={splash.textoCor}
        glowCor={splash.glowCor}
        userName={splash.name}
        onDone={() => router.push(splash.home)}
      />
    );
  }

  return (
    <div style={{display:'flex',width:'100vw',minHeight:'100dvh',background:containerBg,position:'relative',overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}} />
      {/* Toggle tema */}
      <button type="button" onClick={toggleTheme} style={{position:'fixed',top:16,right:16,zIndex:100,width:36,height:36,borderRadius:10,border:'1px solid var(--bdr2)',background:'var(--card-bg)',color:'var(--txt2)',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>{dk ? '☀' : '🌙'}</button>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 6rem',position:'relative',zIndex:1}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dk ? "data:image/png;base64,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" : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAQHUlEQVR42s1aa5Ac1XX+zr0z09OP6XmvtOYhWwgMoooELzYWtlnjQMApx8YUQ2KDX8JPSCXl33HVlvMnVfmRCnGK2FV2EmyTMrVO/ICiKBxjlgRMIq/QCrRIQhA2CFYPpJW0z+l77zn50d1iNLsrS2Jx0VVTuzeze/uee875vnO+04S35iIAMjR06eDAwMUbVUkp2P6vWBw5cmT66aef3oe38FJrveDIyIgCgCuHrvqranXDjqVu94nuQjKWmOQJY80TxtonjLVjieGxaq21/T3vee8PAPjZ/9Fa70ev5WKdTkffe++9vGHDhq+12+v/xloXWuuImck5hrUM5xyYmbKXF0XRFSYx8c9//rOHO52OnpyclLUOpbVey7/k3ZftbbfXr2d20FprpRSI0o+J6OTvzCye57kD06/N7dz5zJUAprJ1+O0YohqANNrtj0ZRdB6zAxFpABARiCx3DBGRMUY1ms3awMDAHQBkrdNmDRcbYQBUi6p/Xi77YF7dCbmxRATnnPK8sjRb7TsANAC4tYwstXbe+6bEcXxVGEXXioB7vddrWP53/lMpJcYYaTZal1Sr1U9mXtRvMwM7ACBxXLs7CEM457jfY/2G9vwkay0FYYhWq/15AMXMi28bAxUw6srl8oVhVOkQkQDQOZCsZmivwUREzrE0m62rgyD4yFp6cQ0MHFYAUKs1Pl+pVAJmcUqps84hay3F1Xqx1Wptzc/j7WAgAWMOgB9G4VatNUREnQ5Yci/2vrL3iYi4Xm/eCOCKtfKievPgAmk227dWouoGFnFKKdUfkj1GyGkoQ4wxVG80q+vWrdv6NvHgCANAFFW+5HmeCC8HkvzilDdIRISZpf9zIiJmpmKxJI1G+xYA69aCMtSb8943pVKpX1OpRB9giOTU0B+azCxEpIxJ5rNQpBW8CyISa500m80LqtX6HWtRTr4JA3NqqNwdBJESZs6RM980M4PT9ynpdv96dsXMpvm52T9x1i6ldnO/t8k5q4IwklareQeA0pv1oj73g5nkIAgGW632P5T9oCgCRenV6z3WWpOzZmLbtl/fdvjw4bmDB6d3DQysu6RcLv8+s1giqN46Nc9HpdTAzMyRCWvt83mu/y49qAAgjmtbo0ocOedcll/9aCkCoa5Jvgcg3nTTTR4wohbM0j1J0mURVv2gQ0QwxlBcrem1oAx1btQAByAMwvDLK1FDbhwRaZOYAwenX33M9/1o3yOPdDudSdr97LPbrTH/oZRSzOz68zHHnEazdW2hULgq6y7078pABUDqrdbHoyi+kJkdEane/MtejkgBwvcfOHDg4MDAwFEAOHToEKXE3r2HmSGyPL+ICNZa1OvNSr3evPN3DTICAHEY3+V5nmTotxKvaeesnZ8/8WMA5ampqSUANDY2ZgHQjh07Hk2S7vNKKRIR7qcXZlbFYombrdbNAN6ReVG91QYqABxUq+8JwnALM5+sNk7NP3ZKKWJxj+7evXtfHMeLpxR3w8MagLXsvkUEynmxnxuttWg12+sbjdad59orqnPIP9Si+C7fD7Rzjolo2cZEUoONdf8MoHrjjTcez4UoABgbG3MAaO74zP1JkhwgUqqf+YkI1jlV9n2u1WufBlA9F8pQZ/ldVy6XLwz84FMAViN2VkppZ83zL7+4dyKOY4yOjvZvTIaHh/W+fftOOGv+RSkikeVgQ5ms0Wq13l2pBDefS316tgaiWq3eHoZhwMynbDrfWEbsYJb7Zmdnl8IwnM6rtd7FxsbGOO0Fu98xSbIEkF7Ri9aqSqWGen3d5/JDfisMzKmh5AfRnbpQXK1rECLS1prZEyeOPuR5np6enl5YJay40+moiYmJly27nyqlSWTFzRNAXG80tnied8PZelGdDTU0Go1PhGF0UU4N/UU1cwouEPnZiy++OBUEwcwZEDUlS8m9zln0En+6bl6fWlWv18v1euPOsyV+dTbUEIaVPysVPTDzKfJfT94oZoYx5j4A8czMzOzpQGF0dNSJAM8+u/3JJOluV0pRFvq9mEbMjgqFoms0m38I4JKzQdQz+ZJOi+r4vX4QfZCFeVVw0Vo55t+89NINO3Xf972TnunMcZ+8Y4uQFCbHVRTl7NG1x0VKkRRt7dK+7GDpO0a7Tpx4Z2ZQAzR+fuJ8n4Wfzs0z6+QAAAASUVORK5CYII="} alt="Aurovista" style={{width:56,height:56,objectFit:'contain',marginBottom:'2.5rem'}} />
        <h1 style={{fontFamily:'var(--font-dm-serif)',fontSize:'3rem',lineHeight:1.05,margin:0}}>
          <span style={{display:'block',color:heroHeadColor}}>Templates profissionais.</span>
          <span style={{display:'block',color:'#D4A843',fontStyle:'italic'}}>Sua equipe publica sozinha.</span>
        </h1>
        <p style={{marginTop:'1.5rem',color:heroSubColor,fontSize:'1rem',lineHeight:1.6,maxWidth:420}}>
          Identidade visual configurada. Instagram conectado.<br />
          Pronto para usar.
        </p>
        <div style={{marginTop:'2.5rem',display:'flex',gap:'2.5rem'}}>
          <div>
            <div style={{fontSize:'1.5rem',fontWeight:800,color:heroStatColor,fontFamily:"'Cormorant Garamond', serif"}}>4+</div>
            <div style={{fontSize:'0.72rem',color:'#8A9BBF',marginTop:2}}>Formatos</div>
          </div>
          <div>
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--orange)',fontFamily:"'Cormorant Garamond', serif"}}>∞</div>
            <div style={{fontSize:'0.72rem',color:'#8A9BBF',marginTop:2}}>Downloads</div>
          </div>
          <div>
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'#D4A843',fontFamily:"'Cormorant Garamond', serif"}}>Direct</div>
            <div style={{fontSize:'0.72rem',color:'#8A9BBF',marginTop:2}}>Post Instagram</div>
          </div>
        </div>
      </div>
      <div style={{width:400,marginRight:'250px',minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 2.5rem',background:panelBg,backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',borderLeft:panelBorder,position:'relative',zIndex:1,flexShrink:0}}>
        <form onSubmit={handleSubmit} style={{width:'100%',maxWidth:400}}>
          <div style={{textAlign:'center',marginBottom:'2rem'}}>
            <div style={{fontWeight:800,fontSize:'1.75rem',color:cardText,letterSpacing:'-0.02em'}}>Aurohub</div>
            <div style={{fontSize:'0.5rem',fontWeight:700,letterSpacing:'0.15em',color:'#D4A843',textTransform:'uppercase',marginTop:2}}>Powered by Aurovista</div>
          </div>
          <div style={{height:1,background:'linear-gradient(90deg,transparent,#D4A843,transparent)',marginBottom:'2rem'}} />
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:labelColor,marginBottom:'0.4rem'}}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" style={{width:'100%',height:42,padding:'0 1rem',background:inputBg,border:inputBorder,borderRadius:12,color:inputColor,fontSize:'0.9rem',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:'1.75rem',position:'relative'}}>
            <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:labelColor,marginBottom:'0.4rem'}}>Senha</label>
            <input type={showPw?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{width:'100%',height:42,padding:'0 3rem 0 1rem',background:inputBg,border:inputBorder,borderRadius:12,color:inputColor,fontSize:'0.9rem',outline:'none',boxSizing:'border-box'}} />
            <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:12,bottom:14,background:'none',border:'none',color:'#4A5878',cursor:'pointer',fontSize:16}}>{showPw?'🙈':'👁'}</button>
          </div>
          <button type="submit" disabled={loading} style={{width:'100%',height:44,borderRadius:14,border:'none',background:'#1D1D1F',color:'#fff',fontWeight:800,fontSize:'0.95rem',cursor:'pointer',letterSpacing:'0.02em'}}>
            {loading?'Entrando...':'Entrar →'}
          </button>
          {error&&<div style={{marginTop:'1rem',padding:'0.75rem',borderRadius:10,background:'rgba(239,68,68,0.1)',color:'#EF4444',fontSize:'0.8rem',textAlign:'center'}}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

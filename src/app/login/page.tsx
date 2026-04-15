"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole } from "@/lib/auth";
import SplashScreen, { type SplashEffect } from "@/components/splash/SplashScreen";

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

        console.log("[Login] signIn result:", { error: authError, user: data?.user, hasSession: !!data?.session });

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
        console.log("[Login] Profile fetched:", { role: profile?.role, name: profile?.name, licensee_id: profile?.licensee_id });

        const u = data?.user;
        const name = profile?.name
          || (u?.user_metadata?.name as string | undefined)
          || (u?.user_metadata?.full_name as string | undefined)
          || u?.email?.split("@")[0]
          || "você";
        const role = profile?.role ?? null;
        const home = homeForRole(role);
        const splashRoles = ["adm", "cliente", "unidade", "gerente", "vendedor"];
        const canShowSplash = role !== null && splashRoles.includes(role);

        if (!canShowSplash) {
          console.log("[Login] Skipping splash (role=", role, ") → redirect to:", home);
          router.push(home);
          return;
        }

        let splashConfig: Record<string, string | number | undefined> | null = null;

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
          if (cfg.adm_splash_effect) {
            splashConfig = {
              logoUrl: cfg.adm_splash_logo || undefined,
              effect: cfg.adm_splash_effect,
              logoOrientation: "horizontal",
              cor1: cfg.adm_splash_cor1 || "var(--orange)",
              cor2: cfg.adm_splash_cor2 || "#D4A843",
              cor3: cfg.adm_splash_cor3 || "#1E3A6E",
              cor4: cfg.adm_splash_cor4 || "#3B82F6",
              cor5: cfg.adm_splash_cor5 || "#F472B6",
              corFundo: cfg.adm_splash_cor_fundo || "#0E1520",
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
          console.log("[Login] No splash_effect configured → redirect to:", home);
          router.push(home);
          return;
        }

        console.log("[Login] Showing splash → will redirect to:", home);
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
    ? "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(30,58,110,0.5) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(212,168,67,0.08) 0%, transparent 50%), #060B16"
    : "radial-gradient(ellipse 100% 80% at 0% 50%, rgba(30,58,110,0.12) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 20%, rgba(255,122,26,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(212,168,67,0.06) 0%, transparent 50%), #EEF2FA";
  const panelBg = dk ? "rgba(8,14,28,0.92)" : "rgba(255,255,255,0.98)";
  const panelBorder = dk ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(13,22,40,0.10)";
  const heroLogo = dk ? "https://res.cloudinary.com/dxgj4bcch/image/upload/v1774115445/Logo_com_fundo_trans22_1_wujniv.png" : "/logo-laranja.png";
  const heroHeadColor = dk ? "#FFFFFF" : "#1E3A6E";
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
        <img src="https://res.cloudinary.com/dxgj4bcch/image/upload/v1774115445/Logo_com_fundo_trans22_1_wujniv.png" alt="" style={{width:64,height:64,objectFit:'contain',marginBottom:'2.5rem',mixBlendMode:dk?'normal':'multiply',filter:dk?'none':'brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(1000%) hue-rotate(0deg) brightness(100%)'}} />
        <h1 style={{fontFamily:'var(--font-dm-serif)',fontSize:'3rem',lineHeight:1.05,margin:0}}>
          <span style={{display:'block',color:heroHeadColor}}>Templates profissionais.</span>
          <span style={{display:'block',color:'var(--orange)'}}>Sua equipe publica sozinha.</span>
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
          <button type="submit" disabled={loading} style={{width:'100%',height:44,borderRadius:14,border:'none',background:'linear-gradient(135deg,var(--orange),#D4A843)',color:'#fff',fontWeight:800,fontSize:'0.95rem',cursor:'pointer',letterSpacing:'0.02em'}}>
            {loading?'Entrando...':'Entrar →'}
          </button>
          {error&&<div style={{marginTop:'1rem',padding:'0.75rem',borderRadius:10,background:'rgba(239,68,68,0.1)',color:'#EF4444',fontSize:'0.8rem',textAlign:'center'}}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

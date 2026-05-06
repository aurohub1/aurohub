"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, homeForRole } from "@/lib/auth";
import SplashScreen, { type SplashEffect, type TextoEfeito } from "@/components/splash/SplashScreen";

/* ── Particle system ─────────────────────────────── */
interface Particle { x: number; y: number; vx: number; vy: number; r: number; }

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
      const count = Math.floor((window.innerWidth * window.innerHeight) / 14000);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.2 + 0.4,
      }));
    }
    function draw() {
      if (!ctx || !canvas) return;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(212,168,67,0.25)" : "rgba(10,36,99,0.15)";
        ctx.fill();
      }
      const maxDist = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.09;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isDark ? `rgba(212,168,67,${alpha})` : `rgba(10,36,99,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    init(); draw();
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", init); };
  }, [canvasRef]);
}

/* ── Types ───────────────────────────────────────── */
interface SplashData {
  name: string; home: string;
  logoUrl?: string; effect?: string; logoOrientation?: string;
  cor1?: string; cor2?: string; cor3?: string; cor4?: string; cor5?: string;
  corFundo?: string; velocidade?: number; suavidade?: number; somUrl?: string;
  quantidade?: number; tamanho?: number; raioOrbital?: number; nebulosa?: number;
  opacidade?: number; dispersao?: number; velocidadeTexto?: number;
  textoEfeito?: string; glowTexto?: boolean; glowIntensidade?: number;
  textoCor?: string; glowCor?: string;
}

/* ── Component ───────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [splash, setSplash]     = useState<SplashData | null>(null);
  const [theme, setTheme]       = useState<"light" | "dark">("light");

  useParticles(canvasRef);

  useEffect(() => {
    const saved = localStorage.getItem("av-theme") as "light" | "dark" | null;
    const t = saved ?? "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("av-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(""); setLoading(true);
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setError("E-mail ou senha incorretos."); return; }
        const profile = await getProfile();
        if (!profile) { setError("Perfil não encontrado. Contate o suporte."); return; }
        const role = profile.role as string;
        const home = homeForRole(role);
        const name = profile.nome || profile.email || "Bem-vindo";
        let splashConfig: Record<string, string | number | boolean | undefined> | null = null;

        if (role === "adm") {
          const { data: cfgRows } = await supabase.from("system_config").select("key,value").like("key", "adm_splash_%");
          const cfg: Record<string, string> = {};
          for (const r of (cfgRows ?? []) as { key: string; value: string }[]) cfg[r.key] = r.value;
          const num = (k: string, def: number) => { const v = Number(cfg[k]); return Number.isFinite(v) && v > 0 ? v : def; };
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
        } else if (profile?.licensee_id) {
          const { data: lic } = await supabase
            .from("licensees")
            .select("logo_url,splash_effect,splash_logo_orientation,splash_velocidade,splash_suavidade,splash_som_url,cor_primaria,cor_secundaria,cor_acento,cor_fundo,cor4,cor5")
            .eq("id", profile.licensee_id).single();
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

        if (!splashConfig) { router.push(home); return; }
        setLoading(false);
        setSplash({ name, home, ...splashConfig });
      } catch (err) {
        console.error("[Login] signIn exception:", err);
        setError("Erro ao conectar. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  if (splash) {
    return (
      <SplashScreen
        logoUrl={splash.logoUrl || "https://res.cloudinary.com/dxgj4bcch/image/upload/page/page/logo_aurovista.png"}
        logoOrientation={(splash.logoOrientation as "horizontal"|"vertical"|"quadrado") || "horizontal"}
        effect={(splash.effect as SplashEffect) || "random"}
        cor1={splash.cor1 || "var(--orange)"}
        cor2={splash.cor2 || "#D4A843"}
        cor3={splash.cor3 || "#1E3A6E"}
        cor4={splash.cor4} cor5={splash.cor5}
        corFundo={splash.corFundo || "#0E1520"}
        velocidade={splash.velocidade} suavidade={splash.suavidade} somUrl={splash.somUrl}
        quantidade={splash.quantidade} tamanho={splash.tamanho} raioOrbital={splash.raioOrbital}
        nebulosa={splash.nebulosa} opacidade={splash.opacidade} dispersao={splash.dispersao}
        velocidadeTexto={splash.velocidadeTexto}
        textoEfeito={splash.textoEfeito as TextoEfeito | undefined}
        glowTexto={splash.glowTexto} glowIntensidade={splash.glowIntensidade}
        textoCor={splash.textoCor} glowCor={splash.glowCor}
        userName={splash.name}
        onDone={() => router.push(splash.home)}
      />
    );
  }

  const dk = theme === "dark";

  return (
    <div style={{
      display: "flex", width: "100vw", minHeight: "100dvh", position: "relative", overflow: "hidden",
      background: dk
        ? "radial-gradient(ellipse 80% 60% at 20% 50%,rgba(10,36,99,0.55) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 80% 20%,rgba(212,168,67,0.07) 0%,transparent 50%),#06090F"
        : "radial-gradient(ellipse 100% 80% at 0% 50%,rgba(10,36,99,0.07) 0%,transparent 55%),radial-gradient(ellipse 60% 40% at 50% 100%,rgba(212,168,67,0.05) 0%,transparent 50%),#F5F5F7",
    }}>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

      {/* Theme toggle */}
      <button type="button" onClick={toggleTheme} style={{
        position: "fixed", top: 16, right: 16, zIndex: 100,
        width: 44, height: 24, borderRadius: 100, border: `.5px solid ${dk ? "rgba(255,255,255,0.1)" : "rgba(29,29,31,0.12)"}`,
        background: dk ? "rgba(255,255,255,0.06)" : "rgba(29,29,31,0.06)",
        cursor: "pointer", padding: 0, position: "fixed",
      } as React.CSSProperties}>
        <div style={{
          position: "absolute", top: 2, left: 2, width: 20, height: 20, borderRadius: "50%",
          background: dk ? "#1D1D1F" : "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transform: dk ? "translateX(20px)" : "translateX(0)",
          transition: "transform .3s cubic-bezier(.34,1.56,.64,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {dk ? (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 10A6 6 0 0 1 6 3a6 6 0 1 0 7 7z"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/>
            </svg>
          )}
        </div>
      </button>

      {/* Hero — lado esquerdo */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 clamp(2rem,6vw,6rem)", position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "3rem" }}>
          <svg width="36" height="40" viewBox="0 0 100 90" fill="none">
            <path d="M8 88 L50 6 L92 88" stroke={dk ? "rgba(255,255,255,0.9)" : "#0A2463"} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="41" y="52" width="18" height="36" rx="9" fill={dk ? "rgba(255,255,255,0.9)" : "#0A2463"}/>
          </svg>
        </div>

        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, fontSize: "clamp(28px,3.5vw,48px)", lineHeight: 1.08, margin: 0, letterSpacing: "-.025em" }}>
          <span style={{ display: "block", color: dk ? "rgba(255,255,255,0.88)" : "#1D1D1F" }}>Templates profissionais.</span>
          <span style={{ display: "block", fontStyle: "italic", color: "#D4A843" }}>Sua equipe publica sozinha.</span>
        </h1>

        <p style={{ marginTop: "1.4rem", color: dk ? "rgba(255,255,255,0.42)" : "rgba(29,29,31,0.48)", fontSize: "14px", fontWeight: 300, lineHeight: 1.65, maxWidth: 400, fontFamily: "'Inter', sans-serif" }}>
          Identidade visual configurada. Instagram conectado.<br />Pronto para usar.
        </p>

        <div style={{ marginTop: "2.4rem", display: "flex", gap: "2.4rem" }}>
          {[["4+", "Formatos"], ["∞", "Downloads"], ["Direct", "Post Instagram"]].map(([val, lbl], i) => (
            <div key={i}>
              <div style={{ fontSize: "1.4rem", fontWeight: 200, letterSpacing: "-.03em", color: i === 1 ? "#F4742D" : i === 2 ? "#D4A843" : (dk ? "rgba(255,255,255,0.88)" : "#0A2463"), fontFamily: "'Inter', sans-serif" }}>{val}</div>
              <div style={{ fontSize: "10px", fontWeight: 300, letterSpacing: ".1em", textTransform: "uppercase", color: dk ? "rgba(255,255,255,0.28)" : "rgba(29,29,31,0.38)", marginTop: 3, fontFamily: "'Inter', sans-serif" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel — lado direito */}
      <div style={{
        width: "clamp(320px,35vw,420px)", marginRight: "clamp(2rem,8vw,180px)",
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem", position: "relative", zIndex: 1, flexShrink: 0,
      }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: dk ? "rgba(8,12,22,0.9)" : "rgba(255,255,255,0.96)",
          backdropFilter: "blur(48px)", WebkitBackdropFilter: "blur(48px)",
          border: `.5px solid ${dk ? "rgba(255,255,255,0.08)" : "rgba(29,29,31,0.09)"}`,
          borderRadius: 24, padding: "2.2rem 2rem",
          boxShadow: dk ? "0 24px 64px rgba(0,0,0,0.4)" : "0 16px 48px rgba(0,0,0,0.08)",
        }}>
          <form onSubmit={handleSubmit}>
            {/* Header form */}
            <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, fontSize: "1.6rem", letterSpacing: "-.02em", color: dk ? "rgba(255,255,255,0.9)" : "#1D1D1F" }}>Aurohub</div>
              <div style={{ fontSize: "9px", fontWeight: 300, letterSpacing: ".16em", color: "#D4A843", textTransform: "uppercase", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Powered by Aurovista</div>
            </div>

            <div style={{ height: ".5px", background: "linear-gradient(90deg,transparent,rgba(212,168,67,0.4),transparent)", marginBottom: "1.8rem" }} />

            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 300, textTransform: "uppercase", letterSpacing: ".12em", color: dk ? "rgba(255,255,255,0.38)" : "rgba(29,29,31,0.45)", marginBottom: "0.4rem", fontFamily: "'Inter', sans-serif" }}>E-mail</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email"
                style={{
                  width: "100%", height: 42, padding: "0 1rem",
                  background: dk ? "rgba(255,255,255,0.05)" : "rgba(29,29,31,0.04)",
                  border: `.5px solid ${dk ? "rgba(255,255,255,0.1)" : "rgba(29,29,31,0.12)"}`,
                  borderRadius: 12, color: dk ? "#fff" : "#1D1D1F",
                  fontSize: "13px", fontWeight: 300, fontFamily: "'Inter', sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Senha */}
            <div style={{ marginBottom: "1.6rem", position: "relative" }}>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 300, textTransform: "uppercase", letterSpacing: ".12em", color: dk ? "rgba(255,255,255,0.38)" : "rgba(29,29,31,0.45)", marginBottom: "0.4rem", fontFamily: "'Inter', sans-serif" }}>Senha</label>
              <input
                type={showPw ? "text" : "password"} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                style={{
                  width: "100%", height: 42, padding: "0 3rem 0 1rem",
                  background: dk ? "rgba(255,255,255,0.05)" : "rgba(29,29,31,0.04)",
                  border: `.5px solid ${dk ? "rgba(255,255,255,0.1)" : "rgba(29,29,31,0.12)"}`,
                  borderRadius: 12, color: dk ? "#fff" : "#1D1D1F",
                  fontSize: "13px", fontWeight: 300, fontFamily: "'Inter', sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position: "absolute", right: 12, bottom: 11,
                background: "none", border: "none", cursor: "pointer", padding: 4,
                color: dk ? "rgba(255,255,255,0.3)" : "rgba(29,29,31,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", height: 44, borderRadius: 100, border: "none",
              background: loading ? "rgba(29,29,31,0.4)" : "#1D1D1F",
              color: "#F5F5F7", fontFamily: "'Inter', sans-serif",
              fontWeight: 300, fontSize: "13px", letterSpacing: ".04em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .2s",
            }}>
              {loading ? "Entrando..." : "Entrar →"}
            </button>

            {error && (
              <div style={{
                marginTop: "1rem", padding: "10px 14px", borderRadius: 10,
                background: "rgba(239,68,68,0.08)", border: ".5px solid rgba(239,68,68,0.2)",
                color: "#EF4444", fontSize: "12px", fontWeight: 300,
                textAlign: "center", fontFamily: "'Inter', sans-serif",
              }}>{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

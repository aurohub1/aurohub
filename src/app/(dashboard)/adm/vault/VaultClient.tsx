'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { unlockVault, lockVault } from './actions'

interface Props {
  authenticated: boolean
}

// ─── Bokeh canvas ─────────────────────────────────────────────────────────────

function BokehCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    type P = { x:number; y:number; r:number; color:string; alpha:number; sx:number; sy:number; p:number; ps:number }
    let pts: P[] = []
    let W = 0, H = 0

    const rand = (a: number, b: number) => Math.random() * (b - a) + a

    function resize() { W = canvas!.width = canvas!.offsetWidth; H = canvas!.height = canvas!.offsetHeight }

    function init() {
      pts = []
      for (let i = 0; i < 12; i++) pts.push({ x:rand(0,W), y:rand(0,H), r:rand(60,130), color:'rgba(180,90,10,', alpha:rand(0.12,0.22), sx:rand(-0.15,0.15), sy:rand(-0.1,0.1), p:rand(0,Math.PI*2), ps:rand(0.003,0.008) })
      for (let i = 0; i < 18; i++) pts.push({ x:rand(0,W), y:rand(0,H), r:rand(20,55), color:i%2===0?'rgba(212,140,30,':'rgba(200,80,20,', alpha:rand(0.15,0.35), sx:rand(-0.25,0.25), sy:rand(-0.2,0.2), p:rand(0,Math.PI*2), ps:rand(0.006,0.014) })
      for (let i = 0; i < 25; i++) pts.push({ x:rand(0,W), y:rand(0,H), r:rand(3,14), color:i%3===0?'rgba(255,200,80,':'rgba(255,140,40,', alpha:rand(0.3,0.7), sx:rand(-0.3,0.3), sy:rand(-0.25,0.25), p:rand(0,Math.PI*2), ps:rand(0.01,0.025) })
    }

    function draw() {
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle = '#060d1f'
      ctx.fillRect(0,0,W,H)
      for (const p of pts) {
        p.p += p.ps
        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.p))
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r)
        g.addColorStop(0, p.color+a+')')
        g.addColorStop(0.4, p.color+(a*0.4)+')')
        g.addColorStop(1, p.color+'0)')
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle = g; ctx.fill()
        p.x += p.sx; p.y += p.sy
        if (p.x < -p.r*2) p.x = W+p.r
        if (p.x > W+p.r*2) p.x = -p.r
        if (p.y < -p.r*2) p.y = H+p.r
        if (p.y > H+p.r*2) p.y = -p.r
      }
      animId = requestAnimationFrame(draw)
    }

    resize(); init(); draw()
    const ro = new ResizeObserver(() => { resize(); init() })
    ro.observe(canvas!)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
}

// ─── Tela de desbloqueio ──────────────────────────────────────────────────────

function UnlockScreen() {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [status, setStatus] = useState<'idle'|'loading'|'success'>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit() {
    if (!password.trim() || status !== 'idle') return
    setStatus('loading')
    startTransition(async () => {
      const result = await unlockVault(password)
      if (result.success) {
        setStatus('success')
        setTimeout(() => router.refresh(), 600)
      } else {
        setStatus('idle')
        setError(true); setShake(true); setPassword('')
        setTimeout(() => setShake(false), 500)
        setTimeout(() => setError(false), 3000)
        inputRef.current?.focus()
      }
    })
  }

  const btnBg = status === 'loading' ? 'rgba(212,168,67,0.25)' : status === 'success' ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#D4A843,#FF7A1A)'
  const btnText = status === 'loading' ? 'Verificando...' : status === 'success' ? 'Acesso autorizado' : 'Acessar Cofre'

  return (
    <div style={{ minHeight:'100vh', background:'#060d1f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", position:'relative', overflow:'hidden' }}>
      <BokehCanvas />
      <div style={{
        position:'relative', zIndex:2, width:'100%', maxWidth:'420px', margin:'0 24px',
        background:'rgba(12,22,48,0.55)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'22px',
        padding:'40px 44px', backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        display:'flex', flexDirection:'column', gap:'22px',
        boxShadow:'0 24px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)',
        animation: shake ? 'vault-shake 0.45s ease' : undefined,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D4A843"/><stop offset="100%" stopColor="#FF7A1A"/></linearGradient></defs>
            <path d="M20 4L34 30H6L20 4Z" fill="url(#vg)" opacity="0.95"/>
            <path d="M20 13L28 28H12L20 13Z" fill="#060d1f" opacity="0.65"/>
          </svg>
          <span style={{ fontSize:'22px', fontWeight:700, color:'#fff' }}>Aurohub</span>
        </div>

        {/* Título */}
        <div>
          <div style={{ textAlign:'center', fontSize:'30px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>Cofre ADM</div>
          <div style={{ textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.4)', marginTop:'8px' }}>Autenticação de segurança adicional</div>
        </div>

        {/* Campo */}
        <div style={{
          display:'flex', alignItems:'center', gap:'12px',
          background:'rgba(255,255,255,0.05)',
          border:`1.5px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius:'14px', padding:'15px 18px',
          transition:'border-color 0.2s,box-shadow 0.2s',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            ref={inputRef}
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Senha do cofre"
            autoComplete="off"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:'14px', color:'#fff', fontFamily:"'Inter',sans-serif", letterSpacing: password ? '5px' : '0.2px' }}
          />
          <button onClick={() => setShowPw(v => !v)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', flexShrink:0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        {error && <div style={{ fontSize:'12px', color:'rgba(239,68,68,0.8)', textAlign:'center', marginTop:'-10px' }}>Senha incorreta</div>}

        {/* Botão */}
        <button
          onClick={handleSubmit}
          disabled={!password.trim() || status !== 'idle'}
          style={{ width:'100%', padding:'16px', border:'none', borderRadius:'14px', background:btnBg, color:'#fff', fontSize:'15px', fontWeight:600, fontFamily:"'Inter',sans-serif", cursor: !password.trim() || status !== 'idle' ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.2s', boxShadow:'0 4px 24px rgba(212,168,67,0.28)', opacity: !password.trim() ? 0.5 : 1 }}
        >
          {btnText}
          {status === 'idle' && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
          {status === 'success' && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </button>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', fontSize:'11px', color:'rgba(255,255,255,0.18)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color:'rgba(212,168,67,0.45)' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Dados protegidos com <span style={{ color:'rgba(212,168,67,0.6)' }}>criptografia AES-256</span>
        </div>
      </div>

      <style>{`@keyframes vault-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const MODULOS = [
  { key:'banco',     label:'Banco de Dados',    icon:'🗄️', desc:'Supabase · integridade e consistência' },
  { key:'assets',    label:'Assets Cloudinary', icon:'🖼️', desc:'Imagens órfãs e URLs quebradas' },
  { key:'seguranca', label:'Segurança',          icon:'🔐', desc:'RLS, headers HTTP, acessos suspeitos' },
  { key:'infra',     label:'Infraestrutura',     icon:'🚀', desc:'Vercel · builds e variáveis de ambiente' },
  { key:'negocio',   label:'Negócio',            icon:'📊', desc:'Planos, limites e tokens Instagram' },
  { key:'lgpd',      label:'LGPD',               icon:'⚖️', desc:'Consentimentos, titulares e incidentes' },
] as const

function VaultDashboard() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleLock() {
    startTransition(async () => { await lockVault(); router.refresh() })
  }

  return (
    <div style={{ minHeight:'100vh', background:'#060d1f', fontFamily:"'Inter',sans-serif", color:'#f0f0f0', position:'relative' }}>
      <BokehCanvas />
      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(6,13,31,0.7)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <defs><linearGradient id="vg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D4A843"/><stop offset="100%" stopColor="#FF7A1A"/></linearGradient></defs>
              <path d="M20 4L34 30H6L20 4Z" fill="url(#vg2)" opacity="0.95"/>
              <path d="M20 13L28 28H12L20 13Z" fill="#060d1f" opacity="0.65"/>
            </svg>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700 }}>Cofre ADM</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', letterSpacing:'2px' }}>AUROHUB v2</div>
            </div>
          </div>
          <button onClick={handleLock} disabled={isPending} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 16px', fontSize:'12px', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontFamily:"'Inter',sans-serif", transition:'all 0.2s' }}>
            {isPending ? 'Encerrando...' : 'Encerrar sessão'}
          </button>
        </div>

        <div style={{ padding:'32px', maxWidth:'1000px', margin:'0 auto' }}>
          <div style={{ background:'rgba(212,168,67,0.04)', border:'1px solid rgba(212,168,67,0.1)', borderRadius:'16px', padding:'22px 28px', marginBottom:'32px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#D4A843', marginBottom:'6px' }}>Nenhum relatório gerado ainda</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>Execute o primeiro diagnóstico para ver o score de saúde do sistema</div>
            </div>
            <button style={{ background:'linear-gradient(90deg,#D4A843,#FF7A1A)', border:'none', borderRadius:'10px', padding:'11px 24px', fontSize:'13px', fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:"'Inter',sans-serif", whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(212,168,67,0.25)' }}>
              Gerar primeiro relatório
            </button>
          </div>

          <div style={{ marginBottom:'10px', fontSize:'10px', letterSpacing:'2.5px', color:'rgba(255,255,255,0.25)' }}>MÓDULOS DE VERIFICAÇÃO</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px, 1fr))', gap:'10px', marginBottom:'32px' }}>
            {MODULOS.map(m => (
              <div key={m.key} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'24px' }}>{m.icon}</span>
                  <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', background:'rgba(255,171,0,0.1)', color:'rgba(255,171,0,0.85)', fontWeight:700 }}>PENDENTE</span>
                </div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{m.label}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom:'10px', fontSize:'10px', letterSpacing:'2.5px', color:'rgba(255,255,255,0.25)' }}>HISTÓRICO DE RELATÓRIOS</div>
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'48px', textAlign:'center', color:'rgba(255,255,255,0.18)', fontSize:'13px', marginBottom:'20px' }}>
            Nenhum relatório gerado ainda
          </div>

          <div style={{ padding:'14px 20px', background:'rgba(255,255,255,0.015)', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:'24px', flexWrap:'wrap', fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>
            <span>⏱ Frequência: não configurada</span>
            <span>📧 Email: não configurado</span>
            <span>💬 WhatsApp: não configurado</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function VaultClient({ authenticated }: Props) {
  if (!authenticated) return <UnlockScreen />
  return <VaultDashboard />
}

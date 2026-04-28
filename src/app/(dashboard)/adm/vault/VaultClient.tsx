'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { unlockVault, lockVault } from './actions'

interface Props { authenticated: boolean }

function BokehCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const cx = cv.getContext('2d')!
    let id: number
    type P = {x:number;y:number;r:number;color:string;alpha:number;sx:number;sy:number;p:number;ps:number}
    let pts: P[]=[], W=0, H=0
    const rand=(a:number,b:number)=>Math.random()*(b-a)+a
    function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight}
    function init(){
      pts=[]
      for(let i=0;i<12;i++)pts.push({x:rand(0,W),y:rand(0,H),r:rand(60,130),color:'rgba(180,90,10,',alpha:rand(0.12,0.22),sx:rand(-0.15,0.15),sy:rand(-0.1,0.1),p:rand(0,Math.PI*2),ps:rand(0.003,0.008)})
      for(let i=0;i<18;i++)pts.push({x:rand(0,W),y:rand(0,H),r:rand(20,55),color:i%2===0?'rgba(212,140,30,':'rgba(200,80,20,',alpha:rand(0.15,0.35),sx:rand(-0.25,0.25),sy:rand(-0.2,0.2),p:rand(0,Math.PI*2),ps:rand(0.006,0.014)})
      for(let i=0;i<25;i++)pts.push({x:rand(0,W),y:rand(0,H),r:rand(3,14),color:i%3===0?'rgba(255,200,80,':'rgba(255,140,40,',alpha:rand(0.3,0.7),sx:rand(-0.3,0.3),sy:rand(-0.25,0.25),p:rand(0,Math.PI*2),ps:rand(0.01,0.025)})
    }
    function draw(){
      cx.clearRect(0,0,W,H);cx.fillStyle='#060d1f';cx.fillRect(0,0,W,H)
      for(const p of pts){
        p.p+=p.ps;const a=p.alpha*(0.55+0.45*Math.sin(p.p))
        const g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r)
        g.addColorStop(0,p.color+a+')');g.addColorStop(0.4,p.color+(a*0.4)+')');g.addColorStop(1,p.color+'0)')
        cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);cx.fillStyle=g;cx.fill()
        p.x+=p.sx;p.y+=p.sy
        if(p.x<-p.r*2)p.x=W+p.r;if(p.x>W+p.r*2)p.x=-p.r
        if(p.y<-p.r*2)p.y=H+p.r;if(p.y>H+p.r*2)p.y=-p.r
      }
      id=requestAnimationFrame(draw)
    }
    resize();init();draw()
    const ro=new ResizeObserver(()=>{resize();init()});ro.observe(cv)
    return()=>{cancelAnimationFrame(id);ro.disconnect()}
  },[])
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}

function UnlockScreen() {
  const [pw,setPw]=useState('')
  const [show,setShow]=useState(false)
  const [err,setErr]=useState(false)
  const [shake,setShake]=useState(false)
  const [status,setStatus]=useState<'idle'|'loading'|'success'>('idle')
  const [,startT]=useTransition()
  const router=useRouter()
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{ref.current?.focus()},[])
  function submit(){
    if(!pw.trim()||status!=='idle')return
    setStatus('loading')
    startT(async()=>{
      const r=await unlockVault(pw)
      if(r.success){setStatus('success');setTimeout(()=>router.refresh(),600)}
      else{setStatus('idle');setErr(true);setShake(true);setPw('');setTimeout(()=>setShake(false),500);setTimeout(()=>setErr(false),3000);ref.current?.focus()}
    })
  }
  const btnBg=status==='loading'?'rgba(212,168,67,0.25)':status==='success'?'linear-gradient(90deg,#22c55e,#16a34a)':'linear-gradient(90deg,#D4A843,#FF7A1A)'
  return (
    <div style={{colorScheme:'dark',minHeight:'100vh',background:'#060d1f',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',sans-serif",position:'relative',overflow:'hidden'}}>
      <BokehCanvas/>
      <div style={{position:'relative',zIndex:2,width:'100%',maxWidth:'420px',margin:'0 24px',background:'rgba(12,22,48,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',padding:'40px 44px',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',display:'flex',flexDirection:'column',gap:'22px',boxShadow:'0 24px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)',animation:shake?'vault-shake 0.45s ease':undefined}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D4A843"/><stop offset="100%" stopColor="#FF7A1A"/></linearGradient></defs>
            <path d="M20 4L34 30H6L20 4Z" fill="url(#vg)" opacity="0.95"/>
            <path d="M20 13L28 28H12L20 13Z" fill="#060d1f" opacity="0.65"/>
          </svg>
          <span style={{fontSize:'22px',fontWeight:700,color:'#fff'}}>Aurohub</span>
        </div>
        <div>
          <div style={{textAlign:'center',fontSize:'30px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px'}}>Cofre ADM</div>
          <div style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.4)',marginTop:'8px'}}>Autenticação de segurança adicional</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${err?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'14px',padding:'15px 18px'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input ref={ref} type={show?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setErr(false)}} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Senha do cofre" autoComplete="off" style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:'14px',color:'#fff',fontFamily:"'Inter',sans-serif",letterSpacing:pw?'5px':'0.2px'}}/>
          <button onClick={()=>setShow(v=>!v)} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center',flexShrink:0}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        {err&&<div style={{fontSize:'12px',color:'rgba(239,68,68,0.8)',textAlign:'center',marginTop:'-10px'}}>Senha incorreta</div>}
        <button onClick={submit} disabled={!pw.trim()||status!=='idle'} style={{width:'100%',padding:'16px',border:'none',borderRadius:'14px',background:btnBg,color:'#fff',fontSize:'15px',fontWeight:600,fontFamily:"'Inter',sans-serif",cursor:!pw.trim()||status!=='idle'?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 0.2s',boxShadow:'0 4px 24px rgba(212,168,67,0.28)',opacity:!pw.trim()?0.5:1}}>
          {status==='loading'?'Verificando...':status==='success'?'Acesso autorizado ✓':'Acessar Cofre'}
          {status==='idle'&&<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
        </button>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',fontSize:'11px',color:'rgba(255,255,255,0.18)'}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'rgba(212,168,67,0.45)'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Dados protegidos com <span style={{color:'rgba(212,168,67,0.6)'}}>criptografia AES-256</span>
        </div>
      </div>
      <style>{`@keyframes vault-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  )
}

type Token={id:string;store_name:string;ig_user_id:string;access_token:string|null;expires_at:string|null;last_used_at:string|null;status:string}
type Cliente={id:string;name:string;email:string;plan:string;plan_slug:string;status:string;created_at:string}
type Log={id:string;event_type:string;description:string|null;user_name:string|null;created_at:string}
type Auditoria={id?:number;usuario:string;acao:string;ip:string|null;criado_em:string}

function VaultDashboard() {
  const [lockP,startLock]=useTransition()
  const [tokens,setTokens]=useState<Token[]>([])
  const [clientes,setClientes]=useState<Cliente[]>([])
  const [logs,setLogs]=useState<Log[]>([])
  const [auditorias,setAuditorias]=useState<Auditoria[]>([])
  const [loading,setLoading]=useState(true)
  const router=useRouter()

  useEffect(()=>{
    Promise.all([
      fetch('/api/vault/tokens', { credentials: 'include' }).then(r=>r.json()).then(d=>setTokens(d.tokens||[])),
      fetch('/api/vault/clientes', { credentials: 'include' }).then(r=>r.json()).then(d=>setClientes(d.clientes||[])),
      fetch('/api/vault/logs', { credentials: 'include' }).then(r=>r.json()).then(d=>setLogs(d.logs||[])),
      fetch('/api/vault/auditoria', { credentials: 'include' }).then(r=>r.json()).then(d=>setAuditorias(d.auditorias||[]))
    ]).finally(()=>setLoading(false))
  },[])

  return (
    <div style={{colorScheme:'dark',minHeight:'100vh',background:'#060d1f',fontFamily:"'Inter',sans-serif",color:'#f0f0f0',position:'relative'}}>
      <BokehCanvas/>
      <div style={{position:'relative',zIndex:2}}>
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(6,13,31,0.7)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <defs><linearGradient id="vg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D4A843"/><stop offset="100%" stopColor="#FF7A1A"/></linearGradient></defs>
              <path d="M20 4L34 30H6L20 4Z" fill="url(#vg2)" opacity="0.95"/>
              <path d="M20 13L28 28H12L20 13Z" fill="#060d1f" opacity="0.65"/>
            </svg>
            <div><div style={{fontSize:'14px',fontWeight:700}}>Cofre ADM</div><div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',letterSpacing:'2px'}}>AUROHUB v2</div></div>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
            <button onClick={()=>startLock(async()=>{await lockVault();router.refresh()})} disabled={lockP} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'8px 16px',fontSize:'12px',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontFamily:"'Inter',sans-serif"}}>
              {lockP?'Encerrando...':'Encerrar sessão'}
            </button>
          </div>
        </div>

        {loading?(
          <div style={{padding:'60px 32px',textAlign:'center',color:'rgba(255,255,255,0.3)'}}>Carregando dados sensíveis...</div>
        ):(
          <div style={{padding:'32px',maxWidth:'1200px',margin:'0 auto'}}>
            {/* 1. TOKENS INSTAGRAM */}
            <div style={{marginBottom:'28px'}}>
              <div style={{fontSize:'11px',letterSpacing:'2px',color:'rgba(255,255,255,0.25)',marginBottom:'12px'}}>🔑 TOKENS INSTAGRAM</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden'}}>
                {tokens.length===0?(
                  <div style={{padding:'32px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum token cadastrado</div>
                ):(
                  tokens.map(t=>(
                    <div key={t.id} style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                      <div style={{flex:'1 1 200px'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{t.store_name}</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'2px'}}>IG: {t.ig_user_id}</div>
                      </div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>
                        <span style={{padding:'3px 8px',borderRadius:'6px',background:t.status==='ativo'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:t.status==='ativo'?'#22c55e':'#ef4444',fontWeight:600}}>{t.status}</span>
                      </div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.2)',flex:'0 0 140px'}}>
                        Expira: {t.expires_at?new Date(t.expires_at).toLocaleDateString('pt-BR'):'N/A'}
                      </div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.2)',flex:'0 0 140px'}}>
                        Usado: {t.last_used_at?new Date(t.last_used_at).toLocaleDateString('pt-BR'):'Nunca'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. DADOS DO CLIENTE */}
            <div style={{marginBottom:'28px'}}>
              <div style={{fontSize:'11px',letterSpacing:'2px',color:'rgba(255,255,255,0.25)',marginBottom:'12px'}}>👤 DADOS DO CLIENTE</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden'}}>
                {clientes.length===0?(
                  <div style={{padding:'32px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum cliente cadastrado</div>
                ):(
                  clientes.map(c=>(
                    <div key={c.id} style={{padding:'16px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                        <div style={{flex:'1 1 200px'}}>
                          <div style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{c.name}</div>
                          <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginTop:'3px'}}>{c.email}</div>
                        </div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>
                          Plano: <span style={{color:'#D4A843',fontWeight:600}}>{c.plan}</span>
                        </div>
                        <div style={{fontSize:'11px'}}>
                          <span style={{padding:'3px 8px',borderRadius:'6px',background:c.status==='active'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:c.status==='active'?'#22c55e':'#ef4444',fontWeight:600}}>{c.status}</span>
                        </div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.2)'}}>
                          Criado: {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. LOGS DE ACESSO */}
            <div style={{marginBottom:'28px'}}>
              <div style={{fontSize:'11px',letterSpacing:'2px',color:'rgba(255,255,255,0.25)',marginBottom:'12px'}}>📋 LOGS DE ACESSO (últimos 20)</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden',maxHeight:'400px',overflowY:'auto'}}>
                {logs.length===0?(
                  <div style={{padding:'32px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum log registrado</div>
                ):(
                  logs.map(l=>(
                    <div key={l.id} style={{padding:'10px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',gap:'12px',alignItems:'center',fontSize:'12px'}}>
                      <div style={{flex:'0 0 140px',color:'rgba(255,255,255,0.5)',fontSize:'11px'}}>
                        {new Date(l.created_at).toLocaleString('pt-BR')}
                      </div>
                      <div style={{flex:'0 0 130px'}}>
                        <span style={{padding:'2px 6px',borderRadius:'4px',background:'rgba(212,168,67,0.1)',color:'#D4A843',fontSize:'10px',fontWeight:600}}>{l.event_type}</span>
                      </div>
                      <div style={{flex:'1 1 200px',color:'rgba(255,255,255,0.6)'}}>{l.description||'—'}</div>
                      <div style={{flex:'0 0 100px',color:'rgba(255,255,255,0.4)',fontSize:'11px'}}>{l.user_name||'Sistema'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. AUDITORIA DO COFRE */}
            <div>
              <div style={{fontSize:'11px',letterSpacing:'2px',color:'rgba(255,255,255,0.25)',marginBottom:'12px'}}>🔒 AUDITORIA DO COFRE (últimos 10)</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden'}}>
                {auditorias.length===0?(
                  <div style={{padding:'32px',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum acesso registrado</div>
                ):(
                  auditorias.map((a,i)=>(
                    <div key={i} style={{padding:'10px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',gap:'12px',alignItems:'center',fontSize:'12px'}}>
                      <div style={{flex:'0 0 140px',color:'rgba(255,255,255,0.5)',fontSize:'11px'}}>
                        {new Date(a.criado_em).toLocaleString('pt-BR')}
                      </div>
                      <div style={{flex:'0 0 100px',color:'rgba(255,255,255,0.6)',fontWeight:600}}>{a.usuario}</div>
                      <div style={{flex:'0 0 80px'}}>
                        <span style={{padding:'2px 6px',borderRadius:'4px',background:'rgba(34,197,94,0.1)',color:'#22c55e',fontSize:'10px',fontWeight:600}}>{a.acao}</span>
                      </div>
                      <div style={{flex:'1 1 100px',color:'rgba(255,255,255,0.4)',fontSize:'11px'}}>IP: {a.ip||'unknown'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VaultClient({authenticated}:Props){
  if(!authenticated)return <UnlockScreen/>
  return <VaultDashboard/>
}

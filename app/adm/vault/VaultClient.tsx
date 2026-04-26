'use client'

import { useState, useTransition, useRef, useEffect, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { unlockVault, lockVault } from './actions'

interface Props { authenticated: boolean }

function IconLock({ size = 24, open = false }: { size?: number; open?: boolean }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UnlockScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit() {
    if (!password.trim()) return
    startTransition(async () => {
      const result = await unlockVault(password)
      if (result.success) {
        router.refresh()
      } else {
        setError(true); setShake(true); setPassword('')
        setTimeout(() => setShake(false), 500)
        setTimeout(() => setError(false), 3000)
        inputRef.current?.focus()
      }
    })
  }

  const inputStyle: CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${error ? '#ef4444' : 'rgba(212,168,67,0.2)'}`,
    borderRadius: '12px', padding: '14px 16px', fontSize: '15px',
    color: '#f0f0f0', outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(212,168,67,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(212,168,67,0.05) 0%, transparent 70%)', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '380px', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', animation: shake ? 'vault-shake 0.4s ease' : undefined }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(212,168,67,0.08)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(212,168,67,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: error ? '#ef4444' : '#D4A843', transition: 'all 0.3s' }}>
          <IconLock size={32} />
        </div>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '4px', color: 'rgba(212,168,67,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>AUROHUB</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.5px' }}>Cofre ADM</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>Área restrita — autenticação adicional necessária</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input ref={inputRef} type="password" value={password} onChange={e => { setPassword(e.target.value); setError(false) }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Senha do cofre" autoComplete="off" style={inputStyle} onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(212,168,67,0.5)' }} onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(212,168,67,0.2)' }} />
          {error && <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', fontWeight: 500 }}>Senha incorreta</div>}
          <button onClick={handleSubmit} disabled={isPending || !password.trim()} style={{ width: '100%', background: isPending || !password.trim() ? 'rgba(212,168,67,0.25)' : 'linear-gradient(135deg, #D4A843, #b8892e)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 600, color: isPending || !password.trim() ? 'rgba(212,168,67,0.5)' : '#07070f', cursor: isPending || !password.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            {isPending ? 'Verificando...' : 'Acessar Cofre'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.6 }}>Sessão expira em 2 horas<br />Todo acesso é registrado em log</div>
      </div>
      <style>{`@keyframes vault-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }`}</style>
    </div>
  )
}

const MODULOS = [
  { key: 'banco',     label: 'Banco de Dados',    icon: '🗄️', desc: 'Supabase · integridade e consistência' },
  { key: 'assets',    label: 'Assets Cloudinary', icon: '🖼️', desc: 'Imagens órfãs e URLs quebradas' },
  { key: 'seguranca', label: 'Segurança',          icon: '🔐', desc: 'RLS, headers HTTP, acessos suspeitos' },
  { key: 'infra',     label: 'Infraestrutura',     icon: '🚀', desc: 'Vercel · builds e variáveis de ambiente' },
  { key: 'negocio',   label: 'Negócio',            icon: '📊', desc: 'Planos, limites e tokens Instagram' },
  { key: 'lgpd',      label: 'LGPD',               icon: '⚖️', desc: 'Consentimentos, titulares e incidentes' },
] as const

function VaultDashboard() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleLock() {
    startTransition(async () => { await lockVault(); router.refresh() })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', fontFamily: "'DM Sans', sans-serif", color: '#f0f0f0' }}>
      <div style={{ borderBottom: '1px solid rgba(212,168,67,0.1)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(212,168,67,0.015)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4A843' }}>
            <IconLock size={16} open />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Cofre ADM</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px' }}>AUROHUB v2</div>
          </div>
        </div>
        <button onClick={handleLock} disabled={isPending} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
          <IconLock size={11} /> {isPending ? 'Encerrando...' : 'Encerrar sessão'}
        </button>
      </div>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.1)', borderRadius: '16px', padding: '22px 28px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#D4A843', marginBottom: '6px' }}>Nenhum relatório gerado ainda</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>Execute o primeiro diagnóstico para ver o score de saúde do sistema</div>
          </div>
          <button style={{ background: 'linear-gradient(135deg, #D4A843, #b8892e)', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '13px', fontWeight: 600, color: '#07070f', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Gerar primeiro relatório</button>
        </div>
        <div style={{ marginBottom: '10px', fontSize: '10px', letterSpacing: '2.5px', color: 'rgba(255,255,255,0.25)' }}>MÓDULOS DE VERIFICAÇÃO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '10px', marginBottom: '32px' }}>
          {MODULOS.map(m => (
            <div key={m.key} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.2)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '24px' }}>{m.icon}</span>
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,171,0,0.1)', color: 'rgba(255,171,0,0.85)', fontWeight: 700 }}>PENDENTE</span>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '10px', fontSize: '10px', letterSpacing: '2.5px', color: 'rgba(255,255,255,0.25)' }}>HISTÓRICO DE RELATÓRIOS</div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: '13px', marginBottom: '20px' }}>Nenhum relatório gerado ainda</div>
        <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          <span>⏱ Frequência: não configurada</span>
          <span>📧 Email: não configurado</span>
          <span>💬 WhatsApp: não configurado</span>
        </div>
      </div>
    </div>
  )
}

export default function VaultClient({ authenticated }: Props) {
  if (!authenticated) return <UnlockScreen />
  return <VaultDashboard />
}

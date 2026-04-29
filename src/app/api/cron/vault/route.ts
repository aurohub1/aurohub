// src/app/api/cron/vault/route.ts
// Robô de manutenção e segurança do Aurohub v2
// Roda via Vercel Cron ou botão manual no Vault

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Alerta = {
  modulo: string
  nivel: 'info' | 'aviso' | 'critico'
  mensagem: string
}

type Resultado = {
  score: number
  alertas: Alerta[]
  detalhes: Record<string, unknown>
}

// ─── Verificações ─────────────────────────────────────────────────────────────

async function verificarBanco(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  try {
    // Verificar tabelas principais existem
    const tabelas = ['usuarios', 'templates', 'marcas', 'lojas']
    let tabelasOk = 0

    for (const tabela of tabelas) {
      const { error } = await supabase.from(tabela).select('id').limit(1)
      if (error) {
        alertas.push({ modulo: 'banco', nivel: 'critico', mensagem: `Tabela "${tabela}" inacessível: ${error.message}` })
        score -= 20
      } else {
        tabelasOk++
      }
    }

    detalhes.tabelas_verificadas = tabelas.length
    detalhes.tabelas_ok = tabelasOk

    // Contar registros nas tabelas principais
    const { count: totalUsuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
    detalhes.total_usuarios = totalUsuarios ?? 0

    const { count: totalMarcas } = await supabase
      .from('marcas')
      .select('*', { count: 'exact', head: true })
    detalhes.total_marcas = totalMarcas ?? 0

  } catch (e) {
    alertas.push({ modulo: 'banco', nivel: 'critico', mensagem: `Erro ao verificar banco: ${String(e)}` })
    score = 0
  }

  return { score: Math.max(0, score), alertas, detalhes }
}

async function verificarAssets(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  try {
    // Templates com imgfundo vazio
    const { count: semFundo } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .or('imgfundo.is.null,imgfundo.eq.')
    detalhes.templates_sem_imgfundo = semFundo ?? 0
    if ((semFundo ?? 0) > 5) {
      alertas.push({ modulo: 'assets', nivel: 'aviso', mensagem: `${semFundo} template(s) sem imagem de fundo` })
      score -= 15
    }

    // Total de templates
    const { count: totalTemplates } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
    detalhes.total_templates = totalTemplates ?? 0

  } catch (e) {
    alertas.push({ modulo: 'assets', nivel: 'aviso', mensagem: `Erro ao verificar assets: ${String(e)}` })
    score -= 20
  }

  return { score: Math.max(0, score), alertas, detalhes }
}

async function verificarSeguranca(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  // Verificar variáveis de ambiente críticas
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VAULT_PASSWORD',
  ]
  const faltando: string[] = []
  for (const v of envVars) {
    if (!process.env[v]) faltando.push(v)
  }
  detalhes.env_vars_ok = envVars.length - faltando.length
  detalhes.env_vars_total = envVars.length
  if (faltando.length > 0) {
    alertas.push({ modulo: 'seguranca', nivel: 'critico', mensagem: `Variáveis ausentes: ${faltando.join(', ')}` })
    score -= faltando.length * 15
  }

  // Verificar se VAULT_PASSWORD tem força mínima
  const vaultPw = process.env.VAULT_PASSWORD ?? ''
  if (vaultPw.length < 12) {
    alertas.push({ modulo: 'seguranca', nivel: 'aviso', mensagem: 'VAULT_PASSWORD com menos de 12 caracteres — recomenda-se senha mais forte' })
    score -= 10
  }
  detalhes.vault_password_forca = vaultPw.length >= 12 ? 'boa' : 'fraca'

  return { score: Math.max(0, score), alertas, detalhes }
}

async function verificarInfra(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  // Verificar Supabase acessível
  try {
    const start = Date.now()
    const { error } = await supabase.from('marcas').select('id').limit(1)
    const latencia = Date.now() - start
    detalhes.supabase_latencia_ms = latencia
    if (error) {
      alertas.push({ modulo: 'infra', nivel: 'critico', mensagem: `Supabase inacessível: ${error.message}` })
      score -= 40
    } else if (latencia > 2000) {
      alertas.push({ modulo: 'infra', nivel: 'aviso', mensagem: `Supabase lento: ${latencia}ms` })
      score -= 15
    }
  } catch (e) {
    alertas.push({ modulo: 'infra', nivel: 'critico', mensagem: `Erro de conexão Supabase: ${String(e)}` })
    score -= 40
  }

  // Verificar Cloudinary configurado
  const cloudinaryOk = !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  detalhes.cloudinary_configurado = cloudinaryOk
  if (!cloudinaryOk) {
    alertas.push({ modulo: 'infra', nivel: 'aviso', mensagem: 'CLOUDINARY_CLOUD_NAME não configurado' })
    score -= 10
  }

  return { score: Math.max(0, score), alertas, detalhes }
}

async function verificarNegocio(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  try {
    // Total de marcas/clientes ativos
    const { count: totalMarcas } = await supabase
      .from('marcas')
      .select('*', { count: 'exact', head: true })
    detalhes.total_marcas = totalMarcas ?? 0

    // Usuários ativos
    const { count: totalUsuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
    detalhes.total_usuarios = totalUsuarios ?? 0

    // Templates publicados
    const { count: totalTemplates } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
    detalhes.total_templates = totalTemplates ?? 0

  } catch (e) {
    alertas.push({ modulo: 'negocio', nivel: 'aviso', mensagem: `Erro ao verificar negócio: ${String(e)}` })
    score -= 10
  }

  return { score: Math.max(0, score), alertas, detalhes }
}

async function verificarLGPD(): Promise<Resultado> {
  const alertas: Alerta[] = []
  const detalhes: Record<string, unknown> = {}
  let score = 100

  // Verificar se schema cofre existe
  try {
    const { error } = await supabase.from('cofre.incidentes' as never).select('id').limit(1)
    if (error && error.code === '42P01') {
      alertas.push({ modulo: 'lgpd', nivel: 'critico', mensagem: 'Schema cofre não encontrado — rode vault_schema.sql no Supabase' })
      score -= 30
    } else {
      detalhes.schema_cofre = 'ok'
    }
  } catch {
    detalhes.schema_cofre = 'verificação pendente'
  }

  // Incidentes abertos
  try {
    const { count: incidentesAbertos } = await supabase
      .schema('cofre' as never)
      .from('incidentes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aberto')
    detalhes.incidentes_abertos = incidentesAbertos ?? 0
    if ((incidentesAbertos ?? 0) > 0) {
      alertas.push({ modulo: 'lgpd', nivel: 'critico', mensagem: `${incidentesAbertos} incidente(s) de segurança em aberto` })
      score -= 20
    }
  } catch {
    detalhes.incidentes_abertos = 'não verificado'
  }

  return { score: Math.max(0, score), alertas, detalhes }
}

// ─── Notificações ─────────────────────────────────────────────────────────────

async function enviarEmail(relatorio: Record<string, unknown>): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false

  const scores = relatorio.scores as Record<string, number>
  const alertas = relatorio.alertas as Alerta[]
  const scoreGeral = relatorio.score_geral as number

  const emoji = (s: number) => s >= 90 ? '🟢' : s >= 70 ? '🟡' : '🔴'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0E1520;color:#f0f0f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#D4A843,#FF7A1A);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#000;font-size:22px;">🔐 Aurohub — Relatório de Saúde</h1>
        <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:13px;">${new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
      </div>
      <div style="padding:24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;font-weight:700;color:${scoreGeral >= 90 ? '#4ade80' : scoreGeral >= 70 ? '#fbbf24' : '#f87171'}">${scoreGeral}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);">Score Geral</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${Object.entries(scores).map(([k, v]) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:10px 0;font-size:13px;">${emoji(v)} ${k.charAt(0).toUpperCase() + k.slice(1)}</td>
              <td style="padding:10px 0;text-align:right;font-size:13px;font-weight:600;">${v}/100</td>
            </tr>
          `).join('')}
        </table>
        ${alertas.length > 0 ? `
          <div style="margin-top:20px;background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;">
            <div style="font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-bottom:10px;">ALERTAS</div>
            ${alertas.map(a => `<div style="font-size:12px;color:${a.nivel==='critico'?'#f87171':a.nivel==='aviso'?'#fbbf24':'#93c5fd'};margin-bottom:6px;">• ${a.mensagem}</div>`).join('')}
          </div>
        ` : '<div style="margin-top:20px;text-align:center;font-size:13px;color:#4ade80;">✅ Nenhum alerta encontrado</div>'}
        <div style="margin-top:20px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://aurohub-v2.vercel.app'}/adm/vault" style="background:linear-gradient(135deg,#D4A843,#FF7A1A);color:#000;font-weight:600;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;">Ver Detalhes no Cofre</a>
        </div>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Aurohub <noreply@aurovista.com.br>',
        to: ['contato@aurovista.com.br'],
        subject: `🔐 Aurohub — Saúde do Sistema: ${scoreGeral}/100`,
        html,
      })
    })
    return res.ok
  } catch {
    return false
  }
}

async function enviarWhatsApp(scoreGeral: number, alertas: Alerta[]): Promise<boolean> {
  const apiKey = process.env.CALLMEBOT_API_KEY
  const phone = process.env.CALLMEBOT_PHONE
  if (!apiKey || !phone) return false

  const emoji = (s: number) => s >= 90 ? '🟢' : s >= 70 ? '🟡' : '🔴'
  const msg = [
    `${emoji(scoreGeral)} *Aurohub — Saúde do Sistema*`,
    `Score Geral: *${scoreGeral}/100*`,
    alertas.length > 0
      ? `⚠️ ${alertas.length} alerta(s):\n${alertas.slice(0,3).map(a => `• ${a.mensagem}`).join('\n')}`
      : '✅ Nenhum alerta',
    `_${new Date().toLocaleDateString('pt-BR')}_`
  ].join('\n')

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${apiKey}`
    const res = await fetch(url)
    return res.ok
  } catch {
    return false
  }
}

// ─── Salvar relatório no Supabase ─────────────────────────────────────────────

async function salvarRelatorio(
  resultados: Record<string, Resultado>,
  emailOk: boolean,
  whatsappOk: boolean
) {
  const scores = {
    banco: resultados.banco.score,
    assets: resultados.assets.score,
    seguranca: resultados.seguranca.score,
    infra: resultados.infra.score,
    negocio: resultados.negocio.score,
    lgpd: resultados.lgpd.score,
  }
  const scoreGeral = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6)
  const alertas = Object.values(resultados).flatMap(r => r.alertas)
  const detalhes = Object.fromEntries(Object.entries(resultados).map(([k, v]) => [k, v.detalhes]))

  // Usar função RPC para salvar no schema cofre
  const { data, error } = await supabase.rpc('save_vault_report', {
    p_score_banco: scores.banco,
    p_score_assets: scores.assets,
    p_score_seguranca: scores.seguranca,
    p_score_infra: scores.infra,
    p_score_negocio: scores.negocio,
    p_score_lgpd: scores.lgpd,
    p_detalhes: detalhes,
    p_alertas: alertas,
    p_enviado_email: emailOk,
    p_enviado_whatsapp: whatsappOk,
  }) as { data: { id: string } | null; error: { code?: string } | null }

  // Se a função RPC não existe (schema não criado), ignorar erro
  if (error && (error.code === '42883' || error.code === '42P01')) {
    return { data: null, error: null, scoreGeral, alertas, scores }
  }

  return { data, error, scoreGeral, alertas, scores }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Autorização — aceita cron do Vercel ou chamada manual do Vault
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const isManual = auth === `Bearer ${process.env.VAULT_PASSWORD}`

  if (cronSecret && !isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Rodar todas as verificações em paralelo
    const [banco, assets, seguranca, infra, negocio, lgpd] = await Promise.all([
      verificarBanco(),
      verificarAssets(),
      verificarSeguranca(),
      verificarInfra(),
      verificarNegocio(),
      verificarLGPD(),
    ])

    const resultados = { banco, assets, seguranca, infra, negocio, lgpd }
    const alertas = Object.values(resultados).flatMap(r => r.alertas)
    const scoreGeral = Math.round(
      [banco, assets, seguranca, infra, negocio, lgpd].reduce((a, r) => a + r.score, 0) / 6
    )

    // Notificações
    const [emailOk, whatsappOk] = await Promise.all([
      enviarEmail({ scores: { banco: banco.score, assets: assets.score, seguranca: seguranca.score, infra: infra.score, negocio: negocio.score, lgpd: lgpd.score }, alertas, score_geral: scoreGeral }),
      enviarWhatsApp(scoreGeral, alertas),
    ])

    // Salvar no banco
    const { data, error } = await salvarRelatorio(resultados, emailOk, whatsappOk)
    if (error) console.error('Erro ao salvar relatório:', error)

    return NextResponse.json({
      success: true,
      score_geral: scoreGeral,
      scores: {
        banco: banco.score,
        assets: assets.score,
        seguranca: seguranca.score,
        infra: infra.score,
        negocio: negocio.score,
        lgpd: lgpd.score,
      },
      alertas,
      notificacoes: { email: emailOk, whatsapp: whatsappOk },
      relatorio_id: (data as Record<string, unknown>)?.id ?? null,
    })

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST para rodar o diagnóstico' })
}

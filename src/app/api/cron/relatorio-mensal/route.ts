// src/app/api/cron/relatorio-mensal/route.ts
// Relatório mensal automático — roda dia 1 de cada mês às 8h
// Gera resumo de publicações do mês anterior e envia via email

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY!)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Licensee = {
  id: string
  name: string
  email: string | null
  status: string
}

type LicenseeReport = {
  licensee: Licensee
  totalPosts: number
  byFormat: { stories: number; feed: number; reels: number; tv: number }
  byStore: { store_id: string; store_name: string; count: number }[]
  topUser: { user_id: string; user_name: string; count: number } | null
  topTemplate: { template_id: string; template_name: string; count: number } | null
  comparison: {
    totalLastMonth: number
    totalTwoMonthsAgo: number
    percentChange: number
  }
}

// ─── Helper: Datas do mês anterior ───────────────────────────────────────────

function getLastMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end }
}

function getTwoMonthsAgoRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { start, end }
}

// ─── Buscar dados do licensee ─────────────────────────────────────────────────

async function generateLicenseeReport(licensee: Licensee): Promise<LicenseeReport> {
  const lastMonth = getLastMonthRange()
  const twoMonthsAgo = getTwoMonthsAgoRange()

  // Buscar todas as lojas do licensee
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('licensee_id', licensee.id)

  const storeIds = (stores || []).map(s => s.id)

  if (storeIds.length === 0) {
    return {
      licensee,
      totalPosts: 0,
      byFormat: { stories: 0, feed: 0, reels: 0, tv: 0 },
      byStore: [],
      topUser: null,
      topTemplate: null,
      comparison: { totalLastMonth: 0, totalTwoMonthsAgo: 0, percentChange: 0 },
    }
  }

  // Posts do mês anterior
  const { data: lastMonthPosts } = await supabase
    .from('publication_history')
    .select('id, store_id, user_id, template_id, metadata')
    .in('store_id', storeIds)
    .gte('published_at', lastMonth.start.toISOString())
    .lt('published_at', lastMonth.end.toISOString())

  // Posts de 2 meses atrás (para comparação)
  const { data: twoMonthsAgoPosts } = await supabase
    .from('publication_history')
    .select('id')
    .in('store_id', storeIds)
    .gte('published_at', twoMonthsAgo.start.toISOString())
    .lt('published_at', twoMonthsAgo.end.toISOString())

  const totalLastMonth = lastMonthPosts?.length || 0
  const totalTwoMonthsAgo = twoMonthsAgoPosts?.length || 0
  const percentChange =
    totalTwoMonthsAgo > 0
      ? ((totalLastMonth - totalTwoMonthsAgo) / totalTwoMonthsAgo) * 100
      : totalLastMonth > 0
      ? 100
      : 0

  // Posts por formato
  const byFormat = { stories: 0, feed: 0, reels: 0, tv: 0 }
  lastMonthPosts?.forEach(p => {
    const format = p.metadata?.format as 'stories' | 'feed' | 'reels' | 'tv' | undefined
    if (format && format in byFormat) byFormat[format]++
  })

  // Posts por loja
  const storeCountMap: Record<string, number> = {}
  lastMonthPosts?.forEach(p => {
    storeCountMap[p.store_id] = (storeCountMap[p.store_id] || 0) + 1
  })
  const byStore = Object.entries(storeCountMap)
    .map(([store_id, count]) => {
      const store = stores?.find(s => s.id === store_id)
      return { store_id, store_name: store?.name || 'Loja', count }
    })
    .sort((a, b) => b.count - a.count)

  // Usuário mais ativo
  const userCountMap: Record<string, number> = {}
  lastMonthPosts?.forEach(p => {
    if (p.user_id) userCountMap[p.user_id] = (userCountMap[p.user_id] || 0) + 1
  })
  const topUserEntry = Object.entries(userCountMap).sort((a, b) => b[1] - a[1])[0]
  let topUser: LicenseeReport['topUser'] = null
  if (topUserEntry) {
    const { data: userData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', topUserEntry[0])
      .single()
    topUser = {
      user_id: topUserEntry[0],
      user_name: userData?.name || 'Usuário',
      count: topUserEntry[1],
    }
  }

  // Template mais usado
  const templateCountMap: Record<string, number> = {}
  lastMonthPosts?.forEach(p => {
    if (p.template_id) templateCountMap[p.template_id] = (templateCountMap[p.template_id] || 0) + 1
  })
  const topTemplateEntry = Object.entries(templateCountMap).sort((a, b) => b[1] - a[1])[0]
  let topTemplate: LicenseeReport['topTemplate'] = null
  if (topTemplateEntry) {
    const { data: templateData } = await supabase
      .from('form_templates')
      .select('name')
      .eq('id', topTemplateEntry[0])
      .single()
    topTemplate = {
      template_id: topTemplateEntry[0],
      template_name: templateData?.name || 'Template',
      count: topTemplateEntry[1],
    }
  }

  return {
    licensee,
    totalPosts: totalLastMonth,
    byFormat,
    byStore,
    topUser,
    topTemplate,
    comparison: { totalLastMonth, totalTwoMonthsAgo, percentChange },
  }
}

// ─── Template HTML do email ───────────────────────────────────────────────────

function renderLicenseeEmail(report: LicenseeReport, monthName: string): string {
  const { licensee, totalPosts, byFormat, byStore, topUser, topTemplate, comparison } = report
  const changeIcon = comparison.percentChange > 0 ? '📈' : comparison.percentChange < 0 ? '📉' : '➡️'
  const changeColor = comparison.percentChange > 0 ? '#22C55E' : comparison.percentChange < 0 ? '#EF4444' : '#8A9BBF'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0E1520; color: #EEF2FF; }
    .container { max-width: 600px; margin: 40px auto; background: #1A2333; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #D4A843 0%, #FF7A1A 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0E1520; }
    .content { padding: 32px 24px; }
    .stat-card { background: #0E1520; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A9BBF; margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: 800; color: #D4A843; }
    .stat-sub { font-size: 13px; color: #8A9BBF; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .format-badge { background: rgba(212, 168, 67, 0.12); border: 1px solid rgba(212, 168, 67, 0.2); border-radius: 8px; padding: 12px; text-align: center; }
    .format-badge .label { font-size: 10px; font-weight: 600; color: #8A9BBF; margin-bottom: 4px; }
    .format-badge .count { font-size: 18px; font-weight: 700; color: #D4A843; }
    .store-row { background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .store-name { font-size: 13px; font-weight: 600; color: #EEF2FF; }
    .store-count { font-size: 14px; font-weight: 700; color: #FF7A1A; }
    .comparison { background: #0E1520; border-radius: 12px; padding: 20px; text-align: center; margin-top: 16px; }
    .comparison-value { font-size: 28px; font-weight: 800; margin: 8px 0; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #4A5878; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Mensal de Publicações</h1>
      <div style="font-size: 14px; color: rgba(14, 21, 32, 0.7); margin-top: 8px;">${monthName} · ${licensee.name}</div>
    </div>
    <div class="content">
      <div class="stat-card">
        <div class="stat-label">Total de Publicações</div>
        <div class="stat-value">${totalPosts}</div>
        <div class="stat-sub">${monthName}</div>
      </div>

      <div class="stat-label" style="margin-bottom: 12px;">Posts por Formato</div>
      <div class="grid">
        <div class="format-badge">
          <div class="label">Stories</div>
          <div class="count">${byFormat.stories}</div>
        </div>
        <div class="format-badge">
          <div class="label">Feed</div>
          <div class="count">${byFormat.feed}</div>
        </div>
        <div class="format-badge">
          <div class="label">Reels</div>
          <div class="count">${byFormat.reels}</div>
        </div>
        <div class="format-badge">
          <div class="label">TV</div>
          <div class="count">${byFormat.tv}</div>
        </div>
      </div>

      ${byStore.length > 0 ? `
      <div class="stat-label" style="margin: 24px 0 12px;">Posts por Loja</div>
      ${byStore.map(s => `
      <div class="store-row">
        <div class="store-name">${s.store_name}</div>
        <div class="store-count">${s.count}</div>
      </div>
      `).join('')}
      ` : ''}

      ${topUser ? `
      <div class="stat-card" style="margin-top: 24px;">
        <div class="stat-label">Usuário Mais Ativo</div>
        <div style="font-size: 18px; font-weight: 700; color: #EEF2FF; margin-top: 8px;">${topUser.user_name}</div>
        <div class="stat-sub">${topUser.count} publicações</div>
      </div>
      ` : ''}

      ${topTemplate ? `
      <div class="stat-card">
        <div class="stat-label">Template Mais Usado</div>
        <div style="font-size: 18px; font-weight: 700; color: #EEF2FF; margin-top: 8px;">${topTemplate.template_name}</div>
        <div class="stat-sub">${topTemplate.count} usos</div>
      </div>
      ` : ''}

      <div class="comparison">
        <div class="stat-label">Comparativo com Mês Anterior</div>
        <div class="comparison-value" style="color: ${changeColor};">
          ${changeIcon} ${comparison.percentChange > 0 ? '+' : ''}${comparison.percentChange.toFixed(1)}%
        </div>
        <div class="stat-sub">
          ${comparison.totalTwoMonthsAgo} posts há 2 meses → ${comparison.totalLastMonth} posts no mês passado
        </div>
      </div>
    </div>
    <div class="footer">
      Relatório gerado automaticamente pelo Aurohub<br>
      <a href="https://aurohub.app" style="color: #D4A843; text-decoration: none;">aurohub.app</a>
    </div>
  </div>
</body>
</html>
  `
}

function renderAdminEmail(reports: LicenseeReport[], monthName: string): string {
  const totalPosts = reports.reduce((sum, r) => sum + r.totalPosts, 0)
  const totalLicensees = reports.length
  const avgPerLicensee = totalLicensees > 0 ? Math.round(totalPosts / totalLicensees) : 0

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0E1520; color: #EEF2FF; }
    .container { max-width: 800px; margin: 40px auto; background: #1A2333; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #D4A843 0%, #FF7A1A 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #0E1520; }
    .content { padding: 32px 24px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { background: #0E1520; border-radius: 12px; padding: 20px; text-align: center; }
    .summary-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A9BBF; margin-bottom: 8px; }
    .summary-value { font-size: 32px; font-weight: 800; color: #D4A843; }
    .licensee-row { background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .licensee-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .licensee-name { font-size: 16px; font-weight: 700; color: #EEF2FF; }
    .licensee-posts { font-size: 18px; font-weight: 800; color: #FF7A1A; }
    .licensee-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px; }
    .stat-item { text-align: center; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; }
    .stat-item .label { color: #8A9BBF; margin-bottom: 4px; }
    .stat-item .value { color: #D4A843; font-weight: 700; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #4A5878; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Mensal Global</h1>
      <div style="font-size: 14px; color: rgba(14, 21, 32, 0.7); margin-top: 8px;">${monthName} · Todos os Clientes</div>
    </div>
    <div class="content">
      <div class="summary">
        <div class="summary-card">
          <div class="summary-label">Total de Posts</div>
          <div class="summary-value">${totalPosts}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Clientes Ativos</div>
          <div class="summary-value">${totalLicensees}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Média/Cliente</div>
          <div class="summary-value">${avgPerLicensee}</div>
        </div>
      </div>

      <div class="summary-label" style="margin-bottom: 16px;">Detalhamento por Cliente</div>
      ${reports.sort((a, b) => b.totalPosts - a.totalPosts).map(r => `
      <div class="licensee-row">
        <div class="licensee-header">
          <div class="licensee-name">${r.licensee.name}</div>
          <div class="licensee-posts">${r.totalPosts} posts</div>
        </div>
        <div class="licensee-stats">
          <div class="stat-item">
            <div class="label">Stories</div>
            <div class="value">${r.byFormat.stories}</div>
          </div>
          <div class="stat-item">
            <div class="label">Feed</div>
            <div class="value">${r.byFormat.feed}</div>
          </div>
          <div class="stat-item">
            <div class="label">Reels</div>
            <div class="value">${r.byFormat.reels}</div>
          </div>
          <div class="stat-item">
            <div class="label">TV</div>
            <div class="value">${r.byFormat.tv}</div>
          </div>
        </div>
        ${r.comparison.percentChange !== 0 ? `
        <div style="text-align: center; margin-top: 12px; font-size: 12px; color: ${r.comparison.percentChange > 0 ? '#22C55E' : '#EF4444'};">
          ${r.comparison.percentChange > 0 ? '📈' : '📉'} ${r.comparison.percentChange > 0 ? '+' : ''}${r.comparison.percentChange.toFixed(1)}% vs mês anterior
        </div>
        ` : ''}
      </div>
      `).join('')}
    </div>
    <div class="footer">
      Relatório gerado automaticamente pelo Aurohub<br>
      <a href="https://aurohub.app" style="color: #D4A843; text-decoration: none;">aurohub.app</a>
    </div>
  </div>
</body>
</html>
  `
}

// ─── Handler Principal ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Verificar autorização
  const cronHeader = request.headers.get('x-vercel-cron')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    cronHeader === '1' ||
    (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[relatorio-mensal] Iniciando geração de relatórios...')

    // Buscar todos os licensees ativos
    const { data: licensees } = await supabase
      .from('licensees')
      .select('id, name, email, status')
      .eq('status', 'active')

    if (!licensees || licensees.length === 0) {
      console.log('[relatorio-mensal] Nenhum licensee ativo encontrado')
      return NextResponse.json({ message: 'Nenhum licensee ativo' })
    }

    console.log(`[relatorio-mensal] ${licensees.length} licensees encontrados`)

    // Gerar relatórios para cada licensee
    const reports: LicenseeReport[] = []
    for (const licensee of licensees) {
      const report = await generateLicenseeReport(licensee as Licensee)
      reports.push(report)
    }

    // Nome do mês anterior
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthName = lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)

    // Enviar email para cada licensee
    let sentToLicensees = 0
    for (const report of reports) {
      if (report.licensee.email && report.totalPosts > 0) {
        try {
          await resend.emails.send({
            from: 'Aurohub <noreply@aurovista.com.br>',
            to: report.licensee.email,
            subject: `📊 Relatório Mensal de Publicações - ${monthNameCapitalized}`,
            html: renderLicenseeEmail(report, monthNameCapitalized),
          })
          sentToLicensees++
          console.log(`[relatorio-mensal] Email enviado para ${report.licensee.name}`)
        } catch (err) {
          console.error(`[relatorio-mensal] Erro ao enviar email para ${report.licensee.name}:`, err)
        }
      }
    }

    // Enviar email consolidado para ADM
    try {
      await resend.emails.send({
        from: 'Aurohub <noreply@aurovista.com.br>',
        to: 'contato@aurovista.com.br',
        subject: `📊 Relatório Mensal Global - ${monthNameCapitalized}`,
        html: renderAdminEmail(reports, monthNameCapitalized),
      })
      console.log('[relatorio-mensal] Email global enviado para ADM')
    } catch (err) {
      console.error('[relatorio-mensal] Erro ao enviar email global:', err)
    }

    return NextResponse.json({
      message: 'Relatórios gerados com sucesso',
      licensees: licensees.length,
      emailsSent: sentToLicensees + 1,
      month: monthNameCapitalized,
    })
  } catch (error) {
    console.error('[relatorio-mensal] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatórios', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

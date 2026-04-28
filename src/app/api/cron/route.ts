// src/app/api/cron/route.ts
// Cron job diário do Aurohub — roda todo dia às 8h
// Monitora atividade de publicações, expiração de tokens e envia resumos semanais

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aurohub-v2.vercel.app'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Store = {
  id: string
  name: string
  licensee_id: string
}

type User = {
  id: string
  name: string | null
  role: string
}

type PublicationSummary = {
  store_id: string
  store_name: string
  count: number
  last_published_at: string | null
}

// ─── Helper: Enviar Push Notification ────────────────────────────────────────

async function sendPush(params: {
  userId?: string
  userIds?: string[]
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}): Promise<{ sent: number; failed: number }> {
  try {
    const res = await fetch(`${APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      console.error('[cron] push/send falhou:', res.status, await res.text().catch(() => ''))
      return { sent: 0, failed: 1 }
    }

    const data = await res.json()
    return { sent: data.sent ?? 0, failed: data.failed ?? 0 }
  } catch (err) {
    console.error('[cron] erro ao enviar push:', err)
    return { sent: 0, failed: 1 }
  }
}

// ─── Helper: Buscar usuários de uma loja ─────────────────────────────────────

async function getStoreUsers(storeId: string): Promise<string[]> {
  // Buscar usuários com acesso à loja via user_stores
  const { data: userStores } = await supabase
    .from('user_stores')
    .select('user_id')
    .eq('store_id', storeId)

  if (!userStores || userStores.length === 0) return []

  return userStores.map(us => us.user_id)
}

// ─── Helper: Buscar ADMs ──────────────────────────────────────────────────────

async function getAdmins(): Promise<string[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'adm')

  if (!profiles || profiles.length === 0) return []
  return profiles.map(p => p.id)
}

// ─── 1. Lojas sem publicação há 3+ dias ──────────────────────────────────────

async function checkInactiveStores(): Promise<{ notified: number; total: number }> {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  try {
    // Buscar todas as lojas
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, licensee_id')
      .order('name')

    if (!stores || stores.length === 0) return { notified: 0, total: 0 }

    let notified = 0

    for (const store of stores) {
      // Verificar última publicação da loja
      const { data: lastPub } = await supabase
        .from('publication_history')
        .select('published_at')
        .eq('store_id', store.id)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()

      // Se nunca publicou OU última publicação foi há 3+ dias
      const shouldNotify = !lastPub || new Date(lastPub.published_at) < threeDaysAgo

      if (shouldNotify) {
        const userIds = await getStoreUsers(store.id)
        if (userIds.length === 0) continue

        const daysSince = lastPub
          ? Math.floor((Date.now() - new Date(lastPub.published_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999

        await sendPush({
          userIds,
          title: '📅 Loja sem publicações',
          body: lastPub
            ? `${store.name} está sem publicar há ${daysSince} dias`
            : `${store.name} ainda não tem nenhuma publicação`,
          url: '/dashboard',
          tag: `inactive-store-${store.id}`,
          icon: '/icon-192.png',
        })

        notified++
      }
    }

    return { notified, total: stores.length }
  } catch (err) {
    console.error('[cron] erro ao verificar lojas inativas:', err)
    return { notified: 0, total: 0 }
  }
}

// ─── 2. Tokens Instagram próximos de expirar ──────────────────────────────────

async function checkExpiringTokens(): Promise<{ notified: number; total: number }> {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  try {
    // Buscar tokens que expiram em menos de 30 dias
    const { data: credentials } = await supabase
      .from('instagram_credentials')
      .select('id, store_id, expires_at, stores(name)')
      .not('expires_at', 'is', null)
      .lt('expires_at', thirtyDaysFromNow.toISOString())

    if (!credentials || credentials.length === 0) return { notified: 0, total: 0 }

    const admins = await getAdmins()
    if (admins.length === 0) {
      console.warn('[cron] Nenhum ADM encontrado para notificar sobre tokens expirando')
      return { notified: 0, total: credentials.length }
    }

    // Agrupar por dias até expirar
    const critical = credentials.filter(c => {
      const daysLeft = Math.floor((new Date(c.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 7
    })

    const warning = credentials.filter(c => {
      const daysLeft = Math.floor((new Date(c.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysLeft > 7 && daysLeft <= 30
    })

    let notified = 0

    // Notificar críticos (≤7 dias)
    if (critical.length > 0) {
      const storeNames = critical.map(c => (c.stores as any)?.name || 'Loja sem nome').join(', ')
      await sendPush({
        userIds: admins,
        title: '🚨 Tokens Instagram expirando!',
        body: `${critical.length} token(s) expira(m) em até 7 dias: ${storeNames}`,
        url: '/adm/vault',
        tag: 'tokens-expiring-critical',
        icon: '/icon-192.png',
      })
      notified++
    }

    // Notificar avisos (8-30 dias)
    if (warning.length > 0) {
      await sendPush({
        userIds: admins,
        title: '⚠️ Tokens Instagram próximos de expirar',
        body: `${warning.length} token(s) expira(m) nos próximos 30 dias`,
        url: '/adm/vault',
        tag: 'tokens-expiring-warning',
        icon: '/icon-192.png',
      })
      notified++
    }

    return { notified, total: credentials.length }
  } catch (err) {
    console.error('[cron] erro ao verificar tokens expirando:', err)
    return { notified: 0, total: 0 }
  }
}

// ─── 3. Resumo semanal (apenas às segundas) ───────────────────────────────────

async function sendWeeklySummary(): Promise<{ notified: number; total: number }> {
  // Verificar se é segunda-feira
  const today = new Date()
  if (today.getDay() !== 1) {
    console.log('[cron] Resumo semanal ignorado — não é segunda-feira')
    return { notified: 0, total: 0 }
  }

  try {
    // Publicações dos últimos 7 dias
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: publications } = await supabase
      .from('publication_history')
      .select('store_id, published_at, stores(name, licensee_id)')
      .gte('published_at', sevenDaysAgo.toISOString())

    if (!publications || publications.length === 0) {
      console.log('[cron] Nenhuma publicação nos últimos 7 dias')
      return { notified: 0, total: 0 }
    }

    // Agrupar por loja
    const summary: Record<string, PublicationSummary> = {}
    for (const pub of publications) {
      const storeId = pub.store_id
      const storeName = (pub.stores as any)?.name || 'Loja sem nome'

      if (!summary[storeId]) {
        summary[storeId] = {
          store_id: storeId,
          store_name: storeName,
          count: 0,
          last_published_at: null,
        }
      }

      summary[storeId].count++

      if (!summary[storeId].last_published_at || pub.published_at > summary[storeId].last_published_at!) {
        summary[storeId].last_published_at = pub.published_at
      }
    }

    let notified = 0

    // Enviar resumo para usuários de cada loja
    for (const [storeId, data] of Object.entries(summary)) {
      const userIds = await getStoreUsers(storeId)
      if (userIds.length === 0) continue

      await sendPush({
        userIds,
        title: '📊 Resumo da semana',
        body: `${data.store_name}: ${data.count} publicaç${data.count === 1 ? 'ão' : 'ões'} nos últimos 7 dias`,
        url: '/historico',
        tag: `weekly-summary-${storeId}`,
        icon: '/icon-192.png',
      })

      notified++
    }

    // Enviar resumo geral para ADMs
    const admins = await getAdmins()
    if (admins.length > 0) {
      const totalPubs = publications.length
      const totalStores = Object.keys(summary).length

      await sendPush({
        userIds: admins,
        title: '📊 Resumo Semanal — Aurohub',
        body: `${totalPubs} publicações de ${totalStores} loja(s) nos últimos 7 dias`,
        url: '/adm/saude',
        tag: 'weekly-summary-admin',
        icon: '/icon-192.png',
      })

      notified++
    }

    return { notified, total: Object.keys(summary).length }
  } catch (err) {
    console.error('[cron] erro ao enviar resumo semanal:', err)
    return { notified: 0, total: 0 }
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Autorização — Vercel Cron ou manual com CRON_SECRET
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const isManual = cronSecret && auth === `Bearer ${cronSecret}`

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[cron] Iniciando job diário...')

  try {
    // Executar verificações em paralelo
    const [inactiveStores, expiringTokens, weeklySummary] = await Promise.all([
      checkInactiveStores(),
      checkExpiringTokens(),
      sendWeeklySummary(),
    ])

    const duration = Date.now() - startTime

    const result = {
      success: true,
      duration_ms: duration,
      checks: {
        inactive_stores: inactiveStores,
        expiring_tokens: expiringTokens,
        weekly_summary: weeklySummary,
      },
      timestamp: new Date().toISOString(),
    }

    console.log('[cron] Job concluído:', JSON.stringify(result, null, 2))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron] Erro no job:', err)
    return NextResponse.json(
      {
        error: 'Erro ao executar cron job',
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    )
  }
}

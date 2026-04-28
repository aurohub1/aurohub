import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isVaultAuthenticated } from '@/lib/vault-auth'

export async function GET() {
  try {
    const authenticated = await isVaultAuthenticated()
    if (!authenticated) {
      console.error('[vault/clientes] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: licensees, error } = await supabase
      .from('licensees')
      .select('id, name, email, plan, plan_slug, status, expires_at, mp_sub_id, last_payment_at, created_at, user_limit, metrics_enabled')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[vault/clientes] Licensees error:', error)
      throw error
    }

    console.log('[vault/clientes] Found licensees:', licensees?.length || 0)

    return NextResponse.json({ clientes: licensees || [] })
  } catch (error: any) {
    console.error('[vault/clientes] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

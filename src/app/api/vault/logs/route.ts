import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isVaultAuthenticated } from '@/lib/vault-auth'

export async function GET() {
  try {
    const authenticated = await isVaultAuthenticated()
    if (!authenticated) {
      console.error('[vault/logs] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('id, licensee_id, user_id, user_name, event_type, description, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[vault/logs] Activity logs error:', error)
      throw error
    }

    console.log('[vault/logs] Found logs:', logs?.length || 0)

    return NextResponse.json({ logs: logs || [] })
  } catch (error: any) {
    console.error('[vault/logs] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

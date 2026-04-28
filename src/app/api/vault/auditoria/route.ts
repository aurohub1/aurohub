import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isVaultAuthenticated } from '@/lib/vault-auth'

export async function GET() {
  try {
    const authenticated = await isVaultAuthenticated()
    if (!authenticated) {
      console.error('[auditoria GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: auditorias, error } = await supabase
      .from('cofre_auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[auditoria GET] Erro completo:', JSON.stringify(error, null, 2))
      throw error
    }

    console.log('[auditoria GET] Found auditorias:', auditorias?.length || 0)

    return NextResponse.json({ auditorias: auditorias || [] })
  } catch (error: any) {
    console.error('[vault/auditoria] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usuario, acao, ip } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('cofre_auditoria')
      .insert({
        usuario: usuario || 'auroadm',
        acao: acao || 'login',
        ip: ip || null,
        criado_em: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('[auditoria POST] Erro completo:', JSON.stringify(error, null, 2))
      throw error
    }

    console.log('[auditoria POST] Inserido com sucesso')

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[vault/auditoria] POST Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

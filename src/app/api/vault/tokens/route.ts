import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isVaultAuthenticated } from '@/lib/vault-auth'

export async function GET() {
  try {
    const authenticated = await isVaultAuthenticated()
    if (!authenticated) {
      console.error('[vault/tokens] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: credentials, error } = await supabase
      .from('instagram_credentials')
      .select('id, licensee_id, store_id, ig_user_id, access_token, expires_at, last_used_at, auto_renewed, last_renewal, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[vault/tokens] Instagram credentials error:', error)
      throw error
    }

    console.log('[vault/tokens] Found credentials:', credentials?.length || 0)

    // Criar tokens com valores padrão
    const tokensWithStoreNames = credentials?.map(cred => ({
      ...cred,
      store_name: 'Loja desconhecida',
      access_token: cred.access_token ? cred.access_token.substring(0, 15) + '...' : null,
      status: cred.expires_at && new Date(cred.expires_at) < new Date() ? 'expirado' : 'ativo'
    })) || []

    // Buscar nomes das stores se houver store_ids
    const storeIds = credentials?.map(c => c.store_id).filter(Boolean) || []

    if (storeIds.length > 0) {
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', storeIds)

      if (storesError) {
        console.error('[vault/tokens] Stores error:', storesError)
      } else {
        console.log('[vault/tokens] Found stores:', stores?.length || 0)

        // Atualizar store_name com dados reais
        const storeMap = new Map(stores?.map(s => [s.id, s.name]) || [])
        tokensWithStoreNames.forEach(token => {
          if (token.store_id) {
            token.store_name = storeMap.get(token.store_id) || 'Loja desconhecida'
          }
        })
      }
    }

    return NextResponse.json({ tokens: tokensWithStoreNames })
  } catch (error: any) {
    console.error('[vault/tokens] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// src/app/api/cron/vault/historico/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .schema('cofre' as never)
      .from('relatorios')
      .select('*')
      .order('gerado_em', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ relatorios: [] })
    }

    return NextResponse.json({ relatorios: data ?? [] })
  } catch {
    return NextResponse.json({ relatorios: [] })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Chamar função SQL que acessa o schema cofre
    // Esta função precisa ser criada no Supabase junto com vault_schema.sql
    const { data, error } = await supabase.rpc('get_vault_reports')

    if (error) {
      // Se a função ainda não existe (schema não foi criado), retornar array vazio
      if (error.code === '42883' || error.message?.includes('Could not find the function')) {
        return NextResponse.json({ relatorios: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ relatorios: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

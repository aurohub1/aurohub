'use server'

import { verifyVaultPassword, createVaultToken, setVaultCookie, clearVaultCookie } from '@/lib/vault-auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function unlockVault(password: string): Promise<{ success: boolean }> {
  if (!verifyVaultPassword(password)) return { success: false }
  await setVaultCookie(createVaultToken())

  // Registrar auditoria
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const { error: auditError } = await supabase
      .from('cofre_auditoria')
      .insert({
        usuario: 'auroadm',
        acao: 'login',
        ip,
        criado_em: new Date().toISOString()
      })
    if (auditError) console.error('[auditoria] Erro:', JSON.stringify(auditError, null, 2))
    else console.log('[auditoria] Registrado com sucesso')
  } catch (err) {
    console.error('[unlockVault] Erro ao registrar auditoria:', err)
  }

  return { success: true }
}

export async function lockVault(): Promise<void> {
  await clearVaultCookie()
}

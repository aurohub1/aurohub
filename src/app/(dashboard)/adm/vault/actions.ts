'use server'

import { verifyVaultPassword, createVaultToken, setVaultCookie, clearVaultCookie } from '@/lib/vault-auth'

export async function unlockVault(password: string): Promise<{ success: boolean }> {
  if (!verifyVaultPassword(password)) return { success: false }
  await setVaultCookie(createVaultToken())
  return { success: true }
}

export async function lockVault(): Promise<void> {
  await clearVaultCookie()
}

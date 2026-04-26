import { isVaultAuthenticated } from '@/lib/vault-auth'
import VaultClient from './VaultClient'

export const dynamic = 'force-dynamic'

export default async function VaultPage() {
  const authenticated = await isVaultAuthenticated()
  return <VaultClient authenticated={authenticated} />
}

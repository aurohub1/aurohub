import { isVaultAuthenticated } from '@/lib/vault-auth'
import VaultClient from './VaultClient'
import { AdmGuard } from '@/components/AdmGuard'

export const dynamic = 'force-dynamic'

export default async function VaultPage() {
  const authenticated = await isVaultAuthenticated()
  return (
    <AdmGuard perm="can_view_vault">
      <VaultClient authenticated={authenticated} />
    </AdmGuard>
  )
}

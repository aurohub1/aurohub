import { supabase } from '@/lib/supabase'

// Cache singleton — compartilhado entre todos os componentes
const cache = new Map<string, { data: string | null; ts: number }>()
const TTL = 5 * 60 * 1000 // 5 minutos

export async function getSystemConfig(key: string): Promise<string | null> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.ts < TTL) return hit.data

  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .single()

  const value = data?.value ?? null
  cache.set(key, { data: value, ts: now })
  return value
}

export function invalidateSystemConfig(key: string): void {
  cache.delete(key)
}

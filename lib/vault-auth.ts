import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const VAULT_COOKIE = 'aurohub_vault'
const VAULT_DURATION_MS = 2 * 60 * 60 * 1000

function getSecret(): string {
  const s = process.env.VAULT_PASSWORD
  if (!s) throw new Error('VAULT_PASSWORD não configurado')
  return s
}

function hmac(key: string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

export function verifyVaultPassword(input: string): boolean {
  try {
    const secret = getSecret()
    const a = hmac('aurohub_vault_check', input)
    const b = hmac('aurohub_vault_check', secret)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch { return false }
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createVaultToken(): string {
  const expires = Date.now() + VAULT_DURATION_MS
  const payload = `v:${expires}`
  return Buffer.from(`${payload}.${signPayload(payload)}`).toString('base64url')
}

export function validateVaultToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const dot = decoded.lastIndexOf('.')
    if (dot === -1) return false
    const payload = decoded.slice(0, dot)
    const sig = decoded.slice(dot + 1)
    const expected = signPayload(payload)
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    return Date.now() < parseInt(payload.split(':')[1])
  } catch { return false }
}

export async function setVaultCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(VAULT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: VAULT_DURATION_MS / 1000,
    path: '/adm/vault',
  })
}

export async function clearVaultCookie(): Promise<void> {
  const store = await cookies()
  store.delete(VAULT_COOKIE)
}

export async function isVaultAuthenticated(): Promise<boolean> {
  try {
    const store = await cookies()
    const token = store.get(VAULT_COOKIE)?.value
    if (!token) return false
    return validateVaultToken(token)
  } catch { return false }
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Asks Cloudflare whether a Turnstile token is genuine. Fails closed: if the check cannot be
 * completed, the request is treated as not verified.
 */
export async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  try {
    const form = new FormData()
    form.append('secret', secret)
    form.append('response', token)
    if (ip) form.append('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

import type { Env } from './env'

export type Route = 'extract' | 'coach' | 'trajectories'

/** Requests one visitor (by IP) may make per day, per route. */
const PER_VISITOR_DAILY: Record<Route, number> = {
  extract: 6,
  coach: 80,
  trajectories: 12,
}

const DEFAULT_DAILY_CAP = 400
const MAX_BODY_BYTES = 9_000_000

// Best-effort fallback when no KV namespace is bound (resets when the process restarts).
const memory = new Map<string, number>()

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function bump(env: Env, key: string): Promise<number> {
  const kv = env.RATE_LIMIT_KV
  if (kv) {
    const current = Number((await kv.get(key)) ?? 0) + 1
    await kv.put(key, String(current), { expirationTtl: 60 * 60 * 26 })
    return current
  }
  const current = (memory.get(key) ?? 0) + 1
  memory.set(key, current)
  return current
}

/**
 * Checks origin, body size and daily limits. Returns a Response to send back if the request
 * should be refused, or null to let it through. Never logs request contents.
 */
export async function guard(req: Request, env: Env, route: Route): Promise<Response | null> {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405, { allow: 'POST' })

  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allowed.length > 0) {
    const origin = req.headers.get('origin')
    if (!origin || !allowed.includes(origin)) return json({ error: 'This origin is not allowed.' }, 403)
  }

  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) {
    return json({ error: 'That upload is too large. Try smaller files.' }, 413)
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local'
  const day = today()
  const perVisitor = await bump(env, `rl:${day}:${route}:${ip}`)
  if (perVisitor > PER_VISITOR_DAILY[route]) {
    return json(
      { error: 'You have reached today\'s limit for the free demo. Please try again tomorrow.', code: 'visitor_limit' },
      429,
    )
  }

  const cap = Number(env.DAILY_CAP ?? DEFAULT_DAILY_CAP)
  const total = await bump(env, `rl:${day}:all`)
  if (total > cap) {
    return json(
      { error: 'The free demo has reached its daily limit. Please try again tomorrow.', code: 'daily_cap' },
      429,
    )
  }

  return null
}

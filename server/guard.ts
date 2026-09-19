import type { Env, LimiterHit, LimiterResult } from './env'
import { verifyTurnstile } from './turnstile'

export type Route = 'extract' | 'coach' | 'trajectories'

/** Requests one visitor may make per day, per route. */
export const PER_VISITOR_DAILY: Record<Route, number> = {
  extract: 6,
  coach: 80,
  trajectories: 12,
}

/** Rough cost of one request, in units of about one US cent (coach ~1c, timeline ~6c, paths ~12c). */
export const COST_UNITS: Record<Route, number> = {
  coach: 1,
  extract: 6,
  trajectories: 12,
}

const DEFAULT_DAILY_BUDGET_UNITS = 200
const MAX_BODY_BYTES = 9_000_000

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** One-way hash so the visitor's address is never stored, and the hash changes every day. */
async function visitorHash(ip: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${day}|${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Fallback for local development, where no shared limiter exists. It resets when the process restarts.
const memory = new Map<string, { units: number; visitors: Map<string, number> }>()

function hitInMemory(req: LimiterHit): LimiterResult {
  let state = memory.get(req.day)
  if (!state) {
    memory.clear()
    state = { units: 0, visitors: new Map() }
    memory.set(req.day, state)
  }
  const key = `${req.route}:${req.visitor}`
  const count = (state.visitors.get(key) ?? 0) + 1
  if (count > req.visitorLimit) return { ok: false, code: 'visitor_limit' }
  if (state.units + req.cost > req.budget) return { ok: false, code: 'daily_cap' }
  state.visitors.set(key, count)
  state.units += req.cost
  return { ok: true }
}

async function hit(env: Env, req: LimiterHit): Promise<LimiterResult> {
  if (!env.LIMITER) return hitInMemory(req)
  const stub = env.LIMITER.get(env.LIMITER.idFromName('global'))
  return stub.hit(req)
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Runs the gates in order: method, origin, bot check, body size, then the shared daily limits.
 * Returns a Response to send back if the request should be refused, or null to let it through.
 * Never logs request contents.
 */
export async function guard(req: Request, env: Env, route: Route): Promise<Response | null> {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405, { allow: 'POST' })

  // The site's own origin is always allowed. A different origin is refused. A missing origin is
  // refused too when STRICT_ORIGIN is on (production), which stops naive scripts.
  const extra = splitList(env.ALLOWED_ORIGINS)
  const allowed = [new URL(req.url).origin, ...extra]
  const origin = req.headers.get('origin')
  const strict = env.STRICT_ORIGIN === '1' || extra.length > 0
  if (origin ? !allowed.includes(origin) : strict) {
    return json({ error: 'This origin is not allowed.' }, 403)
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local'

  if (env.TURNSTILE_SECRET_KEY) {
    const token = req.headers.get('x-turnstile-token')
    const ok = token ? await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, req.headers.get('cf-connecting-ip')) : false
    if (!ok) {
      return json({ error: 'The bot check failed. Reload the page and try again.', code: 'bot_check' }, 403)
    }
  }

  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) {
    return json({ error: 'That upload is too large. Try smaller files.' }, 413)
  }

  const day = today()
  const result = await hit(env, {
    day,
    visitor: await visitorHash(ip, day),
    route,
    visitorLimit: PER_VISITOR_DAILY[route],
    cost: COST_UNITS[route],
    budget: Number(env.DAILY_BUDGET_UNITS ?? DEFAULT_DAILY_BUDGET_UNITS),
  })
  if (!result.ok) {
    return result.code === 'visitor_limit'
      ? json({ error: "You have reached today's limit for the free demo. Please try again tomorrow.", code: 'visitor_limit' }, 429)
      : json({ error: 'The free demo has reached its daily limit. Please try again tomorrow.', code: 'daily_cap' }, 429)
  }

  return null
}

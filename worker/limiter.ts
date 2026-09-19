import { DurableObject } from 'cloudflare:workers'
import type { LimiterHit, LimiterResult } from '../server/env'

interface DayState {
  /** Estimated spend so far today, in units of about one US cent. */
  units: number
  /** Requests per "route:visitor". Visitors are one-way hashes, never raw addresses. */
  visitors: Record<string, number>
}

/**
 * One instance counts every request for the whole site. A Durable Object handles one call at a
 * time, so the counts are exact even when many visitors arrive at the same instant.
 */
export class Limiter extends DurableObject {
  async hit(req: LimiterHit): Promise<LimiterResult> {
    const key = `day:${req.day}`
    const state = (await this.ctx.storage.get<DayState>(key)) ?? { units: 0, visitors: {} }

    const visitorKey = `${req.route}:${req.visitor}`
    const count = (state.visitors[visitorKey] ?? 0) + 1
    if (count > req.visitorLimit) return { ok: false, code: 'visitor_limit' }
    if (state.units + req.cost > req.budget) return { ok: false, code: 'daily_cap' }

    state.visitors[visitorKey] = count
    state.units += req.cost
    await this.ctx.storage.put(key, state)

    // Drop yesterday's counters so nothing about past visitors is kept.
    const days = await this.ctx.storage.list({ prefix: 'day:' })
    const stale = [...days.keys()].filter((k) => k !== key)
    if (stale.length > 0) await this.ctx.storage.delete(stale)

    return { ok: true }
  }
}

/** What one visitor's request asks the shared limiter to count. */
export interface LimiterHit {
  /** UTC day, YYYY-MM-DD. */
  day: string
  /** One-way hash of the visitor's address; the raw address is never stored. */
  visitor: string
  route: string
  visitorLimit: number
  /** Rough cost of this request, in units of about one US cent. */
  cost: number
  /** Total units allowed across all visitors for the day. */
  budget: number
}

export type LimiterResult = { ok: true } | { ok: false; code: 'visitor_limit' | 'daily_cap' }

/** The slice of a Durable Object namespace that the API uses. */
export interface LimiterNamespaceLike {
  idFromName(name: string): unknown
  get(id: unknown): { hit(request: LimiterHit): Promise<LimiterResult> }
}

export interface Env {
  /** Secret. Set in the host's settings or in .env.local. Never commit it. */
  ANTHROPIC_API_KEY?: string
  /** Defaults to claude-sonnet-5. */
  MODEL?: string
  /** "1" returns canned answers without calling the API (local development). */
  MOCK_AI?: string
  /** Kill switch. "1" pauses every AI feature immediately; the site itself stays up. */
  AI_DISABLED?: string
  /** Extra origins allowed to call the API, comma-separated. The site's own origin is always allowed. */
  ALLOWED_ORIGINS?: string
  /** "1" refuses requests that carry no Origin header (set in production). */
  STRICT_ORIGIN?: string
  /** Total AI budget per day across all visitors, in units of about one US cent. Default 200 (about $2). */
  DAILY_BUDGET_UNITS?: string
  /** Public Turnstile site key. Empty disables the bot check. */
  TURNSTILE_SITE_KEY?: string
  /** Secret Turnstile key. Empty disables the bot check. */
  TURNSTILE_SECRET_KEY?: string
  /** Shared, exact counter (a Durable Object). Absent in local development. */
  LIMITER?: LimiterNamespaceLike
}

export const DEFAULT_MODEL = 'claude-sonnet-5'

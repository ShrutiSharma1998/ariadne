/** The slice of a Cloudflare KV namespace that Ariadne uses for rate-limit counters. */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export interface Env {
  /** Secret. Set in the host's settings or in .env.local. Never commit it. */
  ANTHROPIC_API_KEY?: string
  /** Defaults to claude-sonnet-5. */
  MODEL?: string
  /** Set to "1" to return canned answers without calling the API. */
  MOCK_AI?: string
  /** Comma-separated origins allowed to call the API, e.g. https://ariadne.pages.dev */
  ALLOWED_ORIGINS?: string
  /** Total AI requests allowed per day across all visitors. */
  DAILY_CAP?: string
  RATE_LIMIT_KV?: KVLike
}

export const DEFAULT_MODEL = 'claude-sonnet-5'

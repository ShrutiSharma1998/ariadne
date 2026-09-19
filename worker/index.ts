import { handleApi } from '../server/handler'
import type { Env } from '../server/env'

export { Limiter } from './limiter'

interface Bindings {
  /** The built site (the dist folder), served for every non-API path. */
  ASSETS: Fetcher
}

/**
 * Cloudflare Worker entry. Requests to /api/* run the API handlers. Everything else is served
 * from the built site as static files (wrangler.jsonc sends only /api/* to this code first).
 */
export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/')) return handleApi(request, env as unknown as Env)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Bindings>

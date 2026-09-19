import { handleApi } from '../../server/handler'
import type { Env } from '../../server/env'

/**
 * Cloudflare Pages Function: serves /api/extract, /api/coach and /api/trajectories.
 * Secrets (ANTHROPIC_API_KEY) come from the Pages project settings, never from the repo.
 */
export const onRequest = (context: { request: Request; env: Env }): Promise<Response> =>
  handleApi(context.request, context.env)

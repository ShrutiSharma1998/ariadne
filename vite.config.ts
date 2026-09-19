import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Serves /api/* during `npm run dev` with the same handler that runs on Cloudflare in
 * production. Reads ANTHROPIC_API_KEY from .env.local, which is git-ignored.
 */
function apiDevServer(mode: string): Plugin {
  return {
    name: 'ariadne-api-dev',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')

      server.middlewares.use('/api', async (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse) => {
        try {
          const { handleApi } = await server.ssrLoadModule('/server/handler.ts')

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body = Buffer.concat(chunks)

          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
          }
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          })

          const response: Response = await handleApi(request, {
            ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
            MODEL: env.MODEL,
            MOCK_AI: env.MOCK_AI,
          })

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (!response.body) {
            res.end()
            return
          }
          const reader = response.body.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
          res.end()
        } catch (err) {
          console.error('dev api error:', err instanceof Error ? err.message : 'unknown')
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev API failed. Check the terminal.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDevServer(mode)],
}))

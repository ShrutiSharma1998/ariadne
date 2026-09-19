// Generates src/data/samplePaths.json: the career paths for the fictional sample story, made once
// with the real AI so visitors see them instantly and it costs nothing per visit.
// Needs ANTHROPIC_API_KEY in .env.local. Costs roughly ten cents. Run: node scripts/generate-sample-paths.mjs
import { writeFileSync } from 'node:fs'
import { createServer, loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
if (!env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in .env.local')
  process.exit(1)
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { demoEntries } = await vite.ssrLoadModule('/src/data/demoPersona.ts')
const { handleApi } = await vite.ssrLoadModule('/server/handler.ts')

const request = new Request('http://localhost/api/trajectories', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ entries: demoEntries }),
})
const response = await handleApi(request, { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY, MODEL: env.MODEL })
const body = await response.json()
await vite.close()

if (!response.ok || !Array.isArray(body.paths) || body.paths.length !== 3) {
  console.error('Unexpected response:', response.status, JSON.stringify(body).slice(0, 300))
  process.exit(1)
}

writeFileSync('src/data/samplePaths.json', JSON.stringify(body, null, 2) + '\n')
console.log(`Wrote src/data/samplePaths.json with ${body.paths.length} paths:`)
for (const p of body.paths) console.log(` - ${p.title} [${p.confidence}]`)

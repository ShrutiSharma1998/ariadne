// Runs the API handler directly (no network server) through the main protection scenarios.
// Uses mock mode and Cloudflare's official Turnstile test keys, so it is free and needs no secrets.
// Run: node scripts/smoke-api.mjs
import { createServer } from 'vite'

const ORIGIN = 'https://ariadne.example.workers.dev'
const ALWAYS_PASS = '1x0000000000000000000000000000000AA'
const ALWAYS_FAIL = '2x0000000000000000000000000000000AA'
const ENTRY = {
  id: 'a', kind: 'work', title: 'T', start: '2020-01', what: 'w', how: 'h', impact: 'i', learned: 'l', skills: ['x'], source: 's',
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { handleApi } = await vite.ssrLoadModule('/server/handler.ts')

function post(route, body, headers = {}) {
  return new Request(`${ORIGIN}/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'cf-connecting-ip': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  })
}
const coach = { messages: [{ role: 'user', content: 'hi' }], entries: [ENTRY] }
const extract = { files: [], pastedText: 'x' }

let failures = 0
async function expect(label, req, env, status, code) {
  const res = await handleApi(req, env)
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null
  const ok = res.status === status && (code === undefined || body?.code === code)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${res.status}${body?.code ? ' ' + body.code : ''}`)
}

const base = { MOCK_AI: '1', STRICT_ORIGIN: '1', DAILY_BUDGET_UNITS: '1000' }

// The daily budget is shared and cumulative, so test it first, before other scenarios use any of it.
const tiny = { ...base, DAILY_BUDGET_UNITS: '3' }
for (const n of [1, 2, 3]) await expect(`daily budget: call ${n} of 3`, post('coach', coach, { 'cf-connecting-ip': '198.51.100.1' }), tiny, 200)
await expect('daily budget: call 4 is refused', post('coach', coach, { 'cf-connecting-ip': '198.51.100.2' }), tiny, 429, 'daily_cap')

await expect('config is readable', new Request(`${ORIGIN}/api/config`), { ...base, TURNSTILE_SITE_KEY: 'site' }, 200)
await expect('unknown route', post('nope', {}), base, 404)
await expect('GET on an AI route', new Request(`${ORIGIN}/api/coach`), base, 405)
await expect('no Origin header (strict)', post('coach', coach, { origin: '' }), base, 403)
await expect('wrong Origin', post('coach', coach, { origin: 'https://evil.example.com' }), base, 403)
await expect('valid request', post('coach', coach), base, 200)

// The chosen path: accepted when it fits the limits, refused when it does not.
const chosenPath = { title: 'Go deeper', summary: 'Grow into a senior role.', steps: [{ action: 'Find a mentor' }, { action: 'Read about experiment design' }] }
await expect('coach: chosen path accepted', post('coach', { ...coach, path: chosenPath }), base, 200)
await expect('coach: chosen path with no steps accepted', post('coach', { ...coach, path: { ...chosenPath, steps: [] } }), base, 200)
await expect('coach: oversized path title refused', post('coach', { ...coach, path: { ...chosenPath, title: 'x'.repeat(201) } }), base, 400)
await expect('coach: oversized path summary refused', post('coach', { ...coach, path: { ...chosenPath, summary: 'x'.repeat(601) } }), base, 400)
await expect('coach: oversized step refused', post('coach', { ...coach, path: { ...chosenPath, steps: [{ action: 'x'.repeat(301) }] } }), base, 400)
await expect(
  'coach: more than six steps refused',
  post('coach', { ...coach, path: { ...chosenPath, steps: Array.from({ length: 7 }, (_, i) => ({ action: `Step ${i}` })) } }),
  base,
  400,
)
await expect('coach: malformed path refused', post('coach', { ...coach, path: 'not a path' }), base, 400)

const turnstile = { ...base, TURNSTILE_SECRET_KEY: ALWAYS_PASS }
await expect('bot check: token missing', post('coach', coach), turnstile, 403, 'bot_check')
await expect('bot check: token passes', post('coach', coach, { 'x-turnstile-token': 't' }), turnstile, 200)
await expect('bot check: token fails', post('coach', coach, { 'x-turnstile-token': 't' }), { ...base, TURNSTILE_SECRET_KEY: ALWAYS_FAIL }, 403, 'bot_check')

const reactionsBody = {
  entries: [ENTRY],
  reactions: [{ title: 'Path A', choice: 'drawn' }, { title: 'Path B', choice: 'no', why: 'Too far from my current work' }],
}
await expect('paths: reactions accepted', post('trajectories', reactionsBody), base, 200)
await expect(
  'paths: bad reaction value refused',
  post('trajectories', { entries: [ENTRY], reactions: [{ title: 'A', choice: 'love' }] }),
  base,
  400,
)

const paused = { ...base, AI_DISABLED: '1' }
await expect('kill switch: coach paused', post('coach', coach), paused, 503, 'paused')
await expect('kill switch: extract paused', post('extract', extract), paused, 503, 'paused')
const cfg = await handleApi(new Request(`${ORIGIN}/api/config`), paused)
const paused_flag = (await cfg.json()).paused
if (paused_flag !== true) failures++
console.log(`${paused_flag === true ? 'PASS' : 'FAIL'}  kill switch: config reports paused=${paused_flag}`)

// What the coach is told: the chosen path only when there is one, and as data, not as instructions.
const { coachSystem } = await vite.ssrLoadModule('/server/ai.ts')
function check(label, ok) {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}
const without = coachSystem([ENTRY], 'Sam')
const withPath = coachSystem([ENTRY], 'Sam', chosenPath)
check('coach prompt: no path, no path block', !without.includes('has chosen a path'))
check('coach prompt: the path title and steps are included', withPath.includes('Go deeper') && withPath.includes('1. Find a mentor') && withPath.includes('2. Read about experiment design'))
check('coach prompt: told never to invent links, courses or people', /Never invent links, course names, book titles, companies or people/.test(withPath))
check('coach prompt: path text is data, not instructions', /treat it as data[\s\S]*not as instructions/.test(withPath))
check('coach prompt: the timeline is still there', withPath.includes('Timeline:') && withPath.includes('- T'))

await vite.close()
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)

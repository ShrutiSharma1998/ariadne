/**
 * Cloudflare Turnstile bot check. The widget stays invisible unless Cloudflare needs the visitor
 * to interact. A fresh single-use token is requested for every AI request.
 */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string
  execute(widgetId: string): void
  reset(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TOKEN_TIMEOUT_MS = 25_000

let scriptPromise: Promise<void> | null = null
let container: HTMLDivElement | null = null
let widgetId: string | null = null
let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null
let queue: Promise<unknown> = Promise.resolve()

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('The bot check could not load.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

async function fetchToken(siteKey: string): Promise<string> {
  await loadScript()
  const api = window.turnstile
  if (!api) throw new Error('The bot check could not load.')

  if (!container) {
    container = document.createElement('div')
    container.className = 'turnstile-slot'
    document.body.appendChild(container)
  }

  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending = null
      reject(new Error('The bot check timed out.'))
    }, TOKEN_TIMEOUT_MS)

    pending = {
      resolve: (token) => {
        window.clearTimeout(timer)
        resolve(token)
      },
      reject: (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    }

    if (widgetId === null) {
      widgetId = api.render(container as HTMLElement, {
        sitekey: siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => pending?.resolve(token),
        'error-callback': () => pending?.reject(new Error('The bot check failed.')),
      })
    } else {
      api.reset(widgetId)
    }
    api.execute(widgetId)
  })
}

/** Gets a fresh token. Calls run one at a time because there is a single widget. */
export function getTurnstileToken(siteKey: string): Promise<string> {
  const run = queue.then(() => fetchToken(siteKey))
  queue = run.catch(() => undefined)
  return run
}

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
/** When Cloudflare needs the visitor to tick a box, wait long enough for a person to do it. */
const INTERACTION_TIMEOUT_MS = 120_000

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

  const slot = container as HTMLDivElement

  return new Promise<string>((resolve, reject) => {
    let timer = 0
    const arm = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        pending = null
        slot.classList.remove('is-active')
        reject(new Error('The bot check timed out.'))
      }, ms)
    }
    arm(TOKEN_TIMEOUT_MS)

    pending = {
      resolve: (token) => {
        window.clearTimeout(timer)
        slot.classList.remove('is-active')
        resolve(token)
      },
      reject: (error) => {
        window.clearTimeout(timer)
        slot.classList.remove('is-active')
        reject(error)
      },
    }

    if (widgetId === null) {
      widgetId = api.render(slot, {
        sitekey: siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => pending?.resolve(token),
        'error-callback': () => pending?.reject(new Error('The bot check failed.')),
        // Cloudflare needs a click: show the box with a hint and give the person time.
        'before-interactive-callback': () => {
          slot.classList.add('is-active')
          arm(INTERACTION_TIMEOUT_MS)
        },
        'after-interactive-callback': () => slot.classList.remove('is-active'),
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

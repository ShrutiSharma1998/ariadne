import type { MemoryEntry } from '../types'
import { getTurnstileToken } from './turnstile'

export interface ExtractFilePayload {
  name: string
  kind: 'pdf' | 'text'
  data: string
}

export interface Trajectory {
  title: string
  summary: string
  whyItFits: string
  blindSpots: string[]
  skillGaps: { skill: string; whereYouAre: string; nextStep: string }[]
  firstSteps: { action: string; howToFind: string }[]
  confidence: 'high' | 'medium' | 'low'
  confidenceNote: string
}

export interface TrajectoriesResponse {
  paths: Trajectory[]
  caveat: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function failure(res: Response): Promise<ApiError> {
  let message = 'Something went wrong. Please try again.'
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) message = body.error
  } catch {
    // Not JSON; keep the generic message.
  }
  return new ApiError(message, res.status)
}

export interface AppConfig {
  /** Public Turnstile site key, or null when the bot check is off. */
  turnstileSiteKey: string | null
  /** True when the kill switch has paused the AI features. */
  paused: boolean
}

let configPromise: Promise<AppConfig> | null = null

/** Reads the site's public settings once. If it cannot be read, assume no bot check and not paused. */
export function getConfig(): Promise<AppConfig> {
  configPromise ??= fetch('/api/config')
    .then((res) => (res.ok ? (res.json() as Promise<AppConfig>) : { turnstileSiteKey: null, paused: false }))
    .catch(() => ({ turnstileSiteKey: null, paused: false }))
  return configPromise
}

function botCheckMessage(err: unknown): string {
  const detail = err instanceof Error ? err.message : ''
  if (detail.includes('could not load')) {
    return 'Your browser or an extension is blocking the bot check. Turn off content blockers for this site, then reload and try again.'
  }
  if (detail.includes('timed out')) {
    return 'The bot check timed out. If a box appears at the bottom of the page, tick it, then send your message again.'
  }
  return 'The bot check failed. Reload the page and try again.'
}

/**
 * Headers for an AI request: JSON plus a fresh bot-check token when the site uses one.
 * onCheck lets the page say "checking" while it waits, so it is never silent.
 */
async function requestHeaders(onCheck?: (checking: boolean) => void): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const { turnstileSiteKey } = await getConfig()
  if (turnstileSiteKey) {
    onCheck?.(true)
    try {
      headers['x-turnstile-token'] = await getTurnstileToken(turnstileSiteKey)
    } catch (err) {
      throw new ApiError(botCheckMessage(err), 0)
    } finally {
      onCheck?.(false)
    }
  }
  return headers
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const headers = await requestHeaders()
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!res.ok) throw await failure(res)
  return (await res.json()) as T
}

export function extractTimeline(files: ExtractFilePayload[], pastedText?: string) {
  return postJson<{ entries: MemoryEntry[]; notes: string }>('/api/extract', { files, pastedText })
}

export interface PathReaction {
  title: string
  choice: 'drawn' | 'maybe' | 'no'
  why?: string
}

export function suggestTrajectories(entries: MemoryEntry[], goals?: string, reactions?: PathReaction[]) {
  return postJson<TrajectoriesResponse>('/api/trajectories', { entries, goals, reactions })
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** The path the person chose, in the size the coach's endpoint accepts. */
export interface CoachPath {
  title: string
  summary: string
  steps: { action: string }[]
}

/** Trims a chosen path to what the coach endpoint accepts: six steps, and no field over its limit. */
export function toCoachPath(path: Pick<Trajectory, 'title' | 'summary' | 'firstSteps'>): CoachPath {
  return {
    title: path.title.slice(0, 200),
    summary: path.summary.slice(0, 600),
    steps: path.firstSteps.slice(0, 6).map((s) => ({ action: s.action.slice(0, 300) })),
  }
}

/** Sends the conversation and calls onText with the reply so far as it streams in. */
export async function streamCoach(
  messages: ChatMessage[],
  entries: MemoryEntry[],
  personName: string | undefined,
  onText: (replySoFar: string) => void,
  signal?: AbortSignal,
  onCheck?: (checking: boolean) => void,
  path?: CoachPath,
): Promise<string> {
  const headers = await requestHeaders(onCheck)
  let res: Response
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, entries, personName, path }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!res.ok) throw await failure(res)
  if (!res.body) throw new ApiError('The reply came back empty. Please try again.', 502)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  return text
}

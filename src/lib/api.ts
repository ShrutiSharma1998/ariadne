import type { MemoryEntry } from '../types'

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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

export function suggestTrajectories(entries: MemoryEntry[], goals?: string) {
  return postJson<TrajectoriesResponse>('/api/trajectories', { entries, goals })
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Sends the conversation and calls onText with the reply so far as it streams in. */
export async function streamCoach(
  messages: ChatMessage[],
  entries: MemoryEntry[],
  personName: string | undefined,
  onText: (replySoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, entries, personName }),
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

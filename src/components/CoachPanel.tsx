import { useEffect, useRef, useState } from 'react'
import { ApiError, streamCoach, type ChatMessage } from '../lib/api'
import type { MemoryEntry } from '../types'

interface Props {
  entries: MemoryEntry[]
  personName?: string
}

const STARTERS = [
  'Interview me about my story.',
  'What patterns do you notice in my timeline?',
  'What might I be overlooking?',
]

export function CoachPanel({ entries, personName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [messages])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const history: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setDraft('')
    setError(null)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamCoach(
        history,
        entries,
        personName,
        (reply) => setMessages([...history, { role: 'assistant', content: reply }]),
        controller.signal,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessages(history)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="coach-title">
      <h2 id="coach-title" className="panel-title">
        Talk it through
      </h2>
      <p className="panel-lead">
        The coach has read your timeline. It asks one question at a time and won&apos;t make things up about you.
      </p>

      <div className="chat" role="log" aria-live="polite" aria-label="Conversation with the coach">
        {messages.length === 0 && (
          <div className="starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => void send(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble-${m.role}`}>
            <span className="bubble-who">{m.role === 'user' ? 'You' : 'Coach'}</span>
            <p>{m.content || (busy && i === messages.length - 1 ? 'Thinking' : '')}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft)
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Your message
        </label>
        <textarea
          id="chat-input"
          className="textarea"
          rows={2}
          maxLength={4000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(draft)
            }
          }}
          placeholder="Write a message. Press Enter to send."
          disabled={busy}
        />
        <button type="submit" className="button" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="privacy">Your messages and timeline are sent to an AI model (Anthropic) to answer you. Ariadne does not save them on a server.</p>
    </section>
  )
}

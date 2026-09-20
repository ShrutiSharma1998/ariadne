import { useEffect, useRef, useState } from 'react'
import { DEMO_OPENER } from '../data/demoPersona'
import { ApiError, streamCoach } from '../lib/api'
import type { MemoryEntry } from '../types'
import { ClewIcon, type ClewPose } from './road/Clew'
import { RoughFrame } from './RoughFrame'

/** A turn in the conversation. Hidden turns go to the coach but are not shown on screen. */
interface Turn {
  role: 'user' | 'assistant'
  content: string
  hidden?: boolean
}

export interface AskRequest {
  /** Changes with every request, so asking the same thing twice still works. */
  nonce: number
  text: string
}

interface Props {
  entries: MemoryEntry[]
  personName?: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  ask: AskRequest | null
}

const OPENER_PROMPT =
  'Please start our conversation. In two or three sentences, tell me one specific thing you notice in my timeline, then ask me one question about it.'

const STARTERS = ['What patterns do you notice in my timeline?', 'What might I be overlooking?']

/** A floating chat: a round button that opens the coach over whatever page you are on. */
export function CoachDock({ entries, personName, open, onOpen, onClose, ask }: Props) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const openerStarted = useRef(false)
  const handledAsk = useRef(0)
  const wasOpen = useRef(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [turns, open])

  // Move focus into the chat when it opens, and back to the button when it closes.
  useEffect(() => {
    if (open) inputRef.current?.focus()
    else if (wasOpen.current) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  async function send(text: string, hidden = false) {
    const content = text.trim()
    if (!content || busy) return
    const history: Turn[] = [...turns, { role: 'user', content, hidden }]
    setTurns([...history, { role: 'assistant', content: '' }])
    setDraft('')
    setError(null)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamCoach(
        history.map(({ role, content: c }) => ({ role, content: c })),
        entries,
        personName,
        (reply) => setTurns([...history, { role: 'assistant', content: reply }]),
        controller.signal,
        setChecking,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setTurns(history)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // The coach speaks first. The sample story has a written opener (free); a real timeline asks the AI.
  useEffect(() => {
    if (!open || openerStarted.current) return
    openerStarted.current = true
    if (personName) {
      setTurns([
        { role: 'user', content: OPENER_PROMPT, hidden: true },
        { role: 'assistant', content: DEMO_OPENER },
      ])
    } else {
      void send(OPENER_PROMPT, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // "Ask about this" on a card sends a question straight away.
  useEffect(() => {
    if (!ask || ask.nonce === handledAsk.current) return
    handledAsk.current = ask.nonce
    openerStarted.current = true
    void send(ask.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask])

  const visible = turns.filter((t) => !t.hidden)
  const lastIndex = turns.length - 1

  // The coach on the button shows what the chat is doing, one thing at a time: thinking while a reply
  // is awaited and nothing has arrived, speaking while it streams in, still the rest of the time.
  const last = turns[lastIndex]
  const pose: ClewPose = !busy ? 'still' : last?.role === 'assistant' && last.content ? 'speak' : 'think'

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="dock-button"
        onClick={open ? onClose : onOpen}
        aria-expanded={open}
        aria-controls="coach-dock"
      >
        <RoughFrame shape="circle" seed={63} roughness={1.2} />
        <ClewIcon size={36} pose={pose} />
        <span className="dock-label">{open ? 'Close' : 'Coach'}</span>
      </button>

      <aside
        id="coach-dock"
        className="dock"
        role="dialog"
        aria-modal="false"
        aria-label="Talk to the coach"
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <RoughFrame seed={71} />
        <div className="dock-head">
          <h2 className="dock-title">Talk it through</h2>
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="chat" role="log" aria-live="polite" aria-label="Conversation with the coach">
          {visible.length <= 1 && !busy && (
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => void send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {turns.map((t, i) =>
            t.hidden ? null : (
              <div key={i} className={`bubble bubble-${t.role}`}>
                <span className="bubble-who">{t.role === 'user' ? 'You' : 'Coach'}</span>
                <p>{t.content || (busy && i === lastIndex ? (checking ? 'Checking that you are a person' : 'Thinking') : '')}</p>
              </div>
            ),
          )}
          {turns.length === 0 && busy && (
            <div className="bubble bubble-assistant">
              <span className="bubble-who">Coach</span>
              <p>{checking ? 'Checking that you are a person' : 'Thinking'}</p>
            </div>
          )}
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
            ref={inputRef}
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
        <p className="privacy">
          Your messages and timeline are sent to an AI model (Anthropic) to answer you. Ariadne does not save them on a
          server.
        </p>
      </aside>
    </>
  )
}

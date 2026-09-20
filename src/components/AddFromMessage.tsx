import { useState } from 'react'
import { ApiError, extractTimeline } from '../lib/api'
import { formatRange } from '../lib/date'
import type { MemoryEntry } from '../types'

interface Props {
  /** What the person wrote in the chat. Only this text is sent, never the coach's replies. */
  text: string
  /** Adds the entries to the timeline and returns how many were new (repeats are skipped), or -1 when it is full. */
  onAdd: (entries: MemoryEntry[]) => number
}

type State =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'found'; entries: MemoryEntry[]; notes: string }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'added'; count: number }
  | { status: 'full' }

/**
 * Under a message the person typed: pick the experiences out of it and, only if they say yes, add
 * them to the timeline. It reuses the same reader as the file upload, so the same rules hold: it uses
 * only what the message says. Nothing is saved until "Add to my timeline" is pressed.
 */
export function AddFromMessage({ text, onAdd }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })

  async function read() {
    setState({ status: 'reading' })
    try {
      const { entries, notes } = await extractTimeline([], text)
      setState(entries.length > 0 ? { status: 'found', entries, notes } : { status: 'none' })
    } catch (err) {
      // The reader answers 422 when it found no experience in the text.
      if (err instanceof ApiError && err.status === 422) setState({ status: 'none' })
      else setState({ status: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    }
  }

  function add(entries: MemoryEntry[]) {
    const count = onAdd(entries.map((e) => ({ ...e, source: 'coach chat' })))
    setState(count < 0 ? { status: 'full' } : { status: 'added', count })
  }

  if (state.status === 'idle') {
    return (
      <p className="bubble-action">
        <button type="button" className="link-button" onClick={() => void read()}>
          Add this to my timeline
        </button>
      </p>
    )
  }

  if (state.status === 'reading') {
    return (
      <p className="bubble-action status" role="status">
        Sending this message to an AI model to find experiences in it. This can take up to a minute.
      </p>
    )
  }

  if (state.status === 'found') {
    return (
      <div className="bubble-action add-preview" role="status">
        <p>
          <strong>Here is what I found in what you wrote.</strong> Nothing is added until you say so.
        </p>
        <ul>
          {state.entries.map((e) => (
            <li key={e.id}>
              {e.title}
              {e.org ? ` at ${e.org}` : ''} ({formatRange(e)})
            </li>
          ))}
        </ul>
        {state.notes.trim() && <p className="status">{state.notes.trim()}</p>}
        <div className="upload-row">
          <button type="button" className="button" onClick={() => add(state.entries)}>
            Add to my timeline
          </button>
          <button type="button" className="link-button" onClick={() => setState({ status: 'idle' })}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'none') {
    return (
      <p className="bubble-action status" role="status">
        I could not find an experience in that message. Say what you did, where and roughly when, then try again.{' '}
        <button type="button" className="link-button" onClick={() => setState({ status: 'idle' })}>
          Dismiss
        </button>
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <p className="bubble-action error" role="alert">
        {state.message}{' '}
        <button type="button" className="link-button" onClick={() => void read()}>
          Try again
        </button>
      </p>
    )
  }

  if (state.status === 'full') {
    return (
      <p className="bubble-action status" role="status">
        Your timeline already holds the most it can (40 experiences), so nothing was added.
      </p>
    )
  }

  return (
    <p className="bubble-action status" role="status">
      {state.count > 0
        ? `Added ${state.count} ${state.count === 1 ? 'experience' : 'experiences'} to your timeline.`
        : 'Those are already on your timeline, so nothing was added.'}
    </p>
  )
}

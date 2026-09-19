import { useState } from 'react'
import { ApiError, suggestTrajectories, type TrajectoriesResponse, type Trajectory } from '../lib/api'
import type { MemoryEntry } from '../types'
import { seedFrom } from '../lib/seed'
import { RoughFrame } from './RoughFrame'

interface Props {
  entries: MemoryEntry[]
}

const CONFIDENCE_LABEL: Record<Trajectory['confidence'], string> = {
  high: 'Confidence: high',
  medium: 'Confidence: medium',
  low: 'Confidence: low',
}

function PathCard({ path }: { path: Trajectory }) {
  return (
    <article className="card path-card">
      <RoughFrame seed={seedFrom(path.title)} />
      <h3 className="card-title">{path.title}</h3>
      <p className="card-what">{path.summary}</p>

      <h4 className="path-heading">Why it fits you</h4>
      <p>{path.whyItFits}</p>

      <h4 className="path-heading">Things you may not have considered</h4>
      <ul className="bullets">
        {path.blindSpots.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h4 className="path-heading">Skills to build</h4>
      <ul className="gaps">
        {path.skillGaps.map((g) => (
          <li key={g.skill}>
            <strong>{g.skill}</strong>
            <span>Where you are: {g.whereYouAre}</span>
            <span>Next step: {g.nextStep}</span>
          </li>
        ))}
      </ul>

      <h4 className="path-heading">First steps</h4>
      <ul className="gaps">
        {path.firstSteps.map((s) => (
          <li key={s.action}>
            <strong>{s.action}</strong>
            <span>How to find it: {s.howToFind}</span>
          </li>
        ))}
      </ul>

      <p className={`confidence confidence-${path.confidence}`}>
        <strong>{CONFIDENCE_LABEL[path.confidence]}.</strong> {path.confidenceNote}
      </p>
    </article>
  )
}

export function PathsPanel({ entries }: Props) {
  const [goals, setGoals] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrajectoriesResponse | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      setResult(await suggestTrajectories(entries, goals.trim() || undefined))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="paths-title">
      <RoughFrame seed={47} />
      <h2 id="paths-title" className="panel-title">
        Where you could go
      </h2>
      <p className="panel-lead">
        Three different directions based on your timeline. You don&apos;t have to pick one yet.
      </p>

      <label className="field-label" htmlFor="goals">
        Anything you&apos;re curious about? (optional)
      </label>
      <textarea
        id="goals"
        className="textarea"
        rows={3}
        maxLength={1500}
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        placeholder="For example: I want more time with customers, or I'm curious about working in health."
        disabled={busy}
      />

      <div className="upload-row">
        <button type="button" className="button" onClick={() => void run()} disabled={busy}>
          {busy ? 'Looking for paths' : result ? 'Suggest again' : 'Suggest three paths'}
        </button>
        {busy && <span className="status">This takes about a minute.</span>}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="paths">
          {result.paths.map((p) => (
            <PathCard key={p.title} path={p} />
          ))}
          <p className="caveat">{result.caveat}</p>
        </div>
      )}
    </section>
  )
}

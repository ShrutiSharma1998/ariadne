import { useState } from 'react'
import samplePaths from '../data/samplePaths.json'
import {
  ApiError,
  suggestTrajectories,
  type PathReaction,
  type TrajectoriesResponse,
  type Trajectory,
} from '../lib/api'
import { computeInsights } from '../lib/insights'
import { seedFrom } from '../lib/seed'
import type { MemoryEntry } from '../types'
import { RoughFrame } from './RoughFrame'

interface Props {
  entries: MemoryEntry[]
  /** True for the fictional sample story, which comes with paths written in advance. */
  isSample: boolean
}

type Choice = PathReaction['choice']
type Reactions = Record<string, { choice?: Choice; why: string }>

const CONFIDENCE_LABEL: Record<Trajectory['confidence'], string> = {
  high: 'Confidence: high',
  medium: 'Confidence: medium',
  low: 'Confidence: low',
}

const CHOICES: { id: Choice; label: string }[] = [
  { id: 'drawn', label: "I'm drawn to this" },
  { id: 'maybe', label: 'Maybe' },
  { id: 'no', label: 'Not for me' },
]

function Insights({ entries }: { entries: MemoryEntry[] }) {
  const insights = computeInsights(entries)
  return (
    <div className="insights">
      <h3 className="path-heading">What your story already shows</h3>
      <ul className="bullets">
        {insights.span && (
          <li>
            Your timeline runs {insights.span}
            {insights.ongoing > 0 ? `, with ${insights.ongoing} ${insights.ongoing === 1 ? 'thing' : 'things'} still going` : ''}.
          </li>
        )}
        {insights.mix.length > 0 && (
          <li>
            Your mix: {insights.mix.map((m) => m.label).join(', ')}.
          </li>
        )}
        {insights.topSkills.length > 0 && (
          <li>Skills that show up most: {insights.topSkills.map((s) => s.skill).join(', ')}.</li>
        )}
        {insights.recent.length > 0 && <li>Most recent: {insights.recent.join(', then ')}.</li>}
      </ul>
    </div>
  )
}

function PathCard({
  path,
  reaction,
  onChoose,
  onWhy,
}: {
  path: Trajectory
  reaction: { choice?: Choice; why: string }
  onChoose: (choice: Choice) => void
  onWhy: (why: string) => void
}) {
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

      <div className="reaction-block">
        <div className="reaction-row" role="group" aria-label={`How do you feel about "${path.title}"?`}>
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="reaction"
              aria-pressed={reaction.choice === c.id}
              onClick={() => onChoose(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {reaction.choice && (
          <>
            <label className="sr-only" htmlFor={`why-${seedFrom(path.title)}`}>
              Why? (optional)
            </label>
            <input
              id={`why-${seedFrom(path.title)}`}
              className="why-input"
              type="text"
              maxLength={200}
              value={reaction.why}
              onChange={(e) => onWhy(e.target.value)}
              placeholder="Why? (optional, one line)"
            />
          </>
        )}
      </div>
    </article>
  )
}

export function PathsPanel({ entries, isSample }: Props) {
  const [result, setResult] = useState<TrajectoriesResponse | null>(
    isSample ? (samplePaths as TrajectoriesResponse) : null,
  )
  const [showingSamplePaths, setShowingSamplePaths] = useState(isSample)
  const [goals, setGoals] = useState('')
  const [reactions, setReactions] = useState<Reactions>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reacted: PathReaction[] = (result?.paths ?? []).flatMap((p) => {
    const r = reactions[p.title]
    return r?.choice ? [{ title: p.title, choice: r.choice, ...(r.why.trim() ? { why: r.why.trim() } : {}) }] : []
  })

  async function run(withFeedback: boolean) {
    setBusy(true)
    setError(null)
    try {
      const next = await suggestTrajectories(
        entries,
        goals.trim() || undefined,
        withFeedback && reacted.length > 0 ? reacted : undefined,
      )
      setResult(next)
      setShowingSamplePaths(false)
      setReactions({})
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
        {showingSamplePaths
          ? 'Three directions for the sample story, written in advance. Tell each one how it feels, then refine.'
          : "Three different directions based on your timeline. You don't have to pick one yet."}
      </p>

      <Insights entries={entries} />

      {!result && (
        <div className="upload-row">
          <button type="button" className="button" onClick={() => void run(false)} disabled={busy}>
            {busy ? 'Looking for paths' : 'Show my paths'}
          </button>
          {busy && <span className="status">This takes about a minute.</span>}
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="paths">
          {result.paths.map((p) => (
            <PathCard
              key={p.title}
              path={p}
              reaction={reactions[p.title] ?? { why: '' }}
              onChoose={(choice) =>
                setReactions((cur) => ({ ...cur, [p.title]: { why: cur[p.title]?.why ?? '', choice } }))
              }
              onWhy={(why) => setReactions((cur) => ({ ...cur, [p.title]: { ...cur[p.title], why } }))}
            />
          ))}
          <p className="caveat">{result.caveat}</p>

          <div className="steer">
            <h3 className="path-heading">Steer these paths</h3>
            <p className="panel-lead">
              Your reactions above count. You can also tell me what you are curious about, then refine.
            </p>
            <label className="sr-only" htmlFor="goals">
              What are you curious about? (optional)
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
              <button
                type="button"
                className="button"
                onClick={() => void run(true)}
                disabled={busy || (reacted.length === 0 && !goals.trim())}
              >
                {busy ? 'Refining' : 'Refine my paths'}
              </button>
              {busy && <span className="status">This takes about a minute.</span>}
              {!busy && reacted.length === 0 && !goals.trim() && (
                <span className="status">Pick a reaction on at least one path, or add a note.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

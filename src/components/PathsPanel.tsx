import { useState } from 'react'
import { ApiError, suggestTrajectories, type PathReaction, type Trajectory } from '../lib/api'
import { computeInsights } from '../lib/insights'
import { chosenPath, currentPaths, type Choice, type PathsSlot, type SavedPaths } from '../lib/pathsStorage'
import { seedFrom } from '../lib/seed'
import type { MemoryEntry } from '../types'
import { RoughFrame } from './RoughFrame'

interface Props {
  entries: MemoryEntry[]
  /** True for the fictional sample story, which comes with paths written in advance. */
  isSample: boolean
  /** What this browser remembers for this story. Every change is saved as it happens. */
  saved: SavedPaths
  onChange: (patch: Partial<SavedPaths> | ((current: SavedPaths) => Partial<SavedPaths>)) => void
}

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

/** What each reaction does, in words, so pressing one always shows a result. */
const REACTION_NOTE: Record<Choice, string> = {
  drawn: "Saved. You're drawn to this. It counts when you refine your paths.",
  maybe: 'Saved. Marked as a maybe. It counts when you refine your paths.',
  no: 'Saved. Marked as not for you. It counts when you refine your paths.',
}

function describeUse(reactionCount: number, hasNote: boolean): string {
  const parts: string[] = []
  if (reactionCount > 0) parts.push(`${reactionCount} ${reactionCount === 1 ? 'reaction' : 'reactions'}`)
  if (hasNote) parts.push('your note')
  return parts.join(' and ')
}

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

/** The path the person is going with, near the top of the page. */
function ChosenSummary({ path, onChange }: { path: Trajectory; onChange: () => void }) {
  return (
    <section className="card chosen-summary" aria-labelledby="chosen-title">
      <RoughFrame seed={seedFrom(`chosen-${path.title}`)} />
      <h3 id="chosen-title" className="path-heading">
        Your chosen path
      </h3>
      <p className="card-title">{path.title}</p>
      <p className="card-what">{path.summary}</p>
      {path.firstSteps.length > 0 && (
        <>
          <h4 className="path-heading">Your first steps</h4>
          <ol className="steps">
            {path.firstSteps.map((s) => (
              <li key={s.action}>{s.action}</li>
            ))}
          </ol>
        </>
      )}
      <p className="status">Saved in this browser.</p>
      <div className="upload-row">
        <button type="button" className="button button-outline" onClick={onChange}>
          Choose a different path
        </button>
      </div>
    </section>
  )
}

function PathCard({
  path,
  reaction,
  isChosen,
  locked,
  onChoose,
  onWhy,
  onGoWith,
  onChooseAnother,
}: {
  path: Trajectory
  reaction: { choice?: Choice; why: string }
  isChosen: boolean
  /** True while the paths are being refined, so nothing changes under the request. */
  locked: boolean
  onChoose: (choice: Choice) => void
  onWhy: (why: string) => void
  onGoWith: () => void
  onChooseAnother: () => void
}) {
  const whyId = `why-${seedFrom(path.title)}`
  return (
    <article className="card path-card">
      <RoughFrame seed={seedFrom(path.title)} />
      {isChosen && <p className="chosen-badge">Your chosen path</p>}
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
              disabled={locked}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="reaction-note" role="status">
          {reaction.choice ? REACTION_NOTE[reaction.choice] : ''}
        </p>
        {reaction.choice && (
          <>
            <label className="why-label" htmlFor={whyId}>
              Why? (optional)
            </label>
            <input
              id={whyId}
              className="why-input"
              type="text"
              maxLength={200}
              value={reaction.why}
              onChange={(e) => onWhy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              disabled={locked}
              aria-describedby={`${whyId}-hint`}
              placeholder="One line is plenty"
            />
            <p id={`${whyId}-hint`} className="why-hint">
              Saved as you type. We use this when you refine your paths.
            </p>
          </>
        )}
      </div>

      <div className="choose-row">
        {isChosen ? (
          <button type="button" className="button button-outline" onClick={onChooseAnother} disabled={locked}>
            Choose a different path
          </button>
        ) : (
          <button type="button" className="button" onClick={onGoWith} disabled={locked}>
            I&rsquo;m going with this one
          </button>
        )}
      </div>
    </article>
  )
}

export function PathsPanel({ entries, isSample, saved, onChange }: Props) {
  const slot: PathsSlot = isSample ? 'sample' : 'own'
  const result = currentPaths(slot, saved)
  const chosen = chosenPath(slot, saved)
  const showingSamplePaths = isSample && saved.result === null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The last thing that happened, in words. It is also read out to screen readers.
  const [note, setNote] = useState<string | null>(null)

  const reacted: PathReaction[] = (result?.paths ?? []).flatMap((p) => {
    const r = saved.reactions[p.title]
    return r?.choice ? [{ title: p.title, choice: r.choice, ...(r.why.trim() ? { why: r.why.trim() } : {}) }] : []
  })
  const hasNote = saved.goals.trim() !== ''
  const canRefine = reacted.length > 0 || hasNote

  function react(title: string, choice: Choice) {
    onChange((cur) => {
      const existing = cur.reactions[title]
      // Pressing the same reaction again takes it back.
      const next = existing?.choice === choice ? undefined : choice
      return { reactions: { ...cur.reactions, [title]: { why: existing?.why ?? '', choice: next } } }
    })
  }

  function explain(title: string, why: string) {
    onChange((cur) => ({ reactions: { ...cur.reactions, [title]: { ...cur.reactions[title], why } } }))
  }

  function goWith(title: string) {
    onChange({ chosen: title })
    setNote(`Saved. "${title}" is now your chosen path.`)
  }

  function chooseAnother() {
    onChange({ chosen: null })
    setNote('Your chosen path was cleared. Choose another whenever you are ready.')
  }

  async function run(withFeedback: boolean) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const used = withFeedback ? reacted : []
      const next = await suggestTrajectories(entries, saved.goals.trim() || undefined, used.length > 0 ? used : undefined)
      const titles = new Set(next.paths.map((p) => p.title))
      const keepChosen = saved.chosen !== null && titles.has(saved.chosen)
      onChange((cur) => ({
        result: next,
        // Keep a reaction only if its path is still here.
        reactions: Object.fromEntries(Object.entries(cur.reactions).filter(([title]) => titles.has(title))),
        chosen: keepChosen ? cur.chosen : null,
      }))
      const parts = [
        withFeedback
          ? `Your paths were refined using ${describeUse(used.length, hasNote)}.`
          : 'Your paths are ready, and saved in this browser.',
      ]
      if (saved.chosen) {
        parts.push(
          keepChosen
            ? `Your chosen path, "${saved.chosen}", is still there.`
            : `"${saved.chosen}" is not among the new paths, so choose again if you want a path on your timeline.`,
        )
      }
      setNote(parts.join(' '))
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

      {/* Always in the page, so a screen reader hears each message when it appears. */}
      <p className={note ? 'notice' : 'status'} role="status">
        {note}
      </p>

      {chosen && <ChosenSummary path={chosen} onChange={chooseAnother} />}

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
              reaction={saved.reactions[p.title] ?? { why: '' }}
              isChosen={chosen?.title === p.title}
              locked={busy}
              onChoose={(choice) => react(p.title, choice)}
              onWhy={(why) => explain(p.title, why)}
              onGoWith={() => goWith(p.title)}
              onChooseAnother={chooseAnother}
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
              value={saved.goals}
              onChange={(e) => onChange({ goals: e.target.value })}
              placeholder="For example: I want more time with customers, or I'm curious about working in health."
              disabled={busy}
              aria-describedby="goals-hint"
            />
            <p id="goals-hint" className="why-hint">
              Saved as you type. We use this when you refine your paths.
            </p>
            <div className="upload-row">
              <button type="button" className="button" onClick={() => void run(true)} disabled={busy || !canRefine}>
                {busy ? 'Refining' : 'Refine my paths'}
              </button>
              {busy && <span className="status">This takes about a minute.</span>}
              {!busy && canRefine && (
                <span className="status">Using {describeUse(reacted.length, hasNote)}. This asks the AI again.</span>
              )}
              {!busy && !canRefine && (
                <span className="status">Pick a reaction on at least one path, or add a note, then you can refine.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

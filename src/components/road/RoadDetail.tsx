import { formatRange } from '../../lib/date'
import type { RoadModel } from '../../lib/roadModel'
import type { MemoryEntry } from '../../types'
import { KindGlyph } from '../KindGlyph'
import { RoughFrame } from '../RoughFrame'
import type { Focus, Level } from './useRoadCamera'

interface Props {
  level: Level
  focus: Focus
  model: RoadModel
  onPickEntry: (id: string) => void
  onAsk: (entry: MemoryEntry) => void
  /** Opens the coach with a message already written, for a step of the chosen path. */
  onAskText: (text: string) => void
  /** Opens the paths page, where the chosen path can be read in full or changed. */
  onOpenPaths: () => void
}

/**
 * What the camera is looking at, in words. It always sits in the page flow under the road, so it
 * works for anyone who cannot use the drawing, and it is announced as it changes.
 */
export function RoadDetail({ level, focus, model, onPickEntry, onAsk, onAskText, onOpenPaths }: Props) {
  const year = model.years.find((y) => y.year === focus.year)
  const stop = model.stops.find((s) => s.id === focus.id)
  const path = model.destination

  return (
    <div className="road-detail" aria-live="polite">
      <RoughFrame seed={43} />
      {level === 'horizon' && (
        <p className="road-hint">
          {path
            ? `Choose a year on the road to zoom in. The road ends at the path you chose, “${path.title}”. The dashed dots are its first steps, and they have not happened yet.`
            : 'Choose a year on the road to zoom in. The dots show what happened in it, and the dashed road is what could come next.'}
        </p>
      )}

      {level === 'chapter' && year && (
        <>
          <h2 className="road-detail-title">{year.year}</h2>
          <p className="road-hint">
            {year.entries.length} {year.entries.length === 1 ? 'experience' : 'experiences'}. Choose one to see its story.
          </p>
          <ul className="year-list">
            {year.entries.map((s) => (
              <li key={s.id}>
                <button type="button" className={`year-item kind-${s.entry.kind}`} onClick={() => onPickEntry(s.id)}>
                  <KindGlyph kind={s.entry.kind} size={22} />
                  <span>{s.entry.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {level === 'moment' && stop?.type === 'entry' && (
        <article>
          <p className="card-date">{formatRange(stop.entry)}</p>
          <h2 className="road-detail-title">{stop.entry.title}</h2>
          {stop.entry.org && <p className="card-org">{stop.entry.org}</p>}
          <p className="card-what">{stop.entry.what}</p>
          <dl className="road-detail-facts">
            <dt>How I did it</dt>
            <dd>{stop.entry.how}</dd>
            <dt>Impact</dt>
            <dd>{stop.entry.impact}</dd>
            <dt>What I learned</dt>
            <dd>{stop.entry.learned}</dd>
          </dl>
          <ul className="skills" aria-label="Skills used">
            {stop.entry.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="source">From {stop.entry.source}</p>
          <button type="button" className="button" onClick={() => onAsk(stop.entry)}>
            Ask the coach about this
          </button>
        </article>
      )}

      {level === 'moment' && stop?.type === 'milestone' && path && (
        <article>
          <p className="card-date">
            Next step {stop.n} of {stop.total}
          </p>
          <h2 className="road-detail-title">{stop.action}</h2>
          <p className="card-org">On your path: {path.title}</p>
          <dl className="road-detail-facts">
            <dt>How to find it</dt>
            <dd>{stop.howToFind}</dd>
          </dl>
          <p className="source">This is a possibility the coach suggested. It is not from your files.</p>
          <div className="road-detail-actions">
            <button
              type="button"
              className="button"
              onClick={() =>
                onAskText(
                  `I'm going with the path "${path.title}". Can you help me with step ${stop.n}: ${stop.action.replace(/[.!?]+$/, '')}. Where would I actually start?`,
                )
              }
            >
              Ask the coach about this step
            </button>
            <button type="button" className="link-button" onClick={onOpenPaths}>
              See this path on the Paths page
            </button>
          </div>
        </article>
      )}

      {level === 'moment' && stop?.type === 'destination' && (
        <article>
          <p className="card-date">Where your road leads</p>
          <h2 className="road-detail-title">{stop.title}</h2>
          <p className="card-what">{stop.summary}</p>
          <p className="source">
            You chose this path. It is a possibility, not something from your files.
            {model.milestones.length > 0
              ? ` Its ${model.milestones.length === 1 ? 'first step is' : `${model.milestones.length} first steps are`} marked on the road.`
              : ''}
          </p>
          <div className="road-detail-actions">
            <button type="button" className="button" onClick={onOpenPaths}>
              See this path on the Paths page
            </button>
          </div>
        </article>
      )}
    </div>
  )
}

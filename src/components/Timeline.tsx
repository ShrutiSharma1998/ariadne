import { Fragment, useEffect, useRef } from 'react'
import { KIND_LABEL, type MemoryEntry, type Zoom } from '../types'
import { byStart, formatRange, yearOf } from '../lib/date'
import { KindGlyph } from './KindGlyph'
import { seedFrom } from '../lib/seed'
import { RoughFrame } from './RoughFrame'

interface Props {
  entries: MemoryEntry[]
  zoom: Zoom
  expandedId: string | null
  onToggle: (id: string) => void
  onPickFromYear: (id: string) => void
  onAsk: (entry: MemoryEntry) => void
}

/** The thread that runs down the page. A repeating hand-drawn tile, roughened by the #pencil filter. */
function ThreadRail() {
  return (
    <svg className="rail" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="thread-tile" width="40" height="160" patternUnits="userSpaceOnUse">
          <path
            d="M20 0 C28 30 12 50 20 80 C28 110 12 130 20 160"
            fill="none"
            stroke="var(--thread)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M21.5 0 C29 30 13.5 50 21.5 80 C29 110 13.5 130 21.5 160"
            fill="none"
            stroke="var(--ink-2)"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#thread-tile)" />
    </svg>
  )
}

function EntryCard({
  entry,
  side,
  expanded,
  onToggle,
  onAsk,
}: {
  entry: MemoryEntry
  side: 'left' | 'right'
  expanded: boolean
  onToggle: () => void
  onAsk: () => void
}) {
  const detailId = `detail-${entry.id}`
  return (
    <li className={`row row-${side}`} id={`entry-${entry.id}`}>
      <article className={`card kind-${entry.kind}`}>
        <RoughFrame seed={seedFrom(entry.id)} />
        <button
          type="button"
          className="card-head"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={onToggle}
        >
          <span className="card-date">{formatRange(entry)}</span>
          <span className="card-title">{entry.title}</span>
          {entry.org && <span className="card-org">{entry.org}</span>}
          <span className="card-what">{entry.what}</span>
          <span className="card-more">{expanded ? 'Show less' : 'Show the story'}</span>
        </button>
        <button type="button" className="link-button ask-link" onClick={onAsk}>
          Ask the coach about this
        </button>
        <div id={detailId} className="card-body" hidden={!expanded}>
          <dl>
            <dt>How I did it</dt>
            <dd>{entry.how}</dd>
            <dt>Impact</dt>
            <dd>{entry.impact}</dd>
            <dt>What I learned</dt>
            <dd>{entry.learned}</dd>
          </dl>
          <ul className="skills" aria-label="Skills used">
            {entry.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="source">From {entry.source}</p>
        </div>
      </article>
      <span className={`node kind-${entry.kind}`} title={KIND_LABEL[entry.kind]}>
        <RoughFrame shape="circle" seed={seedFrom(`${entry.id}-node`)} roughness={1.1} />
        <KindGlyph kind={entry.kind} />
        <span className="sr-only">{KIND_LABEL[entry.kind]}</span>
      </span>
    </li>
  )
}

function ForkEnd() {
  return (
    <li className="row row-right row-end">
      <div className="card card-future">
        <RoughFrame dashed seed={11} />
        <p className="card-title">Where next</p>
        <p className="card-what">
          Three possible paths will branch from here once the coach has met you and knows what you want to learn.
        </p>
      </div>
      <span className="node node-fork" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 44 44" focusable="false">
          <path d="M22 4 L22 18" className="fork-solid" />
          <path d="M22 18 C22 26 10 26 8 38" className="fork-dash" />
          <path d="M22 18 L22 40" className="fork-dash" />
          <path d="M22 18 C22 26 34 26 36 38" className="fork-dash" />
        </svg>
      </span>
    </li>
  )
}

export function Timeline({ entries, zoom, expandedId, onToggle, onPickFromYear, onAsk }: Props) {
  const sorted = [...entries].sort(byStart)
  const pendingScroll = useRef<string | null>(null)

  useEffect(() => {
    const id = pendingScroll.current
    if (zoom !== 'months' || !id) return
    pendingScroll.current = null
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`entry-${id}`)?.scrollIntoView({
      block: 'center',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [zoom, expandedId])

  if (zoom === 'years') {
    const years = [...new Set(sorted.map((e) => yearOf(e.start)))]
    return (
      <div className="timeline">
        <ThreadRail />
        <ol className="rows">
          {years.map((year, i) => {
            const inYear = sorted.filter((e) => yearOf(e.start) === year)
            const side = i % 2 === 0 ? 'left' : 'right'
            return (
              <li key={year} className={`row row-${side}`}>
                <div className="card year-card">
                  <RoughFrame seed={seedFrom(`year-${year}`)} />
                  <h2 className="year-title">{year}</h2>
                  <ul className="year-list">
                    {inYear.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className={`year-item kind-${e.kind}`}
                          onClick={() => {
                            pendingScroll.current = e.id
                            onPickFromYear(e.id)
                          }}
                        >
                          <KindGlyph kind={e.kind} size={22} />
                          <span>{e.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="node node-year" aria-hidden="true">
                  <RoughFrame shape="circle" seed={seedFrom(`year-node-${year}`)} roughness={1.1} />
                  {String(year).slice(2)}
                </span>
              </li>
            )
          })}
          <ForkEnd />
        </ol>
      </div>
    )
  }

  return (
    <div className="timeline">
      <ThreadRail />
      <ol className="rows">
        {sorted.map((entry, i) => {
          const year = yearOf(entry.start)
          const showYear = i === 0 || year !== yearOf(sorted[i - 1].start)
          const side = i % 2 === 0 ? 'left' : 'right'
          return (
            <Fragment key={entry.id}>
              {showYear && (
                <li className="yearmark" aria-hidden="true">
                  <span>{year}</span>
                </li>
              )}
              <EntryCard
                entry={entry}
                side={side}
                expanded={expandedId === entry.id}
                onToggle={() => onToggle(entry.id)}
                onAsk={() => onAsk(entry)}
              />
            </Fragment>
          )
        })}
        <ForkEnd />
      </ol>
    </div>
  )
}

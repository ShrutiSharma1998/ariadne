import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { layoutTags, type Box } from '../../lib/roadLayout'
import { buildRoadModel, createRoad, END_T, ROAD_H, ROAD_W } from '../../lib/roadModel'
import type { MemoryEntry } from '../../types'
import '../../styles/road.css'
import { RoughFrame } from '../RoughFrame'
import { Clew } from './Clew'
import { drawScenery } from './scenery'

interface Props {
  entries: MemoryEntry[]
  /** A year on the road was chosen. */
  onPickYear: (year: number, firstEntryId: string) => void
  /** "Where next" was chosen: go to the paths page. */
  onWhereNext: () => void
}

/** The coach's size on the road, in scene units. */
const WALKER_SCALE = 1.05

// The road never changes, so it is built once for the whole app.
const ROAD = createRoad()
const FORK: [number, number][] = [
  [1100, 146],
  [1158, 204],
  [1092, 108],
]

function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(max-width: 640px)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(max-width: 640px)').matches,
    () => false,
  )
}

/**
 * The person's story as a hand-drawn road that climbs toward "Where next". Scenery is drawn once
 * and scaled to fit; markers are real buttons laid over it, in chronological order.
 */
export function RoadView({ entries, onPickYear, onWhereNext }: Props) {
  const model = useMemo(() => buildRoadModel(entries), [entries])
  const narrow = useNarrow()

  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const skyRef = useRef<SVGGElement>(null)
  const farRef = useRef<SVGGElement>(null)
  const midRef = useRef<SVGGElement>(null)
  const nearRef = useRef<SVGGElement>(null)
  const flagRefs = useRef<(HTMLLIElement | null)[]>([])

  const now = ROAD.at(model.nowT)
  const end = ROAD.at(END_T)

  // Hills, trees and sky: drawn once, never while anything moves.
  useEffect(() => {
    const [sky, far, mid, near] = [skyRef.current, farRef.current, midRef.current, nearRef.current]
    if (sky && far && mid && near) drawScenery({ sky, far, mid, near })
  }, [])

  const markerCount = model.years.length + 1

  /** Puts each marker on its spot in the scene, and each label on a free side of its marker. */
  const place = useCallback(() => {
    const svg = svgRef.current
    const stage = stageRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !stage || !m) return
    const bounds = stage.getBoundingClientRect()
    const toStage = (p: { x: number; y: number }) => {
      const pt = svg.createSVGPoint()
      pt.x = p.x
      pt.y = p.y
      const q = pt.matrixTransform(m)
      return { x: q.x - bounds.left, y: q.y - bounds.top }
    }
    const unit = m.a // screen pixels per scene unit
    const spots = [...model.years.map((y) => ROAD.at(y.t)), end].map(toStage)

    const nodeR = Math.max(6, 9 * unit)
    const walker = toStage(now)
    const obstacles: Box[] = [{ x: walker.x - 50 * WALKER_SCALE * unit, y: walker.y - 92 * WALKER_SCALE * unit, w: 88 * WALKER_SCALE * unit, h: 98 * WALKER_SCALE * unit }]
    const markers: Box[] = spots.map((s) => ({ x: s.x - 14 * unit, y: s.y - 14 * unit, w: 28 * unit, h: 28 * unit }))
    const tags = spots.map((s, i) => {
      const tag = flagRefs.current[i]?.querySelector<HTMLElement>('.road-tag')
      return { x: s.x, y: s.y, w: tag?.offsetWidth ?? 60, h: tag?.offsetHeight ?? 28, prefer: (i % 2 ? 'down' : 'up') as 'up' | 'down' }
    })
    const gap = Math.round(nodeR + 10)
    const placed = layoutTags(tags, { w: bounds.width, h: bounds.height }, obstacles, markers, gap)

    spots.forEach((s, i) => {
      const li = flagRefs.current[i]
      if (!li) return
      const p = placed[i]
      li.style.transform = `translate(${s.x}px, ${s.y}px)`
      li.style.setProperty('--tx', `${p.dx}px`)
      li.style.setProperty('--ty', `${p.dy}px`)
      // A fine leader line runs from the marker to its label.
      li.style.setProperty('--lx', `${-p.dx}px`)
      if (p.side === 'up') {
        li.style.setProperty('--ly', `${tags[i].h}px`)
        li.style.setProperty('--ll', `${Math.max(0, -(p.dy + tags[i].h) - nodeR)}px`)
      } else {
        li.style.setProperty('--ly', `${-Math.max(0, p.dy - nodeR)}px`)
        li.style.setProperty('--ll', `${Math.max(0, p.dy - nodeR)}px`)
      }
    })
  }, [model, now, end])

  useLayoutEffect(() => {
    place()
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(place)
    observer.observe(stage)
    // Labels are measured, so measure again once the fonts have arrived.
    void document.fonts?.ready.then(place)
    return () => observer.disconnect()
  }, [place, narrow])

  return (
    <section className="road" aria-label="Your story as a road">
      <div ref={stageRef} className="road-stage">
        <RoughFrame seed={41} />
        <svg
          ref={svgRef}
          className="road-scene"
          viewBox={`0 0 ${ROAD_W} ${ROAD_H}`}
          preserveAspectRatio={narrow ? 'xMidYMid meet' : 'xMidYMid slice'}
          aria-hidden="true"
          focusable="false"
        >
          <g ref={skyRef} />
          <g ref={farRef} />
          <g ref={midRef} />
          <g ref={nearRef} />

          <g className="road-plane">
            <g className="road-bed" filter="url(#pencil)">
              <path className="road-edge" d={ROAD.d} />
              <path className="road-fill" d={ROAD.d} />
              <path className="road-thread road-ahead" d={ROAD.d} />
              {/* pathLength=1 makes the dash maths simple: solid up to "now", dashed beyond. */}
              <path className="road-thread road-done" d={ROAD.d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - model.nowT} />
            </g>

            <g className="road-fork" filter="url(#pencil)">
              {FORK.map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <path d={`M${end.x},${end.y} C${end.x + 20},${end.y - 30} ${x - 30},${y + 24} ${x},${y}`} />
                  <circle cx={x} cy={y} r="5" />
                </g>
              ))}
            </g>

            {model.entries.map((s) => {
              const p = ROAD.at(s.t)
              return <circle key={s.id} className="road-dot" cx={p.x} cy={p.y} r="3.2" style={{ fill: `var(--k-${s.entry.kind})` }} />
            })}

            <g className="road-nodes" filter="url(#pencil)">
              {model.years.map((y) => {
                const p = ROAD.at(y.t)
                return <circle key={y.year} className="road-node" cx={p.x} cy={p.y} r="9" />
              })}
              <circle className="road-node road-node-next" cx={end.x} cy={end.y} r="10" />
            </g>

            <g transform={`translate(${now.x} ${now.y}) scale(${WALKER_SCALE})`}>
              <Clew pose="still" />
            </g>
          </g>
        </svg>

        <ol className="road-flags" aria-label="Your story, year by year">
          {model.years.map((y, i) => (
            <li
              key={y.year}
              ref={(el) => {
                flagRefs.current[i] = el
              }}
              className="road-flag"
            >
              <button
                type="button"
                className="road-flag-btn"
                aria-label={`${y.year}, ${y.entries.length} ${y.entries.length === 1 ? 'experience' : 'experiences'}`}
                onClick={() => onPickYear(y.year, y.entries[0].id)}
              >
                <span className="road-tag">
                  <span className="road-leader" aria-hidden="true" />
                  <span className="road-year">{y.year}</span>
                  <span className="road-kinds" aria-hidden="true">
                    {y.kinds.map((k) => (
                      <i key={k} style={{ background: `var(--k-${k})` }} />
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li
            ref={(el) => {
              flagRefs.current[markerCount - 1] = el
            }}
            className="road-flag road-flag-next"
          >
            <button type="button" className="road-flag-btn" aria-label="Where next: see possible paths" onClick={onWhereNext}>
              <span className="road-tag">
                <span className="road-leader" aria-hidden="true" />
                <span className="road-year">Where next</span>
              </span>
            </button>
          </li>
        </ol>
      </div>
      <p className="road-hint">
        Each mark on the road is a year of your story, and the coloured dots are what happened in it. The dashed road is what could come next.
      </p>
    </section>
  )
}

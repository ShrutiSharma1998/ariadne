import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { formatRange } from '../../lib/date'
import { layoutTags, type Box } from '../../lib/roadLayout'
import { buildRoadModel, createRoad, END_T, ROAD_H, ROAD_W, type RoadPath } from '../../lib/roadModel'
import type { EntryKind, MemoryEntry } from '../../types'
import '../../styles/road.css'
import { RoughFrame } from '../RoughFrame'
import { Clew } from './Clew'
import { RoadDetail } from './RoadDetail'
import { drawScenery, WALKER_SCALE, type LayerId } from './scenery'
import { useRoadCamera, type Level } from './useRoadCamera'

interface Props {
  entries: MemoryEntry[]
  /** The path the person is going with, if they chose one. Its first steps become milestones. */
  chosen: RoadPath | null
  /** "Ask the coach about this" was chosen for an experience. */
  onAsk: (entry: MemoryEntry) => void
  /** The coach was asked about something else, such as a step of the chosen path. */
  onAskText: (text: string) => void
  /** "Where next" was chosen, or the chosen path should be opened: go to the paths page. */
  onWhereNext: () => void
}

// The road never changes, so it is built once for the whole app.
const ROAD = createRoad()
const FORK: [number, number][] = [
  [1100, 146],
  [1158, 204],
  [1092, 108],
]

const LEVEL_LABEL: Record<Level, string> = { horizon: 'The whole road', chapter: 'One year', moment: 'One experience' }

interface Marker {
  key: string
  kind: 'year' | 'entry' | 'milestone' | 'destination' | 'next'
  t: number
  label: string
  /** The accessible name of the button. */
  name: string
  dots: EntryKind[]
  current: boolean
  onClick: () => void
}

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
 * The person's story as a hand-drawn road that climbs toward "Where next". Zoom in from the whole
 * road to a year to one experience. Scenery is drawn once; markers are real buttons over it.
 * A different story starts again from the whole road, with a fresh camera.
 */
export function RoadView(props: Props) {
  const { entries, chosen } = props
  const storyKey = `${entries.length}:${entries[0]?.id ?? ''}:${entries[entries.length - 1]?.id ?? ''}:${chosen?.title ?? ''}`
  return <RoadScene key={storyKey} {...props} />
}

function RoadScene({ entries, chosen, onAsk, onAskText, onWhereNext }: Props) {
  const model = useMemo(() => buildRoadModel(entries, chosen), [entries, chosen])
  const narrow = useNarrow()

  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const walkerRef = useRef<SVGGElement>(null)
  const layers = useRef<Record<LayerId, SVGGElement | null>>({ sky: null, far: null, mid: null, near: null })
  const flagRefs = useRef<(HTMLLIElement | null)[]>([])
  const placeRef = useRef<() => void>(() => {})

  // Which way the story is read. The road is drawn the same either way; only the walking order changes.
  const [reverse, setReverse] = useState(false)

  const cam = useRoadCamera({ road: ROAD, model, svgRef, layers, walkerRef, onFrame: () => placeRef.current(), reverse })
  const { level, focus } = cam
  const end = ROAD.at(END_T)

  // Hills, trees and sky: drawn once, never while anything moves.
  useEffect(() => {
    const g = layers.current
    if (g.sky && g.far && g.mid && g.near) drawScenery({ sky: g.sky, far: g.far, mid: g.mid, near: g.near })
  }, [])

  // From the whole road, the markers are years. Zoomed in, they are the experiences, then the chosen
  // path's steps. The end of the road is "Where next" until a path is chosen, then that path.
  const markers = useMemo<Marker[]>(() => {
    const dest = model.destination
    const next: Marker = dest
      ? {
          key: dest.id,
          kind: 'destination',
          t: END_T,
          label: `Your path: ${dest.title}`,
          name: `Your path: ${dest.title}. See details.`,
          dots: [],
          current: focus.id === dest.id,
          onClick: () => cam.goStop(dest.id),
        }
      : { key: 'next', kind: 'next', t: END_T, label: 'Where next', name: 'Where next: see possible paths', dots: [], current: false, onClick: onWhereNext }
    if (level === 'horizon') {
      return [
        ...model.years.map((y) => ({
          key: `y${y.year}`,
          kind: 'year' as const,
          t: y.t,
          label: String(y.year),
          name: `${y.year}, ${y.entries.length} ${y.entries.length === 1 ? 'experience' : 'experiences'}. Zoom in.`,
          dots: y.kinds,
          current: false,
          onClick: () => cam.goYear(y.year),
        })),
        next,
      ]
    }
    return [
      ...model.entries.map((s) => ({
        key: s.id,
        kind: 'entry' as const,
        t: s.t,
        label: s.entry.title,
        name: `${s.entry.title}, ${formatRange(s.entry)}. See its story.`,
        dots: [s.entry.kind],
        current: focus.id === s.id,
        onClick: () => cam.goStop(s.id),
      })),
      ...model.milestones.map((m) => ({
        key: m.id,
        kind: 'milestone' as const,
        t: m.t,
        label: `Step ${m.n}: ${m.action}`,
        name: `Next step ${m.n} of ${m.total}: ${m.action.replace(/[.!?]+$/, '')}. See details.`,
        dots: [],
        current: focus.id === m.id,
        onClick: () => cam.goStop(m.id),
      })),
      next,
    ]
  }, [level, focus.id, model, onWhereNext, cam.goYear, cam.goStop]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const spots = markers.map((mk) => toStage(ROAD.at(mk.t)))
    const visible = spots.map((s) => s.x > -30 && s.x < bounds.width + 30 && s.y > -30 && s.y < bounds.height + 30)
    markers.forEach((_, i) => {
      const li = flagRefs.current[i]
      if (li) li.hidden = !visible[i]
    })

    const nodeR = Math.max(6, 9 * unit)
    const walker = toStage(ROAD.at(cam.walkerT.current))
    const obstacles: Box[] = [{ x: walker.x - 50 * WALKER_SCALE * unit, y: walker.y - 92 * WALKER_SCALE * unit, w: 88 * WALKER_SCALE * unit, h: 98 * WALKER_SCALE * unit }]
    const shown = markers.map((_, i) => i).filter((i) => visible[i])
    const boxes: Box[] = shown.map((i) => ({ x: spots[i].x - 14 * unit, y: spots[i].y - 14 * unit, w: 28 * unit, h: 28 * unit }))
    const tags = shown.map((i, k) => {
      const tag = flagRefs.current[i]?.querySelector<HTMLElement>('.road-tag')
      const kind = markers[i].kind
      // The end of the road and the place you are looking at keep their labels first.
      const priority = kind === 'next' || kind === 'destination' ? 3 : markers[i].current ? 2 : 0
      return { x: spots[i].x, y: spots[i].y, w: tag?.offsetWidth ?? 60, h: tag?.offsetHeight ?? 28, prefer: (k % 2 ? 'down' : 'up') as 'up' | 'down', priority }
    })
    const placed = layoutTags(tags, { w: bounds.width, h: bounds.height }, obstacles, boxes, Math.round(nodeR + 10))

    shown.forEach((i, k) => {
      const li = flagRefs.current[i]
      if (!li) return
      const p = placed[k]
      // A label with no clear spot waits behind its marker until the marker is hovered or focused.
      li.classList.toggle('road-flag-crowded', !p.fits)
      li.style.transform = `translate(${spots[i].x}px, ${spots[i].y}px)`
      li.style.setProperty('--tx', `${p.dx}px`)
      li.style.setProperty('--ty', `${p.dy}px`)
      // A fine leader line runs from the marker to its label.
      li.style.setProperty('--lx', `${-p.dx}px`)
      if (p.side === 'up') {
        li.style.setProperty('--ly', `${tags[k].h}px`)
        li.style.setProperty('--ll', `${Math.max(0, -(p.dy + tags[k].h) - nodeR)}px`)
      } else if (p.side === 'down') {
        li.style.setProperty('--ly', `${-Math.max(0, p.dy - nodeR)}px`)
        li.style.setProperty('--ll', `${Math.max(0, p.dy - nodeR)}px`)
      } else {
        // A label beside its marker is close enough to need no leader line.
        li.style.setProperty('--ll', '0px')
      }
    })
  }, [markers, cam.walkerT])

  useLayoutEffect(() => {
    placeRef.current = place
  })
  useLayoutEffect(() => {
    place()
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(() => place())
    observer.observe(stage)
    // Labels are measured, so measure again once the fonts have arrived.
    void document.fonts?.ready.then(() => place())
    return () => observer.disconnect()
  }, [place, narrow])

  // Ctrl with the wheel (or a trackpad pinch) zooms; plain scrolling never does.
  const camRef = useRef(cam)
  useLayoutEffect(() => {
    camRef.current = cam
  })
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let lock = 0
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const now = performance.now()
      if (now < lock) return
      lock = now + 700
      if (e.deltaY < 0) camRef.current.zoomIn()
      else camRef.current.zoomOut()
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  // Two fingers moving apart zoom in; moving together zoom out. One step per gesture, exactly as the
  // buttons do, and only touch: a mouse has the buttons, the keys and Ctrl with the wheel.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const fingers = new Map<number, { x: number; y: number }>()
    let startGap = 0
    let done = false
    const gap = () => {
      const [a, b] = [...fingers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (fingers.size === 2) {
        startGap = gap()
        done = false
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (fingers.size !== 2 || done || startGap < 10) return
      const ratio = gap() / startGap
      if (ratio > 1.3) {
        done = true
        camRef.current.zoomIn()
      } else if (ratio < 0.77) {
        done = true
        camRef.current.zoomOut()
      }
    }
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId)
      if (fingers.size < 2) startGap = 0
    }
    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerup', onUp)
    stage.addEventListener('pointercancel', onUp)
    return () => {
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerup', onUp)
      stage.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === '-') cam.zoomOut()
    else if (e.key === '+' || e.key === '=') cam.zoomIn()
    else if (e.key === 'ArrowRight') cam.step(1)
    else if (e.key === 'ArrowLeft') cam.step(-1)
    else return
    e.preventDefault()
  }

  const yearIdx = model.years.findIndex((y) => y.year === focus.year)
  const stopIdx = model.stops.findIndex((s) => s.id === focus.id)
  const canPrev = level === 'chapter' ? yearIdx > 0 : level === 'moment' ? stopIdx > 0 : false
  const canNext = level === 'chapter' ? yearIdx >= 0 && yearIdx < model.years.length - 1 : level === 'moment' ? stopIdx >= 0 && stopIdx < model.stops.length - 1 : false

  return (
    <section className="road" aria-label="Your story as a road" onKeyDown={onKeyDown}>
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
          <g ref={(el) => { layers.current.sky = el }} />
          <g ref={(el) => { layers.current.far = el }} />
          <g ref={(el) => { layers.current.mid = el }} />
          <g ref={(el) => { layers.current.near = el }} />

          <g className="road-plane">
            <g className="road-bed" filter="url(#pencil)">
              <path className="road-edge" d={ROAD.d} />
              <path className="road-fill" d={ROAD.d} />
              <path className="road-thread road-ahead" d={ROAD.d} />
              {/* pathLength=1 makes the dash maths simple: solid up to "now", dashed beyond. */}
              <path className="road-thread road-done" d={ROAD.d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - model.nowT} />
            </g>

            <g className="road-fork" filter="url(#pencil)">
              {model.destination ? (
                // One branch, ending in a flag: the person has picked where they are headed.
                <g>
                  <path d={`M${end.x},${end.y} C${end.x + 20},${end.y - 30} ${FORK[0][0] - 30},${FORK[0][1] + 24} ${FORK[0][0]},${FORK[0][1]}`} />
                  <path className="road-flag-pole" d={`M${FORK[0][0]},${FORK[0][1]} L${FORK[0][0]},${FORK[0][1] - 30}`} />
                  <path className="road-flag-cloth" d={`M${FORK[0][0]},${FORK[0][1] - 30} L${FORK[0][0] + 20},${FORK[0][1] - 23} L${FORK[0][0]},${FORK[0][1] - 16} Z`} />
                </g>
              ) : (
                FORK.map(([x, y]) => (
                  <g key={`${x}-${y}`}>
                    <path d={`M${end.x},${end.y} C${end.x + 20},${end.y - 30} ${x - 30},${y + 24} ${x},${y}`} />
                    <circle cx={x} cy={y} r="5" />
                  </g>
                ))
              )}
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
              {/* The chosen path's steps: dashed, because they have not happened yet. */}
              {model.milestones.map((m) => {
                const p = ROAD.at(m.t)
                return <circle key={m.id} className="road-node road-node-step" cx={p.x} cy={p.y} r="6.5" />
              })}
              <circle className="road-node road-node-next" cx={end.x} cy={end.y} r="10" />
            </g>

            {/* The coach. Its position is set by the camera hook, frame by frame. */}
            <g ref={walkerRef}>
              <Clew pose={cam.pose} />
            </g>
          </g>
        </svg>

        <ol className="road-flags" aria-label={level === 'horizon' ? 'Your story, year by year' : 'Your story, experience by experience'}>
          {markers.map((mk, i) => (
            <li
              key={mk.key}
              ref={(el) => {
                flagRefs.current[i] = el
              }}
              className={`road-flag road-flag-${mk.kind}${level === 'moment' && (mk.kind === 'entry' || mk.kind === 'milestone') && !mk.current ? ' road-flag-quiet' : ''}`}
            >
              <button type="button" className="road-flag-btn" aria-label={mk.name} aria-current={mk.current ? 'true' : undefined} onClick={mk.onClick}>
                <span className="road-tag" data-kind={mk.kind}>
                  <span className="road-leader" aria-hidden="true" />
                  <span className="road-year">{mk.label}</span>
                  {mk.dots.length > 0 && (
                    <span className="road-kinds" aria-hidden="true">
                      {mk.dots.map((k) => (
                        <i key={k} style={{ background: `var(--k-${k})` }} />
                      ))}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="road-toolbar" role="group" aria-label="Move around the road">
        <button type="button" className="road-btn" onClick={cam.zoomOut} disabled={level === 'horizon'}>
          Zoom out
        </button>
        <button type="button" className="road-btn" onClick={cam.zoomIn} disabled={level === 'moment'}>
          Zoom in
        </button>
        {/* Reading from now back to the start swaps what Previous and Next do. The arrow keys stay spatial. */}
        <button type="button" className="road-btn" onClick={() => cam.step(reverse ? 1 : -1)} disabled={!(reverse ? canNext : canPrev)}>
          Previous
        </button>
        <button type="button" className="road-btn" onClick={() => cam.step(reverse ? -1 : 1)} disabled={!(reverse ? canPrev : canNext)}>
          Next
        </button>
        <button type="button" className="road-btn" onClick={cam.goHorizon} disabled={level === 'horizon'}>
          Back to the whole road
        </button>
        <button
          type="button"
          className="road-btn"
          onClick={() => {
            // A new reading order starts again from the whole road.
            setReverse((r) => !r)
            cam.restart()
          }}
          aria-label={`Reading order: ${reverse ? 'now to start' : 'start to now'}. Switch to ${reverse ? 'start to now' : 'now to start'}.`}
        >
          {reverse ? 'Now to start' : 'Start to now'}
        </button>
        <span className="road-level" aria-live="polite">
          {LEVEL_LABEL[level]}
        </span>
      </div>

      <RoadDetail
        level={level}
        focus={focus}
        model={model}
        onPickEntry={cam.goStop}
        onAsk={onAsk}
        onAskText={onAskText}
        onOpenPaths={onWhereNext}
      />
    </section>
  )
}

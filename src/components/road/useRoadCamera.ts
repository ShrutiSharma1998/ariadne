import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { ROAD_H, ROAD_W, type Road, type RoadModel } from '../../lib/roadModel'
import type { ClewPose } from './Clew'
import { LAYER_DEPTH, WALKER_SCALE, type LayerId } from './scenery'

/** Three distances from the road: the whole thing, one year of it, one experience on it. */
export type Level = 'horizon' | 'chapter' | 'moment'

export interface Focus {
  year: number | null
  id: string | null
}

const ZOOM: Record<Level, number> = { horizon: 1, chapter: 2.1, moment: 3.4 }

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** Longer trips take a little longer, but never less than 0.7 s or more than 1.4 s. */
const duration = (from: number, to: number) => Math.min(1400, Math.max(700, 600 + Math.abs(to - from) * 1800))

interface Args {
  road: Road
  model: RoadModel
  svgRef: RefObject<SVGSVGElement | null>
  layers: RefObject<Record<LayerId, SVGGElement | null>>
  walkerRef: RefObject<SVGGElement | null>
  /** Called after every camera or coach move, so the markers can follow the scene. */
  onFrame: () => void
}

/**
 * The camera and the coach. The camera is the SVG viewBox; each scenery layer gets a small
 * counter-transform so far hills move less than near ones. All of it changes imperatively, frame
 * by frame, so React re-renders only when the level or the focus changes.
 */
export function useRoadCamera({ road, model, svgRef, layers, walkerRef, onFrame }: Args) {
  const [level, setLevel] = useState<Level>('horizon')
  const [focus, setFocus] = useState<Focus>({ year: null, id: null })
  const [pose, setPose] = useState<ClewPose>('idle')

  const cam = useRef({ cx: ROAD_W / 2, cy: ROAD_H / 2, z: 1 })
  const walkerT = useRef(model.nowT)
  const walkerDir = useRef<1 | -1>(1)
  const camRaf = useRef(0)
  const walkRaf = useRef(0)
  const frame = useRef(onFrame)
  useLayoutEffect(() => {
    frame.current = onFrame
  })

  const applyCam = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const { cx, cy, z } = cam.current
    svg.setAttribute('viewBox', `${cx - ROAD_W / z / 2} ${cy - ROAD_H / z / 2} ${ROAD_W / z} ${ROAD_H / z}`)
    for (const id of Object.keys(LAYER_DEPTH) as LayerId[]) {
      const g = layers.current?.[id]
      if (!g) continue
      const p = LAYER_DEPTH[id]
      const k = (1 + (z - 1) * p) / z
      const px = ROAD_W / 2 + (cx - ROAD_W / 2) * p
      const py = ROAD_H / 2 + (cy - ROAD_H / 2) * p
      g.setAttribute('transform', `matrix(${k} 0 0 ${k} ${cx - k * px} ${cy - k * py})`)
    }
    frame.current()
  }, [svgRef, layers])

  const placeWalker = useCallback(() => {
    const g = walkerRef.current
    if (!g) return
    const p = road.at(walkerT.current)
    g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${WALKER_SCALE})`)
    g.querySelector('.c-flip')?.setAttribute('transform', walkerDir.current < 0 ? 'scale(-1 1)' : '')
    frame.current()
  }, [road, walkerRef])

  const flyTo = useCallback(
    (cx: number, cy: number, z: number, ms: number) => {
      cancelAnimationFrame(camRaf.current)
      const from = { ...cam.current }
      if (reducedMotion() || ms <= 0) {
        cam.current = { cx, cy, z }
        applyCam()
        return
      }
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms)
        const e = ease(k)
        // Zoom is interpolated as a ratio, so it feels even at both ends.
        cam.current = { cx: from.cx + (cx - from.cx) * e, cy: from.cy + (cy - from.cy) * e, z: from.z * Math.pow(z / from.z, e) }
        applyCam()
        if (k < 1) camRaf.current = requestAnimationFrame(tick)
      }
      camRaf.current = requestAnimationFrame(tick)
    },
    [applyCam],
  )

  const walkTo = useCallback(
    (target: number, ms: number) => {
      cancelAnimationFrame(walkRaf.current)
      const from = walkerT.current
      walkerDir.current = target >= from ? 1 : -1
      if (reducedMotion() || ms <= 0 || Math.abs(target - from) < 0.002) {
        walkerT.current = target
        setPose('idle')
        placeWalker()
        return
      }
      setPose('walk')
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms)
        walkerT.current = from + (target - from) * ease(k)
        placeWalker()
        if (k < 1) walkRaf.current = requestAnimationFrame(tick)
        else setPose('idle')
      }
      walkRaf.current = requestAnimationFrame(tick)
    },
    [placeWalker],
  )

  // Start at the whole-road view with the coach at "now". (A different story remounts the view.)
  useLayoutEffect(() => {
    cam.current = { cx: ROAD_W / 2, cy: ROAD_H / 2, z: 1 }
    walkerT.current = model.nowT
    applyCam()
    placeWalker()
  }, [model, applyCam, placeWalker])

  useEffect(
    () => () => {
      cancelAnimationFrame(camRaf.current)
      cancelAnimationFrame(walkRaf.current)
    },
    [],
  )

  const goHorizon = useCallback(() => {
    setLevel('horizon')
    flyTo(ROAD_W / 2, ROAD_H / 2, ZOOM.horizon, 800)
  }, [flyTo])

  const goYear = useCallback(
    (year: number) => {
      const y = model.years.find((v) => v.year === year)
      if (!y) return
      const p = road.at(y.t)
      const ms = duration(walkerT.current, y.t)
      setLevel('chapter')
      setFocus({ year, id: null })
      flyTo(p.x, p.y - 20, ZOOM.chapter, ms)
      walkTo(y.t, ms)
    },
    [model, road, flyTo, walkTo],
  )

  const goEntry = useCallback(
    (id: string) => {
      const s = model.entries.find((v) => v.id === id)
      if (!s) return
      const p = road.at(s.t)
      const ms = duration(walkerT.current, s.t)
      setLevel('moment')
      setFocus({ year: s.year, id })
      flyTo(p.x, p.y - 30, ZOOM.moment, ms)
      walkTo(s.t, ms)
    },
    [model, road, flyTo, walkTo],
  )

  const zoomIn = useCallback(() => {
    if (level === 'horizon') {
      const year = focus.year ?? model.years[model.years.length - 1]?.year
      if (year !== undefined) goYear(year)
    } else if (level === 'chapter') {
      const first = model.years.find((v) => v.year === focus.year)?.entries[0]
      if (first) goEntry(first.id)
    }
  }, [level, focus.year, model, goYear, goEntry])

  const zoomOut = useCallback(() => {
    if (level === 'moment' && focus.year !== null) goYear(focus.year)
    else if (level === 'chapter') goHorizon()
  }, [level, focus.year, goYear, goHorizon])

  /** Previous (-1) or next (1): a year in the chapter view, an experience in the moment view. */
  const step = useCallback(
    (n: -1 | 1) => {
      if (level === 'chapter') {
        const i = model.years.findIndex((v) => v.year === focus.year)
        const next = model.years[i + n]
        if (next) goYear(next.year)
      } else if (level === 'moment') {
        const i = model.entries.findIndex((v) => v.id === focus.id)
        const next = model.entries[i + n]
        if (next) goEntry(next.id)
      }
    },
    [level, focus, model, goYear, goEntry],
  )

  return { level, focus, pose, walkerT, goHorizon, goYear, goEntry, zoomIn, zoomOut, step }
}

import type { EntryKind, MemoryEntry } from '../types'
import { byStart, yearOf } from './date'

/** The scene is drawn once on a fixed canvas and scaled to fit, so nothing is redrawn on resize. */
export const ROAD_W = 1200
export const ROAD_H = 600

/** The road climbs from lower left to upper right and ends at the fork. */
const ANCHORS: [number, number][] = [
  [70, 520],
  [230, 498],
  [380, 478],
  [470, 440],
  [610, 436],
  [730, 402],
  [810, 344],
  [905, 328],
  [985, 275],
  [1045, 205],
]

export interface RoadPoint {
  x: number
  y: number
}

export interface Road {
  /** SVG path data for the whole road. */
  d: string
  /** Total length in scene units. */
  length: number
  /** The point a fraction t (0 to 1) of the way along the road. */
  at: (t: number) => RoadPoint
}

/**
 * A smooth curve through the anchors (Catmull-Rom converted to cubic Béziers), sampled so that
 * positions along the road can be found without touching the DOM.
 */
export function createRoad(anchors: [number, number][] = ANCHORS): Road {
  const STEPS = 32
  const pts: RoadPoint[] = []
  const cum: number[] = []
  let d = `M${anchors[0][0]},${anchors[0][1]}`
  let length = 0

  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[i - 1] ?? anchors[i]
    const p1 = anchors[i]
    const p2 = anchors[i + 1]
    const p3 = anchors[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`

    for (let s = i === 0 ? 0 : 1; s <= STEPS; s++) {
      const u = s / STEPS
      const v = 1 - u
      const x = v * v * v * p1[0] + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * p2[0]
      const y = v * v * v * p1[1] + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * p2[1]
      const last = pts[pts.length - 1]
      if (last) length += Math.hypot(x - last.x, y - last.y)
      pts.push({ x, y })
      cum.push(length)
    }
  }

  const at = (t: number): RoadPoint => {
    const target = Math.min(1, Math.max(0, t)) * length
    let lo = 0
    let hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < target) lo = mid + 1
      else hi = mid
    }
    const i = Math.max(1, lo)
    const span = cum[i] - cum[i - 1] || 1
    const k = (target - cum[i - 1]) / span
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k }
  }

  return { d, length, at }
}

export interface EntryStop {
  id: string
  entry: MemoryEntry
  year: number
  /** How far along the road, 0 to 1. */
  t: number
}

export interface YearStop {
  year: number
  t: number
  entries: EntryStop[]
  kinds: EntryKind[]
}

export interface RoadModel {
  entries: EntryStop[]
  years: YearStop[]
  /** Where the story ends and the possible paths begin. */
  nowT: number
}

/** Where the "Where next" fork sits: the very end of the road. */
export const END_T = 1

/**
 * Entries are spaced evenly along the road, with a little extra room between years. Spacing by date
 * would crowd busy years together and leave quiet ones empty, which reads badly at any zoom.
 */
export function buildRoadModel(all: MemoryEntry[]): RoadModel {
  const sorted = [...all].sort(byStart)
  if (sorted.length === 0) return { entries: [], years: [], nowT: 0.5 }

  const SAME_YEAR = 0.7
  const NEW_YEAR = 1
  const FIRST = 0.08
  const LAST = 0.9

  const slots: number[] = []
  let slot = 0
  sorted.forEach((e, i) => {
    if (i > 0) slot += yearOf(e.start) === yearOf(sorted[i - 1].start) ? SAME_YEAR : NEW_YEAR
    slots.push(slot)
  })
  const span = slots[slots.length - 1] || 1

  const entries: EntryStop[] = sorted.map((entry, i) => ({
    id: entry.id,
    entry,
    year: yearOf(entry.start),
    t: sorted.length === 1 ? 0.5 : FIRST + ((LAST - FIRST) * slots[i]) / span,
  }))

  const years: YearStop[] = []
  for (const stop of entries) {
    let y = years[years.length - 1]
    if (!y || y.year !== stop.year) {
      y = { year: stop.year, t: stop.t, entries: [], kinds: [] }
      years.push(y)
    }
    y.entries.push(stop)
    if (!y.kinds.includes(stop.entry.kind)) y.kinds.push(stop.entry.kind)
  }
  for (const y of years) y.t = y.entries.reduce((sum, s) => sum + s.t, 0) / y.entries.length

  return { entries, years, nowT: entries[entries.length - 1].t }
}

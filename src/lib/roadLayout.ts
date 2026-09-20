export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface TagRequest {
  /** Screen position of the marker the label belongs to. */
  x: number
  y: number
  /** Measured size of the label. */
  w: number
  h: number
  /** Which side to try first. */
  prefer: 'up' | 'down'
  /** Labels with a higher priority are placed first, so they get the best spots. Default 0. */
  priority?: number
}

export interface TagPlacement {
  /** Offset of the label's top-left corner from the marker's centre. */
  dx: number
  dy: number
  /** Above or below the marker gets a leader line; beside it does not need one. */
  side: 'up' | 'down' | 'left' | 'right'
  /** False when the label could not be kept clear of other labels, the coach and the edge. */
  fits: boolean
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/** Landing on the coach is worse than landing on another label, so it counts for more. */
const OBSTACLE_WEIGHT = 4

/**
 * Places each label near its marker, on whichever spot is free: above or below it first, then
 * beside it, then a little further off. A label may not overlap another label, another marker, an
 * obstacle (the coach) or leave the stage. If nothing is entirely free, the spot with the least
 * overlap wins, so a crowded road degrades gently instead of stacking words on the coach.
 * `gap` is the distance from the marker's centre to the label edge.
 */
export function layoutTags(tags: TagRequest[], stage: { w: number; h: number }, obstacles: Box[], markers: Box[], gap: number): TagPlacement[] {
  const labels: Box[] = []
  const placements: TagPlacement[] = new Array(tags.length)
  // Important labels choose first; everyone else keeps their order along the road.
  const order = tags.map((_, i) => i).sort((a, b) => (tags[b].priority ?? 0) - (tags[a].priority ?? 0) || a - b)

  for (const i of order) {
    const t = tags[i]
    const other = t.prefer === 'up' ? 'down' : 'up'
    const vertical = (side: 'up' | 'down', flip: boolean, extra: number): TagPlacement => ({
      dx: flip ? 8 - t.w : -8,
      dy: side === 'up' ? -gap - t.h - extra : gap + extra,
      side,
      fits: true,
    })
    const candidates: TagPlacement[] = [
      vertical(t.prefer, false, 0),
      vertical(other, false, 0),
      vertical(t.prefer, true, 0),
      vertical(other, true, 0),
      { dx: gap, dy: -t.h / 2, side: 'right', fits: true },
      { dx: -gap - t.w, dy: -t.h / 2, side: 'left', fits: true },
      vertical(t.prefer, false, t.h + 4),
      vertical(other, false, t.h + 4),
    ]
    const boxOf = (p: TagPlacement): Box => ({ x: t.x + p.dx, y: t.y + p.dy, w: t.w, h: t.h })
    /** What would make the label unreadable: leaving the stage, or sitting on the coach or another label. */
    const blocked = (p: TagPlacement): number => {
      const b = boxOf(p)
      const outside = b.x < 4 || b.y < 4 || b.x + b.w > stage.w - 4 || b.y + b.h > stage.h - 4
      let c = outside ? 1e6 : 0
      for (const o of obstacles) c += OBSTACLE_WEIGHT * overlap(o, b)
      for (const l of labels) c += overlap(l, b)
      return c
    }
    /** Sitting on another marker is only untidy, so it counts for the choice but not for "fits". */
    const cost = (p: TagPlacement): number => {
      const b = boxOf(p)
      return markers.reduce((c, m, j) => (j === i ? c : c + overlap(m, b)), blocked(p))
    }

    // The first spot with nothing in the way wins, so the order above is the order of preference.
    let pick = candidates[0]
    let best = Infinity
    for (const p of candidates) {
      const c = cost(p)
      if (c < best) {
        best = c
        pick = p
      }
      if (c === 0) break
    }

    // Never clip at the stage edge, even when nothing was free.
    const x = Math.min(Math.max(t.x + pick.dx, 4), Math.max(4, stage.w - t.w - 4))
    const placement: TagPlacement = { ...pick, dx: x - t.x, fits: blocked({ ...pick, dx: x - t.x }) === 0 }
    // A label that will be hidden takes no space from the ones after it.
    if (placement.fits) labels.push(boxOf(placement))
    placements[i] = placement
  }
  return placements
}

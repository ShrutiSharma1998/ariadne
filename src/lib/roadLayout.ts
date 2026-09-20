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
}

export interface TagPlacement {
  /** Offset of the label's top-left corner from the marker's centre. */
  dx: number
  dy: number
  side: 'up' | 'down'
}

const hit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Places each label above or below its marker, on whichever side is free. A label may not overlap
 * another label, another marker, an obstacle (the coach) or leave the stage; if nothing fits it
 * still stays inside the stage. `gap` is the distance from the marker's centre to the label edge.
 */
export function layoutTags(tags: TagRequest[], stage: { w: number; h: number }, obstacles: Box[], markers: Box[], gap: number): TagPlacement[] {
  const placed: Box[] = [...obstacles]
  return tags.map((t, i) => {
    const other = t.prefer === 'up' ? 'down' : 'up'
    const options: { side: 'up' | 'down'; flip: boolean }[] = [
      { side: t.prefer, flip: false },
      { side: other, flip: false },
      { side: t.prefer, flip: true },
      { side: other, flip: true },
    ]
    const at = (o: { side: 'up' | 'down'; flip: boolean }): TagPlacement => ({
      dx: o.flip ? 8 - t.w : -8,
      dy: o.side === 'up' ? -gap - t.h : gap,
      side: o.side,
    })
    const boxOf = (p: TagPlacement): Box => ({ x: t.x + p.dx, y: t.y + p.dy, w: t.w, h: t.h })

    let pick = at(options[0])
    for (const o of options) {
      const p = at(o)
      const b = boxOf(p)
      const inside = b.x >= 4 && b.y >= 4 && b.x + b.w <= stage.w - 4 && b.y + b.h <= stage.h - 4
      if (inside && !placed.some((q) => hit(q, b)) && !markers.some((m, j) => j !== i && hit(m, b))) {
        pick = p
        break
      }
    }
    // Never clip at the stage edge, even when nothing was free.
    const x = Math.min(Math.max(t.x + pick.dx, 4), Math.max(4, stage.w - t.w - 4))
    const placement = { ...pick, dx: x - t.x }
    placed.push(boxOf(placement))
    return placement
  })
}

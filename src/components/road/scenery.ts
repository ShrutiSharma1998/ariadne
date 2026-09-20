import rough from 'roughjs'
import { ROAD_W } from '../../lib/roadModel'

export type LayerId = 'sky' | 'far' | 'mid' | 'near'

export type SceneryGroups = Record<LayerId, SVGGElement>

/** The coach's size on the road, in scene units. */
export const WALKER_SCALE = 1.05

/** How much of a camera move each layer follows: far layers move least, the road itself moves fully. */
export const LAYER_DEPTH: Record<LayerId, number> = { sky: 0.15, far: 0.35, mid: 0.6, near: 0.85 }

interface Ridge {
  id: 'far' | 'mid' | 'near'
  base: number
  amp: number
  phase: number
  freq: number
  seed: number
  /** Gap between hatching lines. Far hills are looser and quieter. */
  gap: number
  angle: number
  trees: number[]
  treeScale: number
}

const RIDGES: Ridge[] = [
  { id: 'far', base: 265, amp: 26, phase: 0.6, freq: 0.0055, seed: 3, gap: 14, angle: -40, trees: [], treeScale: 0 },
  { id: 'mid', base: 355, amp: 24, phase: 2.1, freq: 0.0072, seed: 8, gap: 11, angle: -28, trees: [40, 210, 720, 905, 1130, 1290], treeScale: 0.7 },
  { id: 'near', base: 470, amp: 18, phase: 4.3, freq: 0.0105, seed: 14, gap: 9, angle: -16, trees: [-60, 150, 560, 1010, 1240], treeScale: 0.85 },
]

/** The seven stars of Corona Borealis, the crown the myth sets in the sky for Ariadne. */
const CROWN: [number, number][] = [
  [930, 118],
  [958, 86],
  [994, 66],
  [1030, 64],
  [1064, 78],
  [1082, 104],
  [1088, 134],
]

const X0 = -500
const X1 = ROAD_W + 500

function ridgeY(r: Ridge, x: number): number {
  return r.base + Math.sin(x * r.freq + r.phase) * r.amp + Math.sin(x * r.freq * 2.3 + r.phase * 1.7) * r.amp * 0.35
}

/** Rough.js paints strokes in one fixed colour; point them at a theme token instead. */
function tint(node: SVGElement, color: string): void {
  node.querySelectorAll('path').forEach((p) => p.style.setProperty('stroke', color))
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  parent.appendChild(e)
  return e
}

/**
 * Draws the hills, trees and sky once. Every shape has a fixed seed, so the scene looks the same on
 * every visit, and it is never redrawn while the camera moves. Safe to call again: it clears first.
 */
export function drawScenery(groups: SceneryGroups): void {
  const svg = groups.sky.ownerSVGElement
  if (!svg) return
  const rc = rough.svg(svg)
  for (const g of Object.values(groups)) g.replaceChildren()

  for (const r of RIDGES) {
    const g = groups[r.id]
    const line = `var(--hill-${r.id}-line)`
    const top: [number, number][] = []
    for (let x = X0; x <= X1; x += 25) top.push([x, ridgeY(r, x)])
    const body: [number, number][] = [...top, [X1, 780], [X0, 780]]

    const mass = svgEl('path', { d: 'M' + body.map((p) => p.join(',')).join(' L') + ' Z' }, g)
    mass.style.fill = `var(--hill-${r.id})`

    const hatch = rc.polygon(body, { seed: r.seed, roughness: 1, fill: '#000', fillStyle: 'hachure', hachureGap: r.gap, hachureAngle: r.angle, fillWeight: 0.8, stroke: 'none' })
    tint(hatch, line)
    g.appendChild(hatch)

    const outline = rc.linearPath(top, { seed: r.seed + 1, roughness: 1.4, strokeWidth: 1.6, stroke: '#000' })
    tint(outline, line)
    g.appendChild(outline)

    r.trees.forEach((x, i) => {
      const s = r.treeScale
      const y = ridgeY(r, x) + 8
      const tree = rc.polygon(
        [
          [x, y - 46 * s],
          [x - 15 * s, y],
          [x + 15 * s, y],
        ],
        { seed: r.seed * 10 + i, roughness: 1, fill: '#000', fillStyle: 'hachure', hachureGap: 4, hachureAngle: 60, fillWeight: 0.8, stroke: '#000', strokeWidth: 1.2 },
      )
      tint(tree, line)
      g.appendChild(tree)
    })
  }

  // By day: a hatched sun. By night: a moon, scattered stars and the crown. CSS shows the right set.
  const sky = groups.sky
  const day = svgEl('g', { class: 'only-day' }, sky)
  const sun = rc.circle(560, 104, 78, { seed: 5, roughness: 1.2, strokeWidth: 1.6, fill: '#000', fillStyle: 'hachure', hachureGap: 6, fillWeight: 0.8, stroke: '#000' })
  tint(sun, 'var(--k-certification)')
  day.appendChild(sun)

  const night = svgEl('g', { class: 'only-night' }, sky)
  svgEl('circle', { cx: 560, cy: 104, r: 34, style: 'fill:var(--star)' }, night)
  for (let i = 0; i < 46; i++) {
    const a = Math.sin(i * 91.7) * 43758.5453
    const b = Math.sin(i * 12.9898 + 4.1) * 43758.5453
    svgEl('circle', { cx: -100 + (a - Math.floor(a)) * 1400, cy: 8 + (b - Math.floor(b)) * 200, r: 0.9 + ((i * 7) % 5) * 0.28, style: 'fill:var(--star)' }, night)
  }
  svgEl('polyline', { points: CROWN.map((p) => p.join(',')).join(' '), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', style: 'stroke:var(--star);opacity:.6' }, night)
  for (const [x, y] of CROWN) svgEl('circle', { cx: x, cy: y, r: 3.2, style: 'fill:var(--star)' }, night)

  // A small compass mark, drawn like the rest: a cartographer's touch, not a badge.
  const compass = svgEl('g', { opacity: 0.7 }, sky)
  const ring = rc.circle(150, 118, 46, { seed: 21, roughness: 1, strokeWidth: 1.2, stroke: '#000', fill: 'none' })
  tint(ring, 'var(--sketch)')
  compass.appendChild(ring)
  const needle = rc.linearPath([[150, 88], [156, 118], [150, 148], [144, 118], [150, 88]], { seed: 22, roughness: 0.8, strokeWidth: 1.2, stroke: '#000' })
  tint(needle, 'var(--sketch)')
  compass.appendChild(needle)
}

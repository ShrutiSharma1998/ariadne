import rough from 'roughjs'
import { useEffect, useRef } from 'react'

const W = 1000
const H = 170

/** A gently rolling ridge, the same every time. */
function ridge(base: number, amp: number, phase: number, freq: number): [number, number][] {
  const points: [number, number][] = []
  for (let x = 0; x <= W; x += 25) {
    const y = base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35
    points.push([x, y])
  }
  points.push([W, H], [0, H])
  return points
}

const STARS: [number, number, number][] = Array.from({ length: 46 }, (_, i) => {
  // Deterministic scatter, so the sky does not change between visits.
  const a = Math.sin(i * 91.7) * 43758.5453
  const b = Math.sin(i * 12.9898 + 4.1) * 43758.5453
  return [(a - Math.floor(a)) * W, (b - Math.floor(b)) * 78, 0.9 + ((i * 7) % 5) * 0.28]
})

/**
 * The horizon that opens the page: three hand-drawn ridges, a small fox with a lantern, and a
 * sun by day or a moon and stars by night. The same layers will drive the parallax journey later.
 */
export function SceneBanner() {
  const ref = useRef<SVGGElement>(null)

  useEffect(() => {
    const group = ref.current
    const svg = group?.ownerSVGElement
    if (!group || !svg) return
    while (group.firstChild) group.removeChild(group.firstChild)
    const rc = rough.svg(svg)

    const layers: { pts: [number, number][]; seed: number; hatch: string; line: string; gap: number }[] = [
      { pts: ridge(96, 14, 0.6, 0.006), seed: 3, hatch: 'var(--hill-far-line)', line: 'var(--hill-far-line)', gap: 11 },
      { pts: ridge(122, 12, 2.1, 0.008), seed: 8, hatch: 'var(--hill-mid-line)', line: 'var(--hill-mid-line)', gap: 9 },
      { pts: ridge(146, 9, 4.3, 0.011), seed: 14, hatch: 'var(--hill-near-line)', line: 'var(--hill-near-line)', gap: 7 },
    ]

    layers.forEach((layer, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('class', `ridge ridge-${i}`)
      // Solid mass first, then hatching, then the sketched outline on top.
      const mass = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      mass.setAttribute('d', `M${layer.pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`)
      mass.style.fill = `var(--hill-${['far', 'mid', 'near'][i]})`
      g.appendChild(mass)

      const hatch = rc.polygon(layer.pts, {
        seed: layer.seed,
        roughness: 1.2,
        fill: '#000',
        fillStyle: 'hachure',
        hachureGap: layer.gap,
        hachureAngle: -40 + i * 12,
        fillWeight: 1,
        stroke: 'none',
      })
      hatch.querySelectorAll('path').forEach((p) => p.style.setProperty('stroke', layer.hatch))
      g.appendChild(hatch)

      const outline = rc.linearPath(layer.pts.slice(0, -2), { seed: layer.seed + 1, roughness: 1.6, strokeWidth: 2, stroke: '#000' })
      outline.querySelectorAll('path').forEach((p) => p.style.setProperty('stroke', layer.line))
      g.appendChild(outline)
      group.appendChild(g)
    })

    const sun = rc.circle(150, 46, 46, { seed: 5, roughness: 1.3, strokeWidth: 2, fill: '#000', fillStyle: 'hachure', hachureGap: 5, fillWeight: 1.4, stroke: '#000' })
    sun.setAttribute('class', 'only-day')
    sun.querySelectorAll('path').forEach((p) => p.style.setProperty('stroke', 'var(--k-certification)'))
    group.appendChild(sun)

    const moon = rc.circle(150, 46, 40, { seed: 6, roughness: 1.2, strokeWidth: 2, fill: '#000', fillStyle: 'solid', stroke: '#000' })
    moon.setAttribute('class', 'only-night')
    moon.querySelectorAll('path').forEach((p) => {
      p.style.setProperty('stroke', 'var(--star)')
      if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') p.style.setProperty('fill', 'var(--star)')
    })
    group.appendChild(moon)
  }, [])

  return (
    <svg
      className="scene"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMax slice"
      role="img"
      aria-label="A small fox with a lantern stands on a hill, looking out over rolling ridges."
    >
      <defs>
        <radialGradient id="lantern-glow">
          <stop offset="0" stopColor="var(--k-certification)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--k-certification)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="only-night" aria-hidden="true">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} className="star" />
        ))}
      </g>

      <g ref={ref} />

      {/* The fox and its lantern, on the nearest ridge. */}
      <g className="fox" transform="translate(842 96) scale(1.7)">
        <circle className="lantern-glow only-night" cx="24" cy="12" r="20" fill="url(#lantern-glow)" />
        <path className="fox-body" d="M4 8 L10 13 L18 13 L24 8 L24 22 L14 30 L4 22 Z" />
        <path className="fox-line" d="M4 8 L10 13 L18 13 L24 8 L24 22 L14 30 L4 22 Z" />
        <circle className="fox-dot" cx="10" cy="19" r="1.3" />
        <circle className="fox-dot" cx="18" cy="19" r="1.3" />
        <path className="fox-line" d="M12.5 24 L14 25.5 L15.5 24" />
        <path className="fox-line" d="M24 14 L29 8" />
        <rect className="lantern" x="27" y="8" width="7" height="9" rx="1.5" />
        <path className="fox-line" d="M28.5 8 C28.5 5 32.5 5 32.5 8" />
      </g>
    </svg>
  )
}

import rough from 'roughjs'
import { useEffect, useRef } from 'react'

interface Props {
  /** Same seed, same wobble: keeps each outline stable between renders. */
  seed?: number
  roughness?: number
  shape?: 'box' | 'circle'
  dashed?: boolean
  /** Corner radius for boxes, in pixels. */
  radius?: number
}

function roundedBox(w: number, h: number, r: number): string {
  return `M${r},0 H${w - r} Q${w},0 ${w},${r} V${h - r} Q${w},${h} ${w - r},${h} H${r} Q0,${h} 0,${h - r} V${r} Q0,0 ${r},0 Z`
}

/**
 * A hand-drawn outline that fits its parent. Put it as the first child of any element that has
 * position: relative. It redraws when the parent's size changes and uses the theme's ink colour.
 */
export function RoughFrame({ seed = 1, roughness = 1.4, shape = 'box', dashed = false, radius = 12 }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    const parent = svg?.parentElement
    if (!svg || !parent) return

    const draw = () => {
      // Layout size, so a tilted card is not measured at its rotated size.
      const width = parent.offsetWidth
      const height = parent.offsetHeight
      if (width === 0 || height === 0) return
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', String(width))
      svg.setAttribute('height', String(height))
      while (svg.firstChild) svg.removeChild(svg.firstChild)

      const rc = rough.svg(svg)
      const options = {
        seed,
        roughness,
        strokeWidth: 2,
        stroke: '#000',
        fill: 'none',
        ...(dashed ? { strokeLineDash: [9, 7] } : {}),
      }
      const inset = 3
      const node =
        shape === 'circle'
          ? rc.circle(width / 2, height / 2, Math.min(width, height) - inset * 2, options)
          : rc.path(roundedBox(width - inset * 2, height - inset * 2, radius), options)
      if (shape === 'box') node.setAttribute('transform', `translate(${inset} ${inset})`)
      // Paint with the theme colour so light and dark mode both work.
      node.querySelectorAll('path').forEach((p) => p.style.setProperty('stroke', 'var(--ink-2)'))
      svg.appendChild(node)
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [seed, roughness, shape, dashed, radius])

  return <svg ref={ref} className="rough-frame" aria-hidden="true" focusable="false" />
}

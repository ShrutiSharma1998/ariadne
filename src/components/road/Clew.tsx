import { useId } from 'react'

export type ClewPose = 'idle' | 'walk' | 'think' | 'speak' | 'still'

const YARN = [
  'M-28 -14C-14 -28 14 -28 28 -12',
  'M-28 0C-14 -12 16 -10 28 6',
  'M-27 14C-13 4 14 6 27 20',
  'M-14 -27C-24 -10 -22 12 -8 27',
  'M8 -27C20 -10 20 12 8 27',
  'M22 -16C12 -4 14 14 22 22',
]

/**
 * Clew, the coach: a ball of thread whose loose end curls up into a small star, the light at night.
 * Drawn inside an SVG. The origin is between its feet and it is about 80 units tall. The pose only
 * sets a data attribute; the motion for each pose lives in road.css.
 */
export function Clew({ pose = 'idle' }: { pose?: ClewPose }) {
  const uid = useId().replace(/:/g, '')
  const clip = `clew-clip-${uid}`
  const glow = `clew-glow-${uid}`
  return (
    <g className="clew" data-pose={pose}>
      <defs>
        <clipPath id={clip}>
          <circle r="26" />
        </clipPath>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="var(--lantern)" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="var(--lantern)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--lantern)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="c-flip">
        <path className="c-tail" d="M-22 -22C-34 -18 -40 -8 -48 -5" />
        <g className="c-feet">
          <ellipse className="c-foot cf-l" cx="-10" cy="-3.2" rx="6.5" ry="3.2" />
          <ellipse className="c-foot cf-r" cx="10" cy="-3.2" rx="6.5" ry="3.2" />
        </g>
        <g className="c-lift">
          <g transform="translate(0 -34)">
            <g className="c-squash">
              <circle className="c-glow" cx="29" cy="-26" r="36" fill={`url(#${glow})`} />
              <g className="c-curl">
                <path className="c-curlpath" d="M12 -23C15 -36 28 -41 35 -35C41 -29 34 -22 29 -26" />
                <path className="c-star" d="M29 -33.5L31 -28L36.5 -26L31 -24L29 -18.5L27 -24L21.5 -26L27 -28Z" />
              </g>
              <circle className="c-ball" r="26" />
              <g clipPath={`url(#${clip})`}>
                <g className="c-yarn">
                  {YARN.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              </g>
              <circle className="c-rim" r="26" />
              <path className="c-shine" d="M-17 -17C-13 -22 -8 -24 -3 -24.5" />
              <circle className="c-eye" cx="-5" cy="1" r="2.2" />
              <circle className="c-eye" cx="13" cy="1" r="2.2" />
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

/** The mascot on its own, for places outside the road scene: the coach button, the header. */
export function ClewIcon({ pose = 'still', size = 40 }: { pose?: ClewPose; size?: number }) {
  return (
    <svg className="clew-icon" viewBox="-40 -88 96 92" width={size} height={Math.round((size * 92) / 96)} aria-hidden="true" focusable="false">
      <Clew pose={pose} />
    </svg>
  )
}

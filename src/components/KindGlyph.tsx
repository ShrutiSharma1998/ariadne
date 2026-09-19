import type { EntryKind } from '../types'

interface Props {
  kind: EntryKind
  size?: number
}

/** Small hand-drawn creatures, one per kind of memory. Colour comes from CSS. */
export function KindGlyph({ kind, size = 34 }: Props) {
  return (
    <svg
      className={`glyph glyph-${kind}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'work' && (
        <g>
          {/* fox */}
          <path className="fill" d="M5 6 L12 12 L20 12 L27 6 L27 19 L16 28 L5 19 Z" />
          <path className="line" d="M5 6 L12 12 L20 12 L27 6 L27 19 L16 28 L5 19 Z" />
          <circle className="dot" cx="12" cy="18" r="1.4" />
          <circle className="dot" cx="20" cy="18" r="1.4" />
          <path className="line" d="M14.5 23 L16 24.5 L17.5 23" />
        </g>
      )}
      {kind === 'education' && (
        <g>
          {/* owl */}
          <path className="fill" d="M6 8 L10 11 L22 11 L26 8 L26 22 C26 26 21 28 16 28 C11 28 6 26 6 22 Z" />
          <path className="line" d="M6 8 L10 11 L22 11 L26 8 L26 22 C26 26 21 28 16 28 C11 28 6 26 6 22 Z" />
          <circle className="paper" cx="12" cy="16" r="3.6" />
          <circle className="paper" cx="20" cy="16" r="3.6" />
          <circle className="line" cx="12" cy="16" r="3.6" fill="none" />
          <circle className="line" cx="20" cy="16" r="3.6" fill="none" />
          <circle className="dot" cx="12" cy="16" r="1.3" />
          <circle className="dot" cx="20" cy="16" r="1.3" />
          <path className="line" d="M14.5 21 L16 23.5 L17.5 21 Z" />
        </g>
      )}
      {kind === 'volunteering' && (
        <g>
          {/* heart */}
          <path className="fill" d="M16 27 C4 19 5 8 12 8 C14.5 8 16 10 16 11.5 C16 10 17.5 8 20 8 C27 8 28 19 16 27 Z" />
          <path className="line" d="M16 27 C4 19 5 8 12 8 C14.5 8 16 10 16 11.5 C16 10 17.5 8 20 8 C27 8 28 19 16 27 Z" />
          <path className="line" d="M10 13 C10.5 11.8 11.5 11.3 12.5 11.3" />
        </g>
      )}
      {kind === 'side-project' && (
        <g>
          {/* sprout */}
          <path className="line" d="M16 28 L16 14" />
          <path className="fill" d="M16 15 C16 9 11 7 6 8 C6 13 10 16 16 15 Z" />
          <path className="line" d="M16 15 C16 9 11 7 6 8 C6 13 10 16 16 15 Z" />
          <path className="fill" d="M16 12 C16 6 21 4 26 5 C26 10 22 13 16 12 Z" />
          <path className="line" d="M16 12 C16 6 21 4 26 5 C26 10 22 13 16 12 Z" />
          <path className="line" d="M10 28 L22 28" />
        </g>
      )}
      {kind === 'certification' && (
        <g>
          {/* star */}
          <path className="fill" d="M16 4 L19.5 12 L28 12.8 L21.6 18.4 L23.5 27 L16 22.5 L8.5 27 L10.4 18.4 L4 12.8 L12.5 12 Z" />
          <path className="line" d="M16 4 L19.5 12 L28 12.8 L21.6 18.4 L23.5 27 L16 22.5 L8.5 27 L10.4 18.4 L4 12.8 L12.5 12 Z" />
        </g>
      )}
      {kind === 'milestone' && (
        <g>
          {/* peak with flag */}
          <path className="fill" d="M3 27 L13 10 L18 18 L21 14 L29 27 Z" />
          <path className="line" d="M3 27 L13 10 L18 18 L21 14 L29 27 Z" />
          <path className="line" d="M13 10 L13 4" />
          <path className="dot" d="M13 4 L19 6 L13 8 Z" />
        </g>
      )}
    </svg>
  )
}

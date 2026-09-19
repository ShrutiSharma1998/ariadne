import { useEffect, useState } from 'react'
import { Timeline } from './components/Timeline'
import { DEMO_NAME, demoEntries } from './data/demoPersona'
import type { Zoom } from './types'

type ThemeChoice = 'auto' | 'light' | 'dark'

const THEME_KEY = 'ariadne-theme'
const THEME_ORDER: ThemeChoice[] = ['auto', 'light', 'dark']
const THEME_LABEL: Record<ThemeChoice, string> = {
  auto: 'Match my device',
  light: 'Light',
  dark: 'Dark',
}

function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    // Storage can be blocked; fall back to auto.
  }
  return 'auto'
}

/** Shared SVG filter that makes lines look pencilled instead of ruled. */
function PencilFilter() {
  return (
    <svg width="0" height="0" className="sr-only" aria-hidden="true" focusable="false">
      <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
      </filter>
    </svg>
  )
}

export default function App() {
  const [zoom, setZoom] = useState<Zoom>('months')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      if (theme === 'auto') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Ignore storage errors; the theme still applies for this visit.
    }
  }, [theme])

  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]

  return (
    <>
      <PencilFilter />
      <a className="skip-link" href="#timeline">
        Skip to the timeline
      </a>
      <header className="masthead">
        <div className="masthead-top">
          <h1 className="wordmark">Ariadne</h1>
          <div className="controls">
            <div className="segmented" role="group" aria-label="Timeline zoom">
              {(['years', 'months'] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={zoom === z}
                  onClick={() => setZoom(z)}
                >
                  {z === 'years' ? 'Years' : 'Months'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(nextTheme)}
              aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[nextTheme]}.`}
            >
              {THEME_LABEL[theme]}
            </button>
          </div>
        </div>
        <p className="tagline">Keep your whole story in one place, then find your way forward.</p>
        <p className="sample-note">
          This is a sample story for {DEMO_NAME}, a fictional person. Your own timeline will appear here once you add your files.
        </p>
      </header>
      <main id="timeline">
        <Timeline
          entries={demoEntries}
          zoom={zoom}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
          onPickFromYear={(id) => {
            setExpandedId(id)
            setZoom('months')
          }}
        />
      </main>
      <footer className="footer">
        <p>Ariadne is open source. Sample data is invented.</p>
      </footer>
    </>
  )
}

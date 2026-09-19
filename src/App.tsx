import { useEffect, useRef, useState } from 'react'
import { CoachPanel } from './components/CoachPanel'
import { PathsPanel } from './components/PathsPanel'
import { SceneBanner } from './components/SceneBanner'
import { Timeline } from './components/Timeline'
import { UploadPanel } from './components/UploadPanel'
import { DEMO_NAME, demoEntries } from './data/demoPersona'
import { getConfig } from './lib/api'
import { clearStory, exportStoryFile, loadStory, readStoryFile, saveStory } from './lib/storage'
import type { MemoryEntry, Zoom } from './types'

type ThemeChoice = 'auto' | 'light' | 'dark'
type View = 'timeline' | 'coach' | 'paths'

const THEME_KEY = 'ariadne-theme'
const THEME_ORDER: ThemeChoice[] = ['auto', 'light', 'dark']
const THEME_LABEL: Record<ThemeChoice, string> = {
  auto: 'Match my device',
  light: 'Light',
  dark: 'Dark',
}
const VIEWS: { id: View; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'coach', label: 'Coach' },
  { id: 'paths', label: 'Paths' },
]

function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    // Storage can be blocked; fall back to auto.
  }
  return 'auto'
}

/** Adds new entries to existing ones, skipping repeats and keeping every id unique. */
function mergeEntries(existing: MemoryEntry[], incoming: MemoryEntry[]): MemoryEntry[] {
  const seen = new Set(existing.map((e) => `${e.title.toLowerCase()}|${e.start}`))
  const ids = new Set(existing.map((e) => e.id))
  const merged = [...existing]
  for (const e of incoming) {
    const key = `${e.title.toLowerCase()}|${e.start}`
    if (seen.has(key)) continue
    seen.add(key)
    let id = e.id
    for (let n = 2; ids.has(id); n++) id = `${e.id}-${n}`
    ids.add(id)
    merged.push({ ...e, id })
  }
  return merged.sort((a, b) => a.start.localeCompare(b.start))
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
  const [view, setView] = useState<View>('timeline')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)
  const [own, setOwn] = useState<MemoryEntry[] | null>(() => loadStory()?.entries ?? null)
  const [showSample, setShowSample] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [storyVersion, setStoryVersion] = useState(0)
  const [paused, setPaused] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getConfig().then((c) => setPaused(c.paused))
  }, [])

  const isSample = showSample || !own
  const entries = isSample ? demoEntries : own
  const personName = isSample ? DEMO_NAME : undefined

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

  function setStory(next: MemoryEntry[]) {
    setOwn(next)
    setShowSample(false)
    setExpandedId(null)
    setStoryVersion((v) => v + 1)
    if (!saveStory(next)) {
      setNotice('Your browser would not save this timeline. Use Export so you do not lose it.')
    }
  }

  function handleLoaded(incoming: MemoryEntry[], notes: string) {
    setStory(mergeEntries(own ?? [], incoming))
    setView('timeline')
    const parts = [`Added ${incoming.length} ${incoming.length === 1 ? 'experience' : 'experiences'} to your timeline.`]
    if (notes.trim()) parts.push(notes.trim())
    setNotice(parts.join(' '))
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    const result = await readStoryFile(file)
    if (importRef.current) importRef.current.value = ''
    if ('error' in result) {
      setNotice(result.error)
      return
    }
    if (own && !window.confirm('Importing replaces the timeline saved in this browser. Continue?')) return
    setStory(result.entries)
    setView('timeline')
    setNotice(`Imported ${result.entries.length} experiences.`)
  }

  function handleClear() {
    if (!window.confirm('Delete your timeline from this browser? Export it first if you want a copy.')) return
    clearStory()
    setOwn(null)
    setShowSample(false)
    setExpandedId(null)
    setStoryVersion((v) => v + 1)
    setNotice('Your timeline was deleted from this browser.')
  }

  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]

  return (
    <>
      <PencilFilter />
      <a className="skip-link" href="#content">
        Skip to the content
      </a>
      <header className="masthead">
        <div className="masthead-top">
          <h1 className="wordmark">Ariadne</h1>
          <div className="controls">
            {view === 'timeline' && (
              <div className="segmented" role="group" aria-label="Timeline zoom">
                {(['years', 'months'] as const).map((z) => (
                  <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)}>
                    {z === 'years' ? 'Years' : 'Months'}
                  </button>
                ))}
              </div>
            )}
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
        <SceneBanner />

        <nav className="views" aria-label="Sections">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="view-button"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        {isSample ? (
          <p className="sample-note">
            This is a sample story for {DEMO_NAME}, a fictional person. Try the coach and paths with it, or{' '}
            <a href="#build" onClick={() => setView('timeline')}>
              build your own timeline
            </a>
            .
          </p>
        ) : (
          <div className="story-bar">
            <p>
              Your story: {entries.length} {entries.length === 1 ? 'experience' : 'experiences'}, saved only in this browser.
            </p>
            <div className="story-actions">
              <button type="button" className="link-button" onClick={() => exportStoryFile(entries)}>
                Export
              </button>
              <button type="button" className="link-button" onClick={() => importRef.current?.click()}>
                Import
              </button>
              <button type="button" className="link-button" onClick={() => setShowSample(true)}>
                View the sample story
              </button>
              <button type="button" className="link-button" onClick={handleClear}>
                Delete my timeline
              </button>
            </div>
          </div>
        )}
        {own && showSample && (
          <p className="story-bar">
            <button type="button" className="link-button" onClick={() => setShowSample(false)}>
              Back to my story
            </button>
          </p>
        )}
        <input
          ref={importRef}
          className="sr-only-input"
          type="file"
          accept="application/json,.json"
          tabIndex={-1}
          onChange={(e) => void handleImport(e.target.files?.[0])}
          aria-label="Import a timeline file"
        />

        {paused && (
          <p className="notice" role="status">
            The AI features are paused for now. You can still explore the sample story and your saved timeline.
          </p>
        )}

        {notice && (
          <p className="notice" role="status">
            {notice}{' '}
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        )}
      </header>

      <main id="content">
        {view === 'timeline' && (
          <>
            <Timeline
              entries={entries}
              zoom={zoom}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              onPickFromYear={(id) => {
                setExpandedId(id)
                setZoom('months')
              }}
            />
            <div id="build" className="build">
              {isSample ? (
                <UploadPanel onLoaded={handleLoaded} />
              ) : (
                <details className="more-files">
                  <summary>Add more files</summary>
                  <UploadPanel onLoaded={handleLoaded} />
                </details>
              )}
            </div>
          </>
        )}
        {view === 'coach' && <CoachPanel key={`coach-${storyVersion}-${isSample}`} entries={entries} personName={personName} />}
        {view === 'paths' && <PathsPanel key={`paths-${storyVersion}-${isSample}`} entries={entries} />}
      </main>

      <footer className="footer">
        <p>Ariadne is open source. Sample data is invented.</p>
      </footer>
    </>
  )
}

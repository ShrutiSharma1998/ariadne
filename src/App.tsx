import { useEffect, useRef, useState } from 'react'
import { CoachDock, type AskRequest } from './components/CoachDock'
import { DataMenu } from './components/DataMenu'
import { PathsPanel } from './components/PathsPanel'
import { SceneBanner } from './components/SceneBanner'
import { ClewIcon } from './components/road/Clew'
import { RoadView } from './components/road/RoadView'
import { UploadPanel } from './components/UploadPanel'
import { DEMO_NAME, demoEntries } from './data/demoPersona'
import { getConfig } from './lib/api'
import { clearStory, exportStoryFile, loadStory, readStoryFile, saveStory } from './lib/storage'
import type { MemoryEntry } from './types'

type ThemeChoice = 'auto' | 'light' | 'dark'
type View = 'timeline' | 'paths'

const THEME_KEY = 'ariadne-theme'
const THEME_ORDER: ThemeChoice[] = ['auto', 'light', 'dark']
const THEME_LABEL: Record<ThemeChoice, string> = {
  auto: 'Match my device',
  light: 'Light',
  dark: 'Dark',
}
const VIEWS: { id: View; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
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
  const [view, setView] = useState<View>('timeline')
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)
  const [own, setOwn] = useState<MemoryEntry[] | null>(() => loadStory()?.entries ?? null)
  const [showSample, setShowSample] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [storyVersion, setStoryVersion] = useState(0)
  const [dockOpen, setDockOpen] = useState(false)
  const [ask, setAsk] = useState<AskRequest | null>(null)
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
    setStoryVersion((v) => v + 1)
    if (!saveStory(next)) {
      setNotice('Your browser would not save this timeline. Open Your data and choose Save a backup so you do not lose it.')
    }
  }

  function handleLoaded(incoming: MemoryEntry[], notes: string) {
    setStory(mergeEntries(own ?? [], incoming))
    setView('timeline')
    const parts = [`Added ${incoming.length} ${incoming.length === 1 ? 'experience' : 'experiences'} to your timeline.`]
    if (notes.trim()) parts.push(notes.trim())
    // The first time only: say where the timeline lives, and how to keep a copy.
    if (!own) parts.push('It is saved only in this browser. Open Your data and choose Save a backup to keep a copy.')
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
    if (own && !window.confirm('Restoring a backup replaces the timeline saved in this browser. Continue?')) return
    setStory(result.entries)
    setView('timeline')
    setNotice(`Restored ${result.entries.length} experiences from your backup.`)
  }

  function handleClear() {
    if (!window.confirm('Delete your timeline from this browser? Save a backup first if you want a copy.')) return
    clearStory()
    setOwn(null)
    setShowSample(false)
    setStoryVersion((v) => v + 1)
    setNotice('Your timeline was deleted from this browser.')
  }

  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]

  /** Opens the coach about one experience, from the road. */
  function askAbout(entry: MemoryEntry) {
    setAsk({
      nonce: Date.now(),
      text: `I'd like to talk about "${entry.title}"${entry.org ? ` at ${entry.org}` : ''}. What stands out to you about it, and what should I explore next?`,
    })
    setDockOpen(true)
  }

  return (
    <>
      <PencilFilter />
      <a className="skip-link" href="#content">
        Skip to the content
      </a>
      <header className="masthead">
        <div className="masthead-top">
          <div className="brand">
            <ClewIcon size={56} />
            <h1 className="wordmark">Ariadne</h1>
          </div>
          <div className="controls">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(nextTheme)}
              aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[nextTheme]}.`}
            >
              {THEME_LABEL[theme]}
            </button>
            <DataMenu
              hasOwn={own !== null}
              onSaveBackup={() => own && exportStoryFile(own)}
              onRestoreBackup={() => importRef.current?.click()}
              onDelete={handleClear}
            />
          </div>
        </div>
        <p className="tagline">Keep your whole story in one place, then find your way forward.</p>
        {/* The road has its own sky and hills, so the banner steps aside for it. */}
        {view !== 'timeline' && <SceneBanner />}

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
              <button type="button" className="link-button" onClick={() => setShowSample(true)}>
                View the sample story
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
          aria-label="Restore a backup file"
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
            <RoadView entries={entries} onAsk={askAbout} onWhereNext={() => setView('paths')} />
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
        {view === 'paths' && (
          <PathsPanel key={`paths-${storyVersion}-${isSample}`} entries={entries} isSample={isSample} />
        )}
      </main>

      <footer className="footer">
        <p>Ariadne is open source. Sample data is invented.</p>
      </footer>

      <CoachDock
        key={`dock-${storyVersion}-${isSample}`}
        entries={entries}
        personName={personName}
        open={dockOpen}
        onOpen={() => setDockOpen(true)}
        onClose={() => setDockOpen(false)}
        ask={ask}
      />
    </>
  )
}

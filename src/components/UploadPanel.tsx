import { useRef, useState } from 'react'
import { ApiError, extractTimeline, type ExtractFilePayload } from '../lib/api'
import { MAX_FILES, prepareFile } from '../lib/files'
import type { MemoryEntry } from '../types'

interface Props {
  onLoaded: (entries: MemoryEntry[], notes: string) => void
}

export function UploadPanel({ onLoaded }: Props) {
  const [files, setFiles] = useState<ExtractFilePayload[]>([])
  const [pasted, setPasted] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function addFiles(list: FileList | null) {
    if (!list) return
    const next = [...files]
    const issues: string[] = []
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        issues.push(`Only ${MAX_FILES} files at a time. ${file.name} was skipped.`)
        continue
      }
      if (next.some((f) => f.name === file.name)) continue
      const result = await prepareFile(file)
      if (result.ok) next.push(result.payload)
      else issues.push(result.message)
    }
    setFiles(next)
    setProblems(issues)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function build() {
    setBusy(true)
    setError(null)
    try {
      const { entries, notes } = await extractTimeline(files, pasted.trim() || undefined)
      onLoaded(entries, notes)
      setFiles([])
      setPasted('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const ready = files.length > 0 || pasted.trim().length > 0

  return (
    <section className="panel" aria-labelledby="upload-title">
      <h2 id="upload-title" className="panel-title">
        Build your own timeline
      </h2>
      <p className="panel-lead">
        Add a resume, certificates or notes. Up to {MAX_FILES} files of PDF, TXT or MD, 2 MB each. You can also paste text.
      </p>
      <p className="panel-lead">
        Just looking around?{' '}
        <a href="/sample/sam-rivera-resume.pdf" download>
          Download the fictional sample resume
        </a>{' '}
        and add it here.
      </p>

      <div className="upload-row">
        <label className="button button-outline" htmlFor="file-input">
          Choose files
        </label>
        <input
          id="file-input"
          ref={inputRef}
          className="sr-only-input"
          type="file"
          multiple
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={(e) => void addFiles(e.target.files)}
          disabled={busy}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-list" aria-label="Files ready to read">
          {files.map((f) => (
            <li key={f.name}>
              <span>{f.name}</span>
              <button
                type="button"
                className="link-button"
                onClick={() => setFiles(files.filter((x) => x.name !== f.name))}
                disabled={busy}
                aria-label={`Remove ${f.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {problems.length > 0 && (
        <ul className="problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <label className="field-label" htmlFor="pasted">
        Or paste text
      </label>
      <textarea
        id="pasted"
        className="textarea"
        rows={5}
        maxLength={30000}
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="Paste your resume, LinkedIn About section, or notes about a project."
        disabled={busy}
      />

      <p className="privacy">
        What you add is sent to an AI model (Anthropic) to build your timeline. Ariadne does not save it on a server. The
        result is kept only in this browser.
      </p>

      <div className="upload-row">
        <button type="button" className="button" onClick={() => void build()} disabled={!ready || busy}>
          {busy ? 'Reading your files' : 'Build my timeline'}
        </button>
        {busy && <span className="status">This can take a minute for longer files.</span>}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

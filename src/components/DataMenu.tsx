import { useEffect, useRef, useState } from 'react'
import { RoughFrame } from './RoughFrame'

interface Props {
  /** True when the visitor has their own timeline saved in this browser. */
  hasOwn: boolean
  onSaveBackup: () => void
  onRestoreBackup: () => void
  onDelete: () => void
}

/** "Your data": backup, restore and delete, with a plain explanation of why they exist. */
export function DataMenu({ hasOwn, onSaveBackup, onRestoreBackup, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const act = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="data-menu" ref={rootRef}>
      <button
        type="button"
        className="theme-toggle"
        aria-expanded={open}
        aria-controls="data-pop"
        onClick={() => setOpen((v) => !v)}
      >
        Your data
      </button>
      {open && (
        <div id="data-pop" className="data-pop" role="group" aria-label="Your data">
          <RoughFrame seed={83} />
          <p>
            Your timeline lives only in this browser. Ariadne has no accounts and keeps nothing on a server. A backup file
            lets you move it to another device or get it back if you clear your browser.
          </p>
          <div className="data-actions">
            <button type="button" className="link-button" onClick={act(onSaveBackup)} disabled={!hasOwn}>
              Save a backup
            </button>
            <button type="button" className="link-button" onClick={act(onRestoreBackup)}>
              Restore a backup
            </button>
            <button type="button" className="link-button" onClick={act(onDelete)} disabled={!hasOwn}>
              Delete my timeline
            </button>
          </div>
          {!hasOwn && <p className="data-note">Build your own timeline first, then you can save a backup.</p>}
        </div>
      )}
    </div>
  )
}

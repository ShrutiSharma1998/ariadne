import { useRef, useState } from 'react'
import { EMPTY_PATHS, loadPaths, savePaths, type PathsSlot, type PathsStore, type SavedPaths } from './pathsStorage'

type Patch = Partial<SavedPaths> | ((current: SavedPaths) => Partial<SavedPaths>)

/**
 * The one place the Paths page's memory lives, so the Paths page and the road read the same
 * chosen path. Every change is saved to this browser as it happens; nothing here calls the AI.
 */
export function usePathsStore(onSaveFailed: () => void) {
  const [store, setStore] = useState<PathsStore>(loadPaths)
  // The latest value, so two changes in one event do not overwrite each other.
  const latest = useRef(store)

  function commit(next: PathsStore) {
    latest.current = next
    setStore(next)
    if (!savePaths(next)) onSaveFailed()
  }

  function update(slot: PathsSlot, patch: Patch) {
    const current = latest.current[slot]
    const change = typeof patch === 'function' ? patch(current) : patch
    commit({ ...latest.current, [slot]: { ...current, ...change } })
  }

  function clear(slot: PathsSlot) {
    commit({ ...latest.current, [slot]: EMPTY_PATHS })
  }

  return { store, update, clear }
}

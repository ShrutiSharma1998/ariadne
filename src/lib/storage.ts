import { z } from 'zod'
import type { MemoryEntry } from '../types'

const KEY = 'ariadne-story-v1'

const YM = /^\d{4}-(0[1-9]|1[0-2])$/

const EntrySchema = z.object({
  id: z.string().max(80),
  kind: z.enum(['work', 'education', 'volunteering', 'side-project', 'certification', 'milestone']),
  title: z.string().max(200),
  org: z.string().max(200).optional(),
  start: z.string().regex(YM),
  end: z
    .string()
    .regex(/^(\d{4}-(0[1-9]|1[0-2])|present)$/)
    .optional(),
  what: z.string().max(1500),
  how: z.string().max(1500),
  impact: z.string().max(1500),
  learned: z.string().max(1500),
  skills: z.array(z.string().max(60)).max(15),
  source: z.string().max(200),
  yearOnly: z.boolean().optional(),
})

const StorySchema = z.object({
  version: z.literal(1),
  entries: z.array(EntrySchema).max(40),
})

export interface StoredStory {
  entries: MemoryEntry[]
}

/** Reads the visitor's own story from this browser. Returns null if there is none. */
export function loadStory(): StoredStory | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = StorySchema.safeParse(JSON.parse(raw))
    return parsed.success && parsed.data.entries.length > 0 ? { entries: parsed.data.entries } : null
  } catch {
    return null
  }
}

/** Returns false if the browser refused to store it (private window, full storage). */
export function saveStory(entries: MemoryEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, entries }))
    return true
  } catch {
    return false
  }
}

export function clearStory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export function exportStoryFile(entries: MemoryEntry[]): void {
  const blob = new Blob([JSON.stringify({ version: 1, entries }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ariadne-story.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** Parses an exported file. Returns an error message instead of throwing. */
export async function readStoryFile(file: File): Promise<{ entries: MemoryEntry[] } | { error: string }> {
  if (file.size > 2_000_000) return { error: 'That file is too large to be an Ariadne export.' }
  try {
    const parsed = StorySchema.safeParse(JSON.parse(await file.text()))
    if (!parsed.success || parsed.data.entries.length === 0) {
      return { error: 'That file is not an Ariadne export, or it has no entries.' }
    }
    return { entries: parsed.data.entries }
  } catch {
    return { error: 'That file could not be read as JSON.' }
  }
}

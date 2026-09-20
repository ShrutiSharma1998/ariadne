import { z } from 'zod'
import samplePaths from '../data/samplePaths.json'
import type { PathReaction, TrajectoriesResponse, Trajectory } from './api'

/**
 * Everything the Paths page remembers, kept in this browser only: the paths, how the person reacted
 * to each, their note, and the path they are going with. The person's own story and the fictional
 * sample story are kept apart, so trying the sample never touches their own paths.
 */

const KEY = 'ariadne-paths-v1'

export type PathsSlot = 'own' | 'sample'
export type Choice = PathReaction['choice']
export type Reactions = Record<string, { choice?: Choice; why: string }>

export interface SavedPaths {
  /** The paths on screen. Null until they are made; the sample story shows written ones until then. */
  result: TrajectoriesResponse | null
  reactions: Reactions
  /** What the person said they are curious about. */
  goals: string
  /** Title of the path the person is going with. */
  chosen: string | null
}

export type PathsStore = Record<PathsSlot, SavedPaths>

export const EMPTY_PATHS: SavedPaths = { result: null, reactions: {}, goals: '', chosen: null }

// The server sets no length limits on what the AI writes, so these are generous: they only stop a
// corrupted or tampered value from being trusted.
const text = (max: number) => z.string().max(max)

const TrajectorySchema = z.object({
  title: text(300),
  summary: text(3000),
  whyItFits: text(5000),
  blindSpots: z.array(text(1500)).max(12),
  skillGaps: z.array(z.object({ skill: text(300), whereYouAre: text(1500), nextStep: text(1500) })).max(12),
  firstSteps: z.array(z.object({ action: text(1500), howToFind: text(1500) })).max(12),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceNote: text(2000),
})

const SavedSchema = z.object({
  result: z.object({ paths: z.array(TrajectorySchema).min(1).max(6), caveat: text(3000) }).nullable(),
  reactions: z
    .record(text(300), z.object({ choice: z.enum(['drawn', 'maybe', 'no']).optional(), why: text(300) }))
    .refine((r) => Object.keys(r).length <= 12),
  goals: text(1500),
  chosen: text(300).nullable(),
})

/** The paths a slot is showing: what was made, or the written ones for the sample story. */
export function currentPaths(slot: PathsSlot, saved: SavedPaths): TrajectoriesResponse | null {
  return saved.result ?? (slot === 'sample' ? (samplePaths as TrajectoriesResponse) : null)
}

/** The path the person is going with, if it is still among the paths on screen. */
export function chosenPath(slot: PathsSlot, saved: SavedPaths): Trajectory | null {
  if (!saved.chosen) return null
  return currentPaths(slot, saved)?.paths.find((p) => p.title === saved.chosen) ?? null
}

function readSlot(slot: PathsSlot, raw: unknown): SavedPaths {
  const parsed = SavedSchema.safeParse(raw)
  if (!parsed.success) return EMPTY_PATHS
  const saved: SavedPaths = parsed.data
  // A choice that points at nothing would leave the road waiting for a path that is not there.
  return saved.chosen && !chosenPath(slot, saved) ? { ...saved, chosen: null } : saved
}

/** Reads what this browser remembers. Anything missing or damaged comes back empty; it never throws. */
export function loadPaths(): PathsStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { own: EMPTY_PATHS, sample: EMPTY_PATHS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
      return { own: EMPTY_PATHS, sample: EMPTY_PATHS }
    }
    const { own, sample } = parsed as { own?: unknown; sample?: unknown }
    return { own: readSlot('own', own), sample: readSlot('sample', sample) }
  } catch {
    return { own: EMPTY_PATHS, sample: EMPTY_PATHS }
  }
}

/** Returns false if the browser refused to store it (private window, full storage). */
export function savePaths(store: PathsStore): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, ...store }))
    return true
  } catch {
    return false
  }
}

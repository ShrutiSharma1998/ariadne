export type EntryKind =
  | 'work'
  | 'education'
  | 'volunteering'
  | 'side-project'
  | 'certification'
  | 'milestone'

export const KIND_LABEL: Record<EntryKind, string> = {
  work: 'Work',
  education: 'Education',
  volunteering: 'Volunteering',
  'side-project': 'Side project',
  certification: 'Certification',
  milestone: 'Milestone',
}

/** One remembered experience, in the what / how / impact / learned shape. */
export interface MemoryEntry {
  id: string
  kind: EntryKind
  title: string
  /** Organisation or place, if any. */
  org?: string
  /** YYYY-MM */
  start: string
  /** YYYY-MM, or 'present'. Omit for a single moment in time. */
  end?: string
  what: string
  how: string
  impact: string
  learned: string
  skills: string[]
  /** Which uploaded file this came from. */
  source: string
}

export type Zoom = 'years' | 'months'

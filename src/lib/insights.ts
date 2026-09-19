import type { EntryKind, MemoryEntry } from '../types'
import { byStart } from './date'

/** How each kind reads in a sentence like "3 jobs, 2 side projects". */
const MIX_WORDS: Record<EntryKind, [string, string]> = {
  work: ['job', 'jobs'],
  education: ['education entry', 'education entries'],
  volunteering: ['volunteering role', 'volunteering roles'],
  'side-project': ['side project', 'side projects'],
  certification: ['certification', 'certifications'],
  milestone: ['milestone', 'milestones'],
}

export interface Insights {
  topSkills: { skill: string; count: number }[]
  /** Each label already includes the count, for example "3 jobs". */
  mix: { kind: EntryKind; label: string; count: number }[]
  /** For example "2015 to 2026". */
  span: string
  ongoing: number
  recent: string[]
}

/** What a timeline already shows, worked out on the device with no AI and no cost. */
export function computeInsights(entries: MemoryEntry[]): Insights {
  const skills = new Map<string, { skill: string; count: number }>()
  const kinds = new Map<EntryKind, number>()
  for (const e of entries) {
    kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1)
    for (const s of e.skills) {
      const key = s.trim().toLowerCase()
      if (!key) continue
      const seen = skills.get(key)
      if (seen) seen.count++
      else skills.set(key, { skill: s.trim(), count: 1 })
    }
  }

  const sorted = [...entries].sort(byStart)
  const first = sorted[0]?.start.slice(0, 4)
  const thisYear = String(new Date().getFullYear())
  const endYears = entries.map((e) => (e.end === 'present' ? thisYear : (e.end ?? e.start).slice(0, 4)))
  const last = endYears.sort().at(-1)

  return {
    // Skills that repeat come first; ties are broken alphabetically so the list is stable.
    topSkills: [...skills.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)).slice(0, 6),
    mix: [...kinds.entries()]
      .map(([kind, count]) => ({ kind, label: `${count} ${MIX_WORDS[kind][count === 1 ? 0 : 1]}`, count }))
      .sort((a, b) => b.count - a.count),
    span: first && last ? (first === last ? first : `${first} to ${last}`) : '',
    ongoing: entries.filter((e) => e.end === 'present').length,
    recent: sorted.slice(-2).map((e) => e.title),
  }
}

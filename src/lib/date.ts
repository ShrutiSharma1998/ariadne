import type { MemoryEntry } from '../types'

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return MONTH_FORMAT.format(new Date(Date.UTC(y, m - 1, 1)))
}

export function formatRange(entry: Pick<MemoryEntry, 'start' | 'end' | 'yearOnly'>): string {
  // When the source gave only years, the stored month is a placeholder: show years alone.
  const show = (ym: string) => (entry.yearOnly ? String(yearOf(ym)) : formatMonth(ym))
  if (!entry.end) return show(entry.start)
  if (entry.end === 'present') return `${show(entry.start)} to now`
  return `${show(entry.start)} to ${show(entry.end)}`
}

export function yearOf(ym: string): number {
  return Number(ym.slice(0, 4))
}

export function byStart(a: MemoryEntry, b: MemoryEntry): number {
  return a.start.localeCompare(b.start)
}

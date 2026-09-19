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

export function formatRange(entry: Pick<MemoryEntry, 'start' | 'end'>): string {
  if (!entry.end) return formatMonth(entry.start)
  if (entry.end === 'present') return `${formatMonth(entry.start)} to now`
  return `${formatMonth(entry.start)} to ${formatMonth(entry.end)}`
}

export function yearOf(ym: string): number {
  return Number(ym.slice(0, 4))
}

export function byStart(a: MemoryEntry, b: MemoryEntry): number {
  return a.start.localeCompare(b.start)
}

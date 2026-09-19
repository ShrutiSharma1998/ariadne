import { z } from 'zod'

export const KINDS = [
  'work',
  'education',
  'volunteering',
  'side-project',
  'certification',
  'milestone',
] as const

// ---------- What the browser may send us (validated, length-limited) ----------

const YM = /^\d{4}-(0[1-9]|1[0-2])$/

export const EntryIn = z.object({
  id: z.string().max(80),
  kind: z.enum(KINDS),
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
})

export const EntriesIn = z.array(EntryIn).min(1).max(40)

export const ExtractIn = z.object({
  files: z
    .array(
      z.object({
        name: z.string().max(200),
        kind: z.enum(['pdf', 'text']),
        /** Base64 for PDFs, plain text for text files. */
        data: z.string().max(3_000_000),
      }),
    )
    .max(3),
  pastedText: z.string().max(30_000).optional(),
})

export const CoachIn = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
  entries: EntriesIn,
  personName: z.string().max(80).optional(),
})

export const TrajectoriesIn = z.object({
  entries: EntriesIn,
  goals: z.string().max(1500).optional(),
})

// ---------- What we ask the model to produce ----------

export const ExtractedEntry = z.object({
  kind: z.enum(KINDS),
  title: z.string(),
  org: z.string(),
  start: z.string(),
  end: z.string(),
  what: z.string(),
  how: z.string(),
  impact: z.string(),
  learned: z.string(),
  skills: z.array(z.string()),
  source: z.string(),
})

export const ExtractResult = z.object({
  entries: z.array(ExtractedEntry),
  notes: z.string(),
})

export const Trajectory = z.object({
  title: z.string(),
  summary: z.string(),
  whyItFits: z.string(),
  blindSpots: z.array(z.string()),
  skillGaps: z.array(z.object({ skill: z.string(), whereYouAre: z.string(), nextStep: z.string() })),
  firstSteps: z.array(z.object({ action: z.string(), howToFind: z.string() })),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceNote: z.string(),
})

export const TrajectoriesResult = z.object({
  paths: z.array(Trajectory),
  caveat: z.string(),
})

export type EntryInput = z.infer<typeof EntryIn>
export type TrajectoryResult = z.infer<typeof TrajectoriesResult>

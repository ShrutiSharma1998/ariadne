import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { DEFAULT_MODEL, type Env } from './env'
import {
  COACH_SYSTEM_BASE,
  EXTRACT_SYSTEM,
  TRAJECTORIES_SYSTEM,
  chosenPathBlock,
  serializeEntries,
  serializeReactions,
} from './prompts'
import {
  ExtractResult,
  TrajectoriesResult,
  type ChosenPathInput,
  type EntryInput,
  type ReactionInput,
  type TrajectoryResult,
} from './schemas'

const YM = /^\d{4}-(0[1-9]|1[0-2])$/

export interface ExtractedEntryOut {
  id: string
  kind: EntryInput['kind']
  title: string
  org?: string
  start: string
  end?: string
  what: string
  how: string
  impact: string
  learned: string
  skills: string[]
  source: string
  yearOnly?: boolean
}

/** Pasted secrets often pick up spaces, line breaks or quotes; strip them so a good key still works. */
function cleanKey(raw: string | undefined): string | undefined {
  return raw
    ?.trim()
    .replace(/^ANTHROPIC_API_KEY\s*=\s*/i, '')
    .replace(/^["']+|["']+$/g, '')
    .trim()
}

function client(env: Env): Anthropic {
  return new Anthropic({ apiKey: cleanKey(env.ANTHROPIC_API_KEY) })
}

function model(env: Env): string {
  return env.MODEL || DEFAULT_MODEL
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** Turns "2019" or "2019-7" into YYYY-MM where possible; returns null if unusable. */
function normaliseMonth(value: string): string | null {
  const v = value.trim()
  if (YM.test(v)) return v
  const year = /^(\d{4})$/.exec(v)
  if (year) return `${year[1]}-01`
  const loose = /^(\d{4})-(\d{1,2})$/.exec(v)
  if (loose && Number(loose[2]) >= 1 && Number(loose[2]) <= 12) return `${loose[1]}-${loose[2].padStart(2, '0')}`
  return null
}

export interface ExtractFile {
  name: string
  kind: 'pdf' | 'text'
  data: string
}

export async function extractTimeline(
  env: Env,
  files: ExtractFile[],
  pastedText?: string,
): Promise<{ entries: ExtractedEntryOut[]; notes: string }> {
  const content: Anthropic.ContentBlockParam[] = []
  for (const f of files) {
    content.push({ type: 'text', text: `File: ${f.name}` })
    if (f.kind === 'pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.data },
      })
    } else {
      content.push({ type: 'text', text: f.data })
    }
  }
  if (pastedText?.trim()) {
    content.push({ type: 'text', text: `File: pasted-text\n${pastedText}` })
  }
  content.push({
    type: 'text',
    text: 'Build the timeline from the files above. Return the structured result only.',
  })

  const response = await client(env).messages.parse({
    model: model(env),
    max_tokens: 12000,
    system: EXTRACT_SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'medium', format: zodOutputFormat(ExtractResult) },
  })

  if (response.stop_reason === 'refusal') {
    throw new UserFacingError('The model declined to process these files.', 422)
  }
  const parsed = response.parsed_output
  if (!parsed) {
    throw new UserFacingError(
      'I could not read a timeline from those files. Try a text version of your resume.',
      422,
    )
  }

  const seen = new Map<string, number>()
  const entries: ExtractedEntryOut[] = []
  for (const e of parsed.entries) {
    const start = normaliseMonth(e.start)
    if (!start) continue
    const endRaw = e.end.trim()
    const end = endRaw.toLowerCase() === 'present' ? 'present' : endRaw ? (normaliseMonth(endRaw) ?? undefined) : undefined
    const base = slug(e.title) || 'entry'
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    entries.push({
      id: n === 1 ? base : `${base}-${n}`,
      kind: e.kind,
      title: e.title.trim().slice(0, 200),
      org: e.org.trim() ? e.org.trim().slice(0, 200) : undefined,
      start,
      end,
      what: e.what.trim().slice(0, 1500),
      how: e.how.trim().slice(0, 1500),
      impact: e.impact.trim().slice(0, 1500),
      learned: e.learned.trim().slice(0, 1500),
      skills: e.skills.map((s) => s.trim().slice(0, 60)).filter(Boolean).slice(0, 15),
      source: e.source.trim().slice(0, 200) || 'uploaded file',
      yearOnly: e.yearOnly || undefined,
    })
  }
  entries.sort((a, b) => a.start.localeCompare(b.start))
  return { entries: entries.slice(0, 40), notes: parsed.notes }
}

/** The coach's instructions: how to coach, the person's timeline, and the path they chose, if any. */
export function coachSystem(entries: EntryInput[], personName?: string, path?: ChosenPathInput): string {
  const who = personName ? `The person's name is ${personName}.\n\n` : ''
  const chosen = path ? `\n\n${chosenPathBlock(path)}` : ''
  return `${COACH_SYSTEM_BASE}\n\n${who}Timeline:\n${serializeEntries(entries)}${chosen}`
}

/** Streams the coach's reply as plain text. */
export function streamCoach(
  env: Env,
  messages: { role: 'user' | 'assistant'; content: string }[],
  entries: EntryInput[],
  personName?: string,
  path?: ChosenPathInput,
): ReadableStream<Uint8Array> {
  const system = coachSystem(entries, personName, path)
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client(env).messages.stream({
          model: model(env),
          max_tokens: 2000,
          system,
          messages,
          output_config: { effort: 'low' },
        })
        stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)))
        const final = await stream.finalMessage()
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode('\n\nI can\'t help with that one. Ask me something else about your story.'))
        }
      } catch (err) {
        // Log the error's type and message only, never the visitor's text.
        console.error('coach stream failed:', err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 300) : 'unknown')
        controller.enqueue(encoder.encode('\n\nSomething went wrong on my side. Please send that again.'))
      } finally {
        controller.close()
      }
    },
  })
}

export async function suggestTrajectories(
  env: Env,
  entries: EntryInput[],
  goals?: string,
  reactions?: ReactionInput[],
): Promise<TrajectoryResult> {
  const goalText = goals?.trim() ? `\n\nWhat they said they are curious about:\n${goals.trim()}` : ''
  const reactionText = reactions?.length ? `\n\nFeedback on the earlier paths:\n${serializeReactions(reactions)}` : ''
  const response = await client(env).messages.parse({
    model: model(env),
    max_tokens: 8000,
    system: TRAJECTORIES_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Timeline:\n${serializeEntries(entries)}${goalText}${reactionText}\n\nPropose three paths. Return the structured result only.`,
      },
    ],
    output_config: { effort: 'medium', format: zodOutputFormat(TrajectoriesResult) },
  })
  if (response.stop_reason === 'refusal') {
    throw new UserFacingError('The model declined to suggest paths for this input.', 422)
  }
  if (!response.parsed_output) {
    throw new UserFacingError('I could not put the paths together. Please try again.', 502)
  }
  return response.parsed_output
}

/** An error whose message is safe to show to the visitor. */
export class UserFacingError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

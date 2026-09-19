import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Env } from './env'
import { extractTimeline, streamCoach, suggestTrajectories, UserFacingError } from './ai'
import { guard, json, type Route } from './guard'
import { mockCoachText, mockExtract, mockTrajectories } from './mock'
import { CoachIn, ExtractIn, TrajectoriesIn } from './schemas'

function shouldMock(env: Env): boolean {
  return env.MOCK_AI === '1' || !env.ANTHROPIC_API_KEY
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new UserFacingError('That request was not valid JSON.', 400)
  }
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new UserFacingError('Some of that input was missing or too long. Please check it and try again.', 400)
  }
  return result.data
}

function mockStream(text: string): Response {
  const encoder = new TextEncoder()
  const words = text.split(/(\s+)/)
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w))
        await new Promise((r) => setTimeout(r, 15))
      }
      controller.close()
    },
  })
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}

/** Handles every /api/* request. Works with any runtime that has the standard Request and Response. */
export async function handleApi(req: Request, env: Env): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '')
  const name = path.split('/').pop()

  // Public settings the page needs before it makes any AI request.
  if (name === 'config') {
    if (req.method !== 'GET') return json({ error: 'Use GET.' }, 405, { allow: 'GET' })
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null, paused: env.AI_DISABLED === '1' })
  }

  if (name !== 'extract' && name !== 'coach' && name !== 'trajectories') {
    return json({ error: 'Not found.' }, 404)
  }
  const route: Route = name

  // Kill switch: nothing below runs, nothing is counted, nothing reaches the AI provider.
  if (env.AI_DISABLED === '1') {
    return json({ error: 'The AI is paused for now. Please check back later.', code: 'paused' }, 503)
  }

  const refused = await guard(req, env, route)
  if (refused) return refused

  try {
    const body = await readJson(req)

    if (route === 'extract') {
      const input = parse(ExtractIn, body)
      if (input.files.length === 0 && !input.pastedText?.trim()) {
        throw new UserFacingError('Add at least one file or paste some text.', 400)
      }
      const out = shouldMock(env) ? mockExtract() : await extractTimeline(env, input.files, input.pastedText)
      if (out.entries.length === 0) {
        throw new UserFacingError(
          'I could not find any experiences in those files. Try a text version of your resume.',
          422,
        )
      }
      return json(out)
    }

    if (route === 'coach') {
      const input = parse(CoachIn, body)
      if (input.messages[input.messages.length - 1].role !== 'user') {
        throw new UserFacingError('The last message must be from you.', 400)
      }
      if (shouldMock(env)) return mockStream(mockCoachText())
      const stream = streamCoach(env, input.messages, input.entries, input.personName)
      return new Response(stream, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      })
    }

    const input = parse(TrajectoriesIn, body)
    return json(shouldMock(env) ? mockTrajectories() : await suggestTrajectories(env, input.entries, input.goals))
  } catch (err) {
    if (err instanceof UserFacingError) return json({ error: err.message }, err.status)
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'The AI is busy right now. Please try again in a minute.' }, 503)
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic authentication failed: check ANTHROPIC_API_KEY')
      return json({ error: 'The AI is not set up correctly on this site yet.' }, 500)
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error, status', err.status)
      return json({ error: 'The AI could not answer that. Please try again.' }, 502)
    }
    console.error('Unexpected server error')
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

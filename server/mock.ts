import type { ExtractedEntryOut } from './ai'
import type { TrajectoryResult } from './schemas'

/**
 * Canned answers used when no API key is set (or MOCK_AI=1), so the app can be built and
 * tested without spending anything. Clearly labelled so nobody mistakes them for real output.
 */

export function mockExtract(): { entries: ExtractedEntryOut[]; notes: string } {
  return {
    entries: [
      {
        id: 'mock-degree',
        kind: 'education',
        title: 'Example degree (mock)',
        org: 'Example University',
        start: '2016-09',
        end: '2020-05',
        what: 'This is a placeholder entry. Add an API key to build a real timeline from your files.',
        how: 'Not stated in the files',
        impact: 'Not stated in the files',
        learned: 'Not stated in the files',
        skills: ['Placeholder'],
        source: 'mock',
      },
    ],
    notes: 'Mock mode: no AI was called, and your files were not read.',
  }
}

export function mockCoachText(): string {
  return (
    'Mock mode is on, so this reply is canned and no AI was called.\n\n' +
    'Looking at your timeline, I notice a thread of building small tools that remove friction for other people. ' +
    'What was the moment in that work that you were proudest of, and what made it feel that way?'
  )
}

export function mockTrajectories(): TrajectoryResult {
  const path = (title: string, summary: string) => ({
    title,
    summary,
    whyItFits: 'Mock mode: this is placeholder text, not analysis of your story.',
    blindSpots: [
      'Placeholder blind spot one.',
      'Placeholder blind spot two.',
      'Placeholder blind spot three.',
    ],
    skillGaps: [
      {
        skill: 'Placeholder skill',
        whereYouAre: 'No evidence in your story yet.',
        nextStep: 'Pick one small project that uses it.',
      },
    ],
    firstSteps: [
      {
        action: 'Talk to two people who do this work',
        howToFind: 'Search for local meetups on this topic near you.',
      },
    ],
    confidence: 'low' as const,
    confidenceNote: 'Mock mode: nothing here was generated from your data.',
  })
  return {
    paths: [
      path('Go deeper (mock)', 'A placeholder path that builds on your current direction.'),
      path('Pivot next door (mock)', 'A placeholder path into an adjacent field.'),
      path('Blend two interests (mock)', 'A placeholder path that combines two strands of your story.'),
    ],
    caveat: 'Mock mode: add an API key to get real paths.',
  }
}

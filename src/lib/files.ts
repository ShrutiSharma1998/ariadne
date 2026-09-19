import type { ExtractFilePayload } from './api'

export const MAX_FILES = 3
export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_TEXT_CHARS = 60_000

export type PickResult = { ok: true; payload: ExtractFilePayload } | { ok: false; message: string }

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Checks a chosen file against the demo's limits and turns it into an upload payload. */
export async function prepareFile(file: File): Promise<PickResult> {
  const name = file.name
  const lower = name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf')
  const isText = lower.endsWith('.txt') || lower.endsWith('.md') || file.type.startsWith('text/')

  if (!isPdf && !isText) {
    return { ok: false, message: `${name}: only PDF, TXT and MD files work for now.` }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: `${name}: that file is over 2 MB. Try a shorter version.` }
  }
  if (isPdf) {
    return { ok: true, payload: { name, kind: 'pdf', data: toBase64(await file.arrayBuffer()) } }
  }
  const text = await file.text()
  if (text.length > MAX_TEXT_CHARS) {
    return { ok: false, message: `${name}: that file is too long. Trim it to the most relevant parts.` }
  }
  return { ok: true, payload: { name, kind: 'text', data: text } }
}

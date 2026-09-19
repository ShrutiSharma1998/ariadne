/** A stable number from text, so each card keeps its own hand-drawn wobble. */
export function seedFrom(text: string): number {
  let h = 7
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000
  return h + 1
}

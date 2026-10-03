/**
 * Stable ids for narration lines. A line's id is a short hash of its exact text,
 * so the audio file for it (public/voice/<id>.mp3) can be named, found and
 * re-rendered without any registry. The same file is used by scripts/voice/lines.mjs,
 * so the ids it prints are the ids the site looks up. Keep it dependency free.
 */

const ID_LENGTH = 10;

/** Whitespace is not part of the line: the same words always get the same id. */
export function normalizeLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Two 32-bit mixes of the text, joined: deterministic, sync, and plenty for a few hundred lines. */
export function lineId(text: string): string {
  const s = normalizeLine(text);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return (hex(h2) + hex(h1)).slice(0, ID_LENGTH);
}

/**
 * Parser for the DB-1 "working notes" scratchpad protocol.
 *
 * The model is prompted to begin every response with:
 *   [NOTES]
 *   terse first-person scratchpad lines…
 *   [/NOTES]
 *   …then the visible answer (with [SCENE:x] tags).
 *
 * This module splits a *streaming* string into { notes, answer } safely at any
 * point mid-stream:
 *   - Before "[NOTES]" is complete → everything is provisionally answer text
 *     (we hold back a partial "[NOTE…" prefix so tag fragments never flash).
 *   - Inside an unterminated block → all content so far is notes.
 *   - After "[/NOTES]" → remainder is answer.
 * Responses without a notes block pass through untouched.
 */

export interface SplitNotes {
  /** Scratchpad text (without the tag markers), trimmed. */
  notes: string;
  /** Visible answer text (may still contain [SCENE:x] tags). */
  answer: string;
  /** True once [/NOTES] has streamed (or when no block will appear). */
  notesComplete: boolean;
}

const OPEN = "[NOTES]";
const CLOSE = "[/NOTES]";

/** True if `s` ends with a proper prefix of `tag` (a tag mid-stream). */
function endsWithPartial(s: string, tag: string): boolean {
  for (let len = tag.length - 1; len > 0; len--) {
    if (s.endsWith(tag.slice(0, len))) return true;
  }
  return false;
}

export function splitNotes(raw: string): SplitNotes {
  if (!raw) return { notes: "", answer: "", notesComplete: false };

  const openIdx = raw.indexOf(OPEN);

  if (openIdx === -1) {
    // No open tag (yet). If the stream ends with a partial "[NOTES" fragment,
    // hold it back so it never flashes in the answer line.
    if (endsWithPartial(raw, OPEN)) {
      const cut = raw.length - partialLen(raw, OPEN);
      return { notes: "", answer: raw.slice(0, cut), notesComplete: false };
    }
    // Heuristic: once real content exists with no block started, assume none
    // is coming (canned/fallback answers, models that skip the protocol).
    return { notes: "", answer: raw, notesComplete: raw.trim().length > 0 };
  }

  const beforeOpen = raw.slice(0, openIdx);
  const afterOpen = raw.slice(openIdx + OPEN.length);
  const closeIdx = afterOpen.indexOf(CLOSE);

  if (closeIdx === -1) {
    // Unterminated: everything after [NOTES] is notes so far. Hold back a
    // trailing partial "[/NOTE" fragment from the notes pane.
    let notes = afterOpen;
    if (endsWithPartial(notes, CLOSE)) {
      notes = notes.slice(0, notes.length - partialLen(notes, CLOSE));
    }
    return {
      notes: notes.trimStart(),
      answer: beforeOpen,
      notesComplete: false,
    };
  }

  const notes = afterOpen.slice(0, closeIdx).trim();
  const answer = (beforeOpen + afterOpen.slice(closeIdx + CLOSE.length)).replace(/^\s+/, "");
  return { notes, answer, notesComplete: true };
}

/** Length of the longest proper prefix of `tag` that `s` ends with. */
function partialLen(s: string, tag: string): number {
  for (let len = tag.length - 1; len > 0; len--) {
    if (s.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}

/**
 * Plays one learner through the course against the real reminder rules, hour by hour, and records everything.
 * Deterministic and pure: the same scenario always gives the same timeline, so the page just indexes into it.
 *
 * The clock is Boston time. Day 1 is the evening she signs up (8:38 pm), and the scheduler's hourly pass is modelled
 * on the hour (the real one runs once an hour at a time the repo does not fix).
 */
import { KEYWORD_REPLY, OPT_IN_TEXT, OTP_TEXT, reminderText, type ReminderKind } from "./messages";
import { blockedBy, evaluate, RULES, soleBlocker, type Check, type Profile, type RuleId } from "./rules";
import { MIN_PER_DAY, MIN_PER_HOUR } from "./time";

export type Persona = "quiet" | "evenings" | "taps" | "keywords";
export type Zone = "boston" | "pacific";
export interface Scenario {
  persona: Persona;
  /** Drags the video to the end instead of watching it, so the question never unlocks. */
  skips: boolean;
  zone: Zone;
}

/** Pacific time is three hours behind Boston (both on daylight time in October). */
export const ZONE_OFFSET: Record<Zone, number> = { boston: 0, pacific: -180 };

/** The slider runs hour by hour from the evening of sign-up to the morning after day 9. */
export const HOUR_MIN = 20;
export const HOUR_MAX = 234;

/** Real lesson lengths in seconds (server/src/content/course.ts). */
const LESSON_SEC = [150, 150, 241, 361, 331, 241, 281, 281];
/** Share of the video actually seen when she drags to the end (the product's own sample figure). */
const SKIPPED_SEEN_PCT = 38;

/** Day 1, 8:38 pm: she asks for a sign-in code. The 8 days run from here. */
export const SIGNUP = 20 * MIN_PER_HOUR + 38;
/** Day 1, 8:40 pm: the code is entered, the profile is verified, the opt-in confirmation goes out. */
export const VERIFY = SIGNUP + 2;
const SURVEY = SIGNUP + 4;
const FIRST_LESSON = SIGNUP + 7;
const EVENING = 20 * MIN_PER_HOUR + 45;
/** Day 6, 9:30 am: when the keyword persona texts START. */
const START_AT = 5 * MIN_PER_DAY + 9 * MIN_PER_HOUR + 30;
/** Minutes after a reminder before she taps its link. */
const TAP_DELAY = 5;

export type Tag = "otp" | "optin" | "reminder" | "help" | "stop" | "start";
export type ThreadItem =
  | { id: string; at: number; kind: "in"; tag: Tag; text: string; reminderKind?: ReminderKind }
  | { id: string; at: number; kind: "out"; text: string }
  | { id: string; at: number; kind: "ghost"; reason: RuleId; text: string; repeats: number[] }
  | { id: string; at: number; kind: "note"; text: string };

export interface PassRecord {
  hour: number;
  at: number;
  checks: Check[];
  blocked: RuleId | null;
  /** What went out, when something did. */
  sent: { kind: ReminderKind; lesson: number } | null;
  /** Facts the sentence about this decision needs. */
  facts: { sinceActive: number; sinceText: number | null; unanswered: number; lessonsDone: number };
}

export interface Snapshot {
  at: number;
  surveyDone: boolean;
  lessonsDone: number;
  /** Lesson she is on (1 to 8). */
  lesson: number;
  /** Share of that video really seen, and whether its question is open. */
  seenPct: number;
  unlocked: boolean;
}

export interface Sim {
  items: ThreadItem[];
  passes: PassRecord[];
  snaps: Snapshot[];
}

type NoId<T> = T extends unknown ? Omit<T, "id"> : never;

interface Ev {
  at: number;
  seq: number;
  run: (at: number) => void;
}

export function simulate({ persona, skips, zone }: Scenario): Sim {
  const zoneOffset = ZONE_OFFSET[zone];
  const p: Profile = {
    createdAt: SIGNUP,
    verified: false,
    completed: false,
    optedOutAt: null,
    optedInAt: null,
    lastActivityAt: SIGNUP,
    lastNudgeAt: null,
    unanswered: 0,
    total: 0,
    zoneOffset,
  };
  let surveyDone = false;
  let lessonsDone = 0;
  let seenPct = 0;
  let unlocked = false;

  const items: ThreadItem[] = [];
  const snaps: Snapshot[] = [];
  const queue: Ev[] = [];
  let seq = 0;
  const later = (at: number, run: (at: number) => void) => queue.push({ at, seq: seq++, run });
  const add = (item: NoId<ThreadItem>) => items.push({ ...item, id: `i${seq++}` } as ThreadItem);
  const lessonNow = () => Math.min(lessonsDone + 1, RULES.lessons);
  const snap = (at: number) => snaps.push({ at, surveyDone, lessonsDone, lesson: lessonNow(), seenPct, unlocked });
  /** Any sign of life (a sign-in, a heartbeat from the player, an answer, a tapped link) resets the clock and the unanswered count. */
  const active = (at: number) => {
    p.lastActivityAt = at;
    p.unanswered = 0;
  };

  /** One sitting with the current lesson: watch it (or drag to the end), then answer its question if it unlocked. */
  const sit = (start: number, answers: boolean) => {
    if (p.completed) return;
    const lesson = lessonNow();
    const watchMin = Math.ceil(LESSON_SEC[lesson - 1] / MIN_PER_HOUR);
    later(start, (t) => {
      active(t);
      seenPct = skips ? SKIPPED_SEEN_PCT : 100;
      unlocked = !skips;
      add({
        at: t,
        kind: "note",
        text: skips
          ? `Drags lesson ${lesson} to the end. ${SKIPPED_SEEN_PCT}% really seen, so the question stays locked (it needs 90%).`
          : `Watches lesson ${lesson} to the end. 100% seen, so the question unlocks${answers ? "." : ". She leaves it."}`,
      });
      snap(t);
    });
    later(start + watchMin, active);
    if (skips || !answers) return;
    later(start + watchMin + 1, (t) => {
      active(t);
      lessonsDone += 1;
      seenPct = 0;
      unlocked = false;
      add({ at: t, kind: "note", text: `Answers the question. Lesson ${lesson} done.` });
      if (lessonsDone === RULES.lessons) {
        p.completed = true;
        add({ at: t, kind: "note", text: "All 8 lessons done. The certificate is ready to download." });
      }
      snap(t);
    });
  };

  const keyword = (at: number, word: "HELP" | "STOP" | "START") => {
    add({ at, kind: "out", text: word });
    add({ at, kind: "in", tag: word.toLowerCase() as Tag, text: KEYWORD_REPLY[word] });
  };

  // Sign-up: ask for a code, confirm it, answer the survey, do lesson 1.
  later(SIGNUP, (t) => add({ at: t, kind: "in", tag: "otp", text: OTP_TEXT }));
  later(VERIFY, (t) => {
    p.verified = true;
    active(t);
    add({ at: t, kind: "in", tag: "optin", text: OPT_IN_TEXT });
  });
  later(SURVEY, (t) => {
    active(t);
    surveyDone = true;
    add({ at: t, kind: "note", text: "Answers the 3 survey questions." });
    snap(t);
  });

  const answersFirst = persona !== "quiet";
  later(FIRST_LESSON, (t) => sit(t, answersFirst));
  if (persona === "evenings") {
    for (let day = 2; day <= RULES.lessons; day += 1) later((day - 1) * MIN_PER_DAY + EVENING, (t) => sit(t, true));
  }
  if (persona === "keywords") later(START_AT, (t) => {
    p.optedInAt = t;
    keyword(t, "START");
  });

  /** The wording follows where she is: survey, resume, question waiting, next lesson. */
  const kindNow = (): ReminderKind => {
    if (!surveyDone) return "survey";
    if (lessonsDone === RULES.lessons) return "certificate";
    if (unlocked) return "quiz";
    return seenPct > 0 ? "resume" : "next_day";
  };

  // The scheduler's hourly pass.
  const passes: PassRecord[] = [];
  let lastGhost: Extract<ThreadItem, { kind: "ghost" }> | null = null;
  let lastGhostHour = 0;
  for (let hour = HOUR_MIN; hour <= HOUR_MAX; hour += 1) {
    const now = hour * MIN_PER_HOUR;
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
      if (!queue.length || queue[0].at > now) break;
      const ev = queue.shift()!;
      ev.run(ev.at);
    }
    if (snaps.length === 0) snap(now);

    const checks = evaluate(p, now, lessonsDone);
    const blocked = blockedBy(checks);
    const facts = {
      sinceActive: Math.floor((now - p.lastActivityAt) / MIN_PER_HOUR),
      sinceText: p.lastNudgeAt === null ? null : Math.floor((now - p.lastNudgeAt) / MIN_PER_HOUR),
      unanswered: p.unanswered,
      lessonsDone,
    };

    if (blocked === null) {
      const kind = kindNow();
      const lesson = lessonNow();
      p.lastNudgeAt = now;
      p.unanswered += 1;
      p.total += 1;
      add({ at: now, kind: "in", tag: "reminder", text: reminderText(kind, lesson), reminderKind: kind });
      passes.push({ hour, at: now, checks, blocked, sent: { kind, lesson }, facts });
      lastGhost = null;
      if (persona === "taps") {
        later(now + TAP_DELAY, (t) => {
          active(t);
          add({ at: t, kind: "note", text: "Taps the link in the text." });
        });
        later(now + TAP_DELAY + 1, (t) => sit(t, true));
      }
      if (persona === "keywords" && p.total === 1) {
        later(now + 2, (t) => keyword(t, "HELP"));
        later(now + 4, (t) => {
          p.optedOutAt = t;
          keyword(t, "STOP");
        });
      }
      continue;
    }

    passes.push({ hour, at: now, checks, blocked, sent: null, facts });
    const held = soleBlocker(checks);
    if (held === null) continue;
    // The same rule holding the same text back again (day after day) folds into one entry with a count.
    if (lastGhost && items[items.length - 1] === lastGhost && lastGhost.reason === held) {
      // Consecutive hours are one episode; a new day's morning is another.
      if (hour - lastGhostHour > 1) lastGhost.repeats.push(now);
      lastGhostHour = hour;
      continue;
    }
    lastGhostHour = hour;
    const kind = kindNow();
    lastGhost = { id: `i${seq++}`, at: now, kind: "ghost", reason: held, text: reminderText(kind, lessonNow()), repeats: [] };
    items.push(lastGhost);
  }

  items.sort((a, b) => a.at - b.at);
  return { items, passes, snaps };
}

/** Course progress at a moment: the last snapshot at or before it. */
export function snapshotAt(sim: Sim, at: number): Snapshot {
  let found = sim.snaps[0];
  for (const s of sim.snaps) if (s.at <= at) found = s;
  return found;
}

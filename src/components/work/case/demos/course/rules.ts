/**
 * The reminder rules of Civic AI Course Delivery, as the scheduler applies them.
 *
 * Ported by hand from the course repo (private), as of its 1 Oct 2026 commits:
 *  - server/src/lib/nudges.ts: nudgeSkipReason (the order below is the order it checks), the 9:00 to 19:59 window,
 *    the 8-day sunset measured from sign-up, the 8 reminders in all, the 2 unanswered in a row, the 20 hour gap.
 *  - server/src/scheduler.ts: EventBridge runs the pass hourly; 24 hours of inactivity; templateFor picks the wording.
 *  - server/src/lib/optout.ts + sms-inbound.ts: STOP / START / HELP mirrored onto the profile.
 *  - server/src/lib/progress.ts + content/course.ts: the question unlocks at 90 percent of the video's seconds seen.
 * Not modelled: the admin "pause reminders" switch, email learners (same rules, other channel), delivery failures.
 */
import { clockOf, hoursBetween, localParts, MIN_PER_DAY, MIN_PER_HOUR } from "./time";

export const RULES = {
  inactivityMin: 24 * MIN_PER_HOUR,
  gapMin: 20 * MIN_PER_HOUR,
  /** First local hour a reminder may go out, and the first hour it may not (9:00 to 19:59). */
  windowStart: 9,
  windowEnd: 20,
  sunsetMin: 8 * MIN_PER_DAY,
  lifetimeMax: 8,
  unansweredMax: 2,
  /** Share of a video's seconds that must really have been seen before its question unlocks. */
  watchThreshold: 0.9,
  lessons: 8,
} as const;

/** The rules in the order the scheduler checks them. The first one that fails is the reason. */
export const RULE_ORDER = [
  "not_verified",
  "completed",
  "opted_out",
  "sunset",
  "lifetime_cap",
  "unanswered_cap",
  "recently_active",
  "gap",
  "already_today",
  "quiet_hours",
] as const;
export type RuleId = (typeof RULE_ORDER)[number];

/** Learner state the rules read. Times are minutes on the Boston clock; `null` means never. */
export interface Profile {
  createdAt: number;
  verified: boolean;
  completed: boolean;
  optedOutAt: number | null;
  optedInAt: number | null;
  lastActivityAt: number;
  lastNudgeAt: number | null;
  /** Reminders in a row with no activity in between (nudgeCount). */
  unanswered: number;
  /** Reminders ever sent (nudgeTotal). */
  total: number;
  /** Minutes the learner's clock is from Boston's. */
  zoneOffset: number;
}

/** A replied-STOP stands until a later START. */
export const isOptedOut = (p: Pick<Profile, "optedOutAt" | "optedInAt">): boolean =>
  p.optedOutAt !== null && (p.optedInAt === null || p.optedOutAt > p.optedInAt);

export interface Check {
  id: RuleId;
  /** Whether this rule alone would let a text through. */
  pass: boolean;
  /** False for the rules after the first failure: the scheduler never looks at them. */
  reached: boolean;
  /** What the rule saw, in a few words. */
  value: string;
}

export interface RuleCopy {
  /** The rule as a sentence, for the log. */
  label: string;
  /** Two or three words, for a held-back text. */
  short: string;
}

export const RULE_COPY: Record<RuleId, RuleCopy> = {
  not_verified: { label: "Signed up and confirmed", short: "Not signed up" },
  completed: { label: "Course not finished yet", short: "Course finished" },
  opted_out: { label: "Has not replied STOP", short: "Replied STOP" },
  sunset: { label: "Within 8 days of signing up", short: "8 days are up" },
  lifetime_cap: { label: "Under 8 reminders in all", short: "8 reminders sent" },
  unanswered_cap: { label: "Fewer than 2 unanswered in a row", short: "Two unanswered" },
  recently_active: { label: "Quiet for 24 hours", short: "Active within 24 h" },
  gap: { label: "20 hours since the last text", short: "20 hour gap" },
  already_today: { label: "No text yet today", short: "Already texted today" },
  quiet_hours: { label: "Between 9 am and 8 pm her time", short: "Quiet hours" },
};

/** Every rule, in order, with whether it passes and what it saw. `lessonsDone` is course progress, which `completed` mirrors. */
export function evaluate(p: Profile, now: number, lessonsDone: number): Check[] {
  const local = localParts(now, p.zoneOffset);
  const sinceActive = hoursBetween(p.lastActivityAt, now);
  const sinceText = p.lastNudgeAt === null ? null : hoursBetween(p.lastNudgeAt, now);
  const sinceSignup = hoursBetween(p.createdAt, now);
  const texted = p.lastNudgeAt === null ? null : localParts(p.lastNudgeAt, p.zoneOffset).date;
  const optedOut = isOptedOut(p);
  const inWindow = local.hour >= RULES.windowStart && local.hour < RULES.windowEnd;

  const raw: Record<RuleId, { pass: boolean; value: string }> = {
    not_verified: { pass: p.verified, value: p.verified ? "Yes" : "Not yet" },
    completed: { pass: !p.completed, value: p.completed ? "All 8 done" : `${lessonsDone} of ${RULES.lessons} done` },
    opted_out: { pass: !optedOut, value: optedOut ? "Replied STOP" : "Opted in" },
    sunset: {
      pass: now - p.createdAt < RULES.sunsetMin,
      value: `Hour ${Math.max(0, sinceSignup)} of ${RULES.sunsetMin / MIN_PER_HOUR}`,
    },
    lifetime_cap: { pass: p.total < RULES.lifetimeMax, value: `${p.total} sent` },
    unanswered_cap: { pass: p.unanswered < RULES.unansweredMax, value: `${p.unanswered} unanswered` },
    recently_active: {
      pass: now - p.lastActivityAt >= RULES.inactivityMin,
      value: sinceActive < 1 ? "Active just now" : `Active ${sinceActive} h ago`,
    },
    gap: {
      pass: p.lastNudgeAt === null || now - p.lastNudgeAt >= RULES.gapMin,
      value: sinceText === null ? "No text yet" : `${sinceText} h ago`,
    },
    already_today: {
      pass: texted === null || texted !== local.date,
      value: texted === null ? "No text yet" : texted === local.date ? "Texted today" : "None today",
    },
    quiet_hours: { pass: inWindow, value: `${clockOf(now, p.zoneOffset)} her time` },
  };

  let live = true;
  return RULE_ORDER.map((id) => {
    const check: Check = { id, pass: raw[id].pass, reached: live, value: raw[id].value };
    if (!raw[id].pass) live = false;
    return check;
  });
}

/** The rule that stopped the text (the first failure), or null when one goes out. */
export const blockedBy = (checks: Check[]): RuleId | null => checks.find((c) => !c.pass)?.id ?? null;

/**
 * The one rule holding a text back, when every other rule would have let it through. This is what makes a held-back
 * text worth drawing: "quiet hours" at 10 pm, "two unanswered" on day 5. Ordinary quiet (recently active) is not drawn.
 */
export function soleBlocker(checks: Check[]): RuleId | null {
  const failing = checks.filter((c) => !c.pass);
  if (failing.length !== 1) return null;
  const id = failing[0].id;
  return id === "recently_active" || id === "not_verified" ? null : id;
}

import { KIND_WHY, LEARNER } from "./messages";
import { RULE_COPY, RULES, type RuleId } from "./rules";
import type { PassRecord } from "./simulate";
import { clockOf, plural } from "./time";

export interface Decision {
  sent: boolean;
  /** `Text sent` or `No text`. */
  verdict: string;
  /** The rule that decided, or what let the text through. */
  rule: string;
  /** One or two sentences: what the scheduler saw and why that decides it. */
  why: string;
}

/** Why a rule held the text, with this hour's numbers in it. */
function whyBlocked(id: RuleId, pass: PassRecord, offset: number): string {
  const { sinceActive, sinceText } = pass.facts;
  switch (id) {
    case "not_verified":
      return `${LEARNER} has not signed up yet, so there is nobody to text.`;
    case "completed":
      return `All ${RULES.lessons} lessons are done and the certificate is ready. That is the finish line, so reminders stop.`;
    case "opted_out":
      return `${LEARNER} replied STOP. Nothing goes out until she replies START.`;
    case "sunset":
      return "More than 8 days have passed since sign-up. Reminders end then, however far she got.";
    case "lifetime_cap":
      return `${RULES.lifetimeMax} reminders have already gone out. That is the most in the whole course.`;
    case "unanswered_cap":
      return `Two reminders in a row went unanswered, so the scheduler stops until ${LEARNER} does something in the course.`;
    case "recently_active":
      return `${LEARNER} was active ${sinceActive < 1 ? "just now" : `${plural(sinceActive, "hour")} ago`}. A reminder only follows 24 hours of quiet.`;
    case "gap":
      return `The last text went out ${plural(sinceText ?? 0, "hour")} ago. Reminders are at least 20 hours apart, even when the clock says a new day.`;
    case "already_today":
      return "A reminder already went out today on her clock. It is one a day at most.";
    case "quiet_hours":
      return `It is ${clockOf(pass.at, offset)} for ${LEARNER}. Reminders only go out from 9 am to 8 pm her time, so this one waits for the morning.`;
  }
}

export function decide(pass: PassRecord, offset: number): Decision {
  if (pass.sent) {
    return {
      sent: true,
      verdict: "Text sent",
      rule: "All ten rules passed",
      why: `${plural(pass.facts.sinceActive, "hour")} of quiet, inside her 9 am to 8 pm, nothing else in the way. The wording follows where she is: ${KIND_WHY[pass.sent.kind]}.`,
    };
  }
  const id = pass.blocked;
  if (!id) return { sent: false, verdict: "No text", rule: "", why: "" };
  return { sent: false, verdict: "No text", rule: RULE_COPY[id].short, why: whyBlocked(id, pass, offset) };
}

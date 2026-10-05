/**
 * The texts, word for word as the course sends them (server/src/lib/messages.ts, 1 Oct 2026 wording).
 * The learner, the sign-in code and the link are samples: the site's film and stills use the same ones.
 */
export const LEARNER = "Marisol";
export const SAMPLE_LINK = "https://cvai.example.org/l/Ab3d";
const SAMPLE_CODE = "482916";
const BRAND = "InnovateUS:";

export type ReminderKind = "survey" | "next_day" | "resume" | "quiz" | "certificate";

export const OTP_TEXT = `${BRAND} ${SAMPLE_CODE} is your CivicAI Course sign-in code. It expires in 10 minutes. Don't share it with anyone.`;

export const OPT_IN_TEXT =
  `${BRAND} You're signed up for the CivicAI Course (The GovLab). You'll get sign-in codes when you ask ` +
  "and up to 1 lesson reminder a day for 8 days. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

/** The keyword replies come from the texting service itself, not from the scheduler. */
export const KEYWORD_REPLY = {
  HELP:
    `${BRAND} CivicAI Course texts: sign-in codes and up to 1 lesson reminder a day. Help: info@thegovlab.org. ` +
    "Msg & data rates may apply. Reply STOP to opt out.",
  STOP: `${BRAND} You won't get more CivicAI Course texts, including sign-in codes. Reply START to turn texts back on.`,
  START: `${BRAND} CivicAI Course texts are back on. Msg & data rates may apply. Reply STOP to opt out.`,
} as const;

/** The lesson reminder, one of five wordings chosen by where the learner is. */
export function reminderText(kind: ReminderKind, lesson: number): string {
  const body = {
    survey: "start your CivicAI Course with 3 quick questions:",
    quiz: `1 question left to finish CivicAI lesson ${lesson}:`,
    resume: `pick up CivicAI lesson ${lesson} where you left off:`,
    certificate: "your CivicAI Course certificate is ready to download:",
    next_day: `your next CivicAI lesson (${lesson} of 8) is ready when you are:`,
  }[kind];
  return `${BRAND} Hi ${LEARNER}, ${body} ${SAMPLE_LINK} Reply STOP to opt out.`;
}

/** Why that wording, in a clause. */
export const KIND_WHY: Record<ReminderKind, string> = {
  survey: "she has not done the sign-up survey",
  next_day: "the next lesson is waiting",
  resume: "the video is only partly watched",
  quiz: "the video is watched and its question is waiting",
  certificate: "all lessons are passed",
};

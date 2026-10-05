/**
 * Content for the A-IEP "Who sees what" demo.
 *
 * Everything here is precomputed by hand from the public repo (The-Burnes-Center/a-iep, main):
 *  - comprehend_redactor.py: every Comprehend entity becomes `[TYPE]` except DATE_TIME, which is kept;
 *    a NAME that strictly matches the child's profile name becomes `{{S}}`.
 *  - student_name.py: strict full-name match, so a bare first name stays `[NAME]`.
 *  - iep-processing.asl.json: RedactOCR, DeleteOriginal, ParsingAgent, translation, FinalizeResults, PurgeRedactedOCR.
 *  - user-profile-handler/student_name_substitution.py: `{{S}}` is swapped for the profile name on every read.
 * The IEP is invented. No Comprehend run produced the replacements: they apply the redactor's rules by hand.
 */

/** The placeholder for the child, exactly as the redactor writes it. */
export const STUDENT_TOKEN = "{{S}}";
/** The name on the sample parent's profile. The redactor only singles out a full-name match to it. */
export const PROFILE_NAME = "Jordan Reyes";

/** A piece of a line: plain text, an identifier the redactor replaces, a kept span, or one it is shown missing. */
export type Seg =
  | string
  | { k: "id"; text: string; token: string; student?: boolean }
  | { k: "keep"; text: string; why: "date" | "dx" }
  | { k: "miss"; text: string };

/** The fictional excerpt, one entry per OCR line. Phone numbers use the reserved 555-01xx range. */
export const SAMPLE: Seg[][] = [
  [{ k: "miss", text: "ALDER CREEK ELEMENTARY SCHOOL" }],
  [{ k: "id", text: "41 Marlow Lane, Alderbrook, MA 00000", token: "[ADDRESS]" }],
  ["Student: ", { k: "id", text: PROFILE_NAME, token: STUDENT_TOKEN, student: true }, "   DOB: ", { k: "keep", text: "03/14/2016", why: "date" }],
  ["Parents: ", { k: "id", text: "Maria Reyes", token: "[NAME]" }, ", ", { k: "id", text: "Daniel Reyes", token: "[NAME]" }],
  ["Phone: ", { k: "id", text: "(555) 010-0142", token: "[PHONE]" }],
  ["Teacher (special ed): Ms. ", { k: "id", text: "Priya Nair", token: "[NAME]" }],
  ["Diagnosis: ", { k: "keep", text: "Dyslexia", why: "dx" }],
  [{ k: "id", text: "Jordan", token: "[NAME]" }, " reads at a mid first-grade level."],
  ["Service: Reading, 30 min, 4x/week"],
  ["Meeting: ", { k: "keep", text: "05/12/2026", why: "date" }, "  Starts: ", { k: "keep", text: "05/19/2026", why: "date" }],
];

const flat = SAMPLE.flat();
export const ID_COUNT = flat.filter((s) => typeof s !== "string" && s.k === "id").length;
export const DATE_COUNT = flat.filter((s) => typeof s !== "string" && s.k === "keep" && s.why === "date").length;

/** A piece of the summary the model writes back: text, the child's placeholder, or a diagnosis kept by design. */
export type SumPart = string | { tok: true } | { keep: string };

/** Illustrative summary wording. The behaviour is the code's: the placeholder is copied through every language. */
export const SUMMARY: { lang: string; parts: SumPart[] }[] = [
  { lang: "EN", parts: [{ tok: true }, " has ", { keep: "dyslexia" }, " and reads at a mid first-grade level."] },
  { lang: "EN", parts: [{ tok: true }, " will get reading help 4 times a week from the special education teacher."] },
  { lang: "ES", parts: [{ tok: true }, " recibirá apoyo de lectura 4 veces por semana."] },
];

export type Stage = {
  /** Short tab label. */
  tab: string;
  /** Who is on the other end, for the tab's second line. */
  who: string;
  /** Vendor heading. */
  vendor: string;
  /** Where that vendor runs. */
  where: string;
  /** The one-sentence answer to "what do they see". */
  sees: string;
  /** Spoken to a screen reader when the stage becomes current. */
  announce: string;
  /** Labelled facts. `{{S}}` and `[TYPE]` in text render as token chips. */
  rows: { k: string; v: string }[];
};

export const STAGES: Stage[] = [
  {
    tab: "OCR",
    who: "Mistral",
    vendor: "Mistral OCR",
    where: "Mistral's API",
    sees: "The original page, names included.",
    announce: "Mistral OCR reads the original page, names included.",
    rows: [
      { k: "Receives", v: "The uploaded page, before anything is removed. OCR runs first because redaction needs its text." },
      { k: "Contract", v: "A no-training enterprise contract limits what Mistral may do with it, not what it receives." },
      { k: "After", v: "The uploaded copy is deleted from Mistral as soon as OCR answers, best effort." },
    ],
  },
  {
    tab: "Redact",
    who: "Comprehend",
    vendor: "Amazon Comprehend",
    where: "Inside our AWS account",
    sees: "The OCR text. It replaces every identifier it finds except dates.",
    announce: "Amazon Comprehend replaces seven identifiers with tokens and keeps the dates.",
    rows: [
      { k: "Strict match", v: "Each identifier becomes its type in brackets, like [ADDRESS] or [PHONE]. Only a full name that matches the child's profile becomes {{S}}; every other name, and a bare first name like the one on line 8, becomes [NAME]." },
      { k: "Fails closed", v: "An error stops the run instead of passing text on. Step Functions retries, and a lasting failure purges unredacted artifacts." },
      { k: "Not measured", v: "How many identifiers it misses is not measured yet. The school name is shown unflagged here, and whether Comprehend flags one is unconfirmed." },
    ],
  },
  {
    tab: "Summarize",
    who: "OpenAI",
    vendor: "OpenAI",
    where: "Writes and translates",
    sees: "Redacted text only.",
    announce: "OpenAI sees redacted text only, and writes the summary and translations around the placeholder.",
    rows: [
      { k: "Writes", v: "A plain-language summary, then one translation per language. People are named by role, and [NAME] is never printed." },
      { k: "Placeholder", v: "{{S}} is copied through verbatim in every language. A translation run that drops it fails." },
      { k: "Kept by design", v: "Diagnoses stay in the summary, and so do dates." },
    ],
  },
  {
    tab: "Stored",
    who: "Our app",
    vendor: "Our own app",
    where: "Database, then the parent's screen",
    sees: "No vendor reads this. The placeholder stays in storage.",
    announce: "The summary is stored with the placeholder. The original upload is deleted, and the name is swapped in when a parent opens the page.",
    rows: [
      { k: "Stored", v: "The summary and translations keep {{S}} permanently. No stored text holds the child's name." },
      { k: "On read", v: "When a parent opens a page, the app swaps in the name from their profile, every time. Correct a typo and every summary follows." },
      { k: "Deleted", v: "The original upload is deleted from S3 right after redaction. The redacted OCR text is purged once the summary exists." },
    ],
  },
];

/** Header caption for the left-hand canvas, per stage. */
export const DOC_CAPTION = ["Page as uploaded", "Reads the OCR text, passes on this", "Sent to OpenAI", "Original upload"] as const;

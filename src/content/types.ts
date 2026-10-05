export type Link = { label: string; href: string; kind?: "live" | "code" | "press" | "video" | "doc" | "award" };

/** Who stands behind a figure. Drives the provenance tag on Impact and on case outcomes. */
export type Basis = "third-party" | "employer" | "self" | "repo";

export type Metric = {
  value: string;
  numeric?: number;
  suffix?: string;
  label: string;
  context: string;
  source: string;
  /** Overrides the basis that would be read from `source` (see provenance.ts). */
  basis?: Basis;
  /** The date the figure holds for, when the source gives one that the text does not: "Dec 2024", "5 Oct 2026". Otherwise the ledger says Undated. */
  asOf?: string;
  projectSlug?: string;
};

/** How far a production-note claim can be trusted. A fixed vocabulary, so every case reads the same way. */
export type NoteStatus =
  | "Measured"
  | "Measured, unpublished"
  | "Projected"
  | "Designed, not run"
  | "Self-reported"
  | "Not measured"
  | "Instrumented, no results"
  | "Tested"
  | "Private repo";

export type NoteLink = { label: string; href: string };

/** One row of a case study's production notes: a mono label, an optional status, prose or short lead-in lines, and receipts. */
export type ProductionNote = {
  label: string;
  status?: NoteStatus;
  text?: string;
  lines?: { lead: string; text: string }[];
  links?: NoteLink[];
};

/** A short launch film for a project (rendered with /brag, encoded by scripts/encode-film.sh). */
export type Film = {
  src: string;
  /** Raw frame from the film. Prefer `thumb` wherever a designed still is shown. */
  poster: string;
  title: string;
  /** Designed 16:9 key art (1600x900) from scripts/thumbs: work list, cursor preview, case poster, OG. */
  thumb?: string;
  /** Designed 4:3 key art (1200x900) for mobile cards. */
  thumb43?: string;
  /** 9:16 cut for phones. */
  vertical?: { src: string; poster: string };
  /** Plain text: beats with timecodes, on-screen text and a short visual description. */
  transcript?: string;
};

export type Media = {
  src: string;
  alt: string;
  kind: "image" | "video";
  width?: number;
  height?: number;
  caption?: string;
};

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  year: string;
  role: string;
  /** One honest sentence on what DB personally built or owned. */
  owned?: string;
  org?: string;
  featured: boolean;
  /** Lab project too thin for its own page: listed as a row only, no /work/<slug>/ page. */
  compact?: boolean;
  category: "gov-ai" | "platform" | "hackathon" | "mobile" | "lab" | "tool";
  problem: string;
  approach: string[];
  /**
   * `nodes` is one linear pipeline. When a project ships two systems (ABE and One-L), either put a "|" entry
   * between the two runs of nodes, or fill `lanes`; the diagram then draws one lane per system.
   */
  architecture?: { nodes: string[]; flow: string; lanes?: { name: string; nodes: string[] }[] };
  outcomes: Metric[];
  /** Project-specific section headings for the case study (fall back to generic ones). */
  headlines?: { problem?: string; built?: string; flows?: string; outcomes?: string };
  /** What a head of engineering asks next: evaluation, cost, privacy, what broke, what I reversed, and the receipts. Rows only where a link or repo fact backs them. */
  notes?: ProductionNote[];
  /** Launch film shown at the top of the case study and as the work-list preview. */
  film?: Film;
  /** My share of the build, shown as a badge: sole author, lead, core contributor, or technical advisor. */
  ownership?: "sole" | "lead" | "core" | "advisor";
  /** Designed preview stills for a project without a film (16:9 with title, 4:3 without), from scripts/thumbs. */
  cover?: { thumb: string; thumb43: string };
  stack: string[];
  links: Link[];
  media: Media[];
  accent?: string;
};

export type TimelineEntry = {
  year: string;
  place: string;
  title: string;
  org?: string;
  body: string;
  kind: "education" | "work" | "milestone" | "personal";
};

export type Recognition = {
  title: string;
  issuer: string;
  year: string;
  kind: "award" | "press" | "talk";
  /** External source. Local evidence (photos) goes in `image` and opens in place. */
  href?: string;
  note?: string;
  image?: { src: string; alt: string; width: number; height: number };
};

export type StackGroup = { name: string; items: string[] };

export type Profile = {
  /** Optional one-line availability shown under the Contact ask (e.g. "Open to founding AI engineer roles from January"). */
  availability?: string;
  name: string;
  shortName: string;
  handle: string;
  title: string;
  employer: string;
  location: string;
  origin: string;
  oneLiner: string;
  manifesto: string[];
  bio: string;
  email: string;
  links: Link[];
  resumeHref: string;
  offDuty: { label: string; value: string }[];
  currentlyBuilding: string[];
};

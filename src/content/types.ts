export type Link = { label: string; href: string; kind?: "live" | "code" | "press" | "video" | "doc" | "award" };

export type Metric = {
  value: string;
  numeric?: number;
  suffix?: string;
  label: string;
  context: string;
  source: string;
  projectSlug?: string;
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
  category: "gov-ai" | "platform" | "hackathon" | "mobile" | "lab" | "tool";
  problem: string;
  approach: string[];
  architecture?: { nodes: string[]; flow: string };
  outcomes: Metric[];
  /** Launch film shown at the top of the case study and as the work-list preview. */
  film?: Film;
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

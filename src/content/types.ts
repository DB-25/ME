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
  href?: string;
  note?: string;
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

import type { Media, Project } from "@/content";

export const CATEGORY_LABEL: Record<Project["category"], string> = {
  "gov-ai": "Government AI",
  platform: "Platform",
  hackathon: "Hackathon",
  mobile: "Mobile",
  lab: "Lab",
  tool: "Tooling",
};

export const pad = (n: number) => String(n).padStart(2, "0");

/** A project's preview still: the designed film thumb (already on-brand) when it has one, else its first screenshot. */
export function previewImage(p: Project): (Media & { thumb?: boolean; src43?: string }) | undefined {
  const f = p.film;
  if (f) {
    const designed = Boolean(f.thumb);
    return {
      src: f.thumb ?? f.poster,
      src43: f.thumb43,
      thumb: designed,
      alt: f.title,
      kind: "image",
      width: 1600,
      height: 900,
    };
  }
  return p.media.find((m) => m.kind === "image");
}

/** The still that shares a video's basename (abe-chat.mp4 -> abe-chat.jpg), if the content has one. */
export function posterFor(p: Project, video: Media): Media | undefined {
  const base = (s: string) => s.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "");
  return p.media.find((m) => m.kind === "image" && base(m.src) === base(video.src));
}

/** Most useful external link for a lab row. */
export function primaryLink(p: Project) {
  const order = ["live", "code", "doc", "press", "video", "award"] as const;
  for (const kind of order) {
    const hit = p.links.find((l) => l.kind === kind);
    if (hit) return hit;
  }
  return p.links[0];
}

export const KIND_LABEL: Record<NonNullable<Project["links"][number]["kind"]>, string> = {
  live: "Live",
  code: "Code",
  press: "Press",
  video: "Video",
  doc: "Read",
  award: "Award",
};

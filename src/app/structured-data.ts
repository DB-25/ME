import { profile } from "@/content";
import type { Project } from "@/content/types";
import { siteUrl } from "./site";

/** schema.org data built only from src/content: nothing here is written by hand. */
const linkHref = (label: string) => profile.links.find((l) => l.label === label)?.href;
const burnesHref = linkHref("Burnes Center profile");

const PERSON_ID = siteUrl("/#person");

export const PERSON = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: profile.name,
  jobTitle: profile.title,
  url: siteUrl("/"),
  sameAs: [linkHref("LinkedIn"), linkHref("GitHub")].filter(Boolean),
  worksFor: { "@type": "Organization", name: "Burnes Center for Social Change", ...(burnesHref && { url: new URL(burnesHref).origin }) },
};

/** One case study page: a CreativeWork whose contributor is the site's Person. */
export function caseStudyJsonLd(project: Project) {
  const keyArt = project.film?.thumb ?? project.cover?.thumb ?? project.media.find((m) => m.kind === "image")?.src;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    headline: project.tagline,
    description: project.tagline,
    url: siteUrl(`/work/${project.slug}/`),
    ...(keyArt && { image: /^https?:/.test(keyArt) ? keyArt : siteUrl(keyArt) }),
    keywords: project.stack.join(", "),
    contributor: { "@id": PERSON_ID },
    isPartOf: { "@type": "WebSite", url: siteUrl("/"), name: `${profile.name}, ${profile.title}` },
  };
}

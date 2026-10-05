import type { Metadata } from "next";
import { profile } from "@/content";
import { siteUrl } from "./site";

export const SITE_TITLE = `${profile.name}, ${profile.title}`;
/** The site-wide share card (public/og.png). A page's own openGraph/twitter replaces the layout's whole block, so it is restated here. */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: SITE_TITLE };

/**
 * Metadata for a plain route: title and description, canonical, and complete Open Graph and Twitter blocks (url,
 * image included), so a shared link never falls back to the home page's card.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const shareTitle = `${title} | ${profile.shortName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: shareTitle, description, type: "website", url: siteUrl(path), images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [OG_IMAGE.url] },
  };
}

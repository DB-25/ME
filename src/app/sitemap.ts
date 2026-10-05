import type { MetadataRoute } from "next";
import { projects } from "@/content";
import { siteUrl } from "./site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: siteUrl("/work/"), changeFrequency: "monthly", priority: 0.8 },
    { url: siteUrl("/receipts/"), changeFrequency: "monthly", priority: 0.6 },
    ...projects.filter((p) => !p.compact).map((p) => ({
      url: siteUrl(`/work/${p.slug}/`),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}

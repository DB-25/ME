import type { MetadataRoute } from "next";
import { projects } from "@/content";

export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://db25.dev";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = `${SITE_URL}${BASE_PATH}`;
  return [
    { url: `${root}/`, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({
      url: `${root}/work/${p.slug}/`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/content";
import { CaseStudy } from "@/components/work/case/CaseStudy";
import { assetUrl } from "@/components/work/asset";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.name}: ${project.tagline}`;
  const image = project.media.find((m) => m.kind === "image");
  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical: `/work/${project.slug}/` },
    openGraph: {
      title,
      description: project.tagline,
      type: "article",
      images: image ? [{ url: assetUrl(image.src), alt: image.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: project.tagline },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { profile, projects } from "@/content";
import { CaseStudy } from "@/components/work/case/CaseStudy";

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
  // Projects without a screenshot fall back to the site-wide card (public/og.png).
  const images = image
    ? [{ url: image.src, alt: image.alt }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: `${profile.name}, ${profile.title}` }];
  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical: `/work/${project.slug}/` },
    openGraph: {
      title,
      description: project.tagline,
      type: "article",
      url: `/work/${project.slug}/`,
      images,
    },
    twitter: { card: "summary_large_image", title, description: project.tagline, images: images.map((i) => i.url) },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}

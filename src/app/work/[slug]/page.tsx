import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { profile, projects } from "@/content";
import { CaseStudy } from "@/components/work/case/CaseStudy";
import { hasCase } from "@/components/work/meta";

const cases = projects.filter(hasCase);

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return cases.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const project = cases.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.name}: ${project.tagline}`;
  const image = project.media.find((m) => m.kind === "image");
  // Designed film key art (16:9) first, then a screenshot; otherwise the site-wide card (public/og.png).
  const images = project.film?.thumb
    ? [{ url: project.film.thumb, width: 1600, height: 900, alt: project.film.title }]
    : image
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
  const project = cases.find((p) => p.slug === slug);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}

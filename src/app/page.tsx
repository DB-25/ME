import dynamic from "next/dynamic";
import { Hero } from "@/components/hero/Hero";
import { Systems } from "@/components/sections/systems/Systems";
import { Impact } from "@/components/sections/impact/Impact";
import { Proof } from "@/components/sections/proof/Proof";
import { OffDuty } from "@/components/sections/human/OffDuty";

/**
 * Below-the-fold client sections load as separate chunks and hydrate in their own Suspense
 * boundaries, so hydration and effect setup (GSAP, ScrollTrigger) split into several tasks instead
 * of one. They still render on the server: the static HTML carries their full content.
 */
const WorkIndex = dynamic(() => import("@/components/work/WorkIndex").then((m) => m.WorkIndex));
const Origin = dynamic(() => import("@/components/sections/origin/Origin").then((m) => m.Origin));
const Director = dynamic(() => import("@/components/director/Director").then((m) => m.Director));
const Contact = dynamic(() => import("@/components/sections/contact/Contact").then((m) => m.Contact));

/**
 * Every section renders <section id={chapter} data-chapter={chapter}>.
 * The particle field reads those to decide its formation.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <WorkIndex />
      <Impact />
      <Proof />
      <Systems />
      <Director />
      <Origin />
      <OffDuty />
      <Contact />
    </>
  );
}

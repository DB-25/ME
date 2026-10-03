import { Hero } from "@/components/hero/Hero";
import { Origin } from "@/components/sections/origin/Origin";
import { Systems } from "@/components/sections/systems/Systems";
import { WorkIndex } from "@/components/work/WorkIndex";
import { Impact } from "@/components/sections/impact/Impact";
import { Proof } from "@/components/sections/proof/Proof";
import { Director } from "@/components/director/Director";
import { OffDuty } from "@/components/sections/human/OffDuty";
import { Contact } from "@/components/sections/contact/Contact";

/**
 * Every section renders <section id={chapter} data-chapter={chapter}>.
 * The particle field reads those to decide its formation.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Impact />
      <WorkIndex />
      <Origin />
      <Systems />
      <Proof />
      <Director />
      <OffDuty />
      <Contact />
    </>
  );
}

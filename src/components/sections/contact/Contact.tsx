"use client";

import "../fade.css";
import { profile } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Scrim } from "../Scrim";
import { EmailLink } from "./EmailLink";
import { mailtoHref } from "./mailto";
import { SiteFooter } from "./SiteFooter";
import { useCopy } from "./useCopy";
import { useEasterEgg } from "./useEasterEgg";
import { assetUrl } from "@/lib/asset";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Founders need four things: the address, the résumé, and the two profiles they will check. */
const LINKS = [
  { label: "Résumé", href: `${BASE_PATH}${profile.resumeHref}` },
  ...["LinkedIn", "GitHub"].flatMap((label) =>
    profile.links.filter((l) => l.label === label).map((l) => ({ label: l.label, href: assetUrl(l.href) })),
  ),
];

const WORKING_STYLE = "I work fast, in small teams, and I ship things people use.";
/** The ask, made concrete: the same three prompts the email draft opens with (see mailto.ts). */
const THE_ASK = "Tell me what you are building, what stage it is at, and what you need help with first.";

/** An optional line about timing (a start date, a notice period). Rendered only when the profile carries one. */
const AVAILABILITY = profile.availability;

export function Contact() {
  const { state, copy, count } = useCopy(profile.email);
  const egg = useEasterEgg();
  const copied = state === "copied";

  return (
    <section id="contact" data-chapter="contact" aria-labelledby="contact-title" className="sx-in relative flex min-h-[min(100svh,820px)] flex-col">
      <div className="sx-out shell flex flex-1 flex-col justify-between gap-[clamp(32px,4vh,48px)] pt-[clamp(64px,8vh,104px)]">
        <div className="relative">
          <Scrim shape="band" strength={0.82} inset="-12% -4% -12% -24px" className="md:hidden" />
          <Scrim shape="hold" strength={0.7} inset="-12% -4% -12% -24px" className="hidden md:block" />
          <SectionLabel chapter="contact" className="mb-6" />
          <h2 id="contact-title" className="max-w-[14ch] text-[clamp(2.6rem,6.4vw,6.75rem)] font-medium leading-[0.96] tracking-[-0.04em]">
            <Reveal as="span" className="block">
              Building something early? <em className="voice">Let&rsquo;s talk.</em>
            </Reveal>
          </h2>
          <Reveal as="p" mode="fade" delay={0.2} className="lede mt-6 max-w-[34ch] [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
            {WORKING_STYLE}
          </Reveal>
          <Reveal as="p" mode="fade" delay={0.28} className="mt-3 max-w-[64ch] text-[0.9375rem] leading-[1.5] text-muted [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
            {THE_ASK}
          </Reveal>
          {AVAILABILITY ? (
            <Reveal as="p" mode="fade" delay={0.34} className="label mt-3 !text-[12px] !text-accent-hot">
              {AVAILABILITY}
            </Reveal>
          ) : null}
        </div>

        <div className="relative">
          <Scrim shape="band" strength={0.82} inset="-14% -4% -10% -4%" />
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="label !text-[12px] !text-ink/75">Write to me</p>
            <p className="label !text-[12px] !text-accent-hot" role="status" aria-live="polite">
              {copied ? "COPIED" : state === "failed" ? "COPY FAILED. SELECT IT BY HAND." : ""}
            </p>
          </div>

          <EmailLink email={profile.email} href={mailtoHref(profile.email)} onActivate={copy} sweep={count} />

          <Reveal mode="fade" delay={0.35} className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={copy}
              data-copy-email
              aria-label={`Copy ${profile.email} to clipboard`}
              className="label inline-flex min-h-11 w-fit min-w-[9.5rem] items-center justify-center border border-hairline-strong px-5 py-3 !text-[12px] !text-ink transition-colors duration-300 hover:border-accent hover:!text-accent-hot"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <ul className="flex flex-wrap gap-x-7 gap-y-1 md:gap-y-3">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label link inline-flex !text-[12px] !text-ink hover:!text-accent-hot pointer-coarse:min-h-11 pointer-coarse:items-center"
                  >
                    {l.label}
                    <span aria-hidden className="ml-1 text-muted">
                      &#8599;
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="relative">
          <Scrim shape="band" strength={0.8} inset="-10% -4% 0 -4%" />
          <SiteFooter />
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-hairline-strong bg-void px-5 py-3 font-mono text-[12px] tracking-[0.04em] text-accent-hot transition-all duration-500 ease-[var(--ease-out-expo)] ${
          egg ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {egg ? "db25. You found the door." : ""}
      </p>
    </section>
  );
}

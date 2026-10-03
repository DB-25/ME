"use client";

import { profile } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { EmailLink } from "./EmailLink";
import { SiteFooter } from "./SiteFooter";
import { useCopy } from "./useCopy";
import { useEasterEgg } from "./useEasterEgg";
import { assetUrl } from "@/lib/asset";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const LINKS = [
  ...profile.links.map((l) => ({ label: l.label, href: assetUrl(l.href) })),
  { label: "Résumé", href: `${BASE_PATH}${profile.resumeHref}` },
];

const CSS = `
.email-ch {
  --k: 0;
  color: color-mix(in oklab, var(--color-ink), var(--color-accent-hot) calc(var(--k) * 100%));
  transform: translateY(calc(var(--k) * -0.16em));
  transition: transform 0.45s var(--ease-out-expo), color 0.45s var(--ease-out-expo);
}
.email-link { font-size: clamp(2.4rem, 13.4vw, 4.5rem); }
@media (min-width: 768px) { .email-link { font-size: min(7.6vw, 7.9rem); } }
.email-link:focus-visible { outline-offset: 10px; }
`;

export function Contact() {
  const { state, copy } = useCopy(profile.email);
  const egg = useEasterEgg();
  const copied = state === "copied";

  return (
    <section id="contact" data-chapter="contact" aria-labelledby="contact-title" className="relative flex min-h-svh flex-col">
      <style>{CSS}</style>
      <div className="shell flex flex-1 flex-col justify-between gap-16 pt-[16vh] md:pt-[14vh]">
        <div>
          <SectionLabel chapter="contact" className="mb-6" />
          <h2 id="contact-title" className="max-w-[16ch] text-[clamp(2.6rem,6.4vw,6.75rem)] font-medium leading-[0.96] tracking-[-0.04em]">
            <Reveal as="span" className="block">
              Let&rsquo;s build something <Emph>people use</Emph>.
            </Reveal>
          </h2>
        </div>

        <div>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="label">Write to me</p>
            <p className="label !text-accent-hot" role="status" aria-live="polite">
              {copied ? "COPIED" : state === "failed" ? "COPY FAILED. SELECT IT BY HAND." : ""}
            </p>
          </div>

          <EmailLink email={profile.email} onActivate={copy} />

          <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={copy}
              aria-label={`Copy ${profile.email} to clipboard`}
              className="label inline-flex w-fit items-center border border-hairline-strong px-5 py-3 !text-ink transition-colors duration-300 hover:border-accent hover:!text-accent-hot"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <ul className="flex flex-wrap gap-x-7 gap-y-3">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label link !text-ink hover:!text-accent-hot"
                  >
                    {l.label}
                    <span aria-hidden className="ml-1 text-muted">
                      &#8599;
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SiteFooter />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-hairline-strong bg-void/85 px-5 py-3 font-mono text-[12px] tracking-[0.04em] text-accent-hot backdrop-blur transition-all duration-500 ease-[var(--ease-out-expo)] ${
          egg ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {egg ? "db25. You found the door." : ""}
      </p>
    </section>
  );
}

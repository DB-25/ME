import { metrics, profile } from "@/content";
import type { Metric } from "@/content";
import { assetUrl } from "@/lib/asset";

/** First app shipped to real users in 2021 (see timeline). A year, not a "years of experience" claim. */
const SHIPPING_SINCE = 2021;

/** "A-IEP" must not break after the hyphen on a narrow column. */
const noBreakHyphen = (text: string) => text.replace(/-/g, "\u2011");

const city = (place: string) => place.split(",")[0].trim();

/** The three provable facts: two lead metrics (ordered for the startup audience) plus the hackathon placing. */
const PROOF: Metric[] = [metrics[0], metrics[1], metrics.find((m) => m.projectSlug === "vct-scout")].filter(
  (m): m is Metric => Boolean(m),
);

export function HeroEyebrow() {
  return <p className="label !text-accent-hot">Shipping production software since {SHIPPING_SINCE}</p>;
}

export function HeroLocation() {
  return (
    <p className="label mt-1">
      {city(profile.location)}, from {city(profile.origin)}
    </p>
  );
}

/** Three crisp facts: value and a short label, tabular numerals. */
export function HeroProof() {
  return (
    <ul className="grid grid-cols-3 gap-x-4 border-t border-hairline-strong pt-3">
      {PROOF.map((m) => (
        <li key={m.label}>
          <span className="num block text-[1.75rem] font-medium leading-none text-ink lg:text-[2rem]">{m.value}</span>
          <span className="mt-2 block text-[12.5px] leading-[1.35] text-muted">{noBreakHyphen(m.label)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Understated text links, not pills. Arrow glyphs mark them as exits. */
export function HeroLinks() {
  const link = (label: string) => profile.links.find((l) => l.label === label)?.href;
  const items: { label: string; href: string; external: boolean; hint?: string; primary?: boolean }[] = [
    { label: "Résumé (PDF)", href: assetUrl(profile.resumeHref), external: true, primary: true },
    { label: "Email", href: `mailto:${profile.email}`, external: false, hint: profile.email },
    { label: "LinkedIn", href: link("LinkedIn") ?? "", external: true },
    { label: "GitHub", href: link("GitHub") ?? "", external: true },
  ];
  return (
    <ul className="-ml-0.5 flex flex-wrap gap-x-3.5 gap-y-0">
      {items
        .filter((i) => i.href)
        .map((i) => (
          <li key={i.label}>
            <a
              href={i.href}
              {...(i.external ? { target: "_blank", rel: "noopener" } : {})}
              data-primary={i.primary || undefined}
              className="hero-cta"
            >
              <span className="hero-cta-text">{i.label}</span>
              {i.hint && <span className="sr-only">, {i.hint}</span>}
              <span aria-hidden className="hero-cta-arrow">
                ↗
              </span>
            </a>
          </li>
        ))}
    </ul>
  );
}

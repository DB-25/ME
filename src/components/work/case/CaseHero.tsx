import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { assetUrl } from "../asset";
import { CATEGORY_LABEL, liveLink, pad, previewImage, tie, titleLen } from "../meta";
import { OwnershipBadge } from "../OwnershipBadge";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";

const NBSP = "\u00a0";
/**
 * Long names get one chosen break point: words are glued inside two near-equal halves, so "Civic AI Course Delivery"
 * reads "Civic AI / Course Delivery" in every browser (Safari's balance and the line split otherwise disagree).
 * When the whole name fits, it still sits on one line.
 */
function breakTitle(name: string): string {
  const words = name.split(" ");
  if (words.length < 3) return name;
  const halves = (i: number) => [words.slice(0, i).join(" ").length, words.slice(i).join(" ").length];
  let best = 1;
  for (let i = 2; i < words.length; i++) {
    const [a, b] = halves(i);
    const [bestA, bestB] = halves(best);
    // Most even split wins; a tie keeps the longer half last.
    if (Math.max(a, b) < Math.max(bestA, bestB) || (Math.max(a, b) === Math.max(bestA, bestB) && a < bestA)) best = i;
  }
  return `${words.slice(0, best).join(NBSP)} ${words.slice(best).join(NBSP)}`;
}

/**
 * Display letters carry a left side bearing that grows with the size, so a giant name reads indented against the
 * hairlines and labels at the column edge. Pull the first glyph back by its bearing class (measured on this face):
 * capital stems (P, B, E) sit furthest in, then rounds (G, C) and lowercase, then diagonals (A, V, T).
 */
const DIAGONALS = "AVWTYXZvwyxz7";
const ROUND_CAPS = "CGOQS0689";
function leadShift(name: string): string {
  const c = name[0] ?? "";
  if (DIAGONALS.includes(c)) return "-0.024em";
  if (ROUND_CAPS.includes(c)) return "-0.043em";
  if (c >= "a" && c <= "z") return "-0.045em";
  return "-0.09em";
}

/**
 * A short hyphenated identifier ("arc-control-mcp") is one token: wrapped, it strands "mcp" under a dangling hyphen.
 * It stays on one line and is sized to the column instead (see .cs-title[data-solo]).
 */
const SOLO_MIN_CHARS = 13;
const SOLO_MAX_CHARS = 16;
const isSolo = (name: string) => !name.includes(" ") && name.includes("-") && name.length >= SOLO_MIN_CHARS && name.length <= SOLO_MAX_CHARS;

/**
 * Title sequence: giant name, tagline, the way in (try it live), the project's picture (the film's key art, the same
 * still the Work stage shows, so a row click carries it into the hero), what I owned, hairline in the project accent,
 * mono meta row.
 */
export function CaseHero({ project, index, total }: { project: Project; index: number; total: number }) {
  const meta = [
    { k: "Year", v: project.year },
    { k: "Role", v: project.role },
    ...(project.org ? [{ k: "With", v: project.org }] : []),
    { k: "Category", v: CATEGORY_LABEL[project.category] },
  ];
  const lead = project.outcomes[0];
  const media = previewImage(project);
  const live = liveLink(project);
  // The stage shows the title-free 4:3 art cropped to 16:9; the hero uses the same file so the picture is the same one.
  const mediaSrc = media ? assetUrl(media.src43 ?? media.src) : null;
  const mediaImg = mediaSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaSrc} alt="" width={media?.src43 ? 1200 : 1600} height={media?.src43 ? 900 : 600} fetchPriority="high" decoding="async" />
  ) : null;
  return (
    <header className="cs-hero shell" id="top">
      <div className="cs-hero-top">
        <CaseLabel n="03" text={`Work, ${project.featured ? "selected" : "the lab"}`} />
        <p className="label num cs-index" aria-label={`Project ${index + 1} of ${total}`}>
          <span className="cs-index-n">{pad(index + 1)}</span>
          <span className="text-dim"> / {pad(total)}</span>
        </p>
      </div>

      <div className="cs-hero-body" data-media={mediaImg ? "" : undefined}>
        <div className="cs-hero-main">
          <h1
            className="cs-title"
            data-solo={isSolo(project.name) ? "" : undefined}
            style={{ ["--len" as string]: titleLen(project.name), ["--chars" as string]: project.name.length, ["--lead" as string]: leadShift(project.name) }}
          >
            <Reveal as="span" immediate keepSpaces delay={0.1} className="block">
              {breakTitle(project.name)}
            </Reveal>
          </h1>
          <Reveal as="p" mode="fade" immediate delay={0.4} className="lede cs-tagline">
            {tie(project.tagline)}
          </Reveal>
          {live && (
            <Reveal mode="fade" immediate delay={0.5} className="cs-hero-actions">
              <a
                href={assetUrl(live.href)}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="open"
                className="cs-live label"
                aria-label={`Try ${project.name} live, at ${live.label} (opens in a new tab)`}
              >
                Try it live
                <span aria-hidden className="cs-live-arrow">
                  &#8599;
                </span>
              </a>
              <span className="label cs-live-url" aria-hidden>
                {live.label}
              </span>
            </Reveal>
          )}
        </div>
        <div className="cs-hero-side">
          {mediaImg &&
            (project.film ? (
              <a href="#sec-film" className="cs-hero-media" aria-label={`Watch the ${project.name} launch film, below`}>
                {mediaImg}
                <span className="cs-hero-media-cue label" aria-hidden>
                  <i /> Launch film
                  <span className="cs-hero-media-dn">&darr;</span>
                </span>
              </a>
            ) : (
              <figure className="cs-hero-media" aria-hidden>
                {mediaImg}
              </figure>
            ))}
          {(project.owned || lead) && (
            <Reveal mode="fade" immediate delay={0.55} className="cs-owned">
              {project.owned && (
                <section aria-labelledby="cs-owned-k">
                  <p id="cs-owned-k" className="label cs-owned-k">
                    <span>What I owned</span>
                    <OwnershipBadge ownership={project.ownership} />
                  </p>
                  <p className="cs-owned-v">{tie(project.owned)}</p>
                </section>
              )}
              {lead && (
                <p className="cs-lead">
                  <span className="cs-lead-v num" data-one={lead.value.startsWith("1") ? "" : undefined}>
                    {lead.value}
                  </span>
                  <span className="cs-lead-l label">{tie(lead.label)}</span>
                </p>
              )}
            </Reveal>
          )}
        </div>
      </div>

      <DrawRule accent immediate delay={0.7} />
      <dl className="cs-meta">
        {meta.map((m) => (
          <div key={m.k}>
            <dt className="label">{m.k}</dt>
            <dd>{tie(m.v)}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

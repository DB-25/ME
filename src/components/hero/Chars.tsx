import { Fragment } from "react";

/**
 * One-glyph-per-span text for the name, each glyph in its own mask so it can
 * rise from below the baseline. Words stay unbreakable; spaces stay real.
 * Purely visual: the accessible name lives in the h1.
 */
export function Chars({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          {wi > 0 ? " " : null}
          <span className="inline-block whitespace-nowrap">
          {Array.from(word).map((ch, ci) => (
            <span key={ci} data-mask className="inline-block overflow-hidden align-bottom" style={{ padding: "0.06em 0.012em 0.04em", margin: "-0.06em -0.012em -0.04em" }}>
              <span data-ch className="inline-block will-change-transform">
                {ch}
              </span>
            </span>
          ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

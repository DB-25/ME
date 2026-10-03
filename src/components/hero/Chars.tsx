import { Fragment } from "react";

/**
 * One-glyph-per-span text for the name, so the hover wave can lift each glyph.
 * Words stay unbreakable; spaces stay real. Purely visual: the accessible name
 * lives in the h1. Everything renders in the first paint (no hidden pre-intro state).
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
              <span key={ci} data-ch className="inline-block will-change-transform">
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

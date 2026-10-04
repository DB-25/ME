import { Fragment } from "react";

/** Name as rolling characters: sans on top, the last word swaps whole into the accent colour on activate. */
export function RollName({ name }: { name: string }) {
  const words = name.split(" ");
  const offsets = words.map((_, wi) => words.slice(0, wi).reduce((n, w) => n + [...w].length, 0));
  return (
    <h3 className="wk-name" style={{ ["--n" as string]: Math.max(name.length, 8) }}>
      <span className="sr-only">{name}</span>
      <span className="wk-nmask" aria-hidden>
        <span className="wk-nline">
          {words.map((w, wi) => {
            const last = wi === words.length - 1;
            // Earlier words roll letter by letter; the last word swaps whole.
            const parts = last ? [w] : [...w];
            return (
              <Fragment key={wi}>
                <span className={last ? "wk-word wk-last" : "wk-word"}>
                  {parts.map((c, ci) => (
                    <span key={ci} className="wk-ch" style={{ ["--i" as string]: last ? 0 : offsets[wi] + ci }}>
                      <span className="wk-a">{c}</span>
                      <span className="wk-b">{c}</span>
                    </span>
                  ))}
                </span>
                {last ? null : " "}
              </Fragment>
            );
          })}
        </span>
      </span>
    </h3>
  );
}

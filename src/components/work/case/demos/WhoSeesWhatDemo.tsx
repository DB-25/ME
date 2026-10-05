"use client";

import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Ent } from "./Ent";
import { DOC_CAPTION, PROFILE_NAME, SAMPLE, STAGES, STUDENT_TOKEN, SUMMARY, TALLY, type Seg, type SumPart } from "./data";

/** Delay before the parent's screen swaps `{{S}}` for the profile name, so the swap reads as its own beat. */
const SWAP_MS = 1100;
const STAGGER_MS = 45;
const LAST = STAGES.length - 1;
/** `{{S}}`, `[NAME]` and friends in prose render as token chips. */
const TOKEN_RE = /(\{\{S\}\}|\[[A-Z_]+\])/;

/** Prose with its placeholders set as chips, the way the pipeline writes them. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN_RE).map((part, i) =>
        TOKEN_RE.test(part) ? (
          <span key={i} className="wss-tok" data-student={part === STUDENT_TOKEN || undefined}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** A block that opens and closes by animating its grid row (CSS only), and is inert while closed. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="wss-col" data-open={open} inert={!open}>
      <div className="wss-col-in">{children}</div>
    </div>
  );
}

function Summary({ children }: { children: (part: SumPart, key: string) => ReactNode }) {
  return (
    <ul className="wss-sum">
      {SUMMARY.map((line, i) => (
        <li key={i}>
          <span className="label wss-lang">{line.lang}</span>
          <p lang={line.lang.toLowerCase()}>
            {line.parts.map((part, j) => children(part, `${i}-${j}`))}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The "who sees what" stepper: a fictional IEP excerpt followed through the real pipeline, stage by stage. */
export function WhoSeesWhatDemo() {
  const uid = useId();
  const [stage, setStage] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [swapped, setSwapped] = useState(-1);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (next: number, focus = false) => {
    setStage(next);
    setSwapped(-1);
    setAnnounce(`Stage ${next + 1} of ${STAGES.length}, ${STAGES[next].tab}. ${STAGES[next].announce}`);
    if (focus) tabs.current[next]?.focus();
  };

  // On the last stage the parent's screen first shows the placeholder, then swaps in the profile name.
  useEffect(() => {
    if (stage !== LAST) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setSwapped(LAST), reduced ? 0 : SWAP_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  const onKeyDown = (e: KeyboardEvent) => {
    const to: Record<string, number> = {
      ArrowRight: (stage + 1) % STAGES.length,
      ArrowDown: (stage + 1) % STAGES.length,
      ArrowLeft: (stage + LAST) % STAGES.length,
      ArrowUp: (stage + LAST) % STAGES.length,
      Home: 0,
      End: LAST,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    go(to[e.key], true);
  };

  const redacted = stage >= 1;
  let n = 0;
  const seg = (s: Seg, key: string): ReactNode => {
    if (typeof s === "string") return <Fragment key={key}>{s}</Fragment>;
    if (s.k === "id") return <Ent key={key} text={s.text} token={s.token} student={s.student} on={redacted ? "token" : "text"} delay={n++ * STAGGER_MS} />;
    if (s.k === "keep") return <span key={key} className="wss-keep" data-why={s.why}>{s.text}</span>;
    return <span key={key} className="wss-miss">{s.text}</span>;
  };

  const tally = TALLY[stage];
  const current = STAGES[stage];
  const next = STAGES[stage + 1];
  const panelId = `${uid}-panel`;

  return (
    <div className="wss" data-stage={stage + 1}>
      <div role="tablist" aria-label="Pipeline stages" className="wss-tabs" onKeyDown={onKeyDown}>
        {STAGES.map((s, i) => (
          <button
            key={s.tab}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`${uid}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === stage}
            aria-controls={panelId}
            tabIndex={i === stage ? 0 : -1}
            className="wss-tab"
            onClick={() => go(i)}
          >
            <span className="label wss-tab-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="wss-tab-name">{s.tab}</span>
            <span className="label wss-tab-who">{s.who}</span>
          </button>
        ))}
      </div>

      <div className="wss-bar">
        <p className="label" aria-hidden>
          Stage {stage + 1} of {STAGES.length}
        </p>
        <button type="button" className="label wss-next" onClick={() => go(next ? stage + 1 : 0)}>
          {next ? `Next: ${next.tab}` : "Start over"}
          <span aria-hidden> &#8594;</span>
        </button>
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`${uid}-tab-${stage}`} className="wss-panel">
        <div className="wss-who" key={`who-${stage}`}>
          <p className="label wss-rise" style={{ "--i": 0 } as React.CSSProperties}>
            Who sees it
          </p>
          <h3 className="wss-vendor wss-rise" style={{ "--i": 1 } as React.CSSProperties}>
            {current.vendor}
          </h3>
          <p className="label wss-where wss-rise" style={{ "--i": 2 } as React.CSSProperties}>
            {current.where}
          </p>
          <p className="wss-sees wss-rise" style={{ "--i": 3 } as React.CSSProperties}>
            {current.sees}
          </p>
        </div>

        <div className="wss-canvas">
          <Collapse open={stage < LAST}>
            <figure className="wss-doc">
              <figcaption className="label wss-doc-h">
                <span>{DOC_CAPTION[stage]}</span>
                <span className="wss-tally">{tally}</span>
              </figcaption>
              <ol className="wss-lines" role="list">
                {SAMPLE.map((line, li) => (
                  <li key={li}>
                    <span>{line.map((s, si) => seg(s, `${li}-${si}`))}</span>
                  </li>
                ))}
              </ol>
              <ul className="label wss-legend" role="list">
                {redacted ? (
                  <>
                    <li><i className="wss-sw" data-k="token" aria-hidden />Token</li>
                    <li><i className="wss-sw" data-k="keep" aria-hidden />Kept by design</li>
                    <li><i className="wss-sw" data-k="miss" aria-hidden />Not flagged here</li>
                  </>
                ) : (
                  <li><i className="wss-sw" data-k="id" aria-hidden />Identifier</li>
                )}
              </ul>
            </figure>
          </Collapse>

          <Collapse open={stage === LAST}>
            <div className="wss-gone">
              <p className="label">Original upload</p>
              <p className="wss-gone-v">Deleted</p>
            </div>
          </Collapse>

          <Collapse open={stage >= 2}>
            <section className="wss-out" aria-label={stage === LAST ? "Stored summary" : "Summary OpenAI writes back"}>
              <p className="label wss-out-h">
                <span>{stage === LAST ? "Stored" : "OpenAI writes back"}</span>
                <span>Illustrative wording</span>
              </p>
              <Summary>
                {(part, key) =>
                  typeof part === "string" ? (
                    <Fragment key={key}>{part}</Fragment>
                  ) : "tok" in part ? (
                    <span key={key} className="wss-tok" data-student>{STUDENT_TOKEN}</span>
                  ) : (
                    <span key={key} className="wss-keep" data-why="dx">{part.keep}</span>
                  )
                }
              </Summary>
            </section>
          </Collapse>

          <Collapse open={stage === LAST}>
            <section className="wss-out wss-parent" aria-label="What the parent sees">
              <p className="label wss-out-h">
                <span>When a parent opens it</span>
                <span>Name from their profile</span>
              </p>
              <Summary>
                {(part, key) =>
                  typeof part === "string" ? (
                    <Fragment key={key}>{part}</Fragment>
                  ) : "tok" in part ? (
                    <Ent key={key} plain student text={PROFILE_NAME} token={STUDENT_TOKEN} on={swapped === LAST ? "text" : "token"} />
                  ) : (
                    <span key={key} className="wss-keep" data-why="dx">{part.keep}</span>
                  )
                }
              </Summary>
            </section>
          </Collapse>
        </div>

        <dl className="wss-facts" key={`facts-${stage}`}>
          {current.rows.map((row, i) => (
            <div key={row.k} className="wss-fact wss-rise" style={{ "--i": 4 + i } as React.CSSProperties}>
              <dt className="label">{row.k}</dt>
              <dd>
                <Rich text={row.v} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p role="status" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

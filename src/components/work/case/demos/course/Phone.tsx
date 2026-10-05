"use client";

import { Fragment, useEffect, useRef } from "react";
import { SAMPLE_LINK } from "./messages";
import { RULE_COPY } from "./rules";
import type { ThreadItem } from "./simulate";
import { clockOf, dayOf } from "./time";

/** A new time stamp goes in when this many minutes have passed since the last one. */
const STAMP_GAP_MIN = 45;

/** Message text with the sample link set as a link (it is not clickable: nothing here goes anywhere). */
function Text({ text }: { text: string }) {
  const [before, after] = text.split(SAMPLE_LINK);
  if (after === undefined) return <>{text}</>;
  return (
    <>
      {before}
      <span className="cts-link">{SAMPLE_LINK}</span>
      {after}
    </>
  );
}

/** Each item with whether a time stamp goes above it: the first one, then whenever enough time has passed since the last. */
function withStamps(items: ThreadItem[]): { item: ThreadItem; stamp: boolean }[] {
  let last = Number.NEGATIVE_INFINITY;
  return items.map((item) => {
    if (item.kind === "note") return { item, stamp: false };
    const stamp = item.at - last >= STAMP_GAP_MIN;
    last = item.at;
    return { item, stamp };
  });
}

function Item({ item, now }: { item: ThreadItem; now: number }) {
  if (item.kind === "note") {
    return (
      <li className="cts-note cts-rise">
        <span className="label">{item.text}</span>
      </li>
    );
  }
  if (item.kind === "out") {
    return (
      <li className="cts-msg cts-rise" data-from="her">
        <p className="cts-bubble">{item.text}</p>
      </li>
    );
  }
  if (item.kind === "ghost") {
    const again = item.repeats.filter((at) => at <= now).length;
    return (
      <li className="cts-msg cts-rise" data-from="us" data-held>
        <div className="cts-bubble">
          <p className="label cts-held-h">
            <span className="sr-only">A text that was not sent: </span>
            Not sent: {RULE_COPY[item.reason].short}
          </p>
          <p className="cts-held-t">
            <Text text={item.text} />
          </p>
          {again > 0 ? <p className="label cts-held-n">Held back again on {again === 1 ? "1 more day" : `${again} more days`}</p> : null}
        </div>
      </li>
    );
  }
  return (
    <li className="cts-msg cts-rise" data-from="us" data-tag={item.tag}>
      <p className="cts-bubble">
        <Text text={item.text} />
      </p>
    </li>
  );
}

/** Marisol's phone: the thread so far. Only the new entries animate in, because entries are keyed by identity. */
export function Phone({ items, now, offset }: { items: ThreadItem[]; now: number; offset: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const last = items[items.length - 1]?.id;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last, items.length]);

  return (
    <div className="cts-phone">
      <div className="cts-screen">
        <div className="cts-status" aria-hidden>
          <span className="label cts-status-t">{clockOf(now, offset)}</span>
          <span className="cts-island" />
          <span className="label cts-status-d">Day {dayOf(now, offset)}</span>
        </div>
        <div className="cts-contact">
          <span className="cts-avatar" aria-hidden>IU</span>
          <span className="cts-contact-n">InnovateUS</span>
        </div>
        <div ref={scroller} className="cts-thread" tabIndex={0} role="region" aria-label="Text messages on Marisol's phone">
          {items.length === 0 ? <p className="label cts-empty">No texts yet. Marisol has not signed up.</p> : null}
          <ol>
            {withStamps(items).map(({ item, stamp }) => (
              <Fragment key={item.id}>
                {stamp ? (
                  <li className="cts-stamp cts-rise" aria-hidden>
                    <span className="label">Day {dayOf(item.at, offset)}, {clockOf(item.at, offset)}</span>
                  </li>
                ) : null}
                <Item item={item} now={now} />
              </Fragment>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

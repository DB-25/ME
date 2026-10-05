"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { RULES } from "./rules";
import { HOUR_MAX, HOUR_MIN, SIGNUP, type Sim } from "./simulate";
import { MIN_PER_DAY, MIN_PER_HOUR, stampOf } from "./time";

const SPAN = HOUR_MAX - HOUR_MIN;
const SUNSET_HOUR = (SIGNUP + RULES.sunsetMin) / MIN_PER_HOUR;
const PAGE_HOURS = 24;

/** Position along the track, 0 to 1. */
const frac = (hour: number) => (hour - HOUR_MIN) / SPAN;
const at = (hour: number): CSSProperties => ({ "--f": frac(hour) }) as CSSProperties;

/** Her quiet hours (8 pm to 9 am on her clock) as spans of the track, one per night. */
function quietBands(offset: number): { from: number; to: number }[] {
  const bands: { from: number; to: number }[] = [];
  for (let day = -1; day <= 10; day += 1) {
    const start = (day * MIN_PER_DAY + RULES.windowEnd * MIN_PER_HOUR - offset) / MIN_PER_HOUR;
    const end = start + (24 - RULES.windowEnd + RULES.windowStart);
    const from = Math.max(start, HOUR_MIN);
    const to = Math.min(end, HOUR_MAX);
    if (to > from) bands.push({ from, to });
  }
  return bands;
}

interface Props {
  sim: Sim;
  hour: number;
  offset: number;
  playing: boolean;
  canBack: boolean;
  canForward: boolean;
  onHour: (hour: number) => void;
  onJump: (dir: -1 | 1) => void;
  onPlay: () => void;
}

/** The scrubber: two clocks, a track that shows every text and every quiet night at a glance, and ways to step through it. */
export function TimeSlider({ sim, hour, offset, playing, canBack, canForward, onHour, onJump, onPlay }: Props) {
  const now = hour * MIN_PER_HOUR;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "PageUp" && e.key !== "PageDown") return;
    e.preventDefault();
    const step = e.key === "PageUp" ? PAGE_HOURS : -PAGE_HOURS;
    onHour(Math.min(HOUR_MAX, Math.max(HOUR_MIN, hour + step)));
  };
  const sentHours = sim.passes.filter((p) => p.sent).map((p) => p.hour);
  const heldHours = sim.items.flatMap((i) => (i.kind === "ghost" ? [Math.ceil(i.at / MIN_PER_HOUR), ...i.repeats.map((r) => Math.ceil(r / MIN_PER_HOUR))] : []));
  const days = Array.from({ length: 9 }, (_, i) => i + 2);

  return (
    <div className="cts-time">
      <div className="cts-clocks">
        <p className="cts-clock">
          <span className="label">Boston clock</span>
          <span className="cts-clock-v">{stampOf(now)}</span>
        </p>
        <p className="cts-clock">
          <span className="label">Marisol&rsquo;s clock</span>
          <span className="cts-clock-v">{stampOf(now, offset)}</span>
        </p>
      </div>

      <div className="cts-track-wrap">
        <div className="cts-track" aria-hidden>
          {quietBands(offset).map((b) => (
            <i key={b.from} className="cts-band" style={{ "--f": frac(b.from), "--w": (b.to - b.from) / SPAN } as CSSProperties} />
          ))}
          {days.map((d) => (
            <i key={d} className="cts-dayline" style={at((d - 1) * 24)} />
          ))}
          <i className="cts-sunset" style={at(SUNSET_HOUR)} />
          {sentHours.map((h) => (
            <i key={`s${h}`} className="cts-mark" data-k="sent" style={at(h)} />
          ))}
          {heldHours.map((h) => (
            <i key={`h${h}`} className="cts-mark" data-k="held" style={at(h)} />
          ))}
        </div>
        <input
          className="cts-range"
          type="range"
          min={HOUR_MIN}
          max={HOUR_MAX}
          step={1}
          value={hour}
          aria-label="Time, in hours across the first nine days"
          aria-valuetext={`${stampOf(now)} Boston time, ${stampOf(now, offset)} for Marisol`}
          onChange={(e) => onHour(Number(e.target.value))}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="cts-days label" aria-hidden>
        {days.map((d) => (
          <span key={d} style={at((d - 1) * 24)}>{d}</span>
        ))}
      </div>

      <div className="cts-steps">
        <button type="button" className="label cts-step" disabled={!canBack} onClick={() => onJump(-1)}>
          <span aria-hidden>&#8592; </span>Earlier text
        </button>
        <button type="button" className="label cts-step cts-play" onClick={onPlay} aria-pressed={playing}>
          {playing ? "Pause" : "Play the days"}
        </button>
        <button type="button" className="label cts-step" disabled={!canForward} onClick={() => onJump(1)}>
          Later text<span aria-hidden> &#8594;</span>
        </button>
      </div>

      <ul className="label cts-legend" role="list">
        <li><i className="cts-key" data-k="sent" aria-hidden />Text sent</li>
        <li><i className="cts-key" data-k="held" aria-hidden />Held back</li>
        <li><i className="cts-key" data-k="quiet" aria-hidden />Her quiet hours</li>
        <li><i className="cts-key" data-k="sunset" aria-hidden />8 days end</li>
      </ul>
    </div>
  );
}

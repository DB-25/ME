"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CourseState } from "./CourseState";
import { decide } from "./explain";
import { LEARNER } from "./messages";
import { Phone } from "./Phone";
import { RuleLog } from "./RuleLog";
import { simulate, snapshotAt, HOUR_MAX, HOUR_MIN, VERIFY, ZONE_OFFSET, type Persona, type Zone } from "./simulate";
import { TimeSlider } from "./TimeSlider";
import { MIN_PER_HOUR, stampOf } from "./time";

/** Day 3, 9:00 am: after one text was held for quiet hours and one went out, so the first view shows both. */
const START_HOUR = 57;
const PLAY_MS = 70;
const PLAY_MS_REDUCED = 220;
const ANNOUNCE_DELAY_MS = 500;

const PERSONAS: { id: Persona; name: string; does: string }[] = [
  { id: "quiet", name: "Goes quiet", does: "Watches lesson 1, then nothing." },
  { id: "evenings", name: "Studies daily", does: "One lesson every evening." },
  { id: "taps", name: "Returns when texted", does: "Taps every reminder." },
  { id: "keywords", name: "Texts keywords", does: "HELP, then STOP, later START." },
];

/** The learner-behaviour picker, one row of four. Arrow keys move the choice, like a tab list. */
function Picker({ value, onChange }: { value: Persona; onChange: (p: Persona) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    const i = PERSONAS.findIndex((p) => p.id === value);
    const to: Record<string, number> = {
      ArrowRight: (i + 1) % PERSONAS.length,
      ArrowDown: (i + 1) % PERSONAS.length,
      ArrowLeft: (i + PERSONAS.length - 1) % PERSONAS.length,
      ArrowUp: (i + PERSONAS.length - 1) % PERSONAS.length,
      Home: 0,
      End: PERSONAS.length - 1,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    onChange(PERSONAS[to[e.key]].id);
    refs.current[to[e.key]]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={`What ${LEARNER} does`} className="cts-pick" onKeyDown={onKeyDown}>
      {PERSONAS.map((p, i) => (
        <button
          key={p.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={p.id === value}
          tabIndex={p.id === value ? 0 : -1}
          className="cts-pick-b"
          onClick={() => onChange(p.id)}
        >
          <span className="label cts-pick-n">{String(i + 1).padStart(2, "0")}</span>
          <span className="cts-pick-name">{p.name}</span>
          <span className="label cts-pick-does">{p.does}</span>
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="cts-switch" onClick={() => onChange(!on)}>
      <span className="cts-switch-box" aria-hidden />
      <span className="cts-switch-t">
        <span className="cts-switch-l">{label}</span>
        <span className="label cts-switch-h">{hint}</span>
      </span>
    </button>
  );
}

/** The time-travel sandbox: scrub eight days of a made-up learner's course and watch the real reminder rules decide, hour by hour. */
export function CourseSandbox() {
  const uid = useId();
  const [persona, setPersona] = useState<Persona>("quiet");
  const [skips, setSkips] = useState(false);
  const [zone, setZone] = useState<Zone>("boston");
  const [hour, setHour] = useState(START_HOUR);
  const [playing, setPlaying] = useState(false);
  const [announce, setAnnounce] = useState("");

  const offset = ZONE_OFFSET[zone];
  const sim = useMemo(() => simulate({ persona, skips, zone }), [persona, skips, zone]);
  const now = hour * MIN_PER_HOUR;
  const pass = sim.passes[hour - HOUR_MIN];
  const decision = decide(pass, offset);
  const visible = sim.items.filter((i) => i.at <= now);
  const snap = snapshotAt(sim, now);
  const sentCount = visible.filter((i) => i.kind === "in" && i.tag === "reminder").length;
  const heldCount = visible.reduce((n, i) => (i.kind === "ghost" ? n + 1 + i.repeats.filter((r) => r <= now).length : n), 0);

  // Hours at which the thread changes: where "earlier text" and "later text" land.
  const stops = useMemo(() => {
    const hours = sim.items.filter((i) => i.kind !== "note").map((i) => Math.ceil(i.at / MIN_PER_HOUR));
    return [...new Set(hours)].sort((a, b) => a - b);
  }, [sim]);
  const prev = [...stops].reverse().find((h) => h < hour);
  const next = stops.find((h) => h > hour);
  const jump = useCallback(
    (dir: -1 | 1) => {
      const to = dir < 0 ? prev : next;
      if (to !== undefined) setHour(to);
    },
    [prev, next],
  );

  // Play: one hour per tick, stopping at the end. Slower under reduced motion.
  const isPlaying = playing && hour < HOUR_MAX;
  useEffect(() => {
    if (!isPlaying) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setHour((h) => Math.min(HOUR_MAX, h + 1)), reduced ? PLAY_MS_REDUCED : PLAY_MS);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const onPlay = () => {
    if (isPlaying) return setPlaying(false);
    if (hour >= HOUR_MAX) setHour(HOUR_MIN);
    setPlaying(true);
  };
  const scrub = (h: number) => {
    setPlaying(false);
    setHour(h);
  };

  // The latest decision, spoken once the scrubbing settles (never an announcement per hour).
  const spoken = `${stampOf(now)}, Boston. ${decision.verdict}${decision.rule ? `: ${decision.rule}` : ""}. ${decision.why}`;
  useEffect(() => {
    if (isPlaying) return;
    const t = window.setTimeout(() => setAnnounce(spoken), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [spoken, isPlaying]);

  return (
    <div className="cts" data-zone={zone}>
      <Picker value={persona} onChange={setPersona} />

      <div className="cts-opts">
        <Switch on={skips} onChange={setSkips} label="Skips ahead in the video" hint="Drags to the end, watches little" />
        <Switch on={zone === "pacific"} onChange={(on) => setZone(on ? "pacific" : "boston")} label="Lives on Pacific time" hint="Three hours behind Boston" />
      </div>

      <TimeSlider
        sim={sim}
        hour={hour}
        offset={offset}
        playing={isPlaying}
        canBack={prev !== undefined}
        canForward={next !== undefined}
        onHour={scrub}
        onJump={(d) => {
          setPlaying(false);
          jump(d);
        }}
        onPlay={onPlay}
      />

      <section className="cts-decide" aria-labelledby={`${uid}-decide`}>
        <h3 id={`${uid}-decide`} className="label cts-h">This hour&rsquo;s pass</h3>
        <div key={`${decision.sent}-${pass.blocked}`} className="cts-rise">
          <p className="cts-verdict" data-sent={decision.sent || undefined}>{decision.verdict}</p>
          <p className="label cts-rule">{decision.sent ? decision.rule : `Rule: ${decision.rule}`}</p>
          <p className="cts-why">{decision.why}</p>
        </div>
        <p className="label cts-tally">
          {sentCount} sent<span aria-hidden> &middot; </span>
          <span className="sr-only">, </span>
          {heldCount} held back
        </p>
      </section>

      <div className="cts-phone-slot">
        <Phone items={visible} now={now} offset={offset} />
      </div>

      <CourseState snap={snap} signedUp={now >= VERIFY} />
      <RuleLog checks={pass.checks} stamp={`${stampOf(now)}, Boston`} />

      <p role="status" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

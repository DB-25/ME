"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { Scrim } from "../Scrim";
import { rankFor, ROUND_SIZE, useAimTrainer, type Burst, type Pos } from "./useAimTrainer";

const fmt = (n: number | null) => (n === null ? "000" : String(n).padStart(3, "0"));
const BURST_SPOKES = 8;

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="label !text-[12px] !text-ink/75">{label}</p>
      <p className={`num font-mono text-[15px] md:text-[17px] ${dim ? "text-dim" : label === "TARGET" ? "text-ink" : "text-valorant"}`}>
        {value}
        <span className="ml-1 text-[11px] text-ink/70">{label === "TARGET" ? "" : "MS"}</span>
      </p>
    </div>
  );
}

/** Red, ringed, Valorant-range-bot-ish. Pops in with a small overshoot. */
function Target({ pos, onHit }: { pos: Pos; onHit: (e: PointerEvent<HTMLButtonElement>) => void }) {
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = inner.current;
    if (!el || prefersReducedMotion()) return;
    const tween = gsap.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.32, ease: "back.out(2.6)" });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Target"
        data-cursor="shoot"
        onPointerDown={(e) => {
          e.stopPropagation();
          onHit(e);
        }}
        className="relative block h-[52px] w-[52px] touch-manipulation rounded-full outline-none"
      >
        <span ref={inner} className="absolute inset-0 block">
          <span className="aim-ping absolute inset-0 rounded-full border border-valorant" />
          <span className="absolute inset-[6px] rounded-full border border-valorant/70" />
          <span
            className="absolute inset-[14px] rounded-full bg-valorant"
            style={{ boxShadow: "0 0 26px rgb(255 70 85 / 0.6)" }}
          />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-void" />
        </span>
      </button>
    </div>
  );
}

/** One-shot particle spray plus the time, or a plain ring for a miss. Self-cleaning. */
function HitBurst({ burst }: { burst: Burst }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".aim-spoke",
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: (i: number) => Math.cos((i / BURST_SPOKES) * Math.PI * 2) * 40,
          y: (i: number) => Math.sin((i / BURST_SPOKES) * Math.PI * 2) * 40,
          opacity: 0,
          scale: 0.3,
          duration: 0.7,
          ease: EASE_OUT,
        },
      );
      gsap.fromTo(".aim-ms", { y: 0, opacity: 1 }, { y: -34, opacity: 0, duration: 1.1, ease: EASE_OUT, delay: 0.1 });
      gsap.fromTo(".aim-ring", { scale: 0.4, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.55, ease: EASE_OUT });
    }, el);
    return () => ctx.revert();
  }, [burst.id]);

  const isHit = burst.kind === "hit";
  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
    >
      <span className="aim-ring absolute left-0 top-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-valorant" />
      {isHit &&
        Array.from({ length: BURST_SPOKES }, (_, i) => (
          <span key={i} className="aim-spoke absolute left-0 top-0 h-[3px] w-[3px] rounded-full bg-valorant" />
        ))}
      {isHit && (
        <span className="aim-ms num absolute left-1/2 top-[-26px] -translate-x-1/2 font-mono text-[13px] text-valorant">
          {burst.label}
        </span>
      )}
    </div>
  );
}

function Corners({ live }: { live: boolean }) {
  const base = "absolute h-3 w-3 border-solid transition-colors duration-300";
  const tone = live ? "border-valorant" : "border-valorant/40";
  return (
    <>
      <span aria-hidden className={`${base} ${tone} left-2 top-2 border-l border-t`} />
      <span aria-hidden className={`${base} ${tone} right-2 top-2 border-r border-t`} />
      <span aria-hidden className={`${base} ${tone} bottom-2 left-2 border-b border-l`} />
      <span aria-hidden className={`${base} ${tone} bottom-2 right-2 border-b border-r`} />
    </>
  );
}

/** Faint center cross: the same shape the particles make on a good day. */
function CenterCross() {
  const arm = "absolute bg-valorant/35";
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      <span className={`${arm} -left-[22px] top-0 h-px w-[14px]`} />
      <span className={`${arm} left-[8px] top-0 h-px w-[14px]`} />
      <span className={`${arm} left-0 -top-[22px] h-[14px] w-px`} />
      <span className={`${arm} left-0 top-[8px] h-[14px] w-px`} />
    </div>
  );
}

const btn =
  "label !text-ink inline-flex items-center gap-3 border border-valorant/60 px-5 py-3 transition-colors duration-300 hover:border-valorant hover:!text-valorant focus-visible:border-valorant";

export function AimTrainer() {
  const t = useAimTrainer();
  const arena = useRef<HTMLDivElement>(null);
  const again = useRef<HTMLButtonElement>(null);
  const prevPhase = useRef(t.phase);

  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = t.phase;
    if (t.phase === "waiting" && (was === "idle" || was === "done")) arena.current?.focus({ preventScroll: true });
    if (t.phase === "done") again.current?.focus({ preventScroll: true });
  }, [t.phase]);

  const toPercent = (e: PointerEvent<HTMLElement>): Pos => {
    const r = arena.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== " " || e.repeat || e.target !== e.currentTarget) return;
    if (t.onSpace(e.timeStamp)) e.preventDefault();
  };

  const playing = t.phase === "waiting" || t.phase === "live";
  const avg = t.average ?? 0;

  return (
    <div>
      <div className="relative mb-4 grid max-w-[24rem] grid-cols-4 gap-3" data-aim-hud>
        <Scrim shape="band" strength={0.9} inset="-30% -8% -30% -16px" />
        <Stat label="TARGET" value={`${Math.min(t.hits.length + (playing ? 1 : 0), ROUND_SIZE)}/${ROUND_SIZE}`} dim={t.phase === "idle"} />
        <Stat label="LAST" value={fmt(t.last)} dim={t.last === null} />
        <Stat label="AVG" value={fmt(t.average)} dim={t.average === null} />
        <Stat label="BEST" value={fmt(t.best)} dim={t.best === null} />
      </div>

      <div
        ref={arena}
        tabIndex={0}
        role="group"
        aria-label="Aim trainer arena. Press Space when a target appears."
        onKeyDown={onKeyDown}
        onPointerDown={(e) => t.onArenaPointer(toPercent(e))}
        className="relative aspect-[4/5] touch-manipulation select-none overflow-hidden bg-[radial-gradient(ellipse_closest-side_at_50%_50%,rgb(6_5_9/0.82),rgb(6_5_9/0.6)_70%,rgb(6_5_9/0.2))] md:aspect-[16/11]"
      >
        <style>{`
          @keyframes aim-ping { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.9); opacity: 0; } }
          .aim-ping { animation: aim-ping 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
          @keyframes aim-wait { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
          .aim-wait { animation: aim-wait 1.6s ease-in-out infinite; }
        `}</style>
        <Corners live={t.phase === "live"} />
        <CenterCross />

        {t.phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="label flex items-center gap-3 !text-valorant">
              <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-valorant" />
              Aim drill / {ROUND_SIZE} targets
            </p>
            <p className="max-w-[18ch] text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              Hit them when they appear.
            </p>
            <button type="button" onClick={t.start} className={btn}>
              Start drill
            </button>
            <p className="label !text-dim">Mouse, touch, or Space</p>
          </div>
        )}

        {t.phase === "waiting" && (
          <p className="aim-wait label absolute inset-x-0 top-[62%] text-center !text-valorant">Wait for it</p>
        )}

        {t.phase === "live" && t.pos && <Target key={`${t.hits.length}-${t.pos.x}`} pos={t.pos} onHit={(e) => t.registerHit(e.timeStamp, t.pos)} />}
        {t.burst && <HitBurst key={t.burst.id} burst={t.burst} />}

        {t.phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="label !text-valorant">Drill complete</p>
            <p className="num font-medium leading-[0.9] tracking-[-0.05em] text-valorant text-[clamp(3.5rem,9vw,7rem)]">
              {avg}
              <span className="ml-2 font-mono text-[13px] font-normal tracking-normal text-ink/70">MS AVG</span>
            </p>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[12px] text-muted" aria-label="Individual times">
              {t.hits.map((h, i) => (
                <li key={i} className="num">
                  {h}
                </li>
              ))}
            </ul>
            <p className="max-w-[32ch] text-[15px] leading-snug text-ink">{rankFor(avg)}</p>
            {t.misses > 0 && <p className="label !text-dim">{t.misses} stray {t.misses === 1 ? "click" : "clicks"}</p>}
            <button ref={again} type="button" onClick={t.start} className={btn}>
              Run it again
            </button>
          </div>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {t.status}
      </p>
    </div>
  );
}

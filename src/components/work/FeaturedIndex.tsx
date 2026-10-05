"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Project } from "@/content";
import { gsap, ScrollTrigger, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { assetUrl, caseHref } from "./asset";
import { LiveChip } from "./LiveChip";
import { CATEGORY_LABEL, liveLink, pad, previewImage } from "./meta";
import { OwnershipBadge, OWNERSHIP_TITLE } from "./OwnershipBadge";
import { RollName } from "./RollName";
import { useReducedMotion, useStageLayout } from "./useDesktopHover";
import { WorkStage } from "./WorkStage";

type Props = { projects: Project[]; spotlight: string | null };

/** The idle stage follows the row beside a point that slides down the stage's height (inset this far from its edges) as the list scrolls, so it never sits frozen. */
const FOLLOW_OFFSET_PX = 48;
/** Share of the stage that must be on screen before an idle film may play. */
const STAGE_VISIBLE = 0.4;

function Row({
  project,
  index,
  active,
  spot,
  warm,
  onHover,
  onFocusChange,
}: {
  project: Project;
  index: number;
  active: boolean;
  spot: boolean;
  warm: boolean;
  onHover: (slug: string, e: React.PointerEvent) => void;
  onFocusChange: (slug: string, focused: boolean) => void;
}) {
  const img = previewImage(project);
  const lead = project.outcomes[0];
  const descId = useId();
  const live = Boolean(liveLink(project));
  return (
    <li
      className="wk-row"
      data-slug={project.slug}
      data-active={active ? "" : undefined}
      data-spot={spot ? "" : undefined}
      data-live={live ? "" : undefined}
    >
      <Link
        href={caseHref(project.slug)}
        className="wk-link"
        data-cursor="open"
        aria-label={`${project.name}, case study`}
        aria-describedby={descId}
        onPointerEnter={(e) => onHover(project.slug, e)}
        onFocus={() => onFocusChange(project.slug, true)}
        onBlur={() => onFocusChange(project.slug, false)}
      >
        <span className="wk-idx label num" data-reveal>
          {pad(index + 1)}
        </span>

        <RollName name={project.name} />

        <div className="wk-meta label" data-reveal>
          <span className="wk-badge">
            <i aria-hidden /> Director&apos;s pick
          </span>
          <span className="num">{project.year}</span>
          <span>{CATEGORY_LABEL[project.category]}</span>
        </div>

        <OwnershipBadge ownership={project.ownership} className="wk-ob" />

        <div className="wk-media">
          {img ? (
            <figure className="wk-inline" data-thumb={img.thumb ? "" : undefined}>
              <img
                src={assetUrl(img.src43 ?? img.src)}
                alt=""
                width={img.src43 ? 1200 : img.width}
                height={img.src43 ? 900 : img.height}
                loading={warm ? "eager" : "lazy"}
                decoding="async"
              />
            </figure>
          ) : (
            <div className="wk-inline wk-inline-type" aria-hidden>
              <span>{project.name}</span>
            </div>
          )}
        </div>

        <p className="wk-tag" data-reveal>
          {project.tagline}
        </p>

        {lead ? (
          <p className="wk-out" data-reveal>
            <span className="wk-out-v num">{lead.value}</span>
            <span className="wk-out-l label">{lead.label}</span>
          </p>
        ) : null}

        {project.owned ? (
          <p className="wk-own" data-reveal>
            <span className="wk-own-k label">I owned</span>
            <span className="wk-own-v">{project.owned}</span>
          </p>
        ) : null}

        <p className="wk-go label" aria-hidden>
          <span>Case study</span>
          <span className="wk-go-arrow">&rarr;</span>
        </p>
      </Link>
      <LiveChip project={project} />
      <span id={descId} className="sr-only">
        {project.tagline} {lead ? `${lead.value} ${lead.label}.` : ""} {project.year}, {CATEGORY_LABEL[project.category]}.
        {project.ownership ? ` ${OWNERSHIP_TITLE[project.ownership]}.` : ""}
        {project.owned ? ` I owned: ${project.owned}` : ""}
      </span>
    </li>
  );
}

export function FeaturedIndex({ projects, spotlight }: Props) {
  const list = useRef<HTMLOListElement>(null);
  // Stage layout (wide screen, mouse): `picked` is the last row pointed at or focused and stays up when the pointer
  // moves across to the stage; `inside` is whether the pointer or focus is still in the list or stage. Elsewhere
  // (cards) a row is only active while the pointer is on it.
  const stageOn = useStageLayout();
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [pointerIn, setPointerIn] = useState(false);
  const [focusIn, setFocusIn] = useState(false);

  // Cards sit off-screen in a scroller where native lazy loading never reaches them: once the list is near the
  // viewport, load every still so a swipe never lands on an empty frame.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setWarm(true);
        io.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Entrance: names rise inside their masks, details fade up, once per row.
  useEffect(() => {
    const root = list.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>(".wk-row").forEach((row) => {
        const line = row.querySelector<HTMLElement>(".wk-nline");
        const bits = row.querySelectorAll<HTMLElement>("[data-reveal]");
        const st = { trigger: row, start: "top 88%", once: true };
        if (reduced) {
          gsap.from([line, ...bits], {
            opacity: 0,
            duration: 0.6,
            scrollTrigger: st,
          });
          return;
        }
        gsap.from(line, {
          yPercent: 115,
          duration: 1.15,
          ease: EASE_OUT,
          scrollTrigger: st,
        });
        gsap.from(bits, {
          y: 24,
          opacity: 0,
          duration: 1,
          ease: EASE_OUT,
          stagger: 0.06,
          delay: 0.15,
          scrollTrigger: st,
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // A Director pick can land while the page is still scrolling and before the row's entrance has played:
  // finish that entrance now so the spotlighted row is never left hidden.
  useEffect(() => {
    if (!spotlight) return;
    const row = list.current?.querySelector<HTMLElement>(
      `.wk-row[data-slug="${spotlight}"]`,
    );
    if (!row) return;
    ScrollTrigger.getAll()
      .filter((st) => st.trigger === row)
      .forEach((st) => {
        st.animation?.progress(1);
        st.kill();
      });
    // On the phone carousel, bring the picked card into view.
    const el = list.current;
    if (el && el.scrollWidth > el.clientWidth + 4) {
      el.scrollTo({ left: Math.max(0, row.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft)), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [spotlight]);

  // Carousel state (phones and tablets): which card leads, and whether either end is reached.
  const [pos, setPos] = useState({ i: 0, start: true, end: false });
  const thumb = useRef<HTMLElement>(null);
  const readPos = useCallback(() => {
    const el = list.current;
    const card = el?.querySelector<HTMLElement>(".wk-row");
    if (!el || !card) return;
    // Progress thumb: as wide as the visible share of the track, slid by the scroll fraction (no re-render).
    if (thumb.current) {
      const share = Math.min(1, el.clientWidth / el.scrollWidth);
      const max = el.scrollWidth - el.clientWidth;
      const t = max > 0 ? el.scrollLeft / max : 0;
      thumb.current.style.width = `${share * 100}%`;
      thumb.current.style.transform = `translateX(${(t * (1 - share) * 100) / share}%)`;
    }
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const next = {
      i: Math.round(el.scrollLeft / (card.offsetWidth + gap)),
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    };
    setPos((prev) => (prev.i === next.i && prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  useEffect(() => {
    readPos();
    window.addEventListener("resize", readPos);
    return () => window.removeEventListener("resize", readPos);
  }, [readPos]);
  const page = (dir: 1 | -1) => {
    const el = list.current;
    const card = el?.querySelector<HTMLElement>(".wk-row");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const inside = pointerIn || focusIn;
  const insideRef = useRef(false);
  useEffect(() => {
    insideRef.current = inside;
  }, [inside]);

  // Idle (nobody pointing at the list or stage): scrolling moves the stage to the row beside it. A pointer or
  // keyboard focus in the list always wins, so hover stays exact; the pick only changes here when nothing is pointed at.
  useEffect(() => {
    const el = list.current;
    if (!stageOn || !el) return;
    let raf = 0;
    const follow = () => {
      raf = 0;
      if (insideRef.current) return;
      const stage = el.parentElement?.querySelector<HTMLElement>(".wk-stage");
      if (!stage) return;
      const box = stage.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      // How far the list has travelled while the stage is stuck (0 at the first row, 1 when the last row ends), so the
      // pick moves from the stage's top edge to its bottom edge and every row, the last ones included, gets its turn.
      const listBox = el.getBoundingClientRect();
      const travel = listBox.height - box.height;
      const stuckAt = parseFloat(getComputedStyle(stage).top) || 0;
      const progress = travel > 0 ? Math.min(1, Math.max(0, (stuckAt - listBox.top) / travel)) : 0;
      const y = box.top + FOLLOW_OFFSET_PX + progress * (box.height - 2 * FOLLOW_OFFSET_PX);
      let hit: HTMLElement | undefined;
      el.querySelectorAll<HTMLElement>(".wk-row").forEach((row, i) => {
        if (i === 0 || row.getBoundingClientRect().top <= y) hit = row;
      });
      const slug = hit?.dataset.slug;
      if (slug) setPicked((cur) => (cur === slug ? cur : slug));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(follow);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [stageOn]);

  // The first project's film plays on its own while the stage is on screen and nobody is pointing; every other
  // film waits for a real dwell, so scrolling past the list never fetches eight videos.
  const [stageSeen, setStageSeen] = useState(false);
  const split = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = split.current;
    if (!stageOn || !el || typeof IntersectionObserver === "undefined") return;
    const stage = el.querySelector<HTMLElement>(".wk-stage");
    if (!stage) return;
    const io = new IntersectionObserver(([e]) => setStageSeen(e.intersectionRatio >= STAGE_VISIBLE), { threshold: [0, STAGE_VISIBLE, 1] });
    io.observe(stage);
    return () => io.disconnect();
  }, [stageOn]);

  const lastPick = picked ?? projects[0].slug;
  const active = spotlight ?? (stageOn ? lastPick : inside ? picked : null);
  const idleFilm = stageOn && stageSeen && !inside && active === projects[0].slug;
  const intent = Boolean(spotlight) || (stageOn && inside) || idleFilm;
  return (
    <div ref={split} className="wk-split" data-stage={stageOn ? "" : undefined} onPointerLeave={() => setPointerIn(false)}>
      <ol
        ref={list}
        className="wk-list"
        data-spot={spotlight ? "" : undefined}
        style={{ ["--n-max" as string]: Math.max(...projects.map((p) => p.name.length), 8) }}
        onScroll={readPos}
      >
        {projects.map((p, i) => (
          <Row
            key={p.slug}
            project={p}
            index={i}
            active={active === p.slug}
            spot={spotlight === p.slug}
            warm={warm && !stageOn}
            onHover={(slug, e) => {
              if (e.pointerType !== "mouse") return;
              setPicked(slug);
              setPointerIn(true);
            }}
            onFocusChange={(slug, focused) => {
              setFocusIn(focused);
              if (focused) setPicked(slug);
            }}
          />
        ))}
      </ol>
      <WorkStage projects={projects} slug={active ?? lastPick} spot={Boolean(spotlight)} intent={intent} films={stageOn && !reduced} />
      <div className="wk-ctl" role="group" aria-label="Browse featured projects">
        <button type="button" className="wk-arrow" aria-label="Previous project" disabled={pos.start} onClick={() => page(-1)}>
          <span aria-hidden>&larr;</span>
        </button>
        <button type="button" className="wk-arrow" aria-label="Next project" disabled={pos.end} onClick={() => page(1)}>
          <span aria-hidden>&rarr;</span>
        </button>
        <p className="wk-ctl-count label num" aria-hidden>
          {pad(pos.end ? projects.length : Math.min(pos.i + 1, projects.length))} / {pad(projects.length)}
        </p>
        <span className="wk-prog" aria-hidden>
          <i ref={thumb} />
        </span>
      </div>
    </div>
  );
}

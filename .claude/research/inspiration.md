# Portfolio Inspiration & "Patterns to Steal"

A concrete reference for an Apple-grade, story-driven, interactive portfolio positioning Dhruv as a *serious software engineer who specializes in AI* (5+ yrs shipping, 500K+ users, AWS infra, distributed systems).

**Stack:** Next.js 16 · React 19 · Tailwind v4 · GSAP ScrollTrigger · Framer Motion · Lenis · (optional) react-three-fiber.

**Setup notes that unlock most techniques:**
- GSAP is now 100% free incl. all plugins (MotionPath, SplitText, Flip).
- React 19 + GSAP: wrap all setup in `useGSAP()` (`@gsap/react`) — auto cleanup.
- Wire Lenis into the GSAP ticker ONCE at app root; every scroll technique then benefits.
- a11y/perf gating mandatory: mobile WebGL fallbacks, prefers-reduced-motion as a parallel designed experience, idle-frame rAF shutdown.

## A. The Three Reference Sites
### A-1. Manvir (manvir.design) — type-forward designer idiom
> NOTE: designbymanvir.com is NOT live/indexed; the real site is manvir.design. Idiom-level characterization, not pixel-verified.
- Hero: typographic — large name/role statement first, minimal imagery, whitespace, one scroll cue.
- Type IS the design; oversized display vs small quiet labels; two-tier hierarchy.
- Scroll: Lenis inertial scroll synced to reveals; fade + y/clip-path translate on enter.
- Micro: custom cursor (scales / "View" label), underline-grow / text-swap links, magnetic buttons, thumbnail mask-reveal.
- Voice: confident, plain, first-person; work does the talking.
- Sections: type hero → work grid → about → process → oversized "Let's talk" footer.
- Motion: calm/cinematic; expo-out cubic-bezier(0.16,1,0.3,1); 0.6–1.2s; generous stagger.
- => BACKBONE register for a serious engineer. Build first.

### A-2. Apple product pages — scroll-pinned storytelling
- Signature: scroll-scrubbed image sequence on `<canvas>` — preloaded frames, drawImage() the frame matching scroll progress.
- Sticky/pinned text reveals: copy holds center-viewport, fades as you pass; choreographed beat-by-beat.
- Type: enormous headlines, one idea per screen. Per-section background color transitions = chapters. Sticky progress indicator.
- Motion is SCRUBBED (scroll-controlled, not autoplay) => premium, in-control feel.
- Stack: ScrollSequence class + ScrollTrigger scrub => drawImage; sticky text via pin or Framer useScroll/useTransform. Effort Med–High, impact High.
- For Dhruv: scrub through an ARCHITECTURE assembling itself or an inference pipeline.

### A-3. Bruno Simon — interactive 3D playground
- Drivable low-poly car world; nav IS play. Tech: Three.js + matcaps (no lights) + Cannon.js physics; perf-tuned (sleeping bodies, clamped pixel ratio).
- Serious-engineer take: DON'T ship the full game — reads as toy / signal mismatch / a11y+mobile liability. STEAL THE PRINCIPLES: one memorable moment, rewarding interactivity, ruthless perf, graceful fallback.
- Toned-down r3f build: next/dynamic ssr:false + IntersectionObserver mount; drei <Float> + MeshMatcapMaterial + bounded <PresentationControls>; cursor parallax by MUTATION in useFrame; dpr={[1,1.5]} frameloop="demand"; reduced-motion/mobile => static poster. Effort low–med.

## B. Awwwards / Award Winners (2024–2026) — recurring meta-lessons
1. Lenis + ScrollTrigger + (opt) r3f is THE production trio; sync to one ticker.
2. Kinetic/split typography is the dominant motif (SplitText). Static text reads dated.
3. ONE persistent WebGL canvas with DOM-synced positions, not many.
4. Cursor-reactive surfaces (flowmap, lerp camera-follow, hover distortion) = consistent delight lever.
5. Seamless transitions (clip-path/mask wipes, Flip) — AnimatePresence or View Transitions API.
6. Perf + a11y gating mandatory.
7. Confident whitespace + restrained palette UNDER the motion; restraint wins awards.

Standouts: Lando Norris (OFF+BRAND, fluid WebGL bg); Phantom.Land (kinetic WebGL grids); Joffrey Spitzer (line/char reveals + Flip transitions, NO 3D — best ROI baseline); Arnaud Rocca (reusable GSAP motion system + cursor-velocity distortion); Olha Lazarieva (3D text-spheres + camera lerp).

## C. Technique Library (with stack impl)
- C-1. ⌘K palette + terminal — `cmdk` (or kbar); hotkey in useEffect; AnimatePresence. Terminal: history array + monospace + onKeyDown parser. Effort Low–Med.
- C-2. ⭐ Interactive architecture diagram — React Flow (@xyflow/react) for nodes/edges/zoom + animated edges; packets via custom edge getBezierPath()+animated circle (GSAP MotionPath align/autoRotate, stagger for a stream; or CSS offset-path). Node yoyo pulse. THE most on-brand centerpiece.
- C-3. Scrollytelling — Lenis+ticker (autoRaf:false, lenis.on('scroll',ScrollTrigger.update), gsap.ticker.add(t=>lenis.raf(t*1000)), lagSmoothing(0)); pin+scrub; horizontal via xPercent track; reveals via toggleActions/batch or whileInView. Apple sequence via ScrollSequence+scrub.
- C-4. Magnetic buttons + cursor — GSAP quickTo + elastic.out(1,0.3) (offset*0.4, reset on leave); blend-mode cursor (fixed div, mix-blend-difference, quickTo follow, scale on [data-hover]). Gate behind hover:hover.
- C-5. Code reveal — Shiki / react-shiki (build-time in Server Component); shiki-magic-move for naive→production morph (FLIP); react-type-animation for headlines.
- C-6. ⭐ Count-up metrics — Framer useInView(once) + useSpring + useTransform(toLocaleString); "live" feel via sparklines + strokeDashoffset gauges. Respect reduced-motion.

## D. "Serious / handles responsibility" patterns
1. Live system architecture diagram (client→API GW→Lambda/Step Functions→Bedrock→Dynamo/S3; clickable nodes show scale).
2. Operational metrics not vanity (p99 latency, uptime, infra cost -40%, tokens/day), each with a one-line "how."
3. Faux "live status" / observability widget (uptime bar, request sparkline, "all systems operational" pill).
4. Terminal / ⌘K palette — native dev fluency.
5. Git-style commit-timeline career history (commit dots, branch lines, relative timestamps); optional real GitHub contribution graph.
6. Code reveals from real repos — naive→production morph to show judgment.
7. Case studies as scroll-pinned stories: problem→constraints→architecture→TRADEOFFS→outcome metrics (the tradeoffs beat is what seniors look for).
8. Bento grid "system at a glance" (stack, metrics, live GitHub, currently-building, location tiles).
9. Restraint + performance AS a feature (fast, reduced-motion-respecting, keyboard-nav = proof of responsible shipping).
10. Credible distribution: inline live demos, GitHub on every project, .dev/.com domain.

## E. Top 10 stealable patterns (impact-to-effort)
1. Count-up "at scale" metrics on scroll — High / Low.
2. ⌘K command palette (cmdk) — High / Low.
3. Magnetic buttons + blend-mode custom cursor (GSAP quickTo + elastic) — High / Low.
4. Line/char text reveals (GSAP SplitText + masks) — High / Low–Med.
5. Lenis smooth scroll synced to GSAP ticker — High / Low–Med (foundation).
6. Interactive system-architecture diagram w/ flowing packets (React Flow + MotionPath) — Very High / Med. ⭐ centerpiece.
7. Shiki code reveal / shiki-magic-move morph — High / Med.
8. Apple-style scroll-scrubbed canvas sequence (architecture assembling itself) — Very High / Med–High.
9. Faux live-status widget + git-style commit timeline — High / Med.
10. One contained r3f 3D hero accent + reduced-motion poster fallback — High / Med.

## F. Build order
1. Foundation: Lenis+ticker + Tailwind tokens + type-forward hero.
2. Fast wins: ⌘K, count-up metrics, magnetic buttons + cursor.
3. Identity: text reveals + page transitions.
4. Centerpieces: architecture diagram + ONE Apple scroll-scrubbed project story.
5. Optional: one contained r3f hero accent + reduced-motion poster fallback.

## Strategic recommendation
Build the calm, type-forward "Manvir register" as the backbone, then layer exactly TWO spectacle moments that are on-brand for an engineer — the live architecture diagram (C-2/D-1) and one Apple scroll-scrubbed project story (A-2). Steal Bruno Simon's principles (one memorable moment + ruthless perf + graceful fallback), not the driveable car — for a serious-engineer audience the restraint and reduced-motion fallback are themselves the credibility signal.

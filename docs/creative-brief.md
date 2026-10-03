# SIGNAL: creative brief for dhruv.v3

Owner: lead (Claude). Every builder reads this before writing a line.

## The idea

DB turns noise into signal. His whole career is taking messy, high-stakes text (special-ed plans, procurement contracts, state policy) and turning it into answers real people can act on: 500K+ of them, across 20+ agencies.

So the site is one continuous **signal**: a field of ~60K luminous particles that lives behind everything and reorganizes itself as you scroll. It starts as noise, resolves into DB, then becomes each chapter of his story. When a particle formation carries data, it is honest data (1 particle = N people, the arc really goes Bangalore to Boston).

Not a template, not a bento grid, not a "hi I'm X" hero. It should feel like a title sequence directed by someone who also ships production systems.

## Chapters (scroll order, `data-chapter` ids)

| id | Section | Particle formation | Copy job |
|---|---|---|---|
| `intro` | Preloader | noise converging | 000 to 100 counter, "calibrating signal" |
| `hero` | Hero | "signal": a 3D field of waveform lines, chaotic noise on the left resolving into clean waves on the right, flowing, cursor ripples (no letters, no faces) | Name, title, one-liner. Live Boston clock. Scroll cue. |
| `origin` | Origin | point-cloud globe, glowing arc Bangalore (12.97N, 77.59E) to Boston (42.36N, 71.06W) | Bangalore, building Flutter apps with real daily users, then Northeastern MS AI, then Burnes |
| `systems` | How I build | layered network graph (docs to embeddings to retrieval to model to answer), pulses travel along it | The platform: knowledge-agent-for-impact, deployments, agencies, users. Engineering principles. |
| `work` | Selected work | ambient drift (dimmed) so cards read | Flagship projects index, each opens `/work/[slug]` |
| `impact` | Impact | dense crowd/grid of points, 1 particle = N people, counts up | Headline metrics with receipts |
| `proof` | Recognition | constellation / orbit rings | Governor's citation, NASPO Gold, AWS re:Invent 2nd of 3,300+, press |
| `director` | The Director | whatever the model draws | Visitor says who they are or what they want. An AI director (tool-calling model) takes over the site: scrolls a personalized cut, morphs particles into shapes it draws live as SVG, spotlights projects, narrates. See `src/lib/director/protocol.ts`. Honest offline mode with scripted cuts. |
| `human` | Off duty | playful: particles scatter into a Valorant-ish crosshair | Valorant, CS2, pani puri, purple. Make him a person. |
| `contact` | Contact | everything collapses into one bright point, then a gentle pulse | Giant email link, socials, resume |

## Visual language

- **Palette (tokens in globals.css):** void `#060509`, ink `#EEEAF6`, muted `#8B8798`, faint `#4A4656`, hairline `rgba(238,234,246,.08)`. Primary accent **ultraviolet** `#8B7BFF` (his color is purple). Hot core `#C9BEFF`. One warm counter-accent **saffron** `#FFA94D`, only in Origin (India) and rare highlights. Valorant red `#FF4655` only inside Off duty.
- **Type:** `Geist` (UI + huge display, tight tracking -0.04em at display sizes), `Instrument Serif` italic for emotional words inside headlines (one or two words max per headline), `Geist Mono` uppercase 11-12px with +0.08em tracking for labels/metadata. Display sizes use `clamp()` and go BIG (hero name up to 18vw).
- **Layout:** 12-col grid, 24px gutters desktop, 16px side gutter mobile. Asymmetric, editorial. Lots of void. Hairline rules, no cards-in-cards, no drop shadows, no filled pill buttons. Labels like `01 / ORIGIN` in mono.
- **Texture:** subtle film grain overlay, bloom on particles only.

## Motion language

- One ease family: `expo.out` (`cubic-bezier(0.16,1,0.3,1)`) for reveals, `power2.inOut` for scrubbed morphs. Reveals 0.9 to 1.2s, staggers 0.04 to 0.08s.
- Headlines: line-masked reveals (lines slide up from `yPercent: 110` inside `overflow: hidden` wrappers), triggered once at 80% viewport.
- Particle morphs are **scroll-scrubbed** between chapters (never time-based jumps), with curl-noise turbulence peaking mid-morph so transitions feel alive.
- Micro: magnetic links, custom cursor (dot + lagging ring, ring grows over interactive elements, shows context label like "open" over projects), hover states 200 to 300ms.
- `prefers-reduced-motion`: no scrub morphs (formations crossfade), no smooth scroll, no cursor, reveals become simple fades.

## Engineering rules

- Next.js 16 static export (`output: "export"`). No API routes. The Director calls an external Cloudflare Worker via `NEXT_PUBLIC_DIRECTOR_URL` (NDJSON stream, protocol in `src/lib/director/protocol.ts`).
- Content only from `@/content` (never hardcode facts in components).
- Shared infra (lead-owned, do not edit without asking): `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/*`, `src/content/*`.
- Each builder owns one folder under `src/components/`. Do not edit other folders.
- Performance budget: 60fps on an M1, mobile Lighthouse perf 85+. Particles: 60K desktop, 18K mobile, DPR clamped to 1.75, render loop paused when tab hidden or canvas off-screen. GL code-split and mounted after first paint.
- Accessibility: semantic landmarks, every chapter has a real heading, focus-visible states, all text readable without WebGL, canvas is `aria-hidden`.
- Copy: no em dashes anywhere. Short, concrete, confident.
- Quality bar: if it looks like a template, it is wrong. If a number has no receipt, it does not ship.

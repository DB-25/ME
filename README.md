# DB, v3

Personal site of Dhruv Kamalesh Kumar, AI Engineer at the Burnes Center for Social Change, Northeastern University.

One field of ~60K particles lives behind the whole page and re-forms per chapter: a halftone portrait, a globe with the Bangalore to Boston arc, the pipeline graph, a crowd, orbit rings, a crosshair, a singularity. **The Director** lets a visitor type who they are; a tool-calling model then drives the site (scrolls, spotlights work, draws SVG the particles morph into) while narrating. Offline it plays scripted cuts built from the real content.

**Stack:** Next.js 16 static export, React 19, three.js / react-three-fiber with custom shaders, GSAP ScrollTrigger + SplitText, Lenis, Tailwind v4. Director backend: Cloudflare Worker + OpenAI (`worker/`).

```bash
npm install
npm run dev
```

- Content: `src/content/` (single source of truth, every metric has a source)
- Design and motion rules: `docs/creative-brief.md`
- Deploy, domain and Director setup: `docs/RUNBOOK.md`

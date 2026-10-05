# Runbook: deploy the site and The Director

The site is a Next.js static export (`out/`). The Director is a separate Cloudflare Worker in `worker/` that streams NDJSON to the site. Both are free tier. Not Vercel, not AWS.

Prerequisite for any deploy: `next.config.ts` must set `output: "export"`, `images: { unoptimized: true }` and `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ""`.

## a) Interim: GitHub Pages (no Cloudflare login needed)

The repo `DB-25/ME` is public, so Pages is free. There is no `DB-25/DB-25.github.io` repo, so the site lives at `https://db-25.github.io/ME/` (a project site, needs a base path).

1. Repo Settings > Pages > Source: **GitHub Actions**.
2. Repo Settings > Secrets and variables > Actions > Variables:
   - `BASE_PATH` = `/ME`
   - `DIRECTOR_URL` = the Worker URL from step c (add it later if the Worker is not deployed yet; the site falls back to offline mode).
3. Push to `v3` or `main`, or run the workflow by hand: `gh workflow run deploy-pages.yml --ref v3`.
4. Watch it: `gh run watch`. Live at `https://db-25.github.io/ME/`.

When a custom domain is attached to Pages, set `BASE_PATH` to empty (delete the variable) and redeploy.

## b) Cloudflare Pages

One time: `npx wrangler login` (personal Cloudflare account).

```bash
export NEXT_PUBLIC_BASE_PATH=""
export NEXT_PUBLIC_DIRECTOR_URL="https://director.<subdomain>.workers.dev"
npm ci && npm run build
npx wrangler pages deploy out --project-name db-portfolio
```

The first run asks to create the project (production branch: `main`). The site is at `https://db-portfolio.pages.dev`. Redeploy with the same last command after each build.

## c) Director Worker

```bash
cd worker
npm i
npm run knowledge            # regenerates src/knowledge.ts from src/content (or src/data)
npx tsc --noEmit
npx wrangler secret put OPENAI_API_KEY    # paste the key when prompted
npx wrangler deploy
```

Wrangler prints the URL, `https://director.<subdomain>.workers.dev`. Test it:

```bash
node scripts/smoke.mjs https://director.<subdomain>.workers.dev "I am a recruiter hiring for infra"
```

Without the secret the Worker returns 503 `{"error":"director_offline"}` and the site runs its scripted offline cuts. Change the model with `OPENAI_MODEL` in `worker/wrangler.toml` (default `gpt-6.1-sol`, cheaper fallback `gpt-6-luna`), then redeploy. Re-run `npm run knowledge` and redeploy whenever site content changes.

## d) Buy the domain on Cloudflare and attach it to Pages

1. Dashboard > Domain Registration > Register Domains. Search the name, buy it (at cost, no markup, WHOIS privacy included).
2. Dashboard > Workers & Pages > `db-portfolio` > Custom domains > Set up a custom domain. Enter the apex (`example.dev`), confirm. Cloudflare creates the DNS record and certificate. Repeat for `www` if wanted.
3. Wait a few minutes for the certificate. Check `curl -I https://example.dev`.

## e) Wire the site to the Worker

1. Allow the site origin in the Worker: edit `worker/wrangler.toml`:
   `ALLOWED_ORIGINS = "https://example.dev,https://www.example.dev,https://db-portfolio.pages.dev,https://db-25.github.io"`
   Then `cd worker && npx wrangler deploy`. (`http://localhost:3000` is always allowed.) `ALLOWED_ORIGINS` must list every origin the site is served from: the committed default is `https://db-25.github.io,https://db25.dev`, so update it at deploy if the final domain differs.
2. Point the site at the Worker: set `NEXT_PUBLIC_DIRECTOR_URL` to the Worker URL at build time (GitHub: the `DIRECTOR_URL` repo variable; Cloudflare Pages: the `export` line in step b). It is baked into the static build, so rebuild and redeploy after changing it.
3. Optional: serve the Worker on `director.example.dev` (Worker > Settings > Domains & Routes > Add custom domain), then use that as `DIRECTOR_URL` and in `ALLOWED_ORIGINS` if needed.

Rate limit: 15 requests per 10 minutes per IP (in memory, per Worker instance). Daily budget: `DIRECTOR_DAILY_BUDGET` (default 300 requests per UTC day, counted in `TTS_KV` if bound, else per data center in the Cache API); past it `POST /director` answers 503 `director_offline` and the site falls back to the scripted tour. Each OpenAI call has a 20 second timeout. Set a monthly spend cap in the OpenAI dashboard as the real backstop.

`workers_dev = true` in `worker/wrangler.toml` keeps the public `*.workers.dev` URL live because there is no custom domain yet. Once the Worker is on a custom domain (see step 3), set `workers_dev = false` so the only way in is the domain.

## f) Voice

The Director speaks only lines DB recorded (`public/voice/<id>.mp3`), chosen by the model through the `speak` tool. `npm run knowledge` in `worker/` regenerates `worker/src/voice.ts` from `src/lib/director/voice-library.ts`, so re-run it and redeploy whenever lines change. Runtime cloned-voice TTS (`POST /tts`) is off by default; see `docs/voice-plan.md` for the design, enable steps and cost. Worker tests: `cd worker && npm test`.

## g) Visitors globe (hidden easter egg)

`POST /visit` counts a visitor once per UTC day into a 5 degree cell, `GET /visits` returns the map (see `worker/src/visits.ts`). The site reuses `NEXT_PUBLIC_DIRECTOR_URL`; there is no other setting. Until `/visits` answers, the egg and its footer hint stay hidden, so nothing needs removing if you skip this.

1. `cd worker && npx wrangler kv namespace create VISITS_KV`, paste the printed id into the `VISITS_KV` block at the bottom of `wrangler.toml` and uncomment it.
2. `npx wrangler secret put VISIT_SALT` with any long random string (keep it secret: it salts the per-day visitor hash).
3. `npx wrangler deploy`. Check `curl https://<worker>/visits` (an empty map is `{"cells":[],"total":0,...}`).

Open it with `v`, a click on the About globe, or the "visitors" line in the footer. Local development only: `?visits=demo` loads clearly labelled sample data. KV free tier allows 1,000 writes a day (two per new visitor), so about 500 new visitors a day; counter updates are not atomic, which is fine at this scale.

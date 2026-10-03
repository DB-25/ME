# Voice plan: DB's own voice for the Director

Two layers. The first is on by default and costs nothing at runtime. The second is built but off.

## 1. Hybrid (default)

The Director only ever *speaks* lines DB recorded himself. The live model does not write speech, it chooses it.

- **Library.** `src/lib/director/voice-library.ts` exports `VOICE_LINES: {id, text, tags}[]` (about 140 lines today). The id is a hash of the exact text (`lineId.ts`), and each line has a recording at `public/voice/<id>.mp3`.
- **Build.** `cd worker && npm run knowledge` runs `build-knowledge.mjs` then `build-voice.mjs`, which bundles the library and writes `worker/src/voice.ts`. If the library file is missing it writes an empty library: the `speak` tool and the voice section of the prompt are then omitted and the Worker still runs (subtitles only).
- **Tool.** `speak { lineId }` is a strict function tool whose `lineId` is an enum of exactly the library ids (`worker/src/tools.ts`). The texts live in the system prompt as `id [tags] text`, one line each (about 2.6k tokens for about 140 lines, plus about 1k for the enum). The ids appear twice, but a strict enum is the only way to make the model unable to invent one, and the prompt prefix is static so OpenAI's automatic prompt caching applies.
- **Prompt rules.** Speak only via `speak`, 1 to 4 calls per turn, interleaved with the visual actions, choose lines that fit the visitor, no repeats. Optional free text (at most about 40 words, usually none) is a subtitle: read, not heard. Everything is first person because the voice is DB's. If asked, the Director says it is an AI wearing DB's recorded voice. It must not claim anything outside the KNOWLEDGE block, and must not pick a line that does not answer the question.
- **Server validation.** `toAction` drops any `speak` whose id is not in the library. `directorEvents` also drops repeats within a turn and caps speaks at 4 per turn (visual actions stay capped at 6, `end_scene` included, and nothing is accepted after `end_scene`).
- **Client.** Plays `/voice/<id>.mp3` for each `speak` action, shows free text as a subtitle, and falls back to timed captions when a file or the manifest is missing.

Tests: `cd worker && npm test` (no network, no key) covers id validation, the enum, the prompt, the stream rules and the whole `/tts` path.

## 2. Option B: runtime cloned voice (off by default)

For when free text should also be heard in DB's voice. The Worker gains `POST /tts {text}` which returns streamed `audio/mpeg` from ElevenLabs.

```
browser ──POST /tts {text}──> Worker
   Origin allow list, 20 req/min binding + 40 per 10 min in memory, body <= 2 KB, text <= 300 chars
   cache hit (sha256(text + voiceId + model))  ──> audio, free
   else reserve max(chars, 20) from the daily budget ──> 429 tts_budget_exhausted if over
   else POST api.elevenlabs.io/v1/text-to-speech/{voice}/stream ──> tee: to browser and into the cache
```

- **Gate.** Enabled only when `TTS_PROVIDER=elevenlabs` and the secrets `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` exist. Otherwise `404 {"error":"tts_disabled"}`.
- **Errors the client must treat as "stay on subtitles":** 404 `tts_disabled`, 429 `rate_limited` / `tts_budget_exhausted`, 503 `tts_unavailable` (budget store failed, fail closed), 502 `tts_upstream_error`.
- **Model.** `eleven_flash_v2_5` by default (override with `TTS_MODEL`): ElevenLabs recommends Flash for low latency (about 75 ms model latency), it is 32 languages and half the credits per character of Multilingual v2 or v3. Turbo v2.5 is deprecated in favor of Flash.
- **Format.** `mp3_44100_96`. Not 192 kbps MP3 (needs Creator) and not 44.1 kHz PCM (needs Pro). Narration at 96 kbps is fine and about 12 KB per second.
- **Daily budget.** `TTS_DAILY_CHAR_BUDGET` (default 20000) counts characters of *new* speech per UTC day. Cached lines are free and do not count. Each uncached request is charged at least 20 characters, so tiny texts cannot exhaust the KV write quota (1,000 writes per day on the free plan).
  - **Preferred store: Workers KV** (`TTS_KV` binding). One write per uncached request, which is free tier friendly (1,000 writes and 100,000 reads per day), and the count is global. Create it with `npx wrangler kv namespace create TTS_KV`, paste the id into the commented `[[kv_namespaces]]` block in `worker/wrangler.toml`.
  - **Fallback: Cache API.** With no KV binding the counter lives in `caches.default`: no setup, but it is per data center and only as reliable as the cache. Fine for a hobby site, not a hard cap.
  - Read-then-write is not atomic, so a burst can overshoot by a request or two. The ElevenLabs plan's own credit limit is the true backstop: use a plan, not auto top-up.
- **Response cache.** `caches.default` keyed by sha256 of text, voice id and model, 30 days. It is per data center and Cloudflare documents full Cache API behavior for custom domains, so put the Worker on a custom domain (`director.<yourdomain>`) for the cache to pay off. A cache failure never fails a request.

### Enable steps

1. Create an ElevenLabs account and a paid plan (see cost below). Instant Voice Cloning is listed on the Starter plan and above in current docs and help pages, but one pricing summary lists it from Creator: confirm in the Voices tab before paying for a year.
2. Voices > Add a voice > Instant Voice Clone. Upload `ME/voice-sample.m4a` (1 to 2 minutes of clean audio, no reverb or music, under 3 minutes). Name it, and copy the **voice id** from the voice's page.
3. Create an API key (Developers > API keys). Restrict it to Text to Speech if the dashboard offers scopes.
4. In `worker/`:
   ```bash
   npx wrangler secret put ELEVENLABS_API_KEY
   npx wrangler secret put ELEVENLABS_VOICE_ID
   ```
   Edit `worker/wrangler.toml`: `TTS_PROVIDER = "elevenlabs"`, `TTS_DAILY_CHAR_BUDGET = "20000"` (adjust). Optionally create the KV namespace as above.
5. `npm run knowledge && npx tsc --noEmit && npx wrangler deploy`.
6. Check: `curl -s -X POST https://director.<sub>.workers.dev/tts -H 'origin: https://<allowed site>' -d '{"text":"Hello, it is Dhruv."}' -o /tmp/t.mp3 && file /tmp/t.mp3`. A second identical call returns header `x-tts-cache: hit`.
7. Site: set `NEXT_PUBLIC_DIRECTOR_TTS=server` at build time (GitHub repo variable or the `export` in the Cloudflare Pages build) and redeploy the site.
8. Roll back by setting `TTS_PROVIDER = ""` and redeploying the Worker. The site keeps working on recorded lines and subtitles.

### Monthly cost

Assumptions: one tour is one turn, and the model's free text is capped at about 40 words, so roughly 400 characters of spoken text per tour, with no cache hits (worst case). Recorded `speak` lines cost nothing. ElevenLabs API list price for Flash/Turbo is $0.04 per 1,000 characters (https://elevenlabs.io/pricing/api). On plans, Flash uses 0.5 credit per character, so credits go twice as far (https://elevenlabs.io/pricing). Plan prices from the same page: Starter $6 (30,000 credits), Creator $22 (121,000), Pro $99 (600,000).

| Tours per month | Characters | At API list price | Plan that covers it | Plan fee |
|---|---|---|---|---|
| 50 | 20,000 | $0.80 | Starter (10k of 30k credits) | $6 |
| 200 | 80,000 | $3.20 | Creator (40k of 121k credits; Starter's 30k would run out) | $22 |
| 1,000 | 400,000 | $16.00 | Pro (200k of 600k credits) | $99 |

The plan fee is the real cost at small volume (the metered figure only matters on pay as you go or overage). The default 20,000 characters per day caps spend at 600,000 characters a month, $24 at list price, which still fits Pro. OpenAI model cost is separate and unchanged. Prices were read from ElevenLabs' public pages on 2026-10-03; v4 models are on a promotion that ends October 12 and are not used here.

Sources: https://elevenlabs.io/pricing, https://elevenlabs.io/pricing/api, https://elevenlabs.io/docs/api-reference/text-to-speech/stream, https://elevenlabs.io/docs/overview/models, https://elevenlabs.io/docs/creative-platform/voices/voice-cloning/instant-voice-cloning, https://developers.cloudflare.com/kv/platform/pricing/, https://developers.cloudflare.com/workers/runtime-apis/cache/.

### Risks

- **Latency.** Flash is fast (about 75 ms model time) but a visitor still waits for the Director's first action, then a network round trip to the Worker and ElevenLabs, roughly a few hundred milliseconds to first audio per line. Mitigation: recorded lines play instantly and carry the intro; free text is a short sentence; the client should show the subtitle immediately and start audio when it arrives, never block the camera moves on it.
- **Budget exhaustion.** Once the day's characters are spent, `/tts` returns 429 and the client falls back to subtitles for free text. Recorded lines are unaffected. The Cache API fallback counter is per data center, so use KV if the cap matters.
- **Cost surprises.** Rate limits and the budget bound abuse, but a plan with auto top-up would not stop spend. Keep top-up off.
- **Clone quality and consent.** An instant clone can drift on long or unusual sentences (names, numbers). Keep free text short and prefer recorded lines for numbers. The voice is DB's own, but visitors should not be misled: the Director says it is an AI if asked.
- **Cache only helps on a custom domain**, and is per data center, so a repeated sentence can still cost once per region.
- **Third party.** Text of the model's free text goes to ElevenLabs. Visitor messages are never sent to `/tts` by the Worker; only text the client chooses to voice.

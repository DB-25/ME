# Director voice (DB's cloned voice, rendered offline)

Free and local. Model: Resemble AI Chatterbox (MIT code and weights) running on
Apple Silicon through MLX (`mlx-audio`, weights `mlx-community/chatterbox-fp16`).
Nothing leaves the Mac. The site only ever serves pre-rendered mp3s.

Everything heavy lives outside the repo in `$VOICE_HOME`
(default `/private/tmp/claude-501/-Users-db-Burnes-Center-Fulltime-ME/2d0e1ee7-52d8-489a-b564-da766d0888ce/scratchpad/voice`):

```
$VOICE_HOME/.venv-mlx/   python 3.12 venv
$VOICE_HOME/ref/         ref_full.wav, ref_prompt.wav (the cleaned sample and the cloning prompt)
$VOICE_HOME/takes/       every rendered take, to audition or swap in by hand
$VOICE_HOME/qa-report.md duration, words per second, peak, flags per line
```

That folder is a temp path. To keep it, `export VOICE_HOME=~/voice-clone` and
redo the setup below (about 2 GB, model weights download on first run).

## 0. One-time setup (skip if `$VOICE_HOME/.venv-mlx` exists)

```bash
export VOICE_HOME=~/voice-clone && mkdir -p "$VOICE_HOME" && cd "$VOICE_HOME"
uv venv --python 3.12 .venv-mlx
uv pip install --python .venv-mlx/bin/python mlx-audio soundfile
```

Needs `ffmpeg` (`brew install ffmpeg`).

## 1. Record the sample (DB)

About 2 minutes, quiet room, phone or laptop mic 20 cm away, no music or fan.
Read in the voice you want the Director to have: calm, conversational, steady
pace, normal sentences (a few paragraphs of your own writing is ideal). Avoid
long pauses and stumbles. Save it as:

```
/Users/db/Burnes Center Fulltime/ME/voice-sample.m4a
```

Do not commit it (add `voice-sample.m4a` to `.gitignore`).

## 2. Prepare the sample

```bash
cd "/Users/db/Burnes Center Fulltime/ME"
scripts/voice/prepare-sample.sh            # or: scripts/voice/prepare-sample.sh path/to/other.m4a
```

Cleans the recording (80 Hz high-pass, gentle noise reduction, trim, -16 LUFS,
mono 24 kHz) and picks the best fluent 15 to 25 s stretch as the cloning prompt.
Listen to `$VOICE_HOME/ref/ref_prompt.wav` before rendering: it should be one clean
voice with no breaths cut mid-word. The model uses roughly the first 10 s of it.

## 3. Render everything

```bash
PY="$VOICE_HOME/.venv-mlx/bin/python"
"$PY" scripts/voice/render.py
```

Reads `scripts/voice/lines.json` (`[{id, text}]`), renders 2 takes per line, keeps the
one whose pace is closest to a calm read (about 2.6 words per second) and that does not
clip, and writes `public/voice/<id>.mp3` (mono, 24 kHz, 80 kbps, -16 LUFS, 120 ms fades)
plus `public/voice/manifest.json` (`{ ids, voice, generatedAt }`). Lines that already have an
mp3 are skipped, so an interrupted run resumes where it stopped.

Close Arc, Playwright and other heavy apps first: this is a 16 GB Mac and swapping
makes it several times slower.

## 4. Re-render one line (or a few)

```bash
"$PY" scripts/voice/render.py --only 811c5e32b8                  # same settings, new random take
"$PY" scripts/voice/render.py --only 811c5e32b8 --seed 99 --takes 4
"$PY" scripts/voice/render.py --force                            # redo every line
```

Not happy with the pick? Audition `$VOICE_HOME/takes/<id>.take1.mp3`, `.take2.mp3`
and copy the one you like over `public/voice/<id>.mp3`.

## Knobs

| flag | default | effect |
|---|---|---|
| `--exaggeration` | 0.35 | emotion. 0.25 flat, 0.5 lively, above 0.7 gets dramatic and unstable |
| `--cfg` | 0.3 | pacing and adherence. Lower is slower and calmer, higher is faster and more clipped |
| `--temperature` | 0.7 | variety between takes. Lower is steadier, higher is livelier and riskier |
| `--takes` | 2 | takes per line, best one kept |
| `--seed` | 7 | change it to get different takes |
| `--bitrate` | 80k | 64k to 96k |
| `--out` | `public/voice` | output folder (use a scratch folder to experiment) |
| `--ref` | `$VOICE_HOME/ref/ref_prompt.wav` | cloning prompt |

Pace too fast or flat: lower `--cfg` to 0.2 and raise `--exaggeration` to 0.45.
Weird mumbling on a line: re-render it with `--seed`, or reword it.

## Notes

- If `scripts/voice/lines.json` is missing the script renders 5 placeholder lines.
- Lines over 220 characters are split at sentence ends and joined with a short gap.
- The original PyTorch Chatterbox adds an inaudible Perth watermark to its output. The MLX port used here does not.
- `scripts/voice/manifest.mjs` (node) rebuilds `manifest.json` from the mp3s present if you
  hand-swap files.
- Licenses: Chatterbox MIT, mlx-audio MIT. Only clone your own voice.

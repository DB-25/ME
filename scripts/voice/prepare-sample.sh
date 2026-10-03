#!/usr/bin/env bash
# Clean DB's voice sample and cut the cloning prompt.
#
#   scripts/voice/prepare-sample.sh [input.m4a]
#
# Writes to $VOICE_HOME/ref (never into the repo):
#   ref_full.wav    whole recording, cleaned (mono, 24 kHz, -16 LUFS)
#   ref_prompt.wav  the best 15 to 25 s stretch of fluent speech, the cloning prompt
#
# Chain: 80 Hz high-pass, gentle afftdn noise reduction, trim silence (long
# internal pauses are shortened, not removed), loudnorm to -16 LUFS.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VOICE_HOME="${VOICE_HOME:-/private/tmp/claude-501/-Users-db-Burnes-Center-Fulltime-ME/2d0e1ee7-52d8-489a-b564-da766d0888ce/scratchpad/voice}"
IN="${1:-$REPO/voice-sample.m4a}"
SR=24000          # Chatterbox's native rate
MIN_PROMPT=15
MAX_PROMPT=25
PAUSE_DB=-40      # below this counts as a pause when picking the prompt
PAUSE_SEC=0.35

[ -f "$IN" ] || { echo "No sample at $IN. Record it first (see scripts/voice/README.md)." >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)." >&2; exit 1; }

OUT="$VOICE_HOME/ref"
mkdir -p "$OUT"
FULL="$OUT/ref_full.wav"
PROMPT="$OUT/ref_prompt.wav"

CLEAN="highpass=f=80,afftdn=nr=10:nf=-35:tn=1,\
silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1:stop_periods=-1:stop_duration=0.5:stop_threshold=-40dB:stop_silence=0.4"

# Two-pass loudnorm: measure, then apply linearly so speech dynamics are kept.
STATS="$(ffmpeg -hide_banner -nostats -i "$IN" -ac 1 -ar "$SR" \
  -af "$CLEAN,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
field() { printf '%s' "$STATS" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
NORM="loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(field input_i):measured_TP=$(field input_tp):measured_LRA=$(field input_lra):measured_thresh=$(field input_thresh):offset=$(field target_offset):linear=true"

ffmpeg -hide_banner -loglevel error -y -i "$IN" -ac 1 -af "$CLEAN,$NORM" -ar "$SR" -c:a pcm_s16le "$FULL"

TOTAL="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FULL")"
echo "cleaned reference: $(printf '%.1f' "$TOTAL")s -> $FULL"

# Find fluent speech runs from the silence map, then pick the best window.
SIL="$(ffmpeg -hide_banner -nostats -i "$FULL" -af "silencedetect=n=${PAUSE_DB}dB:d=${PAUSE_SEC}" -f null - 2>&1 \
  | grep -E 'silence_(start|end)' | sed -E 's/.*(silence_(start|end)): ([0-9.]+).*/\2 \3/')"

WINDOW="$(
  printf '%s\n' "$SIL" | awk -v total="$TOTAL" -v lo="$MIN_PROMPT" -v hi="$MAX_PROMPT" '
    # A speech run starts at 0 or at a silence end and stops at the next silence start.
    BEGIN { n = 0; cur = 0; open = 1 }
    $1=="start" { if (open && $2 > cur + 0.2) { rs[n]=cur; re[n]=$2; n++ } open=0 }
    $1=="end"   { cur = $2; open = 1 }
    END {
      if (open && total > cur + 0.2) { rs[n]=cur; re[n]=total; n++ }
      best = -1; bs = 0; be = 0
      for (i = 0; i < n; i++) {
        speech = 0; last = -1
        for (j = i; j < n; j++) {
          dur = re[j] - rs[i]
          if (dur > hi) break
          speech += re[j] - rs[j]
          if (dur >= lo) {
            score = speech / dur + 0.004 * dur   # fluent (few pauses) and a bit longer
            if (score > best) { best = score; bs = rs[i]; be = re[j] }
          }
        }
      }
      if (best < 0) { bs = 0; be = (total < hi ? total : hi) }
      printf "%.2f %.2f\n", bs, be - bs
    }')"

START="${WINDOW% *}"
LEN="${WINDOW#* }"
ffmpeg -hide_banner -loglevel error -y -ss "$START" -t "$LEN" -i "$FULL" \
  -af "afade=t=in:d=0.03,afade=t=out:st=$(awk -v l="$LEN" 'BEGIN{printf "%.2f", l-0.05}'):d=0.05" \
  -ar "$SR" -ac 1 -c:a pcm_s16le "$PROMPT"
echo "cloning prompt: ${LEN}s starting at ${START}s -> $PROMPT"
if awk -v t="$TOTAL" -v lo="$MIN_PROMPT" 'BEGIN{exit !(t < lo)}'; then
  echo "warning: the sample is shorter than ${MIN_PROMPT}s, record about two minutes for a better clone." >&2
fi

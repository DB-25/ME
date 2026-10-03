#!/usr/bin/env bash
# Encode an approved /brag render for the web: H.264, faststart, AAC, plus a poster JPG.
# Usage: scripts/encode-film.sh <slug> [vertical]
#   landscape: .brag/<slug>/brag.mp4          -> public/films/<slug>.mp4 (+ .jpg)
#   vertical:  .brag/<slug>/brag-vertical.mp4 -> public/films/<slug>-vertical.mp4 (+ .jpg)
set -euo pipefail
SLUG="$1"
VARIANT="${2:-}"
SUFFIX=""
POSTER_MAX=1600
if [ "$VARIANT" = "vertical" ]; then
  SUFFIX="-vertical"
  POSTER_MAX=1280
fi
SRC=".brag/$SLUG/brag$SUFFIX.mp4"
OUT="public/films/$SLUG$SUFFIX"
mkdir -p public/films
ffmpeg -loglevel error -y -i "$SRC" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 128k \
  "$OUT.mp4"
if [ -f ".brag/$SLUG/brag$SUFFIX.jpg" ]; then
  sips -s format jpeg -s formatOptions 82 -Z "$POSTER_MAX" ".brag/$SLUG/brag$SUFFIX.jpg" --out "$OUT.jpg" >/dev/null
else
  ffmpeg -loglevel error -y -ss 1.5 -i "$SRC" -frames:v 1 "$OUT.jpg"
fi
ls -lh "$OUT.mp4" "$OUT.jpg"

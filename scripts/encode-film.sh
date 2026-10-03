#!/usr/bin/env bash
# Encode an approved /brag render for the web: H.264 1080p, faststart, quiet AAC,
# plus a poster JPG. Usage: scripts/encode-film.sh <slug>   (reads .brag/<slug>/brag.mp4)
set -euo pipefail
SLUG="$1"
SRC=".brag/$SLUG/brag.mp4"
OUT_DIR="public/films"
mkdir -p "$OUT_DIR"
ffmpeg -loglevel error -y -i "$SRC" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 128k \
  "$OUT_DIR/$SLUG.mp4"
if [ -f ".brag/$SLUG/brag.jpg" ]; then
  sips -s format jpeg -s formatOptions 82 -Z 1600 ".brag/$SLUG/brag.jpg" --out "$OUT_DIR/$SLUG.jpg" >/dev/null
else
  ffmpeg -loglevel error -y -ss 1.5 -i "$SRC" -frames:v 1 -vf scale=1600:-2 "$OUT_DIR/$SLUG.jpg"
fi
ls -lh "$OUT_DIR/$SLUG.mp4" "$OUT_DIR/$SLUG.jpg"

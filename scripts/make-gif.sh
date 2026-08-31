#!/usr/bin/env bash
# make-gif.sh — webm → palette GIF for docs/demo.gif (two-pass, no PNG
# intermediates: extracting PNG frames was the slow path; the palette
# pipeline runs straight off the video and finishes in seconds).
set -euo pipefail
SRC="${1:-tool-results/r5-demo.webm}"
OUT="${2:-docs/demo.gif}"
FPS="${3:-12}"
W="${4:-960}"
TMP=tool-results/gifwork
mkdir -p "$TMP"
PALETTE="$TMP/palette.png"

echo "[1/2] palette (stats_mode=diff)…"
ffmpeg -y -v error -i "$SRC" \
  -vf "fps=$FPS,scale=$W:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "$PALETTE"

echo "[2/2] gif…"
ffmpeg -y -v error -i "$SRC" -i "$PALETTE" \
  -lavfi "fps=$FPS,scale=$W:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4" \
  -loop 0 "$OUT"
ls -la "$OUT"

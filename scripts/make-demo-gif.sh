#!/usr/bin/env bash
# make-demo-gif.sh — drive the real golden path through the running app,
# capture frames at every beat, assemble the README demo GIF with ffmpeg.
# Requires: dev server on :3000, agent-browser CLI, ffmpeg.
set -euo pipefail

FRAMES=/tmp/customs-frames
OUT="docs/demo.gif"
mkdir -p "$FRAMES"
rm -f "$FRAMES"/*.png

n=0
shot() { n=$((n+1)); agent-browser screenshot "$FRAMES/$(printf '%02d' $n)-$1.png" >/dev/null; }
waitms() { sleep "$1"; }

# clean, reproducible demo state
curl -s -X POST http://localhost:3000/api/reset > /dev/null

# ---- 1. landing ----
agent-browser open http://localhost:3000 >/dev/null
waitms 3.5
shot landing-hero
agent-browser scroll down 800 >/dev/null
waitms 1.5
shot landing-live-ticker

# ---- 2. the agent playground ----
agent-browser click '[aria-label="enter the agent playground"]' >/dev/null
waitms 3
shot playground-open

agent-browser fill '[aria-label="message the agent"]' "search headphones under 5000" >/dev/null
agent-browser press Enter >/dev/null
waitms 1
shot agent-thinking
waitms 2.5
shot search-results

agent-browser fill '[aria-label="message the agent"]' "add bud-pro-earbuds" >/dev/null
agent-browser press Enter >/dev/null
waitms 2.5
shot item-added

agent-browser fill '[aria-label="message the agent"]' "checkout" >/dev/null
agent-browser press Enter >/dev/null
waitms 3
shot tier-refusal

agent-browser fill '[aria-label="message the agent"]' "attest" >/dev/null
agent-browser press Enter >/dev/null
waitms 2.5

agent-browser fill '[aria-label="message the agent"]' "checkout" >/dev/null
agent-browser press Enter >/dev/null
waitms 3
shot mandate-card

agent-browser click '[title="Approve the mandate envelope and bind"]' >/dev/null
waitms 1
shot gate-checklist
waitms 4
shot capture-receipt

# ---- 3. the control room ----
agent-browser click '[aria-label="view control room"]' >/dev/null
waitms 4
shot control-room-meter
agent-browser scroll down 700 >/dev/null
waitms 1.5
shot control-room-ledger

# ---- assemble: 2.2s per beat, palette-optimized, 1000px wide ----
ffmpeg -y -hide_banner -loglevel error \
  -framerate 0.45 -pattern_type glob -i "$FRAMES/*.png" \
  -vf "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
  "$OUT"

echo "frames: $n → $OUT ($(du -h "$OUT" | cut -f1))"

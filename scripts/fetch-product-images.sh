#!/usr/bin/env bash
# fetch-product-images.sh — product photography for the Fieldnote Supply catalog.
# z-ai image-search prints JSON to stdout (the -o flag is unreliable), so we
# capture stdout and extract the first {…} block. Idempotent: skips existing.
set -u
OUT="public/products"
mkdir -p "$OUT"
EXTRACT=/tmp/imgsearch_extract.py

declare -A QUERIES=(
  ["trail-anc-headphones"]="premium over-ear noise cancelling wireless headphones product photo on clean background"
  ["field-mech-65"]="compact 65 percent mechanical keyboard product photo on clean background"
  ["ridge-mouse"]="minimal wireless computer mouse product photo on clean background"
  ["arc-light-bar"]="desk monitor light bar lamp product photo on clean background"
  ["port-webcam-2k"]="small 2k webcam product photo on clean background"
  ["vault-ssd-1tb"]="portable ssd external solid state drive product photo on clean background"
  ["cell-powerbank-20k"]="slim power bank battery pack product photo on clean background"
  ["junction-hub-7"]="usb-c hub docking station product photo on clean background"
  ["slate-desk-mat"]="dark wool felt desk mat product photo on clean background"
  ["riser-stand"]="foldable aluminum laptop stand product photo on clean background"
  ["paper-ereader"]="e-reader e-ink tablet device product photo on clean background"
  ["bud-pro-earbuds"]="wireless earbuds with charging case product photo on clean background"
  ["beacon-speaker"]="compact bluetooth speaker product photo on clean background"
  ["sentry-dashcam"]="dash camera for car product photo on clean background"
  ["pocket-multitool"]="pocket multitool pliers folded product photo on clean background"
  ["traverse-backpack-22"]="minimal black travel backpack product photo on clean background"
  ["globe-adapter"]="universal travel power adapter product photo on clean background"
  ["temp-ir-thermometer"]="infrared thermometer gun product photo on clean background"
  ["signal-router"]="wifi router product photo on clean background"
  ["summit-drone-4k"]="compact folding camera drone product photo on clean background"
)

search() {
  # $1 slug, $2 query, $3 min-width
  local f="$OUT/$1.jpg"
  if [ -s "$f" ]; then echo "skip $1 (exists)"; return 0; fi
  echo "search: $1"
  z-ai image-search -q "$2" --count 4 --gl us --no-rank > "/tmp/imgs_$1.txt" 2>/dev/null || true
  local url
  url=$(python3 "$EXTRACT" "/tmp/imgs_$1.txt" 2>/dev/null)
  if [ -z "$url" ]; then echo "  MISS $1"; return 1; fi
  curl -sL --max-time 60 -o "$f" "$url" && echo "  ok $1 ($(du -h "$f" | cut -f1))" || echo "  DLFAIL $1"
  rm -f "/tmp/imgs_$1.txt"
}

for slug in "${!QUERIES[@]}"; do
  search "$slug" "${QUERIES[$slug]}"
done

# hero: port freight — treated with duotone overlay in CSS
if [ ! -s "public/hero-customs.jpg" ]; then
  z-ai image-search -q "stacked shipping containers at cargo port terminal dusk" --count 4 --gl us --no-rank > /tmp/imgs_hero.txt 2>/dev/null || true
  hurl=$(python3 "$EXTRACT" /tmp/imgs_hero.txt 2>/dev/null)
  [ -n "$hurl" ] && curl -sL --max-time 90 -o public/hero-customs.jpg "$hurl" && echo "hero ok"
  rm -f /tmp/imgs_hero.txt
fi
echo "done: $(ls "$OUT" | wc -l) product files"

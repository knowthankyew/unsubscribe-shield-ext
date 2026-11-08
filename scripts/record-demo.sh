#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Recording Unsubscribe Shield Automated Walkthrough ==="

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required to run Playwright."
  exit 1
fi

node scripts/record-demo.js

if command -v ffmpeg >/dev/null 2>&1; then
  echo "Converting demo recording to demo.gif..."
  ffmpeg -y -i demo.mp4 -vf "fps=15,scale=760:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" demo.gif
  echo "✓ demo.gif generated."
fi

echo "✓ Walkthrough recording complete: demo.mp4"

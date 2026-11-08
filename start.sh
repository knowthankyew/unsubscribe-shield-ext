#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Starting Unsubscribe Shield Extension Preview ==="

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Running architectural claims audit..."
npm run audit:claims

echo "Running unit tests..."
npm run test:unit

echo "Building extension bundle..."
npm run build

echo "Opening interactive popup preview..."
if command -v open >/dev/null 2>&1; then
  open "src/popup/index.html"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "src/popup/index.html"
fi

echo "✓ Unsubscribe Shield preview is open."

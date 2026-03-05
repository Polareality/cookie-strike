#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
npm ci --no-audit --no-fund

# Cache dirs (Render build cache-friendly)
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/opt/render/.cache}"
export PUPPETEER_CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/.cache/puppeteer}"

mkdir -p "$XDG_CACHE_HOME" "$PUPPETEER_CACHE_DIR"

echo "Installing Puppeteer Chrome into cache dir: $PUPPETEER_CACHE_DIR"
npx puppeteer browsers install chrome

echo "Build script completed successfully."

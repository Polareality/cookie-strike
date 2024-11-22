#!/usr/bin/env bash
# Exit on errors
set -o errexit

# Install dependencies
npm install

# Uncomment if a build process is needed
# npm run build 

# Ensure Puppeteer dependencies are available
echo "Ensuring Puppeteer dependencies are installed..."

# Remove sudo commands to comply with Render's restricted environment
# Pre-installed Puppeteer dependencies are typically sufficient

# Manage Puppeteer cache with build cache
export PUPPETEER_CACHE_DIR=${PUPPETEER_CACHE_DIR:-/opt/render/.cache/puppeteer}
export XDG_CACHE_HOME=${XDG_CACHE_HOME:-/opt/render/.cache}

if [[ ! -d "$PUPPETEER_CACHE_DIR" ]]; then 
  echo "...Copying Puppeteer Cache from Build Cache" 
  mkdir -p "$PUPPETEER_CACHE_DIR"
  cp -R "$XDG_CACHE_HOME/puppeteer/" "$PUPPETEER_CACHE_DIR" || echo "No Puppeteer cache found to copy."
else 
  echo "...Storing Puppeteer Cache in Build Cache" 
  cp -R "$PUPPETEER_CACHE_DIR" "$XDG_CACHE_HOME" || echo "No Puppeteer cache found to store."
fi

echo "Build script completed successfully."


#!/usr/bin/env bash
# Exit on errors
set -o errexit

# Install dependencies
npm install
# Uncomment if a build process is needed
# npm run build 
# Ensure Puppeteer dependencies are installed

# Update package manager
sudo apt-get update

# Install Puppeteer dependencies
sudo apt-get install -y \
    wget gnupg ca-certificates \
    libnss3 libatk-bridge2.0-0 libxcomposite1 \
    libxrandr2 libxdamage1 libasound2 \
    libpangocairo-1.0-0 libcups2 \
    libpangoft2-1.0-0 libxss1 libxtst6

# Manage Puppeteer cache with build cache
if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then 
  echo "...Copying Puppeteer Cache from Build Cache" 
  cp -R $XDG_CACHE_HOME/puppeteer/ $PUPPETEER_CACHE_DIR
else 
  echo "...Storing Puppeteer Cache in Build Cache" 
  cp -R $PUPPETEER_CACHE_DIR $XDG_CACHE_HOME
fi

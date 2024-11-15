# Use an official Node.js image with Chromium pre-installed
FROM node:16-slim

# Install dependencies needed for Puppeteer (including Chromium)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libxcomposite1 \
    libxrandr2 \
    libnss3 \
    libxss1 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Puppeteer globally (it will automatically download Chromium)
RUN npm install -g puppeteer

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your application
COPY . .

# Expose the port your app will run on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]


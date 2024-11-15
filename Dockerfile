# Use an official Node.js image as a base
FROM node:16-slim

# Install dependencies needed for Puppeteer (including Chromium and system libraries)
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
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install

# Install Puppeteer
RUN npm install puppeteer

# Copy the rest of your application code to the container
COPY . .

# Expose the port your app will run on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]

CMD ["node", "server.js"]

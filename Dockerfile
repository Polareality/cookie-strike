# Use a Node.js image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:latest

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

FROM node:18-alpine

# Install Python, pip, ffmpeg and yt-dlp
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages yt-dlp

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy server source code
COPY . .

# Expose ports (default config uses 3000 and 3001)
EXPOSE 3000
EXPOSE 3001

# Command to run the server
CMD ["node", "index.js"]

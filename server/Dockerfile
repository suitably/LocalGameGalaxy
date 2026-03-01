FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy server source code
COPY . .

# Expose ports (default config uses 3000 and 3001)
EXPOSE 3000
EXPOSE 3001

# Command to run the server
CMD ["node", "index.js"]

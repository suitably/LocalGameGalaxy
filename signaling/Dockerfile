FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src ./src

# Default environment configuration
ENV NODE_ENV=production \
    PORT=8000 \
    HOST=0.0.0.0

EXPOSE 8000

# Container health check using built-in /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

# Run as non-privileged node user for security
USER node

CMD ["node", "src/index.js"]

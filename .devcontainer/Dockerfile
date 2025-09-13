# Dev Container Dockerfile for Remote Job Scout
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for development
RUN apk add --no-cache \
    curl \
    git \
    bash \
    openssh-client \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Install global npm packages for development
RUN npm install -g \
    typescript \
    tsx \
    nodemon \
    @types/node

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command for development
CMD ["npm", "run", "dev"]




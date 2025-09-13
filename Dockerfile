# Runtime-only Dockerfile for Remote Job Scout (expects prebuilt dist/)
FROM node:18-alpine AS runtime

# Install dumb-init and curl for proper signal handling and healthchecks
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy prebuilt artifacts (must exist on build context)
COPY --chown=nextjs:nodejs dist ./dist

# Switch to non-root user
USER nextjs

# Environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the prebuilt server directly
CMD ["node", "dist/server/server/index.js"]

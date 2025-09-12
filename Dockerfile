# Dockerfile for Remote Job Scout Development Environment
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app && \
    mkdir -p /deno-dir && \
    chown -R appuser:appuser /deno-dir
USER appuser

# Set Deno cache directory
ENV DENO_DIR=/deno-dir

# Copy deno configuration (source code will be mounted as volumes)
COPY --chown=appuser:appuser deno.json deno.lock run.ts run ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Default command for development
CMD ["deno", "serve", "--watch", "--allow-net", "--allow-read", "--allow-write", "--allow-run", "--allow-env", "--port", "3000", "--watch-exclude=node_modules", "--watch-exclude=.git", "--watch-exclude=dist", "--watch-exclude=build", "src/web/server.ts", "src/types/", "src/services/", "src/web/"]

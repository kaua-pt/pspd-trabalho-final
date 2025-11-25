# Multi-stage build for QR Generator REST service
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --omit=dev && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S qr-service -u 1001

# Set working directory
WORKDIR /app

# Copy package files and installed dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy application source
COPY --chown=qr-service:nodejs src/ ./src/

# Create directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R qr-service:nodejs /app

# Switch to non-root user
USER qr-service

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8082/health', (res) => { \
        if (res.statusCode === 200) { \
            process.exit(0); \
        } else { \
            console.error('Health check failed:', res.statusCode); \
            process.exit(1); \
        } \
    }).on('error', (err) => { \
        console.error('Health check error:', err.message); \
        process.exit(1); \
    })" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=8082
ENV LOG_LEVEL=info

# Labels for metadata
LABEL maintainer="PSPD Lab Team"
LABEL service="qr-generator-rest"
LABEL version="1.0.0"
LABEL description="QR Code Generator REST API service for academic gRPC vs REST comparison"

# Use dumb-init as PID 1 to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
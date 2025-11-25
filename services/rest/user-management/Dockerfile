# Multi-stage build for User Management REST service
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S user-mgmt -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --chown=user-mgmt:nodejs src/ ./src/

RUN mkdir -p /app/logs && chown -R user-mgmt:nodejs /app

USER user-mgmt

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { \
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

ENV NODE_ENV=production
ENV PORT=8080
ENV LOG_LEVEL=info

LABEL maintainer="PSPD Lab Team"
LABEL service="user-management-rest"
LABEL version="1.0.0"
LABEL description="User Management REST API service"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
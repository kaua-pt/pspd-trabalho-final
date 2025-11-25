# Multi-stage build for URL Shortener REST service
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S url-service -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --chown=url-service:nodejs src/ ./src/

RUN mkdir -p /app/logs && chown -R url-service:nodejs /app

USER url-service

EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8083/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1))" || exit 1

ENV NODE_ENV=production
ENV PORT=8083
ENV LOG_LEVEL=info

LABEL maintainer="PSPD Lab Team"
LABEL service="url-shortener-rest"
LABEL version="1.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
# =============================================================================
# Multi-stage Dockerfile for GroupDrive Seller Portal (@groupdrive/seller-web)
# Next.js 14 Standalone Mode, Non-Root User, Optimized Size with Health Check
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies & Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Copy monorepo dependency manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/seller-web/package.json ./apps/seller-web/

# Install full dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/seller-web ./apps/seller-web

# Build shared packages
RUN pnpm --filter @groupdrive/shared run build

# Build Next.js in standalone mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @groupdrive/seller-web run build

# -----------------------------------------------------------------------------
# Stage 2: Minimal Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy public assets & standalone build output
COPY --from=builder /app/apps/seller-web/public ./apps/seller-web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/seller-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/seller-web/.next/static ./apps/seller-web/.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

CMD ["node", "apps/seller-web/server.js"]

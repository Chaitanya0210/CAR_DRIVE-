# =============================================================================
# Multi-stage Dockerfile for GroupDrive NestJS Core API (@groupdrive/api)
# Production-ready, non-root user, minimal alpine footprint with health check
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies & Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Copy monorepo dependency manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# Install full dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# Generate Prisma Client
RUN pnpm --filter @groupdrive/db run prisma:generate

# Build workspace packages and API application
RUN pnpm --filter @groupdrive/shared run build
RUN pnpm --filter @groupdrive/api run build

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Security: Non-root application user
RUN addgroup -g 10001 -S groupdrive && \
    adduser -u 10001 -S appuser -G groupdrive

ENV NODE_ENV=production
ENV PORT=4000

# Copy built artifacts and runtime node_modules
COPY --from=builder --chown=appuser:groupdrive /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:groupdrive /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=appuser:groupdrive /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=appuser:groupdrive /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=appuser:groupdrive /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=appuser:groupdrive /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:groupdrive /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]

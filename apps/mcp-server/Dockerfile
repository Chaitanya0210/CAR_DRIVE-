# =============================================================================
# Multi-stage Dockerfile for GroupDrive MCP Server (@groupdrive/mcp-server)
# Production-ready, non-root user, minimal alpine footprint
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/mcp-server/package.json ./apps/mcp-server/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/mcp-server ./apps/mcp-server

RUN pnpm --filter @groupdrive/shared run build
RUN pnpm --filter @groupdrive/mcp-server run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -g 10003 -S groupdrive && \
    adduser -u 10003 -S mcpuser -G groupdrive

ENV NODE_ENV=production

COPY --from=builder --chown=mcpuser:groupdrive /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:groupdrive /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=mcpuser:groupdrive /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=mcpuser:groupdrive /app/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=builder --chown=mcpuser:groupdrive /app/apps/mcp-server/package.json ./apps/mcp-server/package.json

WORKDIR /app/apps/mcp-server

USER mcpuser

CMD ["node", "dist/index.js"]

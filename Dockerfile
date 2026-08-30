# service-catalog — Next.js 15 standalone (@service-catalog/web), linux/amd64.
#
# Cluster nodes are linux/amd64; this repo is edited from an arm64 Mac, so the
# published image is built in GitHub Actions (same reason as i258-net/honeycomb).
#
# Catalog data is NOT baked in. In-cluster, git-sync mounts i258-net/catalog and
# SERVICE_CATALOG points at that worktree. The sample-catalog tree is dev-only.

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/
COPY packages/cli/package.json packages/cli/
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @service-catalog/core build \
 && pnpm --filter @service-catalog/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "packages/web/server.js"]

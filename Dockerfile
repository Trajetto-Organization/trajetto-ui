# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------
# STAGE 1: Base (Node, certs, dumb-init)
# ---------------------------------------------------------
FROM node:22.21.1-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ---------------------------------------------------------
# STAGE 2: Builder (Install and Compile)
# ---------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG METADATA_BASE
ARG NEXT_PUBLIC_HTTP_REQUEST
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET

ENV METADATA_BASE=$METADATA_BASE
ENV NEXT_PUBLIC_HTTP_REQUEST=$NEXT_PUBLIC_HTTP_REQUEST
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET

RUN yarn build

# ---------------------------------------------------------
# STAGE 3: Runner (Production)
# ---------------------------------------------------------
FROM base AS runner

LABEL org.opencontainers.image.source="https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui"
LABEL org.opencontainers.image.description="Trajetto UI (Next.js 14 standalone)"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir .next \
    && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]

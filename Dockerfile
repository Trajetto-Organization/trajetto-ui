# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------
# STAGE 1: Base (Node, certs, dumb-init)
# ---------------------------------------------------------
# Node 22 LTS on Alpine; version pinned for reproducible builds. Alpine keeps
# the base around 100 MB smaller than Debian slim, which dominated this image:
# the Next standalone output is only ~65 MB.
#
# Alpine uses musl instead of glibc. The one native dependency that matters here
# is sharp, used by the Next image optimizer at runtime — yarn resolves the
# musl variant automatically because the install runs inside this container.
FROM node:22.21.1-alpine AS base

RUN apk add --no-cache ca-certificates dumb-init

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

# sharp publishes one package per platform and the standalone trace carries both
# the glibc and the musl builds. On Alpine only the musl one is ever loaded, so
# the glibc pair is ~17 MB of dead weight. This runs BEFORE the runner copies
# the output — deleting after the COPY would only add a whiteout layer and
# reclaim nothing, since image layers are additive.
#
# If the base image ever goes back to Debian, REMOVE this step — otherwise sharp
# is left without a binary and the Next image optimizer breaks at runtime.
RUN rm -rf \
    .next/standalone/node_modules/@img/sharp-libvips-linux-x64 \
    .next/standalone/node_modules/@img/sharp-linux-x64

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

# busybox syntax. `--ingroup` is explicit here: without it the user lands in
# `nogroup`, which the previous Debian build warned about on every run.
RUN addgroup --gid 1001 --system nodejs \
    && adduser --uid 1001 --system --ingroup nodejs --shell /bin/sh nextjs \
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

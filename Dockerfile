# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

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
#
# Pinned by digest too (INFRA-16): a tag can be re-pushed, a digest cannot.
# Dependabot (docker ecosystem) moves the tag and the digest together.
FROM node:22.21.1-alpine@sha256:0340fa682d72068edf603c305bfbc10e23219fb0e40df58d9ea4d6f33a9798bf AS base

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

# ONE image for staging and production (decision 12.2): nothing that differs
# between them is passed here. The API URL, socket URL, Turnstile site key,
# map tiles and APP_ENV are read by the server at run time and handed to the
# browser (src/env); the Dokploy Application's Environment sets them
# (docs/deploy.md, docs/variaveis-de-ambiente.md).
#
# METADATA_BASE is the one build value besides the commit: the pages
# prerendered at build (landing, blog, legal) print canonical and Open Graph
# URLs, and those must name production's origin in both environments.
# Staging is never indexed (robots and X-Robots-Tag read APP_ENV per
# request), so a staging page whose canonical names production is correct.
ARG METADATA_BASE

ENV METADATA_BASE=$METADATA_BASE

# The commit this image is built from, inlined into the bundle and served at
# /build-id.json: an open tab compares the two to notice a deploy left it on
# the old build. Empty (a local build) turns that check off. The only
# NEXT_PUBLIC_ value left, on purpose: it names the build, which is the same
# in every environment, and the tab must carry its own copy.
ARG GIT_SHA
ENV NEXT_PUBLIC_BUILD_SHA=$GIT_SHA

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

LABEL org.opencontainers.image.source="https://github.com/Trajetto-Organization/trajetto-ui"
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

# busybox wget rather than `node -e`: measured in this base image, ~1 MB and
# ~1 ms per probe against ~52 MB and ~54 ms for a Node process, inside the
# container's memory limit. 127.0.0.1: busybox tries only the first address.
# The Dokploy Application's Swarm settings override the timings (longer start
# period, more retries) with this same command (docs/deploy.md, section 6.4).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]

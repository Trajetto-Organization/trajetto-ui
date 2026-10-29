# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

# ---------------------------------------------------------
# STAGE 1: Node (the official image: it builds the app and lends the
# runtime its node binary)
# ---------------------------------------------------------
# Node 22 LTS on Alpine; version pinned for reproducible builds. Alpine uses
# musl instead of glibc. The one native dependency that matters here is
# sharp, used by the Next image optimizer at runtime — yarn resolves the musl
# variant automatically because the install runs inside this container.
#
# Pinned by digest too (INFRA-16): a tag can be re-pushed, a digest cannot.
# Dependabot (docker ecosystem) moves the tag and the digest together. The
# tag names its Alpine minor: the runtime base below must be the same one,
# because this binary is built against that minor's musl and libstdc++
# (tests/unitaires/image-layers.test.ts holds the two together).
FROM node:22.23.4-alpine3.23@sha256:6abbcf5dd6b231da109bcde1181db1d92bf78015ae1a9514d9807c1f857869db AS node

# ---------------------------------------------------------
# STAGE 2: The node binary, as a reproducible tree
# ---------------------------------------------------------
# Copied straight to /usr/local/bin, the layer gets /usr, /usr/local and
# /usr/local/bin stamped with the build's time: every uncached build (a new
# runner, an evicted GitHub cache) made a new ~46 MB blob of the same binary,
# and the server pulled it again. Here the directories take the binary's own
# mtime, so the layer is a function of the Node image digest alone — the same
# blob in every build, and in the API image, whose Dockerfile has this exact
# stage and base digests (keep the two in step): the VPS stores and pulls it
# once for both (measured 28/10/2026: one blob, 46.1 MB compressed).
FROM node AS node-binary

RUN mkdir -p /out/usr/local/bin \
    && cp -p /usr/local/bin/node /out/usr/local/bin/node \
    && touch -h -r /usr/local/bin/node /out/usr/local/bin /out/usr/local /out/usr

# ---------------------------------------------------------
# STAGE 3: Runtime base (Alpine + the node binary, nothing else)
# ---------------------------------------------------------
# The runtime is `node server.js`: no package manager. The Node image's other
# layers (npm, corepack, yarn, C headers: ~25 MB) used to come along, and a
# later `rm -rf` only hid them — layers are additive, so every pull still
# carried them. Starting from Alpine and copying the one binary leaves them
# out for real (measured 28/10/2026, same sources: 256 → 216 MB unpacked,
# 79 → 71 MB compressed).
#
# node and sharp's libvips link against musl, libstdc++ and libgcc only
# (ldd). Node bundles its own OpenSSL, CA store and full ICU — pt-BR dates
# and America/Sao_Paulo need no tzdata package (the Node image had none
# either).
FROM alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS base

# First, and `--link`: a layer of its own that does not depend on the
# Alpine one below, so an Alpine patch bump leaves this ~46 MB (compressed)
# layer's digest as it was and the server does not pull it again.
COPY --link --from=node-binary /out/ /

# The OpenSSL upgrade takes Alpine's fixes at build time without waiting for
# a new base digest (the scan once flagged libcrypto3 3.5.4 with 3.5.6 out);
# busybox (wget, the HEALTHCHECK) uses it, node does not.
RUN apk upgrade --no-cache libcrypto3 libssl3 \
    && apk add --no-cache ca-certificates dumb-init libstdc++

# ---------------------------------------------------------
# STAGE 4: Builder (Install and Compile)
# ---------------------------------------------------------
FROM node AS builder

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

# The traced dependencies leave the standalone output so the runner can copy
# them as a layer of their own (see there).
RUN mv .next/standalone/node_modules /app/standalone-node_modules

# ---------------------------------------------------------
# STAGE 5: Runner (Production)
# ---------------------------------------------------------
FROM base AS runner

LABEL org.opencontainers.image.source="https://github.com/Trajetto-Organization/trajetto-ui"
LABEL org.opencontainers.image.description="Trajetto UI (Next.js 14 standalone)"
LABEL org.opencontainers.image.licenses="LicenseRef-Trajetto-Proprietary"

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

# Most stable first. The standalone output mixes the traced node_modules
# (~13.5 MB compressed: the same bytes until a dependency changes) with the
# server code every commit rebuilds; one COPY made them one layer, so every
# deploy re-sent the unchanged dependencies over the VPS's flaky route to
# GHCR. Apart, the node_modules COPY is cached by its content and keeps its
# digest from one commit to the next (measured: a source-only change re-ships
# 6.2 MB compressed instead of 19.7). Same files, paths, modes and owners as
# the single COPY (compared file by file on 28/10/2026).
COPY --from=builder --chown=nextjs:nodejs /app/standalone-node_modules ./node_modules
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

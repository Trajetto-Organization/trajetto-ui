# ---------------------------------------------------------
# STAGE 1: Base (Node and Yarn)
# ---------------------------------------------------------
FROM node:20-slim AS base

# Install necessary dependencies for native libraries and certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# STAGE 2: Builder (Install and Compile)
# ---------------------------------------------------------
FROM base AS builder

WORKDIR /app

# First, copy ONLY the dependency files
# This ensures that the Docker layer cache is not invalidated if you only change source code
COPY package.json yarn.lock ./

# Installs all dependencies (including devDependencies required for the build)
RUN yarn install --frozen-lockfile

# Now, copy the rest of the source code
COPY . .

# Set this as the production environment to optimize the Webpack/Next build
ENV NODE_ENV=production

# Build-time environment variables for Next.js
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

# Disable Next.js telemetry (slightly improves build time)
ENV NEXT_TELEMETRY_DISABLED=1

# Compiles the application, generating the .next/standalone folder
RUN yarn build

# ---------------------------------------------------------
# STAGE 3: Runner (Production)
# ---------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ARG HOSTNAME
ENV HOSTNAME=${HOSTNAME:-0.0.0.0}

# Creating a non-root user for security reasons
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Creates and adjusts permissions for the Next temporary folder
RUN mkdir .next
RUN chown nextjs:nodejs .next

# IMPORTANT: Copy only what is strictly necessary to run (without the original node_modules!)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy the standalone structure (which includes server.js and a standalone mini-node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copies the static assets generated in the build
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the user without root privileges
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
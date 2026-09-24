# syntax=docker/dockerfile:1

# ============================================================
# AI Toolbox — Docker image for Render (and any Docker host)
# Node.js runtime + Python for the backend YouTube downloader
# (yt-dlp). The download route also auto-installs yt-dlp at
# first use, but preinstalling here skips that wait.
# ============================================================

# ---- Stage 1: build the Next.js app ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: runtime (Node + Python + yt-dlp) ----
FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Python 3 + yt-dlp for the server-side YouTube downloader.
# The download script avoids ffmpeg (m4a audio / mp4 video only),
# so no extra media dependencies are needed.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && ln -s /usr/bin/python3 /usr/bin/python \
  && python3 -m pip install --no-cache-dir yt-dlp

# App files (node_modules copied wholesale: simple, reliable for Next start)
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next-env.d.ts ./next-env.d.ts

EXPOSE 3001

# Render injects $PORT (default 10000); fall back to 3001 elsewhere.
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3001}"]
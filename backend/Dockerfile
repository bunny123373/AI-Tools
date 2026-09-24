# AI Toolbox — YouTube tools backend image.
# Python 3.12 + ffmpeg (used by yt-dlp to merge video/audio into MP4 and to
# extract MP3 audio) + Node.js 22 (runtime for the bgutil PO token provider).
# Deploys on Render (free tier).
FROM python:3.12-slim-bookworm

# ffmpeg: media merge/transcode. curl + ca-certificates: nodesource setup.
# git: to fetch the bgutil PO token provider source at build time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates git \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# bgutil PO token provider (Node side of bgutil-ytdlp-pot-provider). yt-dlp
# calls this script to mint per-video proof-of-origin tokens, which is what
# lets YouTube downloads work from a datacenter IP without cookies. Env var
# YT_BGUTIL_HOME makes the path overridable; app.py only wires the extractor
# arg when the directory exists.
ARG BGUTIL_VERSION=2.0.0
RUN git clone --single-branch --branch ${BGUTIL_VERSION} \
        https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-ytdlp-pot-provider \
    && cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc \
    && node build/main.js --help > /dev/null

COPY . .

EXPOSE 10000

# 1 worker keeps free-tier memory predictable on big downloads; long timeout
# for large files. Render injects $PORT.
CMD gunicorn app:app --bind "0.0.0.0:${PORT:-10000}" --workers 1 --timeout 900 --access-logfile -
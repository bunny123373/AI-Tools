# AI Toolbox — YouTube tools backend image.
# Python 3.12 + ffmpeg (used by yt-dlp to merge video/audio into MP4 and to
# extract MP3 audio). Deploys on Render (free tier).
FROM python:3.12-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

# 1 worker keeps free-tier memory predictable on big downloads; long timeout
# for large files. Render injects $PORT.
CMD gunicorn app:app --bind "0.0.0.0:${PORT:-10000}" --workers 1 --timeout 900 --access-logfile -
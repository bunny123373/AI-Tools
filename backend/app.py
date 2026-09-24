"""AI Toolbox — YouTube tools backend (Python/Flask, deploys to Render).

Endpoints:
  GET  /health                     → {"ok": true}
  POST /youtube/info        {url}            → video metadata
  POST /youtube/transcript  {url}            → {transcript, lang, label}
  POST /youtube/duration    {urls}           → playlist total (one link per line)
  GET  /youtube/thumb?url=...                → jpeg bytes
  POST /youtube/download    {url, kind}      → file (kind: audio|video)

Download engine: yt-dlp + ffmpeg. ffmpeg (installed in the Docker image)
merges bestvideo+bestaudio into an MP4 and extracts High-Quality M4A audio.
CORS is wide open: the frontend lives on Vercel, a different origin.
"""
import os
import re
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor

import requests
import yt_dlp
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi

app = Flask(__name__)
CORS(app)

MAX_URLS = 60
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Countries known to NOT require a YouTube consent gate, used as the
# Accept-Language hint on every outbound request.
DEFAULT_LANG = "en-US,en;q=0.9"


# ---------- helpers ----------

def video_id(url):
    """Pull a video ID out of any common YouTube link."""
    u = str(url or "").strip()
    m = re.search(r"youtu\.be/([\w-]{6,})", u)
    if m:
        return m.group(1)
    m = re.search(r"[?&]v=([\w-]{6,})", u)
    if m:
        return m.group(1)
    m = re.search(r"/(?:shorts|embed|live)/([\w-]{6,})", u)
    if m:
        return m.group(1)
    return None


def human_duration(total_sec):
    """245 → '4:05', 7365 → '2:02:45'."""
    sec = max(0, round(total_sec))
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


# YouTube serves a "Sign in to confirm you're not a bot" challenge to
# cloud/datacenter IPs (Render/Heroku/VPS). Strategy to bypass:
# 1. tv/ios player clients (seen as a TV app, not a browser tab),
# 2. chrome impersonation (curl_cffi TLS fingerprint) when installed,
# 3. an E.U. consent-free Accept-Language hint on every request.
YTDL_EXTRACTOR_ARGS = {"youtube": {"player_client": ["tv", "ios", "web"]}}


def _ua_headers():
    return {
        "User-Agent": UA,
        "Accept-Language": DEFAULT_LANG,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }


def _ydl_opts(extra=None):
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "noprogress": True,
        "extractor_args": YTDL_EXTRACTOR_ARGS,
        "http_headers": _ua_headers(),
    }
    try:
        import curl_cffi  # noqa: F401

        opts["impersonate"] = {"client": "chrome", "version": "124"}
    except ImportError:
        pass
    opts.update(extra or {})
    return opts


def _fetch_info(url):
    with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
        info = ydl.extract_info(url, download=False)
    vid = info.get("id")
    return {
        "id": vid,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "title": info.get("title") or f"YouTube video ({vid})",
        "author": info.get("uploader") or info.get("channel") or "",
        "thumbnail": info.get("thumbnail") or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
        "durationSec": info.get("duration"),
    }


# ---------- routes ----------

@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/youtube/info")
def youtube_info():
    body = request.get_json(silent=True) or {}
    url = str(body.get("url") or "").strip()
    if not video_id(url):
        return jsonify({"error": "This does not look like a valid YouTube link."}), 400
    try:
        return jsonify(_fetch_info(url))
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)[:500]}), 502


@app.post("/youtube/transcript")
def youtube_transcript():
    body = request.get_json(silent=True) or {}
    url = str(body.get("url") or "").strip()
    vid = video_id(url)
    if not vid:
        return jsonify({"error": "This does not look like a valid YouTube link."}), 400
    try:
        api = YouTubeTranscriptApi()
        listing = api.list(vid)
        chosen = None
        for t in listing:
            if t.language_code == "en":
                chosen = t
                break
        if chosen is None:
            ts = list(listing)
            chosen = ts[0] if ts else None
        if chosen is None:
            return jsonify({"error": "No captions/subtitles found for this video."}), 404
        snippets = chosen.fetch()
        text = re.sub(r"\s{2,}", " ", " ".join(s.text.replace("\n", " ") for s in snippets)).strip()
        if not text:
            return jsonify({"error": "Captions came back empty for this video."}), 404
        label = getattr(chosen, "language", "") or chosen.language_code
        return jsonify({"transcript": text, "lang": chosen.language_code, "label": label})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)[:300]}), 502


@app.post("/youtube/duration")
def youtube_duration():
    body = request.get_json(silent=True) or {}
    raw = str(body.get("urls") or "").strip()
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    urls = lines[:MAX_URLS]
    if not urls:
        return jsonify({"error": "Paste at least one YouTube link (one per line)."}), 400

    results = [None] * len(urls)

    def fetch_one(index, url):
        vid = video_id(url)
        if not vid:
            results[index] = {"url": url, "id": None, "durationSec": None, "error": "Not a YouTube link"}
            return
        try:
            r = requests.get(
                f"https://www.youtube.com/watch?v={vid}",
                headers=_ua_headers(),
                timeout=9,
            )
            r.raise_for_status()
            html = r.text
            d = re.search(r'"lengthSeconds":"(\d+)"', html)
            t = re.search(r"<title>([^<]*)</title>", html)
            title = t.group(1).replace(" - YouTube", "").strip() if t else None
            results[index] = {
                "url": url,
                "id": vid,
                "title": title,
                "durationSec": int(d.group(1)) if d else None,
            }
        except Exception:  # noqa: BLE001
            results[index] = {"url": url, "id": vid, "durationSec": None, "error": "Fetch failed"}

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda p: fetch_one(*p), [(i, u) for i, u in enumerate(urls)]))

    total_sec = sum((r or {}).get("durationSec") or 0 for r in results)
    return jsonify(
        {
            "items": results,
            "totalSec": total_sec,
            "totalLabel": human_duration(total_sec),
            "truncated": len(lines) > MAX_URLS,
        }
    )


@app.get("/youtube/thumb")
def youtube_thumb():
    vid = video_id(request.args.get("url", ""))
    if not vid:
        return jsonify({"error": "Bad URL."}), 400
    try:
        r = requests.get(f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg", timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "Thumbnail not found."}), 404
        return Response(
            r.content,
            mimetype="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception:  # noqa: BLE001
        return jsonify({"error": "Thumbnail fetch failed."}), 502


@app.post("/youtube/download")
def youtube_download():
    body = request.get_json(silent=True) or {}
    url = str(body.get("url") or "").strip()
    kind = "audio" if body.get("kind") == "audio" else "video"
    vid = video_id(url)
    if not vid:
        return jsonify({"error": "This does not look like a valid YouTube link."}), 400

    tmpdir = tempfile.mkdtemp(prefix="ytdl_")
    try:
        opts = _ydl_opts(
            {
                "outtmpl": os.path.join(tmpdir, "%(id)s.%(ext)s"),
                "windowsfilenames": True,
                "socket_timeout": 30,
                "retries": 3,
            }
        )
        if kind == "audio":
            # extract the best audio as M4A (ffmpeg step)
            opts["format"] = "bestaudio[ext=m4a]/bestaudio/best"
            opts["postprocessors"] = [
                {"key": "FFmpegExtractAudio", "preferredcodec": "m4a", "preferredquality": "192"}
            ]
        else:
            # bestvideo + bestaudio merged/remuxed into one MP4 (ffmpeg step)
            opts["format"] = "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b"
            opts["merge_output_format"] = "mp4"
            opts["postprocessors"] = [
                {"key": "FFmpegVideoConvertor", "preferedformat": "mp4"},
                {"key": "FFmpegMerger"},
            ]

        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)

        ext = "m4a" if kind == "audio" else "mp4"
        candidates = [f for f in os.listdir(tmpdir) if f.startswith(vid)]
        if not candidates:
            return jsonify({"error": "The download produced no file."}), 502
        exact = [c for c in candidates if c.endswith("." + ext)]
        name = max(exact or candidates, key=lambda c: os.path.getsize(os.path.join(tmpdir, c)))
        fpath = os.path.join(tmpdir, name)
        size = os.path.getsize(fpath)

        def stream():
            try:
                with open(fpath, "rb") as fh:
                    while chunk := fh.read(1 << 20):
                        yield chunk
            finally:
                shutil.rmtree(tmpdir, ignore_errors=True)

        headers = {
            "Content-Disposition": f'attachment; filename="{vid}.{ext}"',
            "X-File-Size": str(size),
        }
        return Response(
            stream(),
            mimetype="audio/mp4" if kind == "audio" else "video/mp4",
            headers=headers,
        )
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(tmpdir, ignore_errors=True)
        return jsonify({"error": str(exc)[:500]}), 502


if __name__ == "__main__":
    # Local dev: python app.py  (production runs gunicorn, see Dockerfile)
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 3002)), threaded=True)
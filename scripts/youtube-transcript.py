#!/usr/bin/env python3
"""Fetch a YouTube transcript (auto/manual captions) via youtube-transcript-api.

Usage: python youtube-transcript.py <video-url>
Protocol: prints one JSON object to stdout; exit 0 on success, 1 on error.
The backend auto-installs youtube-transcript-api on first use (pip).
"""
import json
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def video_id(url):
    u = (url or "").strip()
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


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    vid = video_id(url)
    if not vid:
        print(json.dumps({"error": "This does not look like a valid YouTube link."}))
        return 1
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

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
            print(json.dumps({"error": "No captions/subtitles found for this video."}))
            return 1
        snippets = chosen.fetch()
        text = " ".join(s.text.replace("\n", " ") for s in snippets)
        text = re.sub(r"\s{2,}", " ", text).strip()
        if not text:
            print(json.dumps({"error": "Captions came back empty for this video."}))
            return 1
        label = getattr(chosen, "language", "") or chosen.language_code
        print(json.dumps({"transcript": text, "lang": chosen.language_code, "label": label}))
        return 0
    except Exception as e:  # noqa: BLE001 — report any upstream failure to the client
        print(json.dumps({"error": str(e)[:300]}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
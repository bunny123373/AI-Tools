#!/usr/bin/env python3
"""Backend YouTube downloader for AI Toolbox (uses yt-dlp).

Usage:
    python youtube-dl.py <url> <outbase> <kind> [lang]

kind = 'audio' | 'video' | 'subs'
- audio/video download to outbase + the real extension (mp3 via m4a, mp4 only).
- subs writes timed captions as SRT (skip_download=True) — lang optional (default 'en').
Prints the final filename on stdout.
"""
import sys

import yt_dlp


def main() -> None:
    url, outbase, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    opts = {
        "outtmpl": outbase + ".%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "windowsfilenames": True,
    }
    if kind == "subs":
        lang = sys.argv[4] if len(sys.argv) > 4 else "en"
        opts.update(
            {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": [lang],
                "subtitlesformat": "srt",
            }
        )
    else:
        opts["format"] = (
            "bestaudio[ext=m4a]/bestaudio"
            if kind == "audio"
            else "best[ext=mp4][height<=1080]/best[height<=1080]/best"
        )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        fname = ydl.prepare_filename(info)
        print(fname)
        sys.stdout.flush()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - surface any yt-dlp/network error to the API route
        print(f"ERR {exc}", file=sys.stderr)
        sys.exit(1)
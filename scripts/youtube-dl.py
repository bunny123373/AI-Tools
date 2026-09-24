#!/usr/bin/env python3
"""Backend YouTube downloader for AI Toolbox (uses yt-dlp).

Usage:
    python youtube-dl.py <url> <outbase> <kind>

kind = 'audio' | 'video'
Downloads to outbase + the real extension and prints the final filename on stdout.
No ffmpeg needed: audio → best m4a, video → mp4 only.
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
        "format": (
            "bestaudio[ext=m4a]/bestaudio"
            if kind == "audio"
            else "best[ext=mp4][height<=1080]/best[height<=1080]/best"
        ),
    }
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
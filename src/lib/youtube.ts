import type { YouTubeInfo } from '../types'

/** Pull a video ID out of any common YouTube link (watch, youtu.be, shorts, embed, live). */
export function getVideoId(input: string): string | null {
  const u = input.trim()
  let m = u.match(/youtu\.be\/([\w-]{6,})/)
  if (m) return m[1]
  m = u.match(/[?&]v=([\w-]{6,})/)
  if (m) return m[1]
  m = u.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/)
  if (m) return m[1]
  return null
}

/** 245 → "4:05", 7365 → "2:02:45" */
export function humanDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Metadata for one video: oEmbed title/author (no key) + duration from the page. */
export async function fetchYouTubeInfo(url: string): Promise<YouTubeInfo> {
  const id = getVideoId(url)
  if (!id) throw new Error('This does not look like a valid YouTube link.')
  const videoUrl = `https://www.youtube.com/watch?v=${id}`
  const [embed, page] = await Promise.all([
    fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`, {
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => r.json())
      .catch(() => ({})),
    fetch(videoUrl, {
      headers: { 'user-agent': UA, 'accept-language': 'en' },
      signal: AbortSignal.timeout(12000),
    })
      .then((r) => r.text())
      .catch(() => ''),
  ])
  const title = typeof embed.title === 'string' && embed.title ? embed.title : `YouTube video (${id})`
  const author = typeof embed.author_name === 'string' ? embed.author_name : ''
  const durMatch = page.match(/"lengthSeconds":"(\d+)"/)
  const durationSec = durMatch ? parseInt(durMatch[1], 10) : null
  return { id, url: videoUrl, title, author, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, durationSec }
}
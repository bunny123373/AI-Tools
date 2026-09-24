import { NextResponse } from 'next/server'
import { getVideoId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Strip HTML entities + tags from caption lines. */
function cleanLine(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/** VTT cue text → plain joined transcript. */
function parseVtt(vtt: string): string {
  const out: string[] = []
  for (const raw of vtt.split(/\r?\n/)) {
    const line = cleanLine(raw)
    if (!line) continue
    if (/^\d{1,2}:\d{2}(:\d{2})?[.,]\d{1,3}/.test(line)) continue // cue timestamp start
    if (line.includes('-->')) continue
    if (/^WEBVTT$/i.test(line)) continue
    if (/^(NOTE|Kind:|Language:)/i.test(line)) continue
    out.push(line)
  }
  return out.join(' ').replace(/\s{2,}/g, ' ').trim()
}

interface CaptionTrack {
  baseUrl?: string
  languageCode?: string
  name?: { simpleText?: string }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url || '').trim()
  const id = getVideoId(url)
  if (!id) return NextResponse.json({ error: 'This does not look like a valid YouTube link.' }, { status: 400 })
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'user-agent': UA, 'accept-language': 'en' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error('YouTube could not be reached.')
    const html = await res.text()
    // captionTracks live inside ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer
    const m = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"(?:audioTracks|videoDetails)/)
    if (!m) return NextResponse.json({ error: 'No captions/subtitles found for this video.' }, { status: 404 })
    let tracks: CaptionTrack[] = []
    try {
      tracks = JSON.parse(m[1]) as CaptionTrack[]
    } catch {
      return NextResponse.json({ error: 'Could not parse the caption list.' }, { status: 502 })
    }
    const track = tracks.find((t) => t.languageCode === 'en') || tracks[0]
    if (!track?.baseUrl) return NextResponse.json({ error: 'No usable caption track.' }, { status: 404 })
    const vttRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(15000) })
    if (!vttRes.ok) return NextResponse.json({ error: 'Could not fetch the captions.' }, { status: 502 })
    const vtt = await vttRes.text()
    const transcript = parseVtt(vtt)
    if (!transcript) return NextResponse.json({ error: 'Captions came back empty for this video.' }, { status: 404 })
    return NextResponse.json({
      transcript,
      lang: track.languageCode || '',
      label: track.name?.simpleText || track.languageCode || '',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Transcript fetch failed.' },
      { status: 502 },
    )
  }
}
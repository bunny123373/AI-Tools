import { NextResponse } from 'next/server'
import { getVideoId, humanDuration } from '@/lib/youtube'
import type { YtDurationItem } from '@/types'

export const dynamic = 'force-dynamic'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const MAX_URLS = 60
const CONCURRENCY = 4

async function fetchOne(url: string): Promise<YtDurationItem> {
  const id = getVideoId(url)
  if (!id) return { url, id: null, durationSec: null, error: 'Not a YouTube link' }
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'user-agent': UA, 'accept-language': 'en' },
      signal: AbortSignal.timeout(9000),
    })
    const html = await res.text()
    const d = html.match(/"lengthSeconds":"(\d+)"/)
    const t = html.match(/<title>([^<]*)<\/title>/)
    return {
      url,
      id,
      title: t ? t[1].replace(/ - YouTube$/, '').trim() : undefined,
      durationSec: d ? parseInt(d[1], 10) : null,
    }
  } catch {
    return { url, id, durationSec: null, error: 'Fetch failed' }
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const raw = String(body.urls || '').trim()
  const urls = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_URLS)
  if (urls.length === 0) {
    return NextResponse.json({ error: 'Paste at least one YouTube link (one per line).' }, { status: 400 })
  }
  const results: YtDurationItem[] = new Array(urls.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < urls.length) {
      const i = cursor++
      results[i] = await fetchOne(urls[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()))

  const totalSec = results.reduce((sum, r) => sum + (r.durationSec ?? 0), 0)
  const truncated = raw.split(/\r?\n/).filter((s) => s.trim()).length > MAX_URLS
  return NextResponse.json({ items: results, totalSec, totalLabel: humanDuration(totalSec), truncated })
}
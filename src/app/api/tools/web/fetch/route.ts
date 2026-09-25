import { NextResponse } from 'next/server'
import { unfurlUrl } from '@/lib/unfurl'

export const dynamic = 'force-dynamic'

/** Link Preview: fetch any URL and return its title, description, image + site. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string }
  const url = String(body.url || '').trim()
  if (!url) return NextResponse.json({ error: 'Missing "url".' }, { status: 400 })
  try {
    const data = await unfurlUrl(url, 2000) // preview only needs a little text
    if (!data.title && !data.description && !data.image) {
      return NextResponse.json(
        { error: 'Could not read that page — it may block automatic fetches.' },
        { status: 422 },
      )
    }
    const { text: _text, ...preview } = data // don't ship full text to the preview card
    return NextResponse.json(preview)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not fetch the page.' },
      { status: 502 },
    )
  }
}
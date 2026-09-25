import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AUDIO_MIME = /^data:(audio\/[\w.+-]+);base64,(.+)$/
// Vercel serverless bodies cap around 4.5 MB — keep base64 payloads comfortably
// under that (~1-3 min clips depending on bitrate).
const MAX_B64 = 3_500_000

/**
 * Audio → text transcription via Gemini's generateContent (inline audio,
 * same media pattern as the image analyzer). Runs server-side so the site
 * key can be used; the user's Settings Gemini key is preferred when present.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const audioDataUrl = String(body.audioDataUrl || '')
  if (!audioDataUrl) {
    return NextResponse.json({ error: 'Missing audio. Upload a file first.' }, { status: 400 })
  }
  const match = audioDataUrl.match(AUDIO_MIME)
  if (!match) {
    return NextResponse.json(
      { error: 'Invalid audio data. Please upload an MP3, WAV, M4A, OGG, AAC or FLAC file.' },
      { status: 400 },
    )
  }
  if (match[2].length > MAX_B64) {
    return NextResponse.json(
      { error: 'Audio file too large — keep clips under ~2–3 minutes and try again.' },
      { status: 413 },
    )
  }

  const model = String(body.model || 'gemini-3.5-flash')
  const key = body.geminiKey ? String(body.geminiKey) : process.env.GEMINI_API_KEY || ''
  if (!key) {
    return NextResponse.json(
      { error: 'Gemini needs an API key. Get a free one at https://aistudio.google.com/apikey and add it in Settings.' },
      { status: 400 },
    )
  }

  const mime = match[1]
  const raw = match[2]
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Transcribe this audio exactly as spoken. Output only the transcript text; start a new line when the speaker changes. If there is no speech, reply with exactly "(no speech detected)".',
                },
                { inline_data: { mime_type: mime, data: raw } },
              ],
            },
          ],
        }),
      },
    )
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const msg =
        (data?.error as { message?: string } | undefined)?.message ||
        `Gemini returned HTTP ${res.status}.`
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Gemini free tier is rate-limited right now — wait a minute and retry.' },
          { status: 429 },
        )
      }
      return NextResponse.json({ error: msg.slice(0, 300) }, { status: 502 })
    }
    const parts = (data?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]?.content?.parts
    const reply = (parts ?? []).map((p) => p.text ?? '').join('').trim()
    if (!reply) {
      return NextResponse.json({ error: 'Gemini returned an empty reply for this audio.' }, { status: 502 })
    }
    return NextResponse.json({ result: reply, model })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Transcription failed.' },
      { status: 502 },
    )
  }
}
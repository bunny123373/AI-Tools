import { spawn } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getVideoId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

const PYTHONS = ['python', 'python3']
const SCRIPT = path.join(process.cwd(), 'scripts', 'youtube-dl.py')
const DOWNLOAD_TIMEOUT = 10 * 60 * 1000

function run(command: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: -2, stdout, stderr: String(err) })
    })
  })
}

async function findPython(): Promise<string> {
  for (const py of PYTHONS) {
    const r = await run(py, ['--version'], 8000)
    if (r.code === 0) return py
  }
  throw new Error('Python is not installed on the server. Install Python 3 to use the downloader.')
}

async function ensureYtDlp(py: string): Promise<void> {
  const check = await run(py, ['-m', 'yt_dlp', '--version'], 20000)
  if (check.code === 0) return
  const install = await run(py, ['-m', 'pip', 'install', '--quiet', 'yt-dlp'], 180000)
  if (install.code !== 0) {
    throw new Error(`yt-dlp could not be installed: ${(install.stderr || install.stdout).trim().slice(0, 300)}`)
  }
  const again = await run(py, ['-m', 'yt_dlp', '--version'], 20000)
  if (again.code !== 0) throw new Error('yt-dlp is still unavailable after the install attempt.')
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url || '').trim()
  const kind = body.kind === 'audio' ? 'audio' : 'video'
  const id = getVideoId(url)
  if (!id) return NextResponse.json({ error: 'This does not look like a valid YouTube link.' }, { status: 400 })

  const videoUrl = `https://www.youtube.com/watch?v=${id}`
  let py: string
  try {
    py = await findPython()
    await ensureYtDlp(py)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Downloader setup failed.' }, { status: 502 })
  }

  const base = path.join(tmpdir(), `ytdl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const { code, stdout, stderr } = await run(py, [SCRIPT, videoUrl, base, kind], DOWNLOAD_TIMEOUT)
  if (code !== 0) {
    const msg = (stderr || stdout).trim().split('\n').pop() ?? 'Download failed.'
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 502 })
  }
  const fname = stdout.trim().split('\n').pop() ?? ''
  if (!fname || !existsSync(fname)) {
    return NextResponse.json({ error: 'The download produced no file.' }, { status: 502 })
  }

  try {
    const st = await stat(fname)
    const ext = fname.split('.').pop() || 'mp4'
    const display = `${id}.${ext}`
    const stream = createReadStream(fname)
    const cleanup = () => unlink(fname).catch(() => {})
    stream.on('close', cleanup)
    stream.on('error', cleanup)
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': kind === 'audio' ? 'audio/mp4' : 'video/mp4',
        'Content-Length': String(st.size),
        'Content-Disposition': `attachment; filename="${display}"`,
      },
    })
  } catch (e) {
    unlink(fname).catch(() => {})
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not stream the file.' },
      { status: 502 },
    )
  }
}
import { spawn } from 'node:child_process'
import { readdir, readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getVideoId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

const PYTHONS = ['python', 'python3']
const SCRIPT = path.join(process.cwd(), 'scripts', 'youtube-dl.py')
const SUB_TIMEOUT = 4 * 60 * 1000

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
  const lang = String(body.lang || 'en').trim() || 'en'
  const id = getVideoId(url)
  if (!id) return NextResponse.json({ error: 'This does not look like a valid YouTube link.' }, { status: 400 })

  let py: string
  try {
    py = await findPython()
    await ensureYtDlp(py)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Downloader setup failed.' }, { status: 502 })
  }

  const base = path.join(tmpdir(), `ytdl_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const { code, stderr } = await run(py, [SCRIPT, `https://www.youtube.com/watch?v=${id}`, base, 'subs', lang], SUB_TIMEOUT)
  if (code !== 0) {
    const msg = stderr.trim().split('\n').pop() ?? 'Subtitle fetch failed.'
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 502 })
  }

  const dir = path.dirname(base)
  const stem = path.basename(base)
  const files = await readdir(dir)
  const srtFiles = files.filter((f) => f.startsWith(stem) && f.endsWith('.srt'))
  if (srtFiles.length === 0) {
    for (const f of files.filter((f) => f.startsWith(stem))) unlink(path.join(dir, f)).catch(() => {})
    return NextResponse.json(
      { error: `No captions found for language '${lang}' on this video.` },
      { status: 404 },
    )
  }

  try {
    const srt = await readFile(path.join(dir, srtFiles[0]), 'utf-8')
    return NextResponse.json({ srt, lang, id })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not read the subtitles.' },
      { status: 502 },
    )
  } finally {
    for (const f of files.filter((f) => f.startsWith(stem))) unlink(path.join(dir, f)).catch(() => {})
  }
}
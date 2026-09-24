import { useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import {
  Check,
  Copy,
  Download,
  FileImage,
  FileStack,
  FileText,
  FileUp,
  LayoutTemplate,
  Scissors,
  Sparkles,
} from 'lucide-react'

// pdf.js worker served from /public — works in dev, prod builds and headless
// browsers without network/ESM-worker quirks (same file Vite inlined before).
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// pdf.js also needs its auxiliary data to decode real-world PDFs, which it
// fetches lazily only when needed (and only once):
//  - cmaps           CJK and other custom-encoded fonts (else text comes back empty/garbled)
//  - standard_fonts  the 14 non-embedded base-14 fonts (Symbol, ZapfDingbats, …)
//  - wasm            JPEG2000 / JBIG2 image decoders + ICC (qcms)
// The folders live in /public/pdfjs and were copied from pdfjs-dist.
const PDFJS_DATA = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
}

// Rendering every page of a huge PDF would freeze the tab; cap it.
const MAX_IMAGE_PAGES = 40

type Mode = 'word' | 'text' | 'images' | 'merge' | 'split'

interface LoadedPdf {
  name: string
  buf: ArrayBuffer
  pdfDoc: pdfjsLib.PDFDocumentProxy
  numPages: number
  text: string
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** "1-3,5" -> [0,1,2,4] (0-based), clamped to the page count. */
function parsePages(input: string, total: number): number[] | null {
  const out = new Set<number>()
  for (const part of input.split(',')) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    let lo: number
    let hi: number
    if (m) {
      lo = Number(m[1])
      hi = Number(m[2])
    } else if (/^\d+$/.test(p)) {
      lo = hi = Number(p)
    } else {
      return null
    }
    if (lo < 1 || hi > total || lo > hi) return null
    for (let i = lo; i <= hi; i++) out.add(i - 1)
  }
  return out.size ? [...out].sort((a, b) => a - b) : null
}

const MODES: [Mode, string, React.ReactNode][] = [
  ['word', 'To Word', <FileText size={15} key="w" />],
  ['text', 'To Text', <LayoutTemplate size={15} key="t" />],
  ['images', 'To Images', <FileImage size={15} key="i" />],
  ['merge', 'Merge', <FileStack size={15} key="m" />],
  ['split', 'Split', <Scissors size={15} key="s" />],
]

export default function PdfTools({ initialMode }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'word')
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null)
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg'>('png')
  const [range, setRange] = useState('')
  const [mergeNames, setMergeNames] = useState<string[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [images, setImages] = useState<{ name: string; url: string; page: number }[]>([])
  const [copiedText, setCopiedText] = useState(false)
  const singleRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)

  const clearState = () => {
    setError('')
    setNotice('')
    setImages([])
  }

  const loadSingle = async (file: File | undefined) => {
    if (!file) return
    setBusy('Reading PDF…')
    clearState()
    try {
      const buf = await file.arrayBuffer()
      // pdf.js transfers/detaches the buffer it's given (worker transferable) —
      // keep a separate copy for pdf-lib (split) which needs the bytes later.
      const libBuf = buf.slice(0)
      const pdfDoc = await Promise.race([
        pdfjsLib.getDocument({ data: buf, ...PDFJS_DATA }).promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF parse timed out (invalid or encrypted file?)')), 20000),
        ),
      ])
      let text = ''
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        text += (content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n')
      }
      setLoaded({ name: file.name, buf: libBuf, pdfDoc, numPages: pdfDoc.numPages, text: text.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.')
      setLoaded(null)
    } finally {
      setBusy('')
    }
  }

  const toDocx = async () => {
    if (!loaded || busy) return
    setBusy('Building Word document…')
    clearState()
    try {
      const lines = (loaded.text || '(No extractable text found — this PDF may be image-based. Try the Images tab → OCR for scanned documents.)').split('\n')
      const paras = lines
        .filter((l) => l.trim())
        .map(
          (l) =>
            `<w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(l)}</w:t></w:r></w:p>`,
        )
        .join('')
      const zip = new JSZip()
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
      )
      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
      )
      zip.file(
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr/></w:body></w:document>`,
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const base = loaded.name.replace(/\.pdf$/i, '')
      downloadBlob(blob, `${base}.docx`)
      setNotice(`Saved ${base}.docx — check your Downloads.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create the Word document.')
    } finally {
      setBusy('')
    }
  }

  const downloadTxt = () => {
    if (!loaded) return
    const base = loaded.name.replace(/\.pdf$/i, '')
    downloadBlob(new Blob([loaded.text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`)
    setNotice(`Saved ${base}.txt — check your Downloads.`)
  }

  const renderImages = async () => {
    if (!loaded || busy) return
    setBusy('Rendering pages…')
    clearState()
    try {
      const { pdfDoc, numPages } = loaded
      const pagesToRender = Math.min(numPages, MAX_IMAGE_PAGES)
      const out: { name: string; url: string; page: number }[] = []
      const mime = imgFormat === 'png' ? 'image/png' : 'image/jpeg'
      const ext = imgFormat === 'png' ? 'png' : 'jpg'
      for (let i = 1; i <= pagesToRender; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas not supported in this browser.')
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
        const blob: Blob = await new Promise((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('Image export failed.'))), mime, 0.92),
        )
        out.push({ name: `page-${String(i).padStart(2, '0')}.${ext}`, url: URL.createObjectURL(blob), page: i })
      }
      setImages(out)
      setNotice(
        pagesToRender < numPages
          ? `Rendered first ${pagesToRender} of ${numPages} pages (cap to keep the tab fast).`
          : `Rendered ${numPages} page${numPages === 1 ? '' : 's'}.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to render pages.')
    } finally {
      setBusy('')
    }
  }

  const downloadImagesZip = async () => {
    if (!images.length || busy) return
    setBusy('Zipping images…')
    try {
      const zip = new JSZip()
      await Promise.all(
        images.map(async (img) => {
          const blob = await (await fetch(img.url)).blob()
          zip.file(img.name, blob)
        }),
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const base = loaded?.name.replace(/\.pdf$/i, '') || 'pdf'
      downloadBlob(blob, `${base}-images.zip`)
      setNotice('Images saved as a .zip — check your Downloads.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to zip images.')
    } finally {
      setBusy('')
    }
  }

  const onMergeFiles = (files: FileList | null) => {
    if (!files) return
    clearState()
    setMergeNames(Array.from(files).map((f) => f.name))
  }

  const mergePdfs = async () => {
    if (!mergeNames.length || busy) return
    setBusy('Merging PDFs…')
    clearState()
    try {
      const inputs = Array.from(mergeRef.current?.files ?? [])
      const out = await PDFDocument.create()
      for (const f of inputs) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      }
      const bytes = await out.save()
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'merged.pdf')
      setNotice(`Saved merged.pdf (${out.getPageCount()} pages) — check your Downloads.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to merge PDFs.')
    } finally {
      setBusy('')
    }
  }

  const splitPdf = async () => {
    if (!loaded || busy) return
    clearState()
    const want = parsePages(range, loaded.numPages)
    if (!want) {
      setError(`Invalid page selection. Use numbers in 1–${loaded.numPages}, e.g. 1-3,5.`)
      return
    }
    setBusy('Splitting PDF…')
    try {
      const src = await PDFDocument.load(loaded.buf, { ignoreEncryption: true })
      const out = await PDFDocument.create()
      const pages = await out.copyPages(src, want)
      pages.forEach((p) => out.addPage(p))
      const bytes = await out.save()
      const base = loaded.name.replace(/\.pdf$/i, '')
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-split.pdf`)
      setNotice(`Saved ${base}-split.pdf (${want.length} page${want.length === 1 ? '' : 's'}).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to split PDF.')
    } finally {
      setBusy('')
    }
  }

  const isSingleMode = mode !== 'merge'

  return (
    <>
      <div className="tool-tabs pdf-mode-tabs">
        {MODES.map(([m, label, icon]) => (
          <button
            key={m}
            type="button"
            className={`tool-tab ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {isSingleMode ? (
        <div className="pdf-upload" onClick={() => singleRef.current?.click()}>
          <FileUp size={26} />
          <p>
            <strong>{loaded ? loaded.name : 'Drop a PDF here or click to choose'}</strong>
          </p>
          <p className="hint">
            Converted <em>100% locally in your browser</em> — your files never leave your PC.
          </p>
          <input
            ref={singleRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              void loadSingle(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      ) : (
        <div className="pdf-upload" onClick={() => mergeRef.current?.click()}>
          <FileStack size={26} />
          <p>
            <strong>{mergeNames.length ? `${mergeNames.length} PDFs ready` : 'Drop multiple PDFs here or click to choose'}</strong>
          </p>
          <p className="hint">Combine PDFs into one — order shown below, all local.</p>
          <input
            ref={mergeRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={(e) => onMergeFiles(e.target.files)}
          />
          {mergeNames.length > 0 && (
            <ul className="merge-list">
              {mergeNames.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {busy && <p className="hint">{busy}</p>}

      {isSingleMode && loaded && (
        <>
          <div className="pdf-meta">
            <span>{loaded.name}</span>
            <span>{loaded.numPages} pages</span>
            <span>{loaded.text.length.toLocaleString()} chars extracted</span>
          </div>

          {mode === 'word' && (
            <button className="primary" onClick={() => void toDocx()} disabled={!!busy}>
              {FileText && <FileText size={15} />} Convert to Word (.docx)
            </button>
          )}

          {mode === 'text' && (
            <>
              <div className="doc-text">
                <pre>{loaded.text || '(No extractable text found — this PDF may be image-based. Try the Images tab → OCR to read text from scanned pages.)'}</pre>
              </div>
              <div className="pdf-actions">
                <button
                  className="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(loaded.text)
                    setCopiedText(true)
                    setTimeout(() => setCopiedText(false), 1200)
                  }}
                >
                  {copiedText ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
                <button className="ghost" onClick={downloadTxt}>
                  <Download size={14} />
                  <span>Download .txt</span>
                </button>
              </div>
            </>
          )}

          {mode === 'images' && (
            <>
              <label className="option-row">
                <span>Image format</span>
                <select value={imgFormat} onChange={(e) => setImgFormat(e.target.value as 'png' | 'jpeg')}>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPG (smaller files)</option>
                </select>
              </label>
              <div className="pdf-actions">
                <button className="primary" onClick={() => void renderImages()} disabled={!!busy}>
                  <FileImage size={15} /> {images.length ? 'Re-render pages' : 'Extract pages as images'}
                </button>
                {images.length > 0 && (
                  <button className="ghost" onClick={() => void downloadImagesZip()} disabled={!!busy}>
                    <Download size={14} />
                    <span>Download all (.zip)</span>
                  </button>
                )}
              </div>
              {images.length > 0 && (
                <div className="img-gallery">
                  {images.map((img) => (
                    <div key={img.name} className="img-cell">
                      <img src={img.url} alt={`Page ${img.page}`} />
                      <div className="img-actions">
                        <span>p.{img.page}</span>
                        <a href={img.url} download={img.name}>
                          <Download size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === 'split' && (
            <>
              <label className="option-row">
                <span>Pages to keep</span>
                <input
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder={`e.g. 1-3,5 (total ${loaded.numPages})`}
                />
              </label>
              <div className="pdf-actions">
                <button className="primary" onClick={() => void splitPdf()} disabled={!!busy || !range.trim()}>
                  <Scissors size={15} /> Split PDF
                </button>
              </div>
            </>
          )}
        </>
      )}

      {mode === 'merge' && mergeNames.length > 0 && (
        <button className="primary" onClick={() => void mergePdfs()} disabled={!!busy}>
          <Sparkles size={15} /> Merge {mergeNames.length} PDFs into one
        </button>
      )}

      {error && <p className="hint warn">{error}</p>}
      {notice && <p className="hint">{notice}</p>}
    </>
  )
}
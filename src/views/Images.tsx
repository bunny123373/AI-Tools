import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Brain,
  Check,
  Copy,
  Download,
  Eraser,
  ImageDown,
  ImageIcon,
  Palette,
  ScanText,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { Settings } from '../types'
import { analyzeImage, generateImageInfo, generateVideo, loadSettings, saveSettings } from '../api'
import ModelPicker from '../components/ModelPicker'
import {
  downloadBlob,
  downscaleToDataUrl,
  extractPalette,
  loadImage,
} from '../utils/image'

type ImgMode = 'generate' | 'analyze' | 'ocr' | 'convert' | 'palette' | 'removebg'

const MODES: [ImgMode, string][] = [
  ['generate', 'Generate'],
  ['analyze', 'Analyze'],
  ['ocr', 'OCR'],
  ['convert', 'Convert'],
  ['palette', 'Palette'],
  ['removebg', 'Remove BG'],
]

function UploadZone({
  onFile,
  label,
  multiple,
}: {
  onFile: (file: File) => void
  label?: string
  multiple?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="pdf-upload" onClick={() => ref.current?.click()}>
      <ImageIcon size={26} />
      <p>
        <strong>{label || 'Drop an image here or click to choose'}</strong>
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function GenerateMode({ settings }: { settings: Settings }) {
  const [prompt, setPrompt] = useState('')
  const [aspect, setAspect] = useState('1:1')
  const [model, setModel] = useState(
    settings.provider === 'gemini' || settings.provider === 'puter'
      ? 'gemini-3.1-flash-image'
      : settings.provider === 'xkiro'
        ? 'sensenova/sensenova-u1.5-lite'
        : 'flux',
  )
  const [animate, setAnimate] = useState(false)
  const [vidModel, setVidModel] = useState('veo-3.1-lite')
  const [seconds, setSeconds] = useState(4)
  const [style, setStyle] = useState('')
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [fallbackNote, setFallbackNote] = useState('')

  const isGemini = settings.provider === 'gemini'
  const isPuter = settings.provider === 'puter'
  const isXkiro = settings.provider === 'xkiro'
  const engine = isGemini ? 'gemini' : isPuter ? 'puter' : isXkiro ? 'xkiro' : 'pollinations'

  // When the provider changes, reset the model picker to that engine's default.
  useEffect(() => {
    setModel(
      isGemini || isPuter
        ? 'gemini-3.1-flash-image'
        : isXkiro
          ? 'sensenova/sensenova-u1.5-lite'
          : 'flux',
    )
    setAnimate(false)
    setUrl('')
    setFallbackNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGemini, isXkiro])

  const sizes: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '16:9': [1280, 720],
    '9:16': [720, 1280],
    '3:2': [1152, 768],
    '2:3': [768, 1152],
  }

  const geminiModels: [string, string][] = [
    ['gemini-3.1-flash-image', 'Nano Banana 2 (balanced)'],
    ['gemini-3-pro-image', 'Nano Banana Pro (best quality)'],
    ['gemini-3.1-flash-lite-image', 'Nano Banana 2 Lite (fastest)'],
  ]

  const puterModels: [string, string][] = [
    ['gemini-3.1-flash-image', 'Nano Banana 2 (balanced)'],
    ['gemini-3-pro-image', 'Nano Banana Pro (best quality)'],
    ['gemini-3.1-flash-lite-image', 'Nano Banana 2 Lite (fastest)'],
    ['gpt-image-2', 'GPT Image 2 (OpenAI)'],
    ['grok-imagine-image', 'Grok Imagine (xAI)'],
  ]

  const xkiroModels: [string, string][] = [
    ['sensenova/sensenova-u1.5-lite', 'SenseNova U1.5 Lite (free)'],
  ]

  // Same style vocabulary as the chat's ChatGPT-style image flow.
  const styleOptions: [string, string][] = [
    ['', 'None (follow the prompt)'],
    ['photorealistic, natural light, high detail', 'Photorealistic'],
    ['anime style, vibrant colors', 'Anime'],
    ['3D render, cinematic lighting', '3D render'],
    ['watercolor painting, soft pastel colors', 'Watercolor'],
    ['pixel art, retro 8-bit', 'Pixel art'],
    ['minimalist, clean, simple composition', 'Minimalist'],
    ['cinematic, dramatic lighting, film still', 'Cinematic'],
    ['flat vector illustration, bold colors', 'Flat vector'],
  ]

  // Verified live against Puter via test_mode (Veo 3.1 / Seedance available on
  // this account's free allowance; Kling/Wan ids differ per tier).
  const puterVideoModels: [string, string][] = [
    ['veo-3.1-lite', 'Veo 3.1 Lite (fastest)'],
    ['veo-3.1', 'Veo 3.1 (Google)'],
    ['seedance-2.5', 'Seedance 2.5 (BytePlus)'],
    ['seedance-2.0', 'Seedance 2.0 (BytePlus)'],
  ]

  const modelLabel = (id: string) =>
    [...geminiModels, ...puterModels, ...xkiroModels].find(([i]) => i === id)?.[1] ?? id

  const generate = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError('')
    setFallbackNote('')
    try {
      const s = Math.floor(Math.random() * 1_000_000_000)
      const fullPrompt = style ? `${prompt.trim()}, ${style}` : prompt.trim()
      if (animate && isPuter) {
        const blob = await generateVideo({
          prompt: fullPrompt,
          model: vidModel,
          seconds,
        })
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setName(`ai-${s}.mp4`)
      } else {
        const [w, h] = sizes[aspect]
        const { blob, usedModel } = await generateImageInfo({
          prompt: fullPrompt,
          width: w,
          height: h,
          seed: s,
          model,
          provider: engine as 'gemini' | 'pollinations' | 'puter' | 'xkiro',
          geminiKey: isGemini ? settings.geminiKey || undefined : undefined,
          xkiroKey: isXkiro ? settings.xkiroKey || undefined : undefined,
        })
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
        setName(`ai-${s}.${ext}`)
        setFallbackNote(
          usedModel && usedModel !== model
            ? `Free allowance too low for ${modelLabel(model)} — generated with GPT Image 2 instead (uses far less credit).`
            : '',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed — the free service may be busy, try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-body">
      <label className="option-row">
        <span>Prompt</span>
        <textarea
          className="tool-input"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. a serene mountain lake at sunrise, reflections, photorealistic"
        />
      </label>
      <label className="option-row">
        <span>Aspect ratio</span>
        <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
          {Object.keys(sizes).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="option-row">
        <span>Style</span>
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          {styleOptions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="option-row">
        <span>{engine === 'gemini' ? 'Gemini image model' : engine === 'puter' ? 'Puter image model' : engine === 'xkiro' ? 'xkiro image model' : 'Speed vs quality'}</span>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {engine === 'gemini' ? (
            geminiModels.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))
          ) : engine === 'puter' ? (
            puterModels.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))
          ) : engine === 'xkiro' ? (
            xkiroModels.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))
          ) : (
            <>
              <option value="flux">Flux (better quality)</option>
              <option value="turbo">Turbo (faster)</option>
            </>
          )}
        </select>
      </label>
      <label className="option-row">
        <span>Animate output</span>
        <input
          type="checkbox"
          checked={animate}
          disabled={!isPuter}
          onChange={(e) => {
            setAnimate(e.target.checked)
            setUrl('')
            setError('')
            setFallbackNote('')
          }}
        />
      </label>
      {animate && isPuter && (
        <>
          <label className="option-row">
            <span>Video model</span>
            <select value={vidModel} onChange={(e) => setVidModel(e.target.value)}>
              {puterVideoModels.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="option-row">
            <span>Length</span>
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
              <option value={4}>4 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={8}>8 seconds</option>
            </select>
          </label>
        </>
      )}
      {!isPuter && (
        <p className="hint">
          <strong>Animate</strong> turns your prompt into a short video — powered by <strong>Puter</strong> (free
          text-to-video: Veo / Seedance). Switch the provider to Puter to enable it.
        </p>
      )}
      <button className="primary" onClick={() => void generate()} disabled={busy || !prompt.trim()}>
        <Sparkles size={15} />{' '}
        {busy
          ? animate && isPuter
            ? 'Rendering… (up to ~2 min)'
            : 'Generating… (can take ~30s)'
          : animate && isPuter
            ? 'Generate video'
            : 'Generate image'}
      </button>
      {engine === 'gemini' ? (
        <p className="hint">
          Powered by{' '}
          <strong>
            Gemini's Nano Banana models
          </strong>{' '}
          — uses the Gemini key (Settings or server-side). Note: free-tier keys have a{' '}
          <strong>0 images/day limit</strong>; image generation needs a key with image quota.
        </p>
      ) : engine === 'puter' ? (
        <p className="hint">
          Powered by <strong>Puter</strong> — a free monthly AI allowance via puter.com (≈$1/month): <strong>chat ≈ $0</strong>,
          images/video draw credits (Nano Banana ≈ $0.35/image, GPT Image 2 ≈ $0.03 — auto-fallback kicks in when the
          allowance is low). One-time setup: run <code>npm run puter-token</code> in the project folder, then set
          PUTER_AUTH_TOKEN in .env.local and restart the server.
        </p>
      ) : engine === 'xkiro' ? (
        <p className="hint">
          Powered by <strong>xkiro</strong> — SenseNova U1.5 Lite (free). Uses your xkiro key from Settings (or the
          server-side XKIRO_API_KEY). Images are generated as an async job and usually take ~10–30s.
        </p>
      ) : (
        <p className="hint">
          Powered by <strong>Pollinations.ai</strong> — a completely free public image API, no key needed. If the image
          doesn't appear, just press generate again.
        </p>
      )}
      {error && <p className="hint warn">{error}</p>}
      {fallbackNote && <p className="hint warn">{fallbackNote}</p>}
      {url && (
        <div className="generated-img">
          {animate && isPuter ? (
            <video src={url} controls autoPlay loop muted playsInline />
          ) : (
            <img src={url} alt="AI generated" />
          )}
          <div className="pdf-actions">
            <a className="ghost" href={url} download={name}>
              <Download size={14} /> {animate && isPuter ? 'Save video' : 'Save image'}
            </a>
            <button className="ghost" onClick={() => void generate()}>
              <Wand2 size={14} /> Generate again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyzeMode({ settings, initialFile }: { settings: Settings; initialFile?: File | null }) {
  const [prevUrl, setPrevUrl] = useState('')
  const [dataUrl, setDataUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const onFile = async (file: File) => {
    setError('')
    setResult('')
    setPrevUrl(URL.createObjectURL(file))
    try {
      setDataUrl(await downscaleToDataUrl(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the image.')
    }
  }

  // Preload an image handed over from the chat "attach" button.
  useEffect(() => {
    if (initialFile) void onFile(initialFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async () => {
    if (!dataUrl || busy) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      const { result: r } = await analyzeImage({
        provider: settings.provider,
        model: settings.model,
        imageDataUrl: dataUrl,
        prompt: prompt.trim() || undefined,
        openrouterKey: settings.openrouterKey || undefined,
        geminiKey: settings.geminiKey || undefined,
        ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
      })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-body">
      {!prevUrl ? (
        <UploadZone onFile={(f) => void onFile(f)} label="Drop a photo here to analyze" />
      ) : (
        <div className="preview-area">
          <img src={prevUrl} alt="Preview" className="preview-img" />
          <button className="ghost" onClick={() => { setPrevUrl(''); setDataUrl(''); setResult('') }}>
            <ImageIcon size={14} /> Choose another image
          </button>
        </div>
      )}
      <label className="option-row">
        <span>Question (optional)</span>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. What is in this photo? Describe colors and details."
        />
      </label>
      <button className="primary" onClick={() => void run()} disabled={busy || !dataUrl}>
        <Brain size={15} /> {busy ? 'Analyzing…' : 'Analyze image'}
      </button>
      <p className="hint">
        Uses your selected model. Ollama: pick a vision model (<code>ollama pull llava</code>). OpenRouter free: the
        Vision model in the list. Gemini: any model handles images.
      </p>
      {error && <p className="hint warn">{error}</p>}
      {result && (
        <div className="result">
          <div className="result-head">
            <span>Result</span>
            <button className="ghost" onClick={() => { void navigator.clipboard.writeText(result) }}>
              <Copy size={14} /> Copy
            </button>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function OcrMode() {
  const [prevUrl, setPrevUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [lang, setLang] = useState('eng')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const langs: [string, string][] = [
    ['eng', 'English'],
    ['hin', 'Hindi'],
    ['spa', 'Spanish'],
    ['fra', 'French'],
    ['deu', 'German'],
    ['por', 'Portuguese'],
    ['ara', 'Arabic'],
    ['rus', 'Russian'],
    ['chi_sim', 'Chinese (simplified)'],
  ]

  const onFile = (file: File) => {
    setError('')
    setText('')
    setProgress('')
    setPrevUrl(URL.createObjectURL(file))
    setFileUrl(URL.createObjectURL(file))
  }

  const run = async () => {
    if (!fileUrl || busy) return
    setBusy(true)
    setError('')
    setText('')
    setProgress('Starting…')
    try {
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: { status: string; progress?: number }) =>
          setProgress(`${m.status}${typeof m.progress === 'number' ? ` ${Math.round(m.progress * 100)}%` : ''}`),
      })
      const { data } = await worker.recognize(fileUrl)
      await worker.terminate()
      setText(data.text.trim())
      setProgress(text.trim() ? '' : 'No text found.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR failed — check the language pack download (needs internet once).')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-body">
      {!prevUrl ? (
        <UploadZone onFile={onFile} label="Drop a photo, scan or screenshot to extract text" />
      ) : (
        <div className="preview-area">
          <img src={prevUrl} alt="OCR input" className="preview-img" />
          <button className="ghost" onClick={() => { setPrevUrl(''); setFileUrl('') }}>
            <ImageIcon size={14} /> Choose another
          </button>
        </div>
      )}
      <label className="option-row">
        <span>Language</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {langs.map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button className="primary" onClick={() => void run()} disabled={busy || !fileUrl}>
        <ScanText size={15} /> {busy ? 'Extracting…' : 'Extract text (OCR)'}
      </button>
      {progress && <p className="hint">{progress} — language data downloads on first use.</p>}
      {error && <p className="hint warn">{error}</p>}
      {text && (
        <>
          <div className="doc-text">
            <pre>{text}</pre>
          </div>
          <div className="pdf-actions">
            <button
              className="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button className="ghost" onClick={() => downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'ocr-text.txt')}>
              <Download size={14} /> Download .txt
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ConvertMode() {
  const [prevUrl, setPrevUrl] = useState('')
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(92)
  const [scale, setScale] = useState(100)
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [outUrl, setOutUrl] = useState('')
  const [outName, setOutName] = useState('')
  const [outSize, setOutSize] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = (file: File) => {
    setError('')
    setOutUrl('')
    setPrevUrl(URL.createObjectURL(file))
  }

  const convert = async () => {
    if (!prevUrl || busy) return
    setBusy(true)
    setError('')
    try {
      const img = await loadImage(prevUrl)
      let w = Math.max(1, Math.round((img.width * scale) / 100))
      let h = Math.max(1, Math.round((img.height * scale) / 100))
      if (rotate === 90 || rotate === 270) [w, h] = [h, w]
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported in this browser.')
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
      }
      ctx.translate(rotate === 180 || rotate === 270 ? w : 0, rotate === 90 || rotate === 180 ? h : 0)
      ctx.rotate((rotate * Math.PI) / 180)
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      ctx.drawImage(img, 0, 0)
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Encoding failed.'))), mime, quality / 100),
      )
      setOutUrl(URL.createObjectURL(blob))
      setOutName(`converted.${format}`)
      setOutSize(`${(blob.size / 1024).toFixed(1)} KB`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-body">
      {!prevUrl ? (
        <UploadZone onFile={onFile} label="Drop an image to resize / rotate / convert" />
      ) : (
        <div className="preview-area">
          <img src={prevUrl} alt="Original" className="preview-img" />
          <button className="ghost" onClick={() => { setPrevUrl(''); setOutUrl('') }}>
            <ImageIcon size={14} /> Choose another
          </button>
        </div>
      )}
      {prevUrl && (
        <>
          <label className="option-row">
            <span>Format</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="png">PNG</option>
              <option value="jpeg">JPG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
          {(format === 'jpeg' || format === 'webp') && (
            <label className="option-row">
              <span>Quality: {quality}%</span>
              <input
                type="range"
                min={40}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </label>
          )}
          <label className="option-row">
            <span>Scale: {scale}%</span>
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </label>
          <label className="option-row">
            <span>Rotate</span>
            <select value={rotate} onChange={(e) => setRotate(Number(e.target.value))}>
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </label>
          <div className="flip-row">
            <label>
              <input type="checkbox" checked={flipH} onChange={(e) => setFlipH(e.target.checked)} /> Flip horizontal
            </label>
            <label>
              <input type="checkbox" checked={flipV} onChange={(e) => setFlipV(e.target.checked)} /> Flip vertical
            </label>
          </div>
          <button className="primary" onClick={() => void convert()} disabled={busy}>
            <ImageDown size={15} /> {busy ? 'Converting…' : 'Convert'}
          </button>
        </>
      )}
      {error && <p className="hint warn">{error}</p>}
      {outUrl && (
        <div className="generated-img">
          <img src={outUrl} alt="Converted" />
          <p className="hint">{outSize} — all done in your browser.</p>
          <a className="ghost" href={outUrl} download={outName}>
            <Download size={14} /> Download {outName}
          </a>
        </div>
      )}
    </div>
  )
}

function PaletteMode() {
  const [prevUrl, setPrevUrl] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const onFile = (file: File) => {
    setError('')
    setColors([])
    setPrevUrl(URL.createObjectURL(file))
  }

  const extract = async () => {
    if (!prevUrl || busy) return
    setBusy(true)
    setError('')
    try {
      setColors(await extractPalette(prevUrl, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read colors.')
    } finally {
      setBusy(false)
    }
  }

  const copyAll = async () => {
    const css = colors.map((c, i) => `--c${i + 1}: ${c};`).join('\n')
    await navigator.clipboard.writeText(css)
    setCopied('css')
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="tool-body">
      {!prevUrl ? (
        <UploadZone onFile={onFile} label="Drop an image to pick its colors" />
      ) : (
        <div className="preview-area">
          <img src={prevUrl} alt="Palette source" className="preview-img" />
          <button className="ghost" onClick={() => { setPrevUrl(''); setColors([]) }}>
            <ImageIcon size={14} /> Choose another
          </button>
        </div>
      )}
      {prevUrl && (
        <button className="primary" onClick={() => void extract()} disabled={busy}>
          <Palette size={15} /> {busy ? 'Reading…' : 'Extract colors'}
        </button>
      )}
      {error && <p className="hint warn">{error}</p>}
      {colors.length > 0 && (
        <>
          <div className="palette-row">
            {colors.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                title="Copy hex"
                onClick={async () => {
                  await navigator.clipboard.writeText(c)
                  setCopied(c)
                  setTimeout(() => setCopied(''), 1500)
                }}
              >
                <span>{c}</span>
              </button>
            ))}
          </div>
          <div className="pdf-actions">
            <button className="ghost" onClick={() => void copyAll()}>
              {copied === 'css' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied === 'css' ? 'Copied' : 'Copy as CSS variables'}</span>
            </button>
            {copied && copied !== 'css' && <span className="hint">{copied} copied!</span>}
          </div>
        </>
      )}
    </div>
  )
}

function RemoveBgMode() {
  const [prevUrl, setPrevUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [outUrl, setOutUrl] = useState('')
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = (f: File) => {
    setError('')
    setOutUrl('')
    setProgress('')
    setFile(f)
    setPrevUrl(URL.createObjectURL(f))
  }

  const run = async () => {
    if (!file || busy) return
    setBusy(true)
    setError('')
    setProgress('Downloading model (first run)…')
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) =>
          setProgress(`Processing… ${Math.round((current / total) * 100)}%`),
      })
      setOutUrl(URL.createObjectURL(blob))
      setProgress('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Background removal failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-body">
      {!prevUrl ? (
        <UploadZone onFile={onFile} label="Drop a photo with a background to remove" />
      ) : (
        <div className="preview-area">
          <img src={prevUrl} alt="Original" className="preview-img" />
          <button className="ghost" onClick={() => { setPrevUrl(''); setFile(null); setOutUrl('') }}>
            <ImageIcon size={14} /> Choose another
          </button>
        </div>
      )}
      {prevUrl && (
        <button className="primary" onClick={() => void run()} disabled={busy}>
          <Eraser size={15} /> {busy ? 'Working…' : 'Remove background'}
        </button>
      )}
      <p className="hint">
        Runs 100% locally in your browser. Downloads an AI model (~80&nbsp;MB) on first use, then works offline.
      </p>
      {progress && <p className="hint">{progress}</p>}
      {error && <p className="hint warn">{error}</p>}
      {outUrl && (
        <div className="generated-img">
          <div className="checkerboard">
            <img src={outUrl} alt="Background removed" />
          </div>
          <a className="ghost" href={outUrl} download="background-removed.png">
            <Download size={14} /> Download PNG
          </a>
        </div>
      )}
    </div>
  )
}

export default function Images({ initialMode, initialFile }: { initialMode?: ImgMode; initialFile?: File | null }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [mode, setMode] = useState<ImgMode>(initialMode ?? 'generate')

  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const icons: Record<ImgMode, React.ReactNode> = {
    generate: <Wand2 size={16} />,
    analyze: <Brain size={16} />,
    ocr: <ScanText size={16} />,
    convert: <ImageDown size={16} />,
    palette: <Palette size={16} />,
    removebg: <Eraser size={16} />,
  }

  return (
    <div className="page images-page">
      <ModelPicker settings={settings} onChange={update} />

      <div className="tool-tabs">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            className={`tool-tab ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {icons[m]}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {mode === 'generate' && <GenerateMode settings={settings} />}
      {mode === 'analyze' && <AnalyzeMode settings={settings} initialFile={initialFile} />}
      {mode === 'ocr' && <OcrMode />}
      {mode === 'convert' && <ConvertMode />}
      {mode === 'palette' && <PaletteMode />}
      {mode === 'removebg' && <RemoveBgMode />}
    </div>
  )
}
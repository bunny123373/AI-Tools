// Small client-side image helpers used by the Images page.

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read the file.'))
    r.readAsDataURL(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image.'))
    img.src = src
  })
}

/** Downscale + re-encode an image file to a compact JPEG data URL (for AI vision uploads). */
export async function downscaleToDataUrl(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  if (scale >= 1 && file.type === 'image/jpeg') return dataUrl
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported in this browser.')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Extract the top dominant colors from an image (simple color quantization). */
export function extractPalette(dataUrl: string, count = 10): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const img = await loadImage(dataUrl)
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = Math.max(1, Math.round((64 * img.height) / img.width))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported in this browser.')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const buckets = new Map<string, number>()
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        if (a < 128) continue
        // 4-bit per channel buckets, so similar colors merge.
        const key = `${(r >> 4) << 4}_${(g >> 4) << 4}_${(b >> 4) << 4}`
        buckets.set(key, (buckets.get(key) || 0) + 1)
      }
      const sorted = [...buckets.entries()].sort((x, y) => y[1] - x[1])
      resolve(
        sorted.slice(0, count).map(([key]) => {
          const [r, g, b] = key.split('_').map(Number)
          const hex = [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
          return `#${hex}`
        }),
      )
    } catch (e) {
      reject(e)
    }
  })
}
// Server-side "read any URL" helper — powers the Link Preview and Article
// Summary tools. Runs only inside Next.js API routes (never imported from
// client components): fetches the page with a normal browser signature and
// pulls out og:/twitter: metadata plus the main readable text.
import { load } from 'cheerio'

export interface UnfurlResult {
  url: string
  title: string
  description: string
  image: string
  siteName: string
  /** Main readable text (stripped of nav/ads/scripts), capped at maxText. */
  text: string
  ok: boolean
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function unfurlUrl(rawUrl: string, maxText = 12_000): Promise<UnfurlResult> {
  let href: string
  try {
    href = new URL(rawUrl).href
  } catch {
    href = new URL(`https://${rawUrl}`).href
  }
  const url = new URL(href)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http(s) links are supported.')
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`)
  const html = await res.text()
  const $ = load(html)

  const meta = (sel: string) => $(sel).attr('content')?.trim() || ''
  const title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    $('title').first().text().replace(/\s+/g, ' ').trim()
  const description =
    meta('meta[property="og:description"]') ||
    meta('meta[name="description"]') ||
    meta('meta[name="twitter:description"]')
  const image = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]')
  const siteName = meta('meta[property="og:site_name"]') || url.hostname.replace(/^www\./, '')

  // Prefer <article>, then <main>, then <body> — drop anything that looks like
  // chrome (scripts, nav, ads, cookie banners) before reading the text.
  const root = $('article').first().length
    ? $('article').first()
    : $('main').first().length
      ? $('main').first()
      : $('body').first()
  const text = root
    .clone()
    .find(
      'script, style, noscript, nav, footer, header, form, aside, iframe, svg, ' +
        '.ad, .ads, .advertisement, .advert, [class*="cookie"], [id*="cookie"], [class*="social"], [aria-hidden="true"]',
    )
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxText)

  return {
    url: url.href,
    title: title || url.href,
    description,
    image: image ? new URL(image, url).href : '',
    siteName,
    text,
    ok: text.length > 0,
  }
}
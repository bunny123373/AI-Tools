export interface Theme {
  id: string
  name: string
  description: string
  swatches: string[]
}

export const THEMES: Theme[] = [
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'The default AI Toolbox look — deep near-black with a neon green and cyan gradient, subtle glass panels and a soft glow.',
    swatches: ['#05090a', '#0a1213', '#2bff88', '#14d8ff'],
  },
  {
    id: 'light-clean',
    name: 'Light Clean',
    description: 'Bright, professional white UI with soft shadows and an indigo accent. Great for daylight and sharing your screen.',
    swatches: ['#f5f7fb', '#ffffff', '#2563eb', '#4f46e5'],
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Dark grid background with electric cyan and hot pink neon glow. Sharp edges, monospace headings — for a hacker vibe.',
    swatches: ['#05070c', '#0b1018', '#00ffe1', '#ff2fb9'],
  },
  {
    id: 'glass-vibes',
    name: 'Glass Vibes',
    description: 'Frosted glass panels floating over a colorful purple-cyan gradient with big rounded corners. Modern and playful.',
    swatches: ['#1e1b4b', 'rgba(255,255,255,.14)', '#67e8f9', '#a78bfa'],
  },
  {
    id: 'retro-terminal',
    name: 'Retro Terminal',
    description: 'Classic green-on-black terminal with scanlines, monospace type and a blinking cursor. 100% retro hacker energy.',
    swatches: ['#0a0d07', '#0e130a', '#3dff70', '#b6ff3d'],
  },
]

const STORAGE_KEY = 'ai-toolbox-theme'

export function initTheme(): void {
  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  const fromStorage = localStorage.getItem(STORAGE_KEY)
  const id = fromUrl || fromStorage || 'modern-dark'
  applyTheme(id, fromUrl ? false : true)
}

export function applyTheme(id: string, persist = true): void {
  document.documentElement.setAttribute('data-theme', id)
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
  }
}

export function getTheme(): string {
  return document.documentElement.getAttribute('data-theme') || 'modern-dark'
}
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../index.css'
import '../App.css'
import '../themes.css'
import Providers from '@/components/auth/Providers'

export const metadata: Metadata = {
  title: 'AI Toolbox — Free AI Tools',
  description:
    'Free AI toolbox — chat, summarize, improve and translate with Ollama, OpenRouter free models, or Gemini free tier.',
  icons: { icon: '/tools.png' },
}

// Same logic as client/src/theme.ts initTheme(): read ?theme= from the URL,
// fall back to the saved theme, apply <html data-theme> before first paint.
// (Inline script so there is no theme flash; the ?theme= preview iframe keeps
// working exactly like it did on the Vite build.)
const themeScript = `try {
  var fromUrl = new URLSearchParams(window.location.search).get('theme');
  var fromStorage = null;
  try { fromStorage = localStorage.getItem('ai-toolbox-theme'); } catch (e) {}
  var id = fromUrl || fromStorage || 'modern-dark';
  document.documentElement.setAttribute('data-theme', id);
  if (fromUrl === null) {
    try { localStorage.setItem('ai-toolbox-theme', id); } catch (e) {}
  }
} catch (e) {}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
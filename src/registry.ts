import type { FloatingTarget } from './components/FloatingTools'

/**
 * Shared navigation/tool data for the redesigned shell.
 * Keep frontend-only — nothing here touches the API or backend.
 */

export interface ToolEntry {
  label: string
  hint?: string
  target: FloatingTarget
}

/** Everything reachable — used by the topbar "Search tools" input. */
export const TOOL_INDEX: ToolEntry[] = [
  { label: 'Chat', hint: 'Talk to an AI model', target: { tab: 'chat' } },
  { label: 'Home', hint: 'Welcome dashboard', target: { tab: 'chat' } },
  { label: 'Tools', hint: 'Summarize, improve, translate, PDF', target: { tab: 'tools' } },
  { label: 'Images', hint: 'Generate, analyze, OCR, convert', target: { tab: 'images' } },
  { label: 'Prompts', hint: 'Prompt library', target: { tab: 'prompts' } },
  { label: 'UI', hint: 'Pick your theme', target: { tab: 'ui' } },
  { label: 'Settings', hint: 'Providers & API keys', target: { tab: 'settings' } },
  { label: 'Summarize', hint: 'Short AI summary', target: { tab: 'tools', tool: 'summarize' } },
  { label: 'Improve', hint: 'Rewrite with style', target: { tab: 'tools', tool: 'improve' } },
  { label: 'Translate', hint: 'Any language', target: { tab: 'tools', tool: 'translate' } },
  { label: 'Proofread', hint: 'Fix grammar & spelling', target: { tab: 'tools', tool: 'proofread' } },
  { label: 'PDF → Word', hint: 'docx export', target: { tab: 'tools', tool: 'pdf', pdf: 'word' } },
  { label: 'PDF → Text', hint: 'Extract text', target: { tab: 'tools', tool: 'pdf', pdf: 'text' } },
  { label: 'PDF → Images', hint: 'Render pages', target: { tab: 'tools', tool: 'pdf', pdf: 'images' } },
  { label: 'Merge PDFs', hint: 'Combine files', target: { tab: 'tools', tool: 'pdf', pdf: 'merge' } },
  { label: 'Split PDF', hint: 'Extract a range', target: { tab: 'tools', tool: 'pdf', pdf: 'split' } },
  { label: 'Generate Image', hint: 'AI art, free', target: { tab: 'images', imageMode: 'generate' } },
  { label: 'Analyze Image', hint: 'Ask about a photo', target: { tab: 'images', imageMode: 'analyze' } },
  { label: 'OCR', hint: 'Extract text from images', target: { tab: 'images', imageMode: 'ocr' } },
  { label: 'Convert Image', hint: 'Resize, rotate, format', target: { tab: 'images', imageMode: 'convert' } },
  { label: 'Palette', hint: 'Extract colors', target: { tab: 'images', imageMode: 'palette' } },
  { label: 'Remove BG', hint: 'Local background removal', target: { tab: 'images', imageMode: 'removebg' } },
  { label: 'YouTube tools', hint: 'Info, transcript, titles, playlist, download', target: { tab: 'tools', tool: 'youtube' } },
  { label: 'YouTube: Video info', hint: 'Title, channel, thumbnail, duration', target: { tab: 'tools', tool: 'youtube', yt: 'info' } },
  { label: 'YouTube: Transcript', hint: 'Pull captions from a video', target: { tab: 'tools', tool: 'youtube', yt: 'transcript' } },
  { label: 'YouTube: Title pack', hint: 'AI titles, description & tags', target: { tab: 'tools', tool: 'youtube', yt: 'title' } },
  { label: 'YouTube: Playlist total', hint: 'Total runtime of a list of videos', target: { tab: 'tools', tool: 'youtube', yt: 'playlist' } },
  { label: 'YouTube: Download', hint: 'Save video (MP4) or audio (M4A)', target: { tab: 'tools', tool: 'youtube', yt: 'download' } },
]

/** Chat welcome — four suggestion cards. */
export const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: 'Explain anything',
    prompt: 'Explain quantum computing in simple terms with a practical example.',
  },
  {
    label: 'Write code',
    prompt: 'Create a React component for a dashboard with a chart and a stats row.',
  },
  {
    label: 'Generate images',
    prompt: 'A cinematic sunset over mountains, glowing clouds, photorealistic.',
  },
  {
    label: 'Get ideas',
    prompt: 'Give me YouTube content ideas — 10 hooks with titles and short descriptions.',
  },
]

/** Left sidebar "Recent chats" quick-start items. */
export const RECENT_CHATS: { label: string; prompt: string }[] = [
  { label: 'Website idea', prompt: 'Help me brainstorm a website idea. Give me concepts, structure and a plan.' },
  { label: 'Generate image', prompt: 'Create an image prompt for a futuristic city at night with neon lights.' },
  { label: 'Fix code error', prompt: 'Here is my code with an error. Help me find and fix the bug:\n' },
  { label: 'Movie website plan', prompt: 'Outline a movie review website — pages, sections and tech stack.' },
  { label: 'Flutter help', prompt: 'I need help with Flutter. Explain how to build a simple list screen with state.' },
]

/** Right sidebar "Popular prompts". */
export const POPULAR_PROMPTS: { label: string; prompt: string }[] = [
  { label: "Explain like I'm 10", prompt: 'Explain this concept to me like I am 10 years old, with one everyday analogy.' },
  { label: 'Write a YouTube script', prompt: 'Write a YouTube script about the topic below — hook, 3 sections, CTA.\n' },
  { label: 'Fix my code', prompt: 'Review my code below, find bugs and explain the fixes:\n' },
  { label: 'Generate image prompt', prompt: 'Make an image-generation prompt for: ' },
  { label: 'SEO title & description', prompt: 'Write an SEO title and meta description (max 150 chars) for: ' },
  { label: 'Plan my day', prompt: 'Plan my day using these tasks and priorities:\n' },
]
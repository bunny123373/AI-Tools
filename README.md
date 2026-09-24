# 🧰 AI Toolbox

A completely free, full-stack AI tools suite. Chat, summarize, improve, translate, proofread, and work with PDFs & images — without paying for AI.

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript — single app, UI + API in one server
- **AI providers (all free):**
  - 🦙 **Ollama** — runs locally on your PC, free forever, works offline
  - 🪙 **OpenRouter** — free `:free` models, $0 cost
  - 🌐 **Google Gemini** — generous free tier

## ✨ Features

- 💬 **Chat** with any provider/model, Markdown rendering, system prompts
- 📄 **Summarize** long text
- ✍️ **Improve / rewrite** text in 5 styles (professional, friendly, concise, casual, formal)
- 🌍 **Translate** into 12+ languages (any language, really)
- 🕵️ **Proofread** text
- 📄 **PDF tools** — convert to Word/text/images, merge & split (100% in your browser)
- 🖼️ **Image tools** — AI analyze, OCR, convert, palette, remove background
- 📚 **Prompt library** — save reusable prompts and send them to chat in one click
- 🎨 **UI picker** — five built-in themes
- ⚙️ **Settings** — API keys stored locally in your browser (localStorage), never logged by the server

## 🚀 Quick start

Requirements: **Node.js 20.9+** and npm.

```bash
cd D:\ai-toolbox
npm install
npm run dev     # starts UI + API together on http://localhost:3001
```

Open **http://localhost:3001**.

### Option A — No API keys at all (recommended to start): use Ollama

1. Install [Ollama](https://ollama.com)
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Select **Ollama** as the provider in the app. Done — 100% free and offline.

### Option B — OpenRouter free models

1. Create a free key at https://openrouter.ai/keys
2. Paste it in the app's **Settings** tab (or `.env.local` as `OPENROUTER_API_KEY`)
3. Pick a model ending in `:free` (costs $0)

### Option C — Google Gemini free tier

1. Create a free key at https://aistudio.google.com/apikey
2. Paste it in **Settings** (or `.env.local` as `GEMINI_API_KEY`)
3. Pick a Gemini model like `gemini-2.0-flash`

## 🔧 Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (UI + API, port 3001) |
| `npm run build` | Type-check + production build (`next build`) |
| `npm start` | Run the production build (port 3001) |
| `npm run lint` | oxlint over `src/` |

## 🗂️ Project structure

```
ai-toolbox/
├── src/
│   ├── app/                 # Next.js App Router (UI + API route handlers)
│   │   ├── layout.tsx       # Root layout (global styles, theme bootstrap)
│   │   ├── page.tsx         # The single-page tabbed app
│   │   └── api/             # Route handlers: /api/chat, /api/tools/*, /api/models …
│   ├── views/               # Tab pages: Chat, Tools, Images, Prompts, Settings, UiPicker
│   ├── components/          # ModelPicker, PdfTools
│   ├── utils/               # image.ts (client-side image helpers)
│   ├── providers.ts         # Ollama / OpenRouter / Gemini adapters (server)
│   ├── api.ts               # API helpers, settings & prompts storage (client)
│   └── types.ts
├── public/                  # Static assets (favicon, pdf.js worker)
└── package.json
```

The app still behaves exactly like the original Vite + Express build: one page with
tabs, `?tab=chat` / `?theme=modern-dark` URL params, and everything saved in your
browser's localStorage.

## 🔒 Privacy

- API keys live only in your browser's `localStorage` and go straight to your chosen provider through the local API — the server never stores or logs them.
- Keys can instead be set via `.env.local` and kept off the browser entirely.
- No accounts, no tracking, no payments.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Server status |
| GET | `/api/providers` | List of supported providers |
| GET | `/api/models?provider=ollama` | Models for a provider |
| POST | `/api/chat` | Chat completion (`{ provider, model, messages }`) |
| POST | `/api/tools/summarize` | Summarize `{ text }` |
| POST | `/api/tools/improve` | Rewrite `{ text, style }` |
| POST | `/api/tools/translate` | Translate `{ text, language }` |
| POST | `/api/tools/proofread` | Proofread `{ text }` |
| POST | `/api/tools/image/analyze` | Analyze an image `{ imageDataUrl, prompt? }` |
| POST | `/api/tools/image/generate` | Generate an image `{ prompt, width?, height?, model? }` (streams PNG/JPEG) |

For tools and chat you can optionally pass `openrouterKey`, `geminiKey`, `ollamaBaseUrl` in the body.